const mongoose = require("mongoose");

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
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
    unit: {
      type: String,
      required: true,
      enum: ["thùng", "bao", "chai", "lọ", "hộp", "gói", "cái", "kg", "liter"],
      default: "thùng",
    },
    conversionRate: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    note: { type: String, default: "", maxlength: 200 },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, required: false },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: { type: String },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "approved",
        "partially_received",
        "completed",
        "cancelled",
      ],
      default: "draft",
    },
    items: [purchaseOrderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    orderDate: { type: Date, default: Date.now, required: true },
    expectedDeliveryDate: {
      type: Date,
      validate: {
        validator: function (value) {
          if (!value || !this.orderDate) return true;
          return value.getTime() > this.orderDate.getTime();
        },
        message: "Expected delivery date must be after order date",
      },
    },
    notes: { type: String, maxlength: 500 },
    attachments: [{ type: String }],
    deliveryAddress: { type: String },
    paymentMethod: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

purchaseOrderSchema.index({ orderNumber: 1 });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);