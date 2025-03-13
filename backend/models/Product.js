const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({

    name: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String },
    price: { type: Number, required: true },
    SKU: { type: String, required: true },
    unit: { type: String, required: true, enum: ['pcs', 'kg', 'liter', 'box', 'set'] },  // Trường đơn vị tính
    image: [{ type: String }],
    batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }]



}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
