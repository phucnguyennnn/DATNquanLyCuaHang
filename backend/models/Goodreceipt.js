const mongoose = require('mongoose');

const goodReceiptSchema = new mongoose.Schema({
    purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    receiptDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['draft', 'received'],
        default: 'draft' // hoặc 'received' khi đã nhập kho hoàn chỉnh
    },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        manufacture_day: { type: Date, required: true },
        expiry_day: { type: Date, required: true }
    }]
}, { timestamps: true });

module.exports = mongoose.model('GoodReceipt', goodReceiptSchema);
