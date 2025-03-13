const mongoose = require('mongoose');

const orderDetailSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }]
}, { timestamps: true });

module.exports = mongoose.model('OrderDetail', orderDetailSchema);
