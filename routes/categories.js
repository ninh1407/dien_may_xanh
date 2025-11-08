const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateCategory = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Parent category must be a valid ID'),
  body('color')
    .optional()
    .isHexColor()
    .withMessage('Color must be a valid hex color')
];

// Get all categories with optional hierarchy
router.get('/', async (req, res) => {
  try {
    const { parent = null, includeInactive = 'false' } = req.query;
    
    const query = {};
    if (parent !== 'all') {
      query.parent = parent === 'null' ? null : parent;
    }
    
    if (includeInactive !== 'true') {
      query.isActive = true;
    }

    const categories = await Category.find(query)
      .populate('parent', 'name slug')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Build hierarchy if requested
    if (req.query.hierarchy === 'true') {
      const buildHierarchy = (categories, parentId = null) => {
        return categories
          .filter(cat => 
            (parentId === null && !cat.parent) || 
            (cat.parent && cat.parent._id.toString() === parentId.toString())
          )
          .map(cat => ({
            ...cat,
            children: buildHierarchy(categories, cat._id)
          }));
      };

      const hierarchicalCategories = buildHierarchy(categories);
      
      return res.json({
        success: true,
        data: hierarchicalCategories
      });
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get category by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const category = await Category.findOne({ slug, isActive: true })
      .populate('parent', 'name slug')
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get hierarchy
    const hierarchy = await Category.findById(category._id).then(cat => cat.getHierarchy());

    res.json({
      success: true,
      data: {
        ...category,
        hierarchy
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get products by category
router.get('/:slug/products', async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      brand,
      inStock
    } = req.query;

    // Find category
    const category = await Category.findOne({ slug, isActive: true });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get all subcategory IDs
    const categoryIds = await category.getAllSubcategoryIds();

    // Build product query
    const productQuery = {
      category: { $in: categoryIds },
      isActive: true
    };

    if (minPrice || maxPrice) {
      productQuery.$or = [
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

    if (brand) {
      productQuery.brand = new RegExp(brand, 'i');
    }

    if (inStock === 'true') {
      productQuery['inventory.inStock'] = true;
      productQuery['inventory.quantity'] = { $gt: 0 };
    }

    // Build sort options
    const sortOptions = {};
    const validSortFields = ['createdAt', 'price', 'name', 'ratings.average', 'purchases'];
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(productQuery)
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(productQuery)
    ]);

    // Get available brands for this category
    const brands = await Product.distinct('brand', productQuery);

    res.json({
      success: true,
      data: {
        category: {
          ...category.toJSON(),
          hierarchy: await category.getHierarchy()
        },
        products,
        filters: {
          brands: brands.filter(Boolean).sort(),
          priceRange: {
            min: Math.min(...products.map(p => p.price.salePrice || p.price.originalPrice)),
            max: Math.max(...products.map(p => p.price.salePrice || p.price.originalPrice))
          }
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new category (admin only)
router.post('/', authenticate, authorize('admin'), validateCategory, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const categoryData = req.body;

    // Check if parent category exists
    if (categoryData.parent) {
      const parentCategory = await Category.findById(categoryData.parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    // Generate slug if not provided
    if (!categoryData.slug) {
      categoryData.slug = categoryData.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
    }

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug: categoryData.slug });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update category (admin only)
router.put('/:id', authenticate, authorize('admin'), validateCategory, async (req, res) => {
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
    const categoryData = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if parent category exists and prevent circular reference
    if (categoryData.parent) {
      if (categoryData.parent === id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent'
        });
      }

      const parentCategory = await Category.findById(categoryData.parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    // Generate slug if name changed and slug not provided
    if (categoryData.name && categoryData.name !== category.name && !categoryData.slug) {
      categoryData.slug = categoryData.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
    }

    // Check if slug already exists (excluding current category)
    if (categoryData.slug && categoryData.slug !== category.slug) {
      const existingCategory = await Category.findOne({ 
        slug: categoryData.slug,
        _id: { $ne: id }
      });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    Object.assign(category, categoryData);
    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has subcategories
    const subcategories = await Category.find({ parent: id });
    if (subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Please delete subcategories first.'
      });
    }

    // Check if category has products
    const products = await Product.find({ category: id });
    if (products.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with products. Please reassign or delete products first.'
      });
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get featured categories
router.get('/featured/list', async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const categories = await Category.find({ isFeatured: true, isActive: true })
      .populate('parent', 'name slug')
      .sort({ sortOrder: 1, name: 1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get featured categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;