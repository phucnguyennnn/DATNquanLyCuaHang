const express = require('express');
const router = express.Router();
const productController = require('../controllers/productControlller');
const upload = require('../middlewares/upload');
const { protect, restrictTo } = require('../middlewares/authmiddleware');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Admin protected routes
router.use(protect, restrictTo('admin'));

router.post('/', upload.array('images', 5), productController.createProduct);
router.get('/all/products', productController.getAll);
router.patch('/:id', upload.array('images', 5), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.get('/:id/inventory', productController.getProductInventory);
router.get('/:id/batches', productController.getProductBatches);

module.exports = router;