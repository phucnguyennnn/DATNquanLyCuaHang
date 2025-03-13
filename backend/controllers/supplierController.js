const Supplier = require('../models/Supplier');


exports.createSupplier = async (req, res) => {
    try {
        const { name, description, address, contact } = req.body;

        const newSupplier = new Supplier({
            name,
            description,
            address,
            contact
        });

        await newSupplier.save();
        res.status(201).json(newSupplier); // Trả về nhà cung cấp mới
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getAllSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find();
        res.status(200).json(suppliers); // Trả về danh sách nhà cung cấp
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.updateSupplier = async (req, res) => {
    try {
        const updatedSupplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedSupplier) return res.status(404).json({ message: 'Nhà cung cấp không tồn tại' });
        res.status(200).json(updatedSupplier); // Trả về nhà cung cấp đã cập nhật
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.deleteSupplier = async (req, res) => {
    try {
        const deletedSupplier = await Supplier.findByIdAndDelete(req.params.id);
        if (!deletedSupplier) return res.status(404).json({ message: 'Nhà cung cấp không tồn tại' });
        res.status(200).json({ message: 'Nhà cung cấp đã được xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
