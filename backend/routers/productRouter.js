const express = require('express');
const router = express.Router();
const productController = require('../controllers/productControlller');
const upload = require('../middlewares/upload');

// Định nghĩa các route
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', upload.array('images', 5), productController.createProduct); 
router.put('/:id', upload.array('images', 5), productController.updateProduct); 
router.delete('/:id', productController.deleteProduct);

module.exports = router;