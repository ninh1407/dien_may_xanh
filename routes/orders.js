const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticate, authorize, ownerOrAdmin } = require('../middleware/auth');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../utils/email');

const router = express.Router();

// Validation middleware
const validateOrder = [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isNumeric().withMessage('Valid price is required'),
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('shippingAddress.fullName').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  body('shippingAddress.phone').matches(/^[0-9\s\-\+\(\)]{10,}$/).withMessage('Valid phone number is required'),
  body('shippingAddress.address').trim().isLength({ min: 5 }).withMessage('Address is required'),
  body('shippingAddress.ward').trim().isLength({ min: 1 }).withMessage('Ward is required'),
  body('shippingAddress.district').trim().isLength({ min: 1 }).withMessage('District is required'),
  body('shippingAddress.province').trim().isLength({ min: 1 }).withMessage('Province is required'),
  body('paymentMethod').isIn(['COD', 'bank_transfer', 'credit_card', 'momo', 'zalo_pay']).withMessage('Valid payment method is required'),
  body('shippingMethod').optional().isString()
];

const validateOrderStatus = [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).withMessage('Valid status is required'),
  body('note').optional().trim()
];

// Helper function to calculate order totals
const calculateOrderTotals = (items) => {
  const subtotal = items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  const tax = subtotal * 0.1; // 10% tax
  const shipping = subtotal > 500000 ? 0 : 30000; // Free shipping over 500k VND
  const discount = 0; // TODO: Implement discount codes
  const total = subtotal + tax + shipping - discount;

  return {
    subtotal,
    tax,
    shipping,
    discount,
    total
  };
};

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `DH${timestamp}${random}`;
};

// Create new order
router.post('/', authenticate, validateOrder, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { items, shippingAddress, billingAddress, paymentMethod, shippingMethod, note } = req.body;
    const user = req.user;

    // Validate products and check stock
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`
        });
      }

      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available`
        });
      }

      if (!product.isInStock() || product.inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is out of stock or insufficient quantity`
        });
      }

      // Check price consistency
      const currentPrice = product.price.salePrice || product.price.originalPrice;
      if (Math.abs(currentPrice - item.price) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Price for ${product.name} has changed. Please refresh the page.`
        });
      }

      orderItems.push({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        specifications: item.specifications || {}
      });
    }

    // Calculate totals
    const totals = calculateOrderTotals(orderItems);

    // Create order
    const order = new Order({
      orderNumber: generateOrderNumber(),
      user: user._id,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'pending' : 'unpaid',
      shippingMethod: shippingMethod || 'standard',
      status: 'pending',
      ...totals,
      timeline: [{
        status: 'pending',
        note: 'Đơn hàng đã được tạo',
        timestamp: new Date()
      }],
      note
    });

    await order.save();

    // Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { 'inventory.quantity': -item.quantity } }
      );
    }

    // Clear user's cart
    user.cart = [];
    await user.save();

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(user.email, order);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the order creation if email fails
    }

    // Populate order for response
    await order.populate([
      { path: 'items.product', select: 'name images' },
      { path: 'user', select: 'firstName lastName email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's orders
router.get('/my-orders', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('orderNumber status paymentStatus total createdAt items');

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single order details
router.get('/:orderId', authenticate, ownerOrAdmin(Order), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate([
        { path: 'items.product', select: 'name images brand' },
        { path: 'user', select: 'firstName lastName email phone' }
      ]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update order status (admin only)
router.patch('/:orderId/status', authenticate, authorize('admin'), validateOrderStatus, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { status, note } = req.body;
    const order = await Order.findById(req.params.orderId).populate('user', 'email firstName lastName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': [],
      'refunded': []
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    // Handle special cases
    if (status === 'cancelled') {
      // Restore product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { 'inventory.quantity': item.quantity } }
        );
      }
      order.paymentStatus = 'refunded';
    }

    if (status === 'delivered') {
      order.paymentStatus = 'paid';
    }

    // Update status and add to timeline
    order.status = status;
    order.timeline.push({
      status,
      note: note || `Order status updated to ${status}`,
      timestamp: new Date()
    });

    await order.save();

    // Send status update email
    try {
      await sendOrderStatusUpdateEmail(order.user.email, order);
    } catch (emailError) {
      console.error('Status update email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all orders (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, startDate, endDate } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    // Calculate statistics
    const stats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        statistics: stats[0] || {
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Cancel order (user can cancel their own orders, admin can cancel any)
router.post('/:orderId/cancel', authenticate, ownerOrAdmin(Order), async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in ${order.status} status`
      });
    }

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { 'inventory.quantity': item.quantity } }
      );
    }

    // Update order status
    order.status = 'cancelled';
    order.paymentStatus = 'refunded';
    order.timeline.push({
      status: 'cancelled',
      note: reason || 'Order cancelled by customer',
      timestamp: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get order statistics (admin only)
router.get('/admin/statistics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const stats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          confirmedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          shippedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get daily stats for chart
    const dailyStats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          revenue: 1,
          orders: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          pendingOrders: 0,
          confirmedOrders: 0,
          shippedOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0
        },
        dailyStats
      }
    });
  } catch (error) {
    console.error('Get order statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;