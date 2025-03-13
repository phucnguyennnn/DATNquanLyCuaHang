const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // customerId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Customer',
    //     required: true
    // },
    // total_amount: { type: Number, required: true },
    // employeeId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Employee',
    //     required: true
    // },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
