const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    address: { type: String },
    contact: {
        phone: { type: String },
        email: { type: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
