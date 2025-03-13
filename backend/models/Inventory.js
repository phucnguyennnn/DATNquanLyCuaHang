const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    warehouse_stock: { type: Number, default: 0 },
    shelf_stock: { type: Number, default: 0 },
    total_stock: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
