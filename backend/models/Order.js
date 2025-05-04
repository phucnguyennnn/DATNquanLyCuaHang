const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    appliedDiscount: {
      type: {
        type: String,
        enum: ["product", "batch", "promotion", "manual"],
      },
      value: {
        type: Number,
        min: 0,
      },
      description: String,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customerDetails: {
      name: {
        type: String,
        trim: true,
        required: function () {
          return !this.customer;
        },
      },
      phone: {
        type: String,
        trim: true,
        required: function () {
          return !this.customer;
        },
      },
      email: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "cancelled",
        "refunded",
        "pending_hold",
        "deposit",
      ],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "credit_card",
        "debit_card",
        "bank_transfer",
        "ewallet",
        "other",
      ],
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "refunded", "failed"],
      default: "pending",
    },
    depositAmount: {
      // Thêm trường cho tiền đặt cọc
      type: Number,
      default: 0,
      min: 0,
    },
    items: [orderItemSchema],
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    shippingInfo: {
      method: String,
      trackingNumber: String,
      estimatedDelivery: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate order number before saving
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const Order = mongoose.model("Order");
    const count = await Order.countDocuments();
    this.orderNumber = `ORD-${(count + 1).toString().padStart(6, "0")}`;
  }
  next();
});

// Calculate prices and discounts before saving
orderSchema.pre("save", async function (next) {
  if (this.isModified("items")) {
    const Product = mongoose.model("Product");
    const Batch = mongoose.model("Batch");

    let totalAmount = 0;
    let totalDiscount = 0;

    for (const item of this.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product ${item.product} not found`);
      }

      item.originalPrice = product.price;

      if (item.batch) {
        const batch = await Batch.findById(item.batch);
        if (!batch) {
          throw new Error(`Batch ${item.batch} not found`);
        }

        item.unitPrice = product.getBatchDiscountedPrice(batch);

        if (batch.discountInfo && batch.discountInfo.isDiscounted) {
          const discountAmount = product.price - item.unitPrice;
          item.appliedDiscount = {
            type: "batch",
            value: batch.discountInfo.discountValue,
            description: `Giảm giá ${batch.discountInfo.discountValue}${
              batch.discountInfo.discountType === "percentage" ? "%" : "đ"
            } do ${batch.discountInfo.reason} (còn ${
              batch.daysUntilExpiry
            } ngày)`,
          };
          totalDiscount += discountAmount * item.quantity;
        }
      } else {
        item.unitPrice = product.getDiscountedPrice();

        if (product.discount && product.discount.isActive) {
          const discountAmount = product.price - item.unitPrice;
          item.appliedDiscount = {
            type: "product",
            value: product.discount.value,
            description: `Giảm giá sản phẩm ${product.discount.value}${
              product.discount.type === "percentage" ? "%" : "đ"
            } (${product.discount.name})`,
          };
          totalDiscount += discountAmount * item.quantity;
        }
      }

      item.totalPrice = item.unitPrice * item.quantity;
      totalAmount += item.originalPrice * item.quantity;
    }

    this.totalAmount = totalAmount;
    this.totalDiscount = totalDiscount;
    this.finalAmount =
      totalAmount - totalDiscount + this.taxAmount + this.shippingFee;
  }

  next();
});

// Update batch quantities when order status changes
orderSchema.pre("save", async function (next) {
  if (this.isModified("status")) {
    const Batch = mongoose.model("Batch");

    if (
      this.status === "completed" &&
      this.previous("status") !== "completed"
    ) {
      for (const item of this.items) {
        if (item.batch) {
          await Batch.findByIdAndUpdate(item.batch, {
            $inc: { remaining_quantity: -item.quantity },
          });
        }
      }
    } else if (
      this.status === "cancelled" &&
      this.previous("status") === "completed"
    ) {
      for (const item of this.items) {
        if (item.batch) {
          await Batch.findByIdAndUpdate(item.batch, {
            $inc: { remaining_quantity: item.quantity },
          });
        }
      }
    }
  }
  next();
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "customerDetails.phone": 1 });

module.exports = mongoose.model("Order", orderSchema);
