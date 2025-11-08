const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize, ownerOrAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

// Validation middleware
const validateUpdateProfile = [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('phone').optional().matches(/^[0-9\s\-\+\(\)]{10,}$/).withMessage('Valid phone number is required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Valid gender is required')
];

const validateAddress = [
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  body('phone').matches(/^[0-9\s\-\+\(\)]{10,}$/).withMessage('Valid phone number is required'),
  body('address').trim().isLength({ min: 5 }).withMessage('Address is required'),
  body('ward').trim().isLength({ min: 1 }).withMessage('Ward is required'),
  body('district').trim().isLength({ min: 1 }).withMessage('District is required'),
  body('province').trim().isLength({ min: 1 }).withMessage('Province is required'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean')
];

const validatePasswordChange = [
  body('currentPassword').isLength({ min: 6 }).withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
];

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .populate('orders', 'orderNumber status total createdAt')
      .populate('wishlist', 'name images price slug');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user profile
router.patch('/profile', authenticate, validateUpdateProfile, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { firstName, lastName, phone, dateOfBirth, gender } = req.body;
    const user = req.user;

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (gender) user.gender = gender;

    await user.save();

    // Return updated user without sensitive data
    const updatedUser = await User.findById(user._id)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload profile picture
router.post('/profile/picture', authenticate, uploadSingle('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const user = req.user;
    user.avatar = req.file.path;
    await user.save();

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile picture',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Change password
router.patch('/password', authenticate, validatePasswordChange, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user addresses
router.get('/addresses', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');

    res.json({
      success: true,
      data: user.addresses
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching addresses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add new address
router.post('/addresses', authenticate, validateAddress, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { fullName, phone, address, ward, district, province, isDefault } = req.body;
    const user = req.user;

    const newAddress = {
      fullName,
      phone,
      address,
      ward,
      district,
      province,
      isDefault: isDefault || user.addresses.length === 0
    };

    // If this is the default address, unset others
    if (newAddress.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push(newAddress);
    await user.save();

    res.json({
      success: true,
      message: 'Address added successfully',
      data: user.addresses
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update address
router.patch('/addresses/:addressId', authenticate, validateAddress, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { addressId } = req.params;
    const { fullName, phone, address, ward, district, province, isDefault } = req.body;
    const user = req.user;

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Update address fields
    user.addresses[addressIndex].fullName = fullName;
    user.addresses[addressIndex].phone = phone;
    user.addresses[addressIndex].address = address;
    user.addresses[addressIndex].ward = ward;
    user.addresses[addressIndex].district = district;
    user.addresses[addressIndex].province = province;

    // Handle default address
    if (isDefault) {
      user.addresses.forEach((addr, index) => {
        addr.isDefault = index === addressIndex;
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: user.addresses
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete address
router.delete('/addresses/:addressId', authenticate, async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = req.user;

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // If deleted address was default, set first remaining address as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Address deleted successfully',
      data: user.addresses
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's wishlist
router.get('/wishlist', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'wishlist',
        select: 'name images price slug isActive inventory',
        populate: {
          path: 'category',
          select: 'name slug'
        }
      });

    // Filter out inactive products
    const activeWishlist = user.wishlist.filter(product => product.isActive);

    res.json({
      success: true,
      data: activeWishlist
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add item to wishlist
router.post('/wishlist/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = req.user;

    // Check if product is already in wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Product is already in your wishlist'
      });
    }

    user.wishlist.push(productId);
    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate({
        path: 'wishlist',
        select: 'name images price slug',
        populate: {
          path: 'category',
          select: 'name slug'
        }
      });

    res.json({
      success: true,
      message: 'Product added to wishlist successfully',
      data: updatedUser.wishlist
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding product to wishlist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Remove item from wishlist
router.delete('/wishlist/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = req.user;

    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();

    res.json({
      success: true,
      message: 'Product removed from wishlist successfully',
      data: user.wishlist
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing product from wishlist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's order history
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const orders = await User.findById(req.user._id)
      .populate({
        path: 'orders',
        match: status ? { status } : {},
        options: {
          sort: { createdAt: -1 },
          limit: limit * 1,
          skip: (page - 1) * limit
        },
        populate: {
          path: 'items.product',
          select: 'name images'
        }
      })
      .select('orders');

    const total = await User.findById(req.user._id).populate({
      path: 'orders',
      match: query,
      select: '_id'
    });

    res.json({
      success: true,
      data: {
        orders: orders.orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total.orders.length,
          pages: Math.ceil(total.orders.length / limit)
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

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status) query.isActive = status === 'active';

    const users = await User.find(query)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user by ID (admin only)
router.get('/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .populate('orders', 'orderNumber status total createdAt')
      .populate('wishlist', 'name images price slug');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user status (admin only)
router.patch('/:userId/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { isActive, role } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    if (role && ['user', 'admin'].includes(role)) {
      user.role = role;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: {
        isActive: user.isActive,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;