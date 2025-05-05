const express = require("express");
const router = express.Router();
const batchController = require("../controllers/batchController");

// Route để tạo một lô hàng mới
router.post("/", batchController.createBatch);

// Route để lấy tất cả các lô hàng
router.get("/", batchController.getAllBatches);

// Route để lấy một lô hàng theo ID
router.get("/:id", batchController.getBatchById);

// Route để cập nhật một lô hàng theo ID
router.put("/:id", batchController.updateBatch);

// Route để xóa một lô hàng theo ID
router.delete("/:id", batchController.deleteBatch);
// 
router.put("/:id/transfer-to-shelf", batchController.transferToShelf);
module.exports = router;
