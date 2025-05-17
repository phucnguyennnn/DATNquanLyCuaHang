// models/Batch.js
const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    batchCode: {
      type: String,
      unique: true,
      sparse: true,
    },
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
        validate: {
          validator: function (value) {
            if (this.discountInfo?.discountType === 'percentage') {
              return value <= 100;
            }
            return value <= Number.MAX_SAFE_INTEGER;
          },
          message: function (props) {
            return this.discountInfo?.discountType === 'percentage'
              ? 'Percentage discount must be <= 100'
              : `Discount value exceeds maximum allowed`;
          },
        },
        default: 0,
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

batchSchema.pre("save", async function (next) {
  try {
    // Generate batchCode if not provided
    if (!this.batchCode) {
      // Get product code (abbreviated name)
      const Product = mongoose.model('Product');
      const product = await Product.findById(this.product);

      // Use product code or create abbreviation from product name
      let productCode;
      if (product) {
        if (product.code) {
          productCode = product.code;
        } else if (product.name) {
          // Create abbreviation from product name (first letters of each word, max 5 chars)
          productCode = product.name
            .split(/\s+/)
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 5);
        } else {
          productCode = product._id.toString().slice(-4).toUpperCase();
        }
      } else {
        productCode = 'LH';
      }

      // Format date as ddmmyy
      const now = this.createdAt || new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const dateString = `${day}${month}${year}`;

      // Get sequence number
      const Batch = mongoose.model('Batch');
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const count = await Batch.countDocuments({
        product: this.product,
        createdAt: { $gte: todayStart, $lte: todayEnd }
      });

      const sequence = String(count + 1).padStart(3, '0');

      // Create batchCode with format [ProductAbbrev]-[ddmmyy]-[Sequence]
      this.batchCode = `${productCode}-${dateString}-${sequence}`;
    }

    // Add code to fetch associated product to get discount rules
    const daysLeft = this.daysUntilExpiry;

    // Get the product to check its discount rules
    const Product = mongoose.model('Product');
    const product = await Product.findById(this.product);

    if (
      !this.discountInfo.isDiscounted ||
      this.discountInfo.discountReason === "near_expiry"
    ) {
      // Use product-specific discount rules if available
      if (product && product.expiryDiscountRules && Array.isArray(product.expiryDiscountRules) && product.expiryDiscountRules.length > 0) {
        // Sort rules by days in descending order (larger values first)
        const sortedRules = [...product.expiryDiscountRules].sort((a, b) =>
          b.daysBeforeExpiry - a.daysBeforeExpiry
        );

        // Find the applicable rule based on days left
        const applicableRule = sortedRules.find(rule => daysLeft <= rule.daysBeforeExpiry);

        if (applicableRule) {
          this.discountInfo = {
            isDiscounted: true,
            discountType: applicableRule.discountType,
            discountValue: applicableRule.discountValue,
            discountStartDate: new Date(),
            discountEndDate: this.expiry_day,
            discountReason: "near_expiry",
          };
        } else if (
          daysLeft > sortedRules[0]?.daysBeforeExpiry &&
          this.discountInfo.discountReason === "near_expiry"
        ) {
          // Clear discount if days left exceeds the largest threshold
          this.discountInfo.isDiscounted = false;
          this.discountInfo.discountValue = 0;
          this.discountInfo.discountStartDate = undefined;
          this.discountInfo.discountEndDate = undefined;
          this.discountInfo.discountReason = undefined;
        }
      } else {
        // Fall back to default rules if no product-specific rules exist
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
    }
    this.remaining_quantity =
      this.initial_quantity -
      this.sold_quantity -
      this.lost_quantity -
      this.quantity_on_shelf;
    if (this.remaining_quantity < 0)
      return next(new Error("Remaining quantity cannot be negative."));
    if (this.remaining_quantity === 0 && this.initial_quantity > 0 && this.quantity_on_shelf === 0)
      this.status = "hết hàng";
    else if (this.expiry_day < new Date()) this.status = "hết hạn";
    // else if (
    //   this.status === "hoạt động" &&
    //   this.remaining_quantity < this.initial_quantity * 0.2
    // )
    //   this.status = "không hoạt động";
    next();
  } catch (error) {
    return next(error);
  }
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
