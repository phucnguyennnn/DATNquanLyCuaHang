const PaymentService = require('../services/paymentService');
const Order = require('../models/Order');
const { v4: uuidv4 } = require('uuid');

const paymentController = {
    // Tạo thanh toán VNPay
    createVNPayPayment: async (req, res) => {
        try {
            const { orderId, amount, orderInfo } = req.body;
            const ipAddr = req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                '127.0.0.1';

            const paymentUrl = PaymentService.createVNPayPayment(
                orderId,
                amount,
                orderInfo || `Thanh toán đơn hàng ${orderId}`,
                ipAddr
            );

            // Lưu thông tin thanh toán vào database
            await Order.findByIdAndUpdate(orderId, {
                paymentMethod: 'vnpay',
                paymentStatus: 'pending'
            });

            res.status(200).json({
                success: true,
                paymentUrl,
                message: 'Tạo link thanh toán VNPay thành công'
            });
        } catch (error) {
            console.error('Error creating VNPay payment:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi tạo thanh toán VNPay',
                error: error.message
            });
        }
    },

    // Tạo thanh toán MoMo QR
    createMoMoPayment: async (req, res) => {
        try {
            const { orderId, amount, orderInfo } = req.body;

            const momoResponse = await PaymentService.createMoMoQRPayment(
                orderId,
                amount,
                orderInfo || `Thanh toán đơn hàng ${orderId}`
            );

            if (momoResponse.resultCode === 0) {
                // Lưu thông tin thanh toán vào database
                await Order.findByIdAndUpdate(orderId, {
                    paymentMethod: 'momo',
                    paymentStatus: 'pending'
                });

                res.status(200).json({
                    success: true,
                    payUrl: momoResponse.payUrl,
                    qrCodeUrl: momoResponse.qrCodeUrl,
                    deeplink: momoResponse.deeplink,
                    message: 'Tạo thanh toán MoMo thành công'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: momoResponse.message || 'Lỗi khi tạo thanh toán MoMo'
                });
            }
        } catch (error) {
            console.error('Error creating MoMo payment:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi tạo thanh toán MoMo',
                error: error.message
            });
        }
    },

    // Xử lý callback VNPay
    handleVNPayReturn: async (req, res) => {
        try {
            const vnpParams = req.query;
            const isValid = PaymentService.verifyVNPayCallback(vnpParams);

            if (isValid) {
                const orderId = vnpParams.vnp_TxnRef;
                const responseCode = vnpParams.vnp_ResponseCode;

                if (responseCode === '00') {
                    // Thanh toán thành công
                    await Order.findByIdAndUpdate(orderId, {
                        paymentStatus: 'paid',
                        paidAt: new Date(),
                        transactionId: vnpParams.vnp_TransactionNo
                    });

                    res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`);
                } else {
                    // Thanh toán thất bại
                    await Order.findByIdAndUpdate(orderId, {
                        paymentStatus: 'failed'
                    });

                    res.redirect(`${process.env.FRONTEND_URL}/payment/failed?orderId=${orderId}`);
                }
            } else {
                res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
            }
        } catch (error) {
            console.error('Error handling VNPay return:', error);
            res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
        }
    },

    // Xử lý callback MoMo
    handleMoMoReturn: async (req, res) => {
        try {
            const momoParams = req.body;
            const isValid = PaymentService.verifyMoMoCallback(momoParams);

            if (isValid) {
                const orderId = momoParams.orderId;
                const resultCode = momoParams.resultCode;

                if (resultCode === 0) {
                    // Thanh toán thành công
                    await Order.findByIdAndUpdate(orderId, {
                        paymentStatus: 'paid',
                        paidAt: new Date(),
                        transactionId: momoParams.transId
                    });

                    res.status(200).json({ message: 'Success' });
                } else {
                    // Thanh toán thất bại
                    await Order.findByIdAndUpdate(orderId, {
                        paymentStatus: 'failed'
                    });

                    res.status(200).json({ message: 'Failed' });
                }
            } else {
                res.status(400).json({ message: 'Invalid signature' });
            }
        } catch (error) {
            console.error('Error handling MoMo return:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Kiểm tra trạng thái thanh toán
    checkPaymentStatus: async (req, res) => {
        try {
            const { orderId } = req.params;

            const order = await Order.findById(orderId).select('paymentStatus paidAt transactionId');
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng'
                });
            }

            res.status(200).json({
                success: true,
                paymentStatus: order.paymentStatus,
                paidAt: order.paidAt,
                transactionId: order.transactionId
            });
        } catch (error) {
            console.error('Error checking payment status:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi kiểm tra trạng thái thanh toán'
            });
        }
    }
};

module.exports = paymentController;
