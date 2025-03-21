const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderDetailID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderDetail",
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        default: null  // Có thể không có khách hàng
    },
    totalAmount: {
        type: Number,
        required: true
    },
    employeeID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
