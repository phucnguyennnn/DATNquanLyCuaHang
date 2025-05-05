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
    unitPrice: { type: Number, required: true, min: 0 }, // Giá bán trung bình hoặc giá tại thời điểm mua
    batchesUsed: [batchUsedSchema],
    discount: { type: Number, default: 0, min: 0, max: 100 }, // Phần trăm giảm giá thêm (nếu có) cho sản phẩm này
    itemTotal: { type: Number, required: true, min: 0 }, // Tổng tiền của sản phẩm này (sau giảm giá)
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
  paymentMethod: {
    type: String,
    enum: ["cash", "transfer"],
    default: "cash",
  },
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

orderSchema.pre("save", async function (next) {
  if (this.isModified("products") || this.isModified("taxRate")) {
    let totalAmount = 0;
    let discountAmount = 0;

    for (const productItem of this.products) {
      const Product = mongoose.model("Product");
      const product = await Product.findById(productItem.productId);
      if (!product)
        throw new Error(`Không tìm thấy sản phẩm ${productItem.productId}`);

      const unitWithRatio1 = product.units.find((unit) => unit.ratio === 1);
      if (!unitWithRatio1 || unitWithRatio1.salePrice === undefined) {
        throw new Error(
          `Không tìm thấy giá bán cho sản phẩm ${productItem.productId}`
        );
      }
      const originalUnitPrice = unitWithRatio1.salePrice;
      let currentItemTotal = 0;
      let totalBatchDiscountAmount = 0;

      for (const batchUsed of productItem.batchesUsed) {
        const Batch = mongoose.model("Batch");
        const batch = await Batch.findById(batchUsed.batchId);
        if (!batch)
          throw new Error(`Không tìm thấy lô hàng ${batchUsed.batchId}`);

        let batchUnitPrice = originalUnitPrice;
        let batchDiscountAmount = 0;

        if (batch.discountInfo && batch.discountInfo.isDiscounted) {
          if (batch.discountInfo.discountType === "percentage") {
            batchUnitPrice =
              originalUnitPrice * (1 - batch.discountInfo.discountValue / 100);
            batchDiscountAmount =
              originalUnitPrice * (batch.discountInfo.discountValue / 100);
          } else if (batch.discountInfo.discountType === "fixed_amount") {
            batchUnitPrice = Math.max(
              0,
              originalUnitPrice - batch.discountInfo.discountValue
            );
            batchDiscountAmount = originalUnitPrice - batchUnitPrice;
          }
        }
        currentItemTotal += batchUnitPrice * batchUsed.quantity;
        totalBatchDiscountAmount += batchDiscountAmount * batchUsed.quantity;
      } // Tính giá đơn vị trung bình

      productItem.unitPrice = currentItemTotal / productItem.quantity; // Áp dụng giảm giá thêm cho sản phẩm

      const additionalDiscountAmount =
        productItem.unitPrice *
        (productItem.discount / 100) *
        productItem.quantity;
      productItem.itemTotal = currentItemTotal - additionalDiscountAmount;

      totalAmount += originalUnitPrice * productItem.quantity; // Tổng tiền dựa trên giá gốc
      discountAmount += totalBatchDiscountAmount + additionalDiscountAmount;
    }

    this.totalAmount = totalAmount;
    this.discountAmount = discountAmount;
    this.taxAmount = (totalAmount - discountAmount) * this.taxRate; // Tính thuế
    this.finalAmount = totalAmount - discountAmount + this.taxAmount; // Tính tổng tiền cuối cùng
  }

  next();
});

orderSchema.index({ customerId: 1 });
orderSchema.index({ staffId: 1 });
orderSchema.index({ date: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model("Order", orderSchema);
