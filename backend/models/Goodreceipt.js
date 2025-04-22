const mongoose = require("mongoose");

const goodReceiptItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value'
    }
  },
  manufactureDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value <= new Date();
      },
      message: "Manufacture date cannot be in the future"
    }
  },
  expiryDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value > this.manufactureDate;
      },
      message: "Expiry date must be after manufacture date"
    }
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  }
});

const goodReceiptSchema = new mongoose.Schema({
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  receiptDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'received', 'partially_received', 'cancelled'],
    default: 'draft'
  },
  items: [goodReceiptItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
goodReceiptSchema.index({ purchaseOrder: 1 });
goodReceiptSchema.index({ supplier: 1 });
goodReceiptSchema.index({ receiptDate: -1 });
goodReceiptSchema.index({ status: 1 });

// Middleware to update inventory when good receipt is completed
goodReceiptSchema.pre('save', async function (next) {
  if (this.isModified('status')) {
    if (this.status === 'received') {
      const Batch = mongoose.model('Batch');
      const Inventory = mongoose.model('Inventory');

      for (const item of this.items) {
        // Create batch for each item - use supplier field, NOT supplierId
        const batch = new Batch({
          product: item.product,
          supplier: this.supplier, // Make sure this is using the correct field name
          manufacture_day: item.manufactureDate,
          expiry_day: item.expiryDate,
          initial_quantity: item.quantity,
          remaining_quantity: item.quantity,
          status: 'active',
          goodReceipt: this._id,
          import_price: item.unitPrice
        });

        const savedBatch = await batch.save();
        item.batch = savedBatch._id;

        // Update inventory
        await Inventory.findOneAndUpdate(
          { product: item.product },
          { $inc: { warehouse_stock: item.quantity } },
          { upsert: true, new: true }
        );
      }
    }
  }
  next();
});

module.exports = mongoose.model('GoodReceipt', goodReceiptSchema);