const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateAddToCart = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1')
];

const validateUpdateQuantity = [
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1')
];

// Helper function to calculate cart totals
const calculateCartTotals = (items) => {
  const subtotal = items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  const tax = subtotal * 0.1; // 10% tax
  const shipping = subtotal > 500000 ? 0 : 30000; // Free shipping over 500k VND
  const total = subtotal + tax + shipping;

  return {
    subtotal,
    tax,
    shipping,
    total
  };
};

// Get user's cart
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await req.user.populate({
      path: 'cart.product',
      populate: {
        path: 'category',
        select: 'name slug'
      }
    });

    const cartItems = user.cart || [];
    const totals = calculateCartTotals(cartItems);

    res.json({
      success: true,
      data: {
        items: cartItems,
        totals,
        itemCount: cartItems.reduce((count, item) => count + item.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add item to cart
router.post('/add', authenticate, validateAddToCart, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { productId, quantity } = req.body;
    const user = req.user;

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is active and in stock
    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    if (!product.isInStock() || product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product is out of stock or insufficient quantity'
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = user.cart.findIndex(item => 
      item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      const newQuantity = user.cart[existingItemIndex].quantity + quantity;
      
      // Check if total quantity exceeds available stock
      if (newQuantity > product.inventory.quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.inventory.quantity} items available in stock`
        });
      }

      user.cart[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      user.cart.push({
        product: productId,
        quantity: quantity,
        price: product.price.salePrice || product.price.originalPrice
      });
    }

    await user.save();
    await user.populate({
      path: 'cart.product',
      populate: {
        path: 'category',
        select: 'name slug'
      }
    });

    const totals = calculateCartTotals(user.cart);

    res.json({
      success: true,
      message: 'Product added to cart successfully',
      data: {
        items: user.cart,
        totals,
        itemCount: user.cart.reduce((count, item) => count + item.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding product to cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update item quantity
router.put('/update/:productId', authenticate, validateUpdateQuantity, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { productId } = req.params;
    const { quantity } = req.body;
    const user = req.user;

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is in stock
    if (!product.isInStock() || product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product is out of stock or insufficient quantity'
      });
    }

    // Find item in cart
    const cartItemIndex = user.cart.findIndex(item => 
      item.product.toString() === productId
    );

    if (cartItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart'
      });
    }

    // Update quantity
    user.cart[cartItemIndex].quantity = quantity;
    await user.save();
    
    await user.populate({
      path: 'cart.product',
      populate: {
        path: 'category',
        select: 'name slug'
      }
    });

    const totals = calculateCartTotals(user.cart);

    res.json({
      success: true,
      message: 'Cart updated successfully',
      data: {
        items: user.cart,
        totals,
        itemCount: user.cart.reduce((count, item) => count + item.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Remove item from cart
router.delete('/remove/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = req.user;

    // Find item in cart
    const cartItemIndex = user.cart.findIndex(item => 
      item.product.toString() === productId
    );

    if (cartItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart'
      });
    }

    // Remove item from cart
    user.cart.splice(cartItemIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Product removed from cart successfully',
      data: {
        items: user.cart,
        totals: calculateCartTotals(user.cart),
        itemCount: user.cart.reduce((count, item) => count + item.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing product from cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Clear entire cart
router.delete('/clear', authenticate, async (req, res) => {
  try {
    const user = req.user;
    user.cart = [];
    await user.save();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0
        },
        itemCount: 0
      }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get cart summary (for header/minicart)
router.get('/summary', authenticate, async (req, res) => {
  try {
    const user = await req.user.populate({
      path: 'cart.product',
      select: 'name images price inventory'
    });

    const cartItems = user.cart || [];
    const totals = calculateCartTotals(cartItems);

    // Get first 3 items for preview
    const previewItems = cartItems.slice(0, 3).map(item => ({
      id: item.product._id,
      name: item.product.name,
      image: item.product.images[0]?.url || '',
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    }));

    res.json({
      success: true,
      data: {
        itemCount: cartItems.reduce((count, item) => count + item.quantity, 0),
        total: totals.total,
        previewItems,
        hasMore: cartItems.length > 3
      }
    });
  } catch (error) {
    console.error('Get cart summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cart summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Validate cart before checkout
router.get('/validate', authenticate, async (req, res) => {
  try {
    const user = await req.user.populate({
      path: 'cart.product',
      select: 'name price inventory isActive'
    });

    const validationResults = [];
    let isValid = true;

    for (const item of user.cart) {
      const issues = [];

      if (!item.product.isActive) {
        issues.push('Product is no longer available');
        isValid = false;
      }

      if (!item.product.isInStock() || item.product.inventory.quantity < item.quantity) {
        issues.push(`Only ${item.product.inventory.quantity} items available`);
        isValid = false;
      }

      // Check if price has changed
      const currentPrice = item.product.price.salePrice || item.product.price.originalPrice;
      if (item.price !== currentPrice) {
        issues.push(`Price changed from ${item.price.toLocaleString()}đ to ${currentPrice.toLocaleString()}đ`);
        isValid = false;
      }

      if (issues.length > 0) {
        validationResults.push({
          productId: item.product._id,
          productName: item.product.name,
          issues
        });
      }
    }

    res.json({
      success: true,
      data: {
        isValid,
        validationResults,
        cartItems: user.cart.map(item => ({
          productId: item.product._id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price.salePrice || item.product.price.originalPrice,
          isActive: item.product.isActive,
          inStock: item.product.isInStock(),
          availableQuantity: item.product.inventory.quantity
        }))
      }
    });
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;