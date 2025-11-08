const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  price: {
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [0, 'Price cannot be negative']
    },
    salePrice: {
      type: Number,
      min: [0, 'Sale price cannot be negative'],
      validate: {
        validator: function(value) {
          return !value || value <= this.originalPrice;
        },
        message: 'Sale price must be less than or equal to original price'
      }
    },
    currency: {
      type: String,
      default: 'VND'
    }
  },
  inventory: {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    inStock: {
      type: Boolean,
      default: true
    },
    lowStockThreshold: {
      type: Number,
      default: 5
    }
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  specifications: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    unit: String
  }],
  features: [String],
  tags: [String],
  ratings: {
    average: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5'],
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isOnSale: {
    type: Boolean,
    default: false
  },
  saleStartDate: Date,
  saleEndDate: Date,
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  views: {
    type: Number,
    default: 0
  },
  purchases: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ 'price.salePrice': 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ isFeatured: -1, createdAt: -1 });
productSchema.index({ slug: 1 });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.price.salePrice && this.price.originalPrice > this.price.salePrice) {
    return Math.round(((this.price.originalPrice - this.price.salePrice) / this.price.originalPrice) * 100);
  }
  return 0;
});

// Virtual for final price
productSchema.virtual('finalPrice').get(function() {
  return this.price.salePrice || this.price.originalPrice;
});

// Check if product is in stock
productSchema.methods.isInStock = function() {
  return this.inventory.quantity > 0 && this.inventory.inStock;
};

// Check if sale is active
productSchema.methods.isSaleActive = function() {
  if (!this.isOnSale || !this.price.salePrice) return false;
  
  const now = new Date();
  if (this.saleStartDate && now < this.saleStartDate) return false;
  if (this.saleEndDate && now > this.saleEndDate) return false;
  
  return true;
};

// Update stock
productSchema.methods.updateStock = function(quantity, operation = 'decrease') {
  if (operation === 'decrease') {
    this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);
  } else {
    this.inventory.quantity += quantity;
  }
  
  this.inventory.inStock = this.inventory.quantity > 0;
  return this.save();
};

// Update ratings
productSchema.methods.updateRatings = async function() {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { product: this._id } },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        numOfReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    this.ratings.average = Math.round(stats[0].averageRating * 10) / 10;
    this.ratings.count = stats[0].numOfReviews;
  } else {
    this.ratings.average = 0;
    this.ratings.count = 0;
  }

  await this.save();
};

// Ensure virtual fields are serialized
productSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Product', productSchema);