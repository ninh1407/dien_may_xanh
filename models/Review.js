const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Review content is required'],
    maxlength: [1000, 'Review content cannot exceed 1000 characters']
  },
  pros: [{
    type: String,
    maxlength: [100, 'Each pro cannot exceed 100 characters']
  }],
  cons: [{
    type: String,
    maxlength: [100, 'Each con cannot exceed 100 characters']
  }],
  images: [{
    url: String,
    alt: String
  }],
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpfulVotes: {
    type: Number,
    default: 0
  },
  votedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vote: {
      type: String,
      enum: ['helpful', 'not_helpful']
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  response: {
    content: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Compound index to ensure one review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, rating: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ isActive: 1, createdAt: -1 });

// Check if user can review (must have purchased the product)
reviewSchema.statics.canUserReview = async function(userId, productId) {
  const Order = mongoose.model('Order');
  
  const order = await Order.findOne({
    user: userId,
    'items.product': productId,
    orderStatus: 'delivered'
  });
  
  return !!order;
};

// Update product ratings after review is saved
reviewSchema.post('save', async function() {
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product);
  if (product) {
    await product.updateRatings();
  }
});

// Update product ratings after review is removed
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const Product = mongoose.model('Product');
    const product = await Product.findById(doc.product);
    if (product) {
      await product.updateRatings();
    }
  }
});

// Method to mark as helpful
reviewSchema.methods.markAsHelpful = function(userId, helpful = true) {
  const existingVote = this.votedBy.find(vote => vote.user.toString() === userId.toString());
  
  if (existingVote) {
    if (existingVote.vote === (helpful ? 'helpful' : 'not_helpful')) {
      // Remove vote if same as existing
      this.votedBy = this.votedBy.filter(vote => vote.user.toString() !== userId.toString());
      this.helpfulVotes += helpful ? -1 : 0;
    } else {
      // Update existing vote
      existingVote.vote = helpful ? 'helpful' : 'not_helpful';
      this.helpfulVotes += helpful ? 1 : -1;
    }
  } else {
    // Add new vote
    this.votedBy.push({
      user: userId,
      vote: helpful ? 'helpful' : 'not_helpful'
    });
    this.helpfulVotes += helpful ? 1 : 0;
  }
  
  return this.save();
};

// Method to add admin response
reviewSchema.methods.addResponse = function(content, adminId) {
  this.response = {
    content: content,
    respondedAt: new Date(),
    respondedBy: adminId
  };
  return this.save();
};

// Virtual for review summary
reviewSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    rating: this.rating,
    title: this.title,
    content: this.content.length > 100 ? this.content.substring(0, 100) + '...' : this.content,
    author: this.user.fullName,
    date: this.createdAt,
    helpful: this.helpfulVotes,
    verified: this.isVerifiedPurchase
  };
});

// Ensure virtual fields are serialized
reviewSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Review', reviewSchema);