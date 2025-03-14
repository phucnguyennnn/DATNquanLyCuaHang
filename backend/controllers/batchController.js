const Batch = require('../models/Batch');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

exports.createBatch = async (req, res) => {
    try {
        const { manufacture_day, expiry_day, quantity, status, supplierName, productName } = req.body;

        const supplier = await Supplier.findOne({ name: supplierName });
        if (!supplier) {
            return res.status(400).json({ message: 'Nhà cung cấp không tồn tại' });
        }

        const product = await Product.findOne({ name: productName });
        if (!product) {
            return res.status(400).json({ message: 'Sản phẩm không tồn tại' });
        }

        if (new Date(manufacture_day) >= new Date(expiry_day)) {
            return res.status(400).json({ message: 'Ngày sản xuất phải trước ngày hết hạn' });
        }

        if (quantity <= 0) {
            return res.status(400).json({ message: 'Số lượng phải lớn hơn 0' });
        }

        const newBatch = new Batch({
            manufacture_day,
            expiry_day,
            quantity,
            status,
            supplierId: {
                _id: supplier._id,
                name: supplier.name,
            },
            productId: {
                _id: product._id,
                name: product.name,
            },
        });

        await newBatch.save();
        product.batches.push(newBatch._id);
        await product.save();
        res.status(201).json(newBatch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllBatches = async (req, res) => {
    try {
        const batches = await Batch.find()
            .populate('supplierId', 'name')
            .populate('productId', 'name');

        res.status(200).json(batches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateBatch = async (req, res) => {
    try {
        const updatedBatch = await Batch.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedBatch) return res.status(404).json({ message: 'Lô hàng không tồn tại' });
        res.status(200).json(updatedBatch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteBatch = async (req, res) => {
    try {
        const deletedBatch = await Batch.findByIdAndDelete(req.params.id);
        if (!deletedBatch) return res.status(404).json({ message: 'Lô hàng không tồn tại' });
        res.status(200).json({ message: 'Lô hàng đã được xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getBatchById = async (req, res) => {
    try {
        const batchId = req.params.id;

        const batch = await Batch.findById(batchId)
            .populate('supplierId', 'name')
            .populate('productId', 'name');

        if (!batch) {
            return res.status(404).json({ message: 'Batch không tồn tại' });
        }

        res.status(200).json(batch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};




