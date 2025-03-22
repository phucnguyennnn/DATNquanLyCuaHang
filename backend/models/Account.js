const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['admin', 'employee', 'customer'], // Giới hạn các giá trị hợp lệ
        default: 'customer', // Mặc định là 'customer'
    },
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);