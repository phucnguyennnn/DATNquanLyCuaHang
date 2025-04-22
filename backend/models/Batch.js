const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    manufacture_day: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value <= new Date();
        },
        message: "Manufacture date cannot be in the future"
      }
    },
    expiry_day: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.manufacture_day;
        },
        message: "Expiry date must be after manufacture date.",
      },
    },
    initial_quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    },
    remaining_quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    },
    status: {
      type: String,
      enum: ["active", "inactive", "expired", "sold_out"],
      default: "active",
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    goodReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoodReceipt",
      required: true
    },
    import_price: {
      type: Number,
      required: true,
      min: 0
    },
    discountInfo: {
      isDiscounted: {
        type: Boolean,
        default: false
      },
      discountType: {
        type: String,
        enum: ["percentage", "fixed_amount"],
        default: "percentage"
      },
      discountValue: {
        type: Number,
        min: 0,
        max: function () {
          return this.discountType === "percentage" ? 100 : Number.MAX_SAFE_INTEGER;
        }
      },
      discountStartDate: Date,
      discountEndDate: Date,
      discountReason: {
        type: String,
        enum: ["near_expiry", "promotion", "other"],
        default: "near_expiry"
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for days until expiry
batchSchema.virtual('daysUntilExpiry').get(function () {
  const diffTime = Math.abs(this.expiry_day - new Date());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Auto-apply discount when nearing expiry
batchSchema.pre("save", function (next) {
  // Only apply if not already discounted or current discount is for near expiry
  if (!this.discountInfo.isDiscounted || this.discountInfo.discountReason === "near_expiry") {
    const daysLeft = this.daysUntilExpiry;

    if (daysLeft <= 7) { // 1 week before expiry
      this.discountInfo = {
        isDiscounted: true,
        discountType: "percentage",
        discountValue: 30, // 30% discount
        discountStartDate: new Date(),
        discountEndDate: this.expiry_day,
        discountReason: "near_expiry"
      };
    } else if (daysLeft <= 14) { // 2 weeks before expiry
      this.discountInfo = {
        isDiscounted: true,
        discountType: "percentage",
        discountValue: 15, // 15% discount
        discountStartDate: new Date(),
        discountEndDate: this.expiry_day,
        discountReason: "near_expiry"
      };
    }
  }

  // Update status based on conditions
  if (this.remaining_quantity === 0) {
    this.status = "sold_out";
  } else if (this.expiry_day < new Date()) {
    this.status = "expired";
  } else if (this.status === "active" && this.remaining_quantity < this.initial_quantity * 0.2) {
    this.status = "inactive";
  }

  next();
});

// Method to get discounted price
batchSchema.methods.getDiscountedPrice = function (originalPrice) {
  if (!this.discountInfo.isDiscounted ||
    new Date() < this.discountInfo.discountStartDate ||
    new Date() > this.discountInfo.discountEndDate) {
    return originalPrice;
  }

  if (this.discountInfo.discountType === "percentage") {
    return originalPrice * (1 - this.discountInfo.discountValue / 100);
  } else {
    return Math.max(0, originalPrice - this.discountInfo.discountValue);
  }
};

// Indexes
batchSchema.index({ product: 1, status: 1 });
batchSchema.index({ expiry_day: 1 });
batchSchema.index({ "discountInfo.isDiscounted": 1 });

module.exports = mongoose.model("Batch", batchSchema);