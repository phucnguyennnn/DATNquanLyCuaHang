const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({

    manufacture_day: {
        type: Date,
        required: true
    },
    expiry_day: {
        type: Date,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'inactive'],
        default: 'active'
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    goodReceiptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GoodReceipt'
    }
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);
