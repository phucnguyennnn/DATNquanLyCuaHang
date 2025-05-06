const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// Apply protect middleware to all routes in this router
router.use(protect);

// Apply restrictTo middleware to all routes in this router, allowing only 'admin' and 'employee'
router.use(restrictTo('admin', 'employee'));

// Routes for Order Management (now relative to /api/orders)
router.post("/", orderController.createOrder);
router.get("/:orderId", orderController.getOrderById);
router.post("/:orderId/payment/success", orderController.processPaymentSuccess);
router.get("/", orderController.getAllOrders);
router.put("/:orderId/cancel", orderController.cancelOrder);
router.put("/:orderId/hold", orderController.holdOrder);
router.put("/:orderId/resume", orderController.resumeOrder);
router.put("/:orderId/add-item", orderController.addItemToHoldOrder);
router.put("/:orderId/deposit", orderController.recordDeposit);
router.post("/deposit/from-cart", orderController.createDepositOrderFromCart);
router.post(
  "/:orderId/payment/online/success",
  orderController.processOnlinePaymentSuccess
);
router.post("/:orderId/payment/cash", orderController.processCashPayment);
router.post("/:orderId/change", orderController.calculateChange);

module.exports = router;
