const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },
    total_warehouse_stock: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    total_shelf_stock: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    reserved_stock: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    sold_stock: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    last_restocked: { type: Date },
    last_sold: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

inventorySchema.virtual("available_stock").get(function () {
  return Math.max(0, this.total_shelf_stock - this.reserved_stock);
});
inventorySchema.virtual("total_stock").get(function () {
  return this.total_warehouse_stock + this.total_shelf_stock;
});
inventorySchema.virtual("stock_status").get(function () {
  const total = this.total_stock;
  if (total === 0) return "out_of_stock";
  if (this.available_stock <= 5) return "low_stock";
  return "in_stock";
});

inventorySchema.pre("save", function (next) {
  if (this.total_shelf_stock < this.reserved_stock)
    throw new Error("Reserved stock cannot exceed shelf stock");
  if (
    this.total_warehouse_stock < 0 ||
    this.total_shelf_stock < 0 ||
    this.reserved_stock < 0 ||
    this.sold_stock < 0
  )
    throw new Error("Stock quantities cannot be negative");
  next();
});

inventorySchema.index({ product: 1 });
inventorySchema.index({ available_stock: 1 });

module.exports = mongoose.model("Inventory", inventorySchema);
