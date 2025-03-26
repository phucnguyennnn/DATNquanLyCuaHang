const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    address: { type: String },
    contact: {
        phone: { type: String, match: /^[0-9]{10}$/ }, 
        email: { type: String, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
    },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }] 
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);