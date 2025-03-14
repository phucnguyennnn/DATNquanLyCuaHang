const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({

    manufacture_day: { type: Date, required: true },
    expiry_day: { type: Date, required: true },
    quantity: { type: Number, required: true },
    status: { type: String, enum: ['active', 'inactive'], required: true },

    supplierId: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
        name: { type: String, required: true }
    },
    productId: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true }
    },
    goodReceiptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GoodReceipt'
    }
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);
