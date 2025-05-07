const mongoose = require("mongoose");

const batchUsedSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} không phải là số nguyên",
      },
    },
  },
  { _id: false }
);

const orderProductSchema = new mongoose.Schema(
  {
    productId: {
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
        message: "{VALUE} không phải là số nguyên",
      },
    },
    selectedUnitName: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 }, // Thêm trường unitPrice
    batchesUsed: [batchUsedSchema],
    discount: { type: Number, default: 0, min: 0, max: 100 },
    itemTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);
const orderSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  products: [orderProductSchema],
  totalAmount: { type: Number, required: true, min: 0 }, // Tổng tiền trước giảm giá
  discountAmount: { type: Number, default: 0, min: 0 }, // Tổng số tiền giảm giá cho toàn đơn hàng
  taxRate: { type: Number, default: 0, min: 0 }, // Tỷ lệ thuế, mặc định là 0
  taxAmount: { type: Number, default: 0, min: 0 }, // Số tiền thuế, mặc định là 0
  finalAmount: { type: Number, required: true, min: 0 }, // Tổng tiền khách phải trả
    orderNumber: { type: String, unique: true },
  paymentMethod: {
    type: String,
    enum: ["cash", "transfer"],
    default: "cash",
  },
  //them trương thanh tien
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "unpaid", "deposit"],
    default: "pending",
  },
  depositAmount: { type: Number, default: 0, min: 0 },
  notes: { type: String, trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
orderSchema.index({ customerId: 1 });
orderSchema.index({ staffId: 1 });
orderSchema.index({ date: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model("Order", orderSchema);
