const express = require('express');
const router = express.Router();
const productController = require('../controllers/productControlller');
const upload = require('../middlewares/upload');

// Định nghĩa các route
router.get('/', productController.getAllProducts); // Lấy danh sách sản phẩm active
router.get('/product/all', productController.getAll); // Lấy tất cả sản phẩm (cả active và inactive)
router.get('/:id', productController.getProductById); // Lấy chi tiết sản phẩm theo ID
router.post('/', upload.array('images', 5), productController.createProduct); // Tạo mới sản phẩm
router.patch('/:id', upload.array('images', 5), productController.updateProduct); // Cập nhật sản phẩm
router.delete('/:id', productController.deleteProduct); // Xóa (ẩn) sản phẩm

module.exports = router;