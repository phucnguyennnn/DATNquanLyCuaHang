const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');


router.post('/', supplierController.createSupplier);

router.get('/', supplierController.getAllSuppliers);

router.put('/:id', supplierController.updateSupplier);

router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
