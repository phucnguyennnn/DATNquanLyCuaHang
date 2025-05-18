const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
// Apply protect middleware to all routes in this router
router.use(protect);
// Apply restrictTo middleware to all routes in this router, allowing only 'admin' and 'employee'
router.use(restrictTo("admin", "employee"));

router.post("/", (req, res) => {
  req.body.orderType = req.body.orderType || "instore";
  orderController.createOrder(req, res);
});

router.get("/", orderController.getAllOrders);
router.get("/:orderId", orderController.getOrderById);
router.put("/:orderId", orderController.updateOrder); // Route cập nhật đơn hàng
router.post("/cart", orderController.createOrderFromCart); // Route tạo đơn hàng từ giỏ hàng
router.post(
  "/:orderId/payment/online",
  orderController.processOnlinePaymentSuccess
); //đổi tên route
router.post("/:orderId/payment/cash", orderController.processCashPayment); //đổi tên route
router.post("/:orderId/change", orderController.calculateChange); // Route tính tiền thừa
router.put("/:orderId/cancel", orderController.cancelOrder);
router.post("/:orderId/hold", orderController.holdOrder);
router.post("/:orderId/resume", orderController.resumeOrder);
router.post("/:orderId/deposit", orderController.recordDeposit);

module.exports = router;
