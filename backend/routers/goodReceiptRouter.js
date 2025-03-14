const express = require("express");
const router = express.Router();
const goodReceiptController = require("../controllers/goodReceiptController");

// Xác nhận nhập kho
router.patch("/confirm/:id", goodReceiptController.confirmGoodReceipt);

// Tạo thủ công (nếu cần)
router.post("/", goodReceiptController.createGoodReceipt);

// Lấy danh sách tất cả phiếu nhập kho
router.get("/", goodReceiptController.getAllGoodReceipts);

// Lấy chi tiết một phiếu nhập kho theo ID
router.get("/:id", goodReceiptController.getGoodReceiptById);

module.exports = router;
