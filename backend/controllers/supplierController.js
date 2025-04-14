const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createSupplier = async (req, res) => {
    try {
        const { name, description, company, taxId, address, contact, paymentTerms, bankDetails, isActive } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required.' });
        }

        const existingSupplier = await Supplier.findOne({ name });
        if (existingSupplier) {
            return res.status(400).json({ message: 'Supplier with this name already exists.' });
        }

        const newSupplier = new Supplier({
            name,
            description,
            company,
            taxId,
            address,
            contact,
            paymentTerms,
            bankDetails,
            isActive: isActive !== undefined ? isActive : true
        });

        await newSupplier.save();

        return res.status(201).json({
            message: 'Supplier created successfully.',
            supplier: newSupplier
        });
    } catch (error) {
        console.error('Create supplier error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.',
            error: error.message 
        });
    }
};

const getAllSuppliers = async (req, res) => {
    try {
        const { active, search } = req.query;
        let query = {};

        if (active !== undefined) {
            query.isActive = active === 'true';
        }

        if (search) {
            query.$text = { $search: search };
        }

        const suppliers = await Supplier.find(query)
            .select('-__v')
            .sort({ name: 1 });

        return res.status(200).json(suppliers);
    } catch (error) {
        console.error('Get suppliers error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.',
            error: error.message 
        });
    }
};

const getSupplierById = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid supplier ID format.' });
        }

        const supplier = await Supplier.findById(req.params.id)
            .populate({
                path: 'products',
                select: 'name SKU price active',
                match: { active: true }
            });

        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }

        return res.status(200).json(supplier);
    } catch (error) {
        console.error('Get supplier by ID error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.',
            error: error.message 
        });
    }
};

const updateSupplier = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid supplier ID format.' });
        }

        const { name, ...updateData } = req.body;

        if (name) {
            const existingSupplier = await Supplier.findOne({ name, _id: { $ne: req.params.id } });
            if (existingSupplier) {
                return res.status(400).json({ message: 'Supplier with this name already exists.' });
            }
            updateData.name = name;
        }

        const updatedSupplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedSupplier) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }

        return res.status(200).json({
            message: 'Supplier updated successfully.',
            supplier: updatedSupplier
        });
    } catch (error) {
        console.error('Update supplier error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.',
            error: error.message 
        });
    }
};

const toggleSupplierStatus = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid supplier ID format.' });
        }

        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }

        supplier.isActive = !supplier.isActive;
        await supplier.save();

        return res.status(200).json({
            message: `Supplier ${supplier.isActive ? 'activated' : 'deactivated'} successfully.`,
            supplier
        });
    } catch (error) {
        console.error('Toggle supplier status error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.',
            error: error.message 
        });
    }
};

const deleteSupplier = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid supplier ID format.' });
        }

        const productsWithSupplier = await Product.countDocuments({
            'suppliers.supplier': req.params.id
        });

        if (productsWithSupplier > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete supplier. There are products associated with this supplier.',
                associatedProductsCount: productsWithSupplier
            });
        }

        const deletedSupplier = await Supplier.findByIdAndDelete(req.params.id);
        if (!deletedSupplier) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }

        return res.status(200).json({
            message: 'Supplier deleted successfully.',
            supplier: deletedSupplier
        });
    } catch (error) {
        console.error('Delete supplier error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.',
            error: error.message 
        });
    }
};

const getProductsBySupplier = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid supplier ID format.' });
        }

        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }

        const products = await Product.find({ 'suppliers.supplier': req.params.id })
            .select('name SKU price active category')
            .populate('category', 'name');

        return res.status(200).json({
            count: products.length,
            products
        });
    } catch (error) {
        console.error('Get products by supplier error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.',
            error: error.message 
        });
    }
};

module.exports = {
    createSupplier,
    getAllSuppliers,
    getSupplierById,
    updateSupplier,
    toggleSupplierStatus,
    deleteSupplier,
    getProductsBySupplier
};