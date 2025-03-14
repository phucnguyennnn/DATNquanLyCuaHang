const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');

router.post('/', batchController.createBatch);

router.get('/', batchController.getAllBatches);

router.put('/:id', batchController.updateBatch);

router.delete('/:id', batchController.deleteBatch);

router.get('/:id', batchController.getBatchById);

module.exports = router;
