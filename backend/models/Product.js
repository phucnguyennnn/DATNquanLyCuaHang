const mongoose = require('mongoose');
const { isValidObjectId } = require('mongoose');

const supplierInfoSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
    validate: {
      validator: (value) => isValidObjectId(value),
      message: "Invalid supplier ID"
    }
  },
  importPrice: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderQuantity: {
    type: Number,
    min: 1,
    default: 1
  },
  leadTime: {
    type: Number,
    min: 0,
    default: 0
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const discountRuleSchema = new mongoose.Schema({
  daysBeforeExpiry: {
    type: Number,
    required: [true, 'Days before expiry is required'],
    min: [1, 'Days before expiry must be at least 1']
  },
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: {
      values: ["percentage", "fixed_amount"],
      message: "Discount type must be either 'percentage' or 'fixed_amount'"
    }
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative'],
    validate: {
      validator: function(value) {
        if (this.discountType === "percentage") {
          return value <= 100;
        }
        return value <= 1000000000;
      },
      message: function(props) {
        return props.reason.discountType === "percentage" 
          ? "Percentage discount cannot exceed 100%" 
          : "Fixed amount discount cannot exceed 1,000,000,000";
      }
    }
  }
});

const productSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Product name is required'], 
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, 'Category is required'],
      validate: {
        validator: (value) => isValidObjectId(value),
        message: "Invalid category ID"
      }
    },
    description: { 
      type: String, 
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative']
    },
    SKU: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [50, 'SKU cannot exceed 50 characters']
    },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      maxlength: [50, 'Barcode cannot exceed 50 characters']
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      enum: {
        values: [
          "piece", "kg", "g", "liter", "ml", 
          "box", "set", "bottle", "pack", 
          "carton", "pair", "dozen", "meter"
        ],
        message: "Invalid unit type"
      }
    },
    minStockLevel: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    },
    reorderLevel: {
      type: Number,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    },
    weight: {
      type: Number,
      min: 0
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 }
    },
    expiryDiscountRules: {
      type: [discountRuleSchema],
      default: [
        { daysBeforeExpiry: 7, discountType: "percentage", discountValue: 30 },
        { daysBeforeExpiry: 14, discountType: "percentage", discountValue: 15 }
      ],
      validate: {
        validator: function(rules) {
          if (!Array.isArray(rules)) return false;
          const daysSet = new Set();
          for (const rule of rules) {
            if (daysSet.has(rule.daysBeforeExpiry)) {
              return false;
            }
            daysSet.add(rule.daysBeforeExpiry);
          }
          return true;
        },
        message: "Invalid discount rules format or duplicate daysBeforeExpiry"
      }
    },
    images: [{ 
      type: String, 
      trim: true 
    }],
    suppliers: [supplierInfoSchema],
    active: {
      type: Boolean,
      default: true,
    },
    tags: [{
      type: String,
      trim: true
    }],
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    discount: {
      type: {
        type: String,
        enum: ["percentage", "fixed_amount"]
      },
      value: {
        type: Number,
        min: 0
      },
      startDate: Date,
      endDate: Date,
      reason: String
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.pre('save', function(next) {
  if (typeof this.expiryDiscountRules === 'string') {
    try {
      this.expiryDiscountRules = JSON.parse(this.expiryDiscountRules);
    } catch (error) {
      return next(new Error('Invalid expiryDiscountRules format'));
    }
  }

  if (typeof this.suppliers === 'string') {
    try {
      this.suppliers = JSON.parse(this.suppliers);
    } catch (error) {
      return next(new Error('Invalid suppliers format'));
    }
  }
  
  next();
});

productSchema.index({ name: 'text', description: 'text', SKU: 'text', barcode: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ active: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'suppliers.supplier': 1 });

productSchema.virtual('primarySupplier').get(function() {
  return this.suppliers.find(s => s.isPrimary) || this.suppliers[0];
});

productSchema.methods.getDiscountedPrice = function() {
  if (!this.discount || 
      new Date() < this.discount.startDate || 
      new Date() > this.discount.endDate) {
    return this.price;
  }
  
  if (this.discount.type === "percentage") {
    return this.price * (1 - this.discount.value / 100);
  } else {
    return Math.max(0, this.price - this.discount.value);
  }
};

productSchema.pre('remove', async function(next) {
  const Batch = mongoose.model('Batch');
  await Batch.deleteMany({ product: this._id });
  next();
});

module.exports = mongoose.model("Product", productSchema);