const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

// Định nghĩa các route
router.post('/', supplierController.createSupplier); 
router.get('/', supplierController.getAllSuppliers); 
router.get('/:id', supplierController.getSupplierById); 
router.put('/:id', supplierController.updateSupplier); 
router.delete('/:id', supplierController.deleteSupplier); 
router.get('/:supplierId/products', supplierController.getProductsBySupplierId);
module.exports = router;