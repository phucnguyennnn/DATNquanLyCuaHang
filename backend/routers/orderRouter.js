const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// Apply protect middleware to all routes in this router
router.use(protect);
// Apply restrictTo middleware to all routes in this router, allowing only 'admin' and 'employee'
// Route để tạo đơn hàng
router.post("/", orderController.createOrder);

// Route để lấy danh sách tất cả các đơn hàng
router.get("/", orderController.getAllOrders);

// Route để lấy thông tin chi tiết của một đơn hàng theo ID
router.get("/:orderId", orderController.getOrderById);

module.exports = router;
