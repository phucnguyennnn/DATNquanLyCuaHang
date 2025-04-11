const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    SKU: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      enum: [
        "piece",
        "kg",
        "liter",
        "box",
        "set",
        "bottle",
        "pack",
        "carton",
        "pair",
      ],
    },
    batches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
      },
    ],
    images: [{ type: String, trim: true }],
    suppliers: [
      {
        _id: false,
        supplier: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Supplier",
          required: true,
        },
        importPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
