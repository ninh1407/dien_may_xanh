const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const Review = require('../models/Review');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Middleware xác thực admin
const requireAdmin = [authenticate, authorize(['admin'])];

// Validation middleware
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Tên sản phẩm phải từ 3-200 ký tự'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Mô tả phải từ 10-2000 ký tự'),
  body('price.originalPrice')
    .isFloat({ min: 0 })
    .withMessage('Giá gốc phải là số dương'),
  body('price.salePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá khuyến mãi phải là số dương'),
  body('inventory.sku')
    .trim()
    .notEmpty()
    .withMessage('SKU là bắt buộc'),
  body('inventory.quantity')
    .isInt({ min: 0 })
    .withMessage('Số lượng phải là số nguyên không âm'),
  body('category')
    .isMongoId()
    .withMessage('Danh mục không hợp lệ'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tên thương hiệu không quá 100 ký tự')
];

// ===== THỐNG KÊ TỔNG QUAN =====

// Thống kê dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [
      totalProducts,
      totalUsers,
      totalOrders,
      totalRevenue,
      recentOrders,
      topProducts,
      monthlyStats
    ] = await Promise.all([
      // Tổng sản phẩm
      Product.countDocuments({ isActive: true }),
      
      // Tổng người dùng
      User.countDocuments({ isActive: true }),
      
      // Tổng đơn hàng
      Order.countDocuments(),
      
      // Tổng doanh thu
      Order.aggregate([
        { $match: { status: { $in: ['delivered', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      // Đơn hàng gần đây
      Order.find()
        .populate('user', 'firstName lastName email')
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      
      // Sản phẩm bán chạy
      Order.aggregate([
        { $unwind: '$items' },
        { $group: { 
          _id: '$items.product', 
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }},
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        { $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }},
        { $unwind: '$product' },
        { $project: {
          name: '$product.name',
          images: '$product.images',
          totalSold: 1,
          revenue: 1
        }}
      ]),
      
      // Thống kê theo tháng
      Order.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalProducts,
          totalUsers,
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        recentOrders,
        topProducts,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê'
    });
  }
});

// ===== QUẢN LÝ SẢN PHẨM =====

// Lấy tất cả sản phẩm (admin view)
router.get('/products', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      if (status === 'active') query.isActive = true;
      if (status === 'inactive') query.isActive = false;
      if (status === 'out-of-stock') {
        query['inventory.quantity'] = { $lte: 0 };
      }
      if (status === 'on-sale') {
        query.isOnSale = true;
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query)
    ]);

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
    console.error('Get admin products error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm'
    });
  }
});

// Tạo sản phẩm mới
router.post('/products', requireAdmin, validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const productData = req.body;
    
    // Tạo slug từ tên
    const slug = productData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Kiểm tra SKU trùng
    const existingSku = await Product.findOne({ 
      'inventory.sku': productData.inventory.sku 
    });
    
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: 'SKU đã tồn tại'
      });
    }

    const product = new Product({
      ...productData,
      slug: slug,
      ratings: {
        average: 0,
        count: 0
      },
      reviews: [],
      purchases: 0,
      isActive: true
    });

    await product.save();
    
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .lean();

    res.json({
      success: true,
      message: 'Sản phẩm đã được tạo',
      data: populatedProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo sản phẩm'
    });
  }
});

// Cập nhật sản phẩm
router.put('/products/:id', requireAdmin, validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Kiểm tra SKU trùng (trừ sản phẩm hiện tại)
    if (updateData.inventory?.sku) {
      const existingSku = await Product.findOne({ 
        'inventory.sku': updateData.inventory.sku,
        _id: { $ne: id }
      });
      
      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: 'SKU đã tồn tại'
        });
      }
    }

    // Cập nhật slug nếu tên thay đổi
    if (updateData.name) {
      updateData.slug = updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Sản phẩm đã được cập nhật',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật sản phẩm'
    });
  }
});

// Xóa sản phẩm
router.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Sản phẩm đã được xóa'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa sản phẩm'
    });
  }
});

// Cập nhật trạng thái sản phẩm
router.patch('/products/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, isFeatured, isOnSale } = req.body;

    const updateData = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof isFeatured === 'boolean') updateData.isFeatured = isFeatured;
    if (typeof isOnSale === 'boolean') updateData.isOnSale = isOnSale;

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Trạng thái sản phẩm đã được cập nhật',
      data: product
    });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái sản phẩm'
    });
  }
});

// ===== QUẢN LÝ ĐƠN HÀNG =====

// Lấy tất cả đơn hàng
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'firstName lastName email phone')
        .populate('items.product', 'name images sku')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đơn hàng'
    });
  }
});

// Cập nhật trạng thái đơn hàng
router.patch('/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }

    const order = await Order.findById(id).populate('user', 'email firstName lastName');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại'
      });
    }

    const oldStatus = order.status;
    order.status = status;
    
    if (notes) {
      order.notes = notes;
    }

    // Thêm lịch sử trạng thái
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    
    order.statusHistory.push({
      status: status,
      timestamp: new Date(),
      notes: notes || `Cập nhật trạng thái từ ${oldStatus} sang ${status}`
    });

    await order.save();

    // TODO: Gửi email thông báo cho khách hàng
    // sendOrderStatusEmail(order.user.email, order, status);

    res.json({
      success: true,
      message: 'Trạng thái đơn hàng đã được cập nhật',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái đơn hàng'
    });
  }
});

// ===== QUẢN LÝ NGƯỜI DÙNG =====

// Lấy tất cả người dùng
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (status) {
      if (status === 'active') query.isActive = true;
      if (status === 'inactive') query.isActive = false;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách người dùng'
    });
  }
});

// Cập nhật trạng thái người dùng
router.patch('/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, role } = req.body;

    const updateData = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (role && ['user', 'admin'].includes(role)) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Trạng thái người dùng đã được cập nhật',
      data: user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái người dùng'
    });
  }
});

// ===== QUẢN LÝ DANH MỤC =====

// Lấy tất cả danh mục
router.get('/categories', requireAdmin, async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('parent', 'name')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh mục'
    });
  }
});

// Tạo danh mục mới
router.post('/categories', requireAdmin, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Tên danh mục phải từ 2-100 ký tự'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Mô tả không quá 500 ký tự')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { name, description, parent, image } = req.body;
    
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const category = new Category({
      name,
      slug,
      description,
      parent: parent || null,
      image: image || '',
      isActive: true
    });

    await category.save();

    res.json({
      success: true,
      message: 'Danh mục đã được tạo',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo danh mục'
    });
  }
});

// ===== QUẢN LÝ ĐÁNH GIÁ =====

// Lấy tất cả đánh giá
router.get('/reviews', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      product,
      user,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (status) {
      if (status === 'active') query.isActive = true;
      if (status === 'inactive') query.isActive = false;
      if (status === 'reported') query.isReported = true;
    }
    
    if (product) {
      query.product = product;
    }
    
    if (user) {
      query.user = user;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('user', 'firstName lastName avatar')
        .populate('product', 'name images')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments(query)
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
      message: 'Lỗi khi lấy danh sách đánh giá'
    });
  }
});

// Cập nhật trạng thái đánh giá
router.patch('/reviews/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, isReported } = req.body;

    const updateData = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof isReported === 'boolean') updateData.isReported = isReported;

    const review = await Review.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Đánh giá không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Trạng thái đánh giá đã được cập nhật',
      data: review
    });
  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái đánh giá'
    });
  }
});

// ===== QUẢN LÝ KHO HÀNG =====

// Cập nhật tồn kho
router.patch('/products/:id/inventory', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại'
      });
    }

    let newQuantity;
    if (operation === 'set') {
      newQuantity = quantity;
    } else if (operation === 'add') {
      newQuantity = product.inventory.quantity + quantity;
    } else if (operation === 'subtract') {
      newQuantity = product.inventory.quantity - quantity;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Phép toán không hợp lệ'
      });
    }

    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng không thể âm'
      });
    }

    product.inventory.quantity = newQuantity;
    product.inventory.inStock = newQuantity > 0;
    product.inventory.lastUpdated = new Date();

    await product.save();

    res.json({
      success: true,
      message: 'Tồn kho đã được cập nhật',
      data: {
        quantity: product.inventory.quantity,
        inStock: product.inventory.inStock
      }
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật tồn kho'
    });
  }
});

// Lấy sản phẩm sắp hết hàng
router.get('/inventory/low-stock', requireAdmin, async (req, res) => {
  try {
    const { threshold = 10 } = req.query;
    
    const products = await Product.find({
      'inventory.quantity': { $lte: parseInt(threshold) },
      isActive: true
    })
    .populate('category', 'name')
    .sort({ 'inventory.quantity': 1 })
    .lean();

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm sắp hết hàng'
    });
  }
});

module.exports = router;