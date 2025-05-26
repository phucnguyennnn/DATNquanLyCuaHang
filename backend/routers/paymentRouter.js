const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Tạo thanh toán VNPay
router.post('/vnpay/create', authenticateToken, paymentController.createVNPayPayment);

// Tạo thanh toán MoMo
router.post('/momo/create', authenticateToken, paymentController.createMoMoPayment);

// Callback VNPay
router.get('/vnpay-return', paymentController.handleVNPayReturn);

// Callback MoMo
router.post('/momo-ipn', paymentController.handleMoMoReturn);

// Kiểm tra trạng thái thanh toán
router.get('/status/:orderId', authenticateToken, paymentController.checkPaymentStatus);

module.exports = router;
