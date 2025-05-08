// models/Batch.js
const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    manufacture_day: {
      type: Date,
      required: true,
      validate: {
        validator: (value) => value <= new Date(),
        message: "Manufacture date cannot be in the future",
      },
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
        message: "{VALUE} is not an integer value",
      },
    },
    remaining_quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    sold_quantity: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    lost_quantity: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    quantity_on_shelf: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    status: {
      type: String,
      enum: ["hoạt động", "không hoạt động", "hết hạn", "hết hàng"],
      default: "hoạt động",
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
      index: true,
    },
    goodReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoodReceipt",
      required: true,
    },
    discountInfo: {
      isDiscounted: { type: Boolean, default: false },
      discountType: {
        type: String,
        enum: ["percentage", "fixed_amount"],
        default: "percentage",
      },
      discountValue: {
        type: Number,
        min: 0,
        max: function () {
          return this.discountType === "percentage"
            ? 100
            : Number.MAX_SAFE_INTEGER
        },
        validate: {
          validator: function (value) {
            if (this.discountType === 'percentage') {
              return value <= 100
            }
            return true
          },
          message: 'Percentage discount must be <= 100'
        }
      },
      discountStartDate: Date,
      discountEndDate: Date,
      discountReason: {
        type: String,
        enum: ["near_expiry", "promotion", "other"],
        default: "near_expiry",
      },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

batchSchema.virtual("daysUntilExpiry").get(function () {
  const diffTime = Math.abs(this.expiry_day - new Date());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

batchSchema.pre("save", function (next) {
  // Generate batchCode if not provided
  if (!this.batchCode) {
    const randomCode = Math.random().toString(36).substring(2, 9).toUpperCase();
    this.batchCode = `BATCH-${Date.now()}-${randomCode}`;
  }

  const daysLeft = this.daysUntilExpiry;
  if (
    !this.discountInfo.isDiscounted ||
    this.discountInfo.discountReason === "near_expiry"
  ) {
    if (daysLeft <= 7) {
      this.discountInfo = {
        isDiscounted: true,
        discountType: "percentage",
        discountValue: 30,
        discountStartDate: new Date(),
        discountEndDate: this.expiry_day,
        discountReason: "near_expiry",
      };
    } else if (daysLeft <= 14 && daysLeft > 7) {
      this.discountInfo = {
        isDiscounted: true,
        discountType: "percentage",
        discountValue: 15,
        discountStartDate: new Date(),
        discountEndDate: this.expiry_day,
        discountReason: "near_expiry",
      };
    } else if (
      daysLeft > 14 &&
      this.discountInfo.discountReason === "near_expiry"
    ) {
      this.discountInfo.isDiscounted = false;
      this.discountInfo.discountValue = 0;
      this.discountInfo.discountStartDate = undefined;
      this.discountInfo.discountEndDate = undefined;
      this.discountInfo.discountReason = undefined;
    }
  }
  this.remaining_quantity =
    this.initial_quantity -
    this.sold_quantity -
    this.lost_quantity -
    this.quantity_on_shelf;
  if (this.remaining_quantity < 0)
    return next(new Error("Remaining quantity cannot be negative."));
  if (this.remaining_quantity === 0 && this.initial_quantity > 0)
    this.status = "hết hàng";
  else if (this.expiry_day < new Date()) this.status = "hết hạn";
  else if (
    this.status === "hoạt động" &&
    this.remaining_quantity < this.initial_quantity * 0.2
  )
    this.status = "không hoạt động";
  next();
});

batchSchema.methods.getDiscountedPrice = function (originalPrice) {
  if (this.discountInfo.isDiscounted) {
    if (this.discountInfo.discountType === "percentage") {
      return originalPrice * (1 - this.discountInfo.discountValue / 100);
    } else if (this.discountInfo.discountType === "fixed_amount") {
      return Math.max(0, originalPrice - this.discountInfo.discountValue);
    }
  }
  return originalPrice;
};

batchSchema.index({ expiry_day: 1 });
batchSchema.index({ "discountInfo.isDiscounted": 1 });
batchSchema.index({ batchCode: 1, unique: true });
batchSchema.index({ product: 1 });

module.exports = mongoose.model("Batch", batchSchema);
