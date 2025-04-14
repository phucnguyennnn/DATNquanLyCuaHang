const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// API cho giỏ hàng
router.post('/', cartController.createOrUpdateCart);
router.get('/', cartController.getCart);
router.delete('/:productId',cartController.removeFromCart);
router.delete('/', cartController.clearCart);

module.exports = router;