const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
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
  unit: {
    type: String,
    required: true,
    enum: ['thùng', 'bao', 'chai', 'lọ', 'hộp', 'gói', 'cái', 'kg', 'liter'],
    default: 'thùng'
  },
  conversionRate: {
    type: Number,
    required: true,
    min: 1
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
  receivedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  note: {
    type: String,
    default: '',
    maxlength: [200, 'Note cannot exceed 200 characters']
  }
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'partially_received', 'completed', 'cancelled'],
    default: 'draft'
  },
  items: [purchaseOrderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  orderDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  expectedDeliveryDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return value > this.orderDate;
      },
      message: 'Expected delivery date must be after order date'
    }
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  attachments: [{
    type: String
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate order number before saving
purchaseOrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const PurchaseOrder = mongoose.model('PurchaseOrder');
    const count = await PurchaseOrder.countDocuments();
    this.orderNumber = `PO-${(count + 1).toString().padStart(6, '0')}`;
  }
  
  // Calculate total amount if items are modified
  if (this.isModified('items')) {
    this.totalAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }
  
  next();
});

// Validate that received quantity doesn't exceed ordered quantity
purchaseOrderSchema.pre('save', function(next) {
  for (const item of this.items) {
    if (item.receivedQuantity > item.quantity) {
      throw new Error(`Received quantity cannot exceed ordered quantity for product ${item.product}`);
    }
  }
  next();
});

// Update status based on received quantities
purchaseOrderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    const allReceived = this.items.every(item => item.receivedQuantity === item.quantity);
    const someReceived = this.items.some(item => item.receivedQuantity > 0);
    const noneReceived = this.items.every(item => item.receivedQuantity === 0);
    
    if (allReceived) {
      this.status = 'completed';
    } else if (someReceived && !allReceived) {
      this.status = 'partially_received';
    } else if (noneReceived && this.status === 'partially_received') {
      this.status = 'approved';
    }
  }
  next();
});

// Indexes for better performance
purchaseOrderSchema.index({ orderNumber: 1 });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);