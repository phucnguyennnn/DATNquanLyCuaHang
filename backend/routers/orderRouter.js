const express = require("express");
const orderController = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Tạo đơn hàng
router.post("/create", orderController.createOrder);

// Lấy chi tiết đơn hàng theo ID
router.get("/:orderId", orderController.getOrderById);

// Cập nhật trạng thái đã thanh toán
router.put(
  "/:orderId/payment-success",
  protect,
  orderController.processPaymentSuccess
);

// Lấy danh sách đơn hàng
router.get("/", protect, orderController.getAllOrders);

// Hủy đơn hàng
router.put("/:orderId/cancel", protect, orderController.cancelOrder);

// Tạo đơn hàng chờ
router.post("/hold", protect, orderController.holdOrder);

// Tiếp tục đơn hàng chờ
router.put("/:orderId/resume", protect, orderController.resumeOrder);

// Ghi nhận đặt cọc
router.put("/:orderId/deposit", protect, orderController.recordDeposit);

// Xử lý thanh toán trực tuyến thành công
router.put(
  "/:orderId/online-payment-success",
  orderController.processOnlinePaymentSuccess
);

module.exports = router;
