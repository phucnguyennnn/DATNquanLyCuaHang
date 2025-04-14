const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    description: { 
      type: String, 
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    image: {
      type: String,
      trim: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// Cascade delete subcategories when parent is deleted
categorySchema.pre('remove', async function(next) {
  await this.model('Category').deleteMany({ parentCategory: this._id });
  next();
});

// Index for better performance
categorySchema.index({ name: 'text', description: 'text' });
categorySchema.index({ parentCategory: 1 });

module.exports = mongoose.model('Category', categorySchema);