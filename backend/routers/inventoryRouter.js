const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Thêm hoặc cập nhật tồn kho
router.post('/add-or-update', inventoryController.addOrUpdateInventory);

// Lấy thông tin tồn kho của sản phẩm
router.get('/:productId', inventoryController.getInventoryByProductId);

// Trừ tồn kho khi bán sản phẩm
router.put('/deduct', inventoryController.deductInventory);

module.exports = router;
