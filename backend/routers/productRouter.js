const express = require('express');
const router = express.Router();
const productController = require('../controllers/productControlller');
const upload = require('../middlewares/upload');

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.post('/products', upload.single('image'), productController.createProduct);


module.exports = router;
