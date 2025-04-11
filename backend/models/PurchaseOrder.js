const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            unit: {
                type: String,
                required: true,
                enum: ['thùng', 'bao', 'chai', 'lọ', 'hộp', 'gói', 'cái'],
                default: 'thùng'
                // ví dụ: 'thùng', 'bao', 'chai'
            },
            conversionRate: {
                type: Number,
                required: true,
                // tỷ lệ quy đổi sang đơn vị nhỏ nhất, ví dụ: 1 thùng = 24 gói → 24
            },
            unitPrice: {
                type: Number,
                required: true,
                // giá nhập theo đơn vị lớn, ví dụ: giá 1 thùng
            },
            note: {
                type: String,
                default: ''
            }
        }
    ],
    totalPrice: {
        type: Number,
        required: true
    },
    orderDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
