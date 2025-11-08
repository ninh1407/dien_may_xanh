const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
    unique: true
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
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  image: {
    url: String,
    alt: String
  },
  icon: String,
  color: {
    type: String,
    default: '#000000'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  productsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1, isActive: 1 });
categorySchema.index({ isFeatured: -1, sortOrder: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Update products count
categorySchema.methods.updateProductsCount = async function() {
  const Product = mongoose.model('Product');
  const count = await Product.countDocuments({ category: this._id, isActive: true });
  this.productsCount = count;
  await this.save();
};

// Get category hierarchy
categorySchema.methods.getHierarchy = async function() {
  const hierarchy = [];
  let current = this;
  
  while (current) {
    hierarchy.unshift({
      _id: current._id,
      name: current.name,
      slug: current.slug
    });
    current = current.parent ? await mongoose.model('Category').findById(current.parent) : null;
  }
  
  return hierarchy;
};

// Get all subcategory IDs recursively
categorySchema.methods.getAllSubcategoryIds = async function() {
  const ids = [this._id];
  const subcategories = await mongoose.model('Category').find({ parent: this._id });
  
  for (const subcategory of subcategories) {
    const subIds = await subcategory.getAllSubcategoryIds();
    ids.push(...subIds);
  }
  
  return ids;
};

// Pre-save middleware to generate slug if not provided
categorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }
  next();
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Category', categorySchema);