const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 }, 
    SKU: { type: String, required: true, unique: true }, 
    unit: { type: String, required: true, enum: ['pcs', 'kg', 'liter', 'box', 'set'] },
    image: [{ type: String }],
    batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
    suppliers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' }] 
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);