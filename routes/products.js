const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price.originalPrice')
    .isFloat({ min: 0 })
    .withMessage('Original price must be a positive number'),
  body('price.salePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sale price must be a positive number'),
  body('inventory.sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required'),
  body('inventory.quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand name cannot exceed 100 characters')
];

const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Review title must be between 5 and 100 characters'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Review content must be between 10 and 1000 characters')
];

// Get all products with filtering and pagination
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      inStock,
      onSale,
      featured
    } = req.query;

    // Build query
    const query = { isActive: true };
    
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) {
        const categoryIds = await categoryDoc.getAllSubcategoryIds();
        query.category = { $in: categoryIds };
      }
    }
    
    if (brand) {
      query.brand = new RegExp(brand, 'i');
    }
    
    if (minPrice || maxPrice) {
      query.$or = [
        {
          'price.salePrice': {
            $gte: minPrice ? parseFloat(minPrice) : 0,
            $lte: maxPrice ? parseFloat(maxPrice) : Infinity
          }
        },
        {
          $and: [
            { 'price.salePrice': { $exists: false } },
            {
              'price.originalPrice': {
                $gte: minPrice ? parseFloat(minPrice) : 0,
                $lte: maxPrice ? parseFloat(maxPrice) : Infinity
              }
            }
          ]
        }
      ];
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (inStock === 'true') {
      query['inventory.inStock'] = true;
      query['inventory.quantity'] = { $gt: 0 };
    }
    
    if (onSale === 'true') {
      query.isOnSale = true;
      query['price.salePrice'] = { $exists: true, $gt: 0 };
    }
    
    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Build sort options
    const sortOptions = {};
    const validSortFields = ['createdAt', 'price', 'name', 'ratings.average', 'purchases'];
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    // Execute query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query)
    ]);

    // Check wishlist for authenticated users
    if (req.user) {
      const user = await User.findById(req.user._id).select('wishlist');
      products.forEach(product => {
        product.isInWishlist = user.wishlist.includes(product._id);
      });
    }

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single product by slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const product = await Product.findOne({ slug, isActive: true })
      .populate('category', 'name slug')
      .populate({
        path: 'reviews',
        match: { isActive: true },
        populate: {
          path: 'user',
          select: 'firstName lastName avatar'
        },
        options: { limit: 10, sort: { createdAt: -1 } }
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    product.views += 1;
    await product.save();

    // Check if in wishlist for authenticated users
    let isInWishlist = false;
    if (req.user) {
      const user = await User.findById(req.user._id).select('wishlist');
      isInWishlist = user.wishlist.includes(product._id);
    }

    // Check if user can review (must have purchased)
    let canReview = false;
    if (req.user) {
      canReview = await Review.canUserReview(req.user._id, product._id);
    }

    res.json({
      success: true,
      data: {
        ...product.toJSON(),
        isInWishlist,
        canReview
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new product (admin only)
router.post('/', authenticate, authorize('admin'), validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const productData = req.body;
    
    // Generate slug if not provided
    if (!productData.slug) {
      productData.slug = productData.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
    }

    // Check if slug already exists
    const existingProduct = await Product.findOne({ slug: productData.slug });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this name already exists'
      });
    }

    // Verify category exists
    const category = await Category.findById(productData.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const product = new Product(productData);
    await product.save();

    // Update category product count
    await category.updateProductsCount();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update product (admin only)
router.put('/:id', authenticate, authorize('admin'), validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const productData = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // If category is being changed, update counts
    if (productData.category && productData.category !== product.category.toString()) {
      const oldCategory = await Category.findById(product.category);
      const newCategory = await Category.findById(productData.category);
      
      if (!newCategory) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID'
        });
      }

      // Update category counts
      if (oldCategory) await oldCategory.updateProductsCount();
      if (newCategory) await newCategory.updateProductsCount();
    }

    Object.assign(product, productData);
    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete product (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(id);

    // Update category product count
    const category = await Category.findById(product.category);
    if (category) {
      await category.updateProductsCount();
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add review to product
router.post('/:id/reviews', authenticate, validateReview, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { rating, title, content, pros, cons, images } = req.body;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      product: id,
      user: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Check if user can review (must have purchased)
    const canReview = await Review.canUserReview(req.user._id, id);
    if (!canReview) {
      return res.status(400).json({
        success: false,
        message: 'You can only review products you have purchased'
      });
    }

    const review = new Review({
      product: id,
      user: req.user._id,
      rating,
      title,
      content,
      pros: pros || [],
      cons: cons || [],
      images: images || [],
      isVerifiedPurchase: true
    });

    await review.save();

    // Add review to product
    product.reviews.push(review._id);
    await product.save();

    // Update product ratings
    await product.updateRatings();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: review
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get product reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [reviews, total] = await Promise.all([
      Review.find({ product: id, isActive: true })
        .populate('user', 'firstName lastName avatar')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments({ product: id, isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;