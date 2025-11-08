const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative']
    },
    selectedSpecifications: [{
      name: String,
      value: String
    }]
  }],
  shippingAddress: {
    fullName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    ward: String,
    district: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    notes: String
  },
  billingAddress: {
    fullName: String,
    phone: String,
    address: String,
    ward: String,
    district: String,
    city: String
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['cod', 'bank_transfer', 'credit_card', 'momo', 'zalopay'],
      required: true
    },
    provider: String,
    transactionId: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  shippingMethod: {
    name: {
      type: String,
      required: true
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    estimatedDays: Number,
    trackingNumber: String
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    shipping: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    promoCode: String,
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  timeline: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  notes: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  cancellation: {
    reason: String,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  refund: {
    amount: Number,
    reason: String,
    refundedAt: Date,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ 'paymentMethod.paymentStatus': 1 });
orderSchema.index({ createdAt: -1 });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `DMX${timestamp}${random}`;
  }
  next();
});

// Update timeline when status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus')) {
    this.timeline.push({
      status: this.orderStatus,
      timestamp: new Date()
    });
  }
  next();
});

// Calculate total price for items
orderSchema.methods.calculateItemTotal = function() {
  return this.items.reduce((total, item) => total + item.totalPrice, 0);
};

// Check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.orderStatus);
};

// Check if order can be refunded
orderSchema.methods.canBeRefunded = function() {
  return ['delivered'].includes(this.orderStatus) && this.paymentMethod.paymentStatus === 'paid';
};

// Update payment status
orderSchema.methods.updatePaymentStatus = function(status, transactionId = null) {
  this.paymentMethod.paymentStatus = status;
  if (transactionId) {
    this.paymentMethod.transactionId = transactionId;
  }
  if (status === 'paid') {
    this.paymentMethod.paidAt = new Date();
  }
  return this.save();
};

// Update order status
orderSchema.methods.updateStatus = function(status, note = null, updatedBy = null) {
  this.orderStatus = status;
  if (note) {
    this.timeline.push({
      status: status,
      timestamp: new Date(),
      note: note,
      updatedBy: updatedBy
    });
  }
  return this.save();
};

// Ensure virtual fields are serialized
orderSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Order', orderSchema);