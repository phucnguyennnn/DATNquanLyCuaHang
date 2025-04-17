const express = require("express");
const router = express.Router();
const goodReceiptController = require("../controllers/goodReceiptController");
const { protect, restrictTo } = require("../middlewares/authmiddleware");

// Route để tạo phiếu nhập kho từ phiếu đặt hàng (Admin only)
router.post(
  "/from-purchase-order/:purchaseOrderId",
  protect,
  restrictTo("admin"),
  goodReceiptController.createGoodReceiptFromPurchaseOrder
);

// Route để xác nhận phiếu nhập kho và tạo lô hàng (Admin only)
router.patch(
  "/confirm/:id",
  protect,
  restrictTo("admin"),
  goodReceiptController.confirmGoodReceipt
);

// Route để lấy tất cả phiếu nhập kho (Authenticated users)
router.get("/", protect, goodReceiptController.getAllGoodReceipts);

// Route để lấy chi tiết phiếu nhập kho theo ID (Authenticated users)
router.get("/:id", protect, goodReceiptController.getGoodReceiptById);

module.exports = router;