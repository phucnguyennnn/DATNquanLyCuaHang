const Batch = require('../models/Batch');

exports.createBatch = async (req, res) => {
    try {
        const { manufacture_day, expiry_day, quantity, status, supplierName, productId } = req.body;

        // Tìm nhà cung cấp theo tên
        const supplier = await Supplier.findOne({ name: supplierName });
        if (!supplier) {
            return res.status(400).json({ message: 'Nhà cung cấp không tồn tại' });
        }

        // Kiểm tra sản phẩm có tồn tại không
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(400).json({ message: 'Sản phẩm không tồn tại' });
        }

        // Tạo Batch mới với supplierId lấy từ tên nhà cung cấp
        const newBatch = new Batch({
            manufacture_day,
            expiry_day,
            quantity,
            status,
            supplierId: supplier._id,  // Lưu supplierId
            productId,
        });

        await newBatch.save();
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
        res.status(200).json({ message: 'Lô hàng đã được xóa thành công' }); // Trả về thông báo xóa thành công
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

