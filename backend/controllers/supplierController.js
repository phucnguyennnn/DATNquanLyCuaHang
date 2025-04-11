const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

const createSupplier = async (req, res) => {
    try {
      const { name, description, address, contact, products = [] } = req.body;
  
      if (!name) {
        return res.status(400).json({ message: 'Name is required.' });
      }
  
      const existing = await Supplier.findOne({ name });
      if (existing) {
        return res.status(400).json({ message: 'Supplier already exists.' });
      }
  
      // Validate product IDs
      const validProductIds = products.filter(id => isValidObjectId(id));
      const existingProducts = await Product.find({ _id: { $in: validProductIds } });
  
      if (existingProducts.length !== validProductIds.length) {
        return res.status(400).json({ message: 'One or more products not found.' });
      }
  
      const newSupplier = new Supplier({
        name,
        description,
        address,
        contact,
        products: validProductIds,
      });
  
      await newSupplier.save();
  
      // Update suppliers field in each product
      await Promise.all(existingProducts.map(async (product) => {
        const alreadyLinked = product.suppliers.find(s => s.supplier.toString() === newSupplier._id.toString());
        if (!alreadyLinked) {
          product.suppliers.push({ supplier: newSupplier._id, importPrice: 0 }); // default importPrice = 0
          await product.save();
        }
      }));
  
      return res.status(201).json({ message: 'Supplier created.', supplier: newSupplier });
    } catch (error) {
      console.error('Create supplier error:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };
  
  const getAllSuppliers = async (req, res) => {
    try {
      const suppliers = await Supplier.find().populate('products', 'name');
      return res.status(200).json(suppliers);
    } catch (error) {
      console.error('Get suppliers error:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };

// Lấy nhà cung cấp theo ID
const getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id).populate('products', 'name'); // Populate để lấy thông tin sản phẩm
        if (!supplier) {
            return res.status(404).json({ message: 'Nhà cung cấp không tồn tại' });
        }
        res.status(200).json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cập nhật nhà cung cấp
const updateSupplier = async (req, res) => {
    try {
        const { products } = req.body;

        // Kiểm tra nhà cung cấp có tồn tại không
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Nhà cung cấp không tồn tại' });
        }

        // Nếu có sản phẩm, kiểm tra và cập nhật danh sách sản phẩm
        if (products && products.length > 0) {
            const existingProducts = await Product.find({ _id: { $in: products } });
            if (existingProducts.length !== products.length) {
                return res.status(400).json({ message: 'Một hoặc nhiều sản phẩm không tồn tại' });
            }
            supplier.products = products;
        }

        // Cập nhật thông tin nhà cung cấp
        const updatedSupplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            { ...req.body, products: supplier.products },
            { new: true }
        );

        res.status(200).json(updatedSupplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xóa nhà cung cấp
const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Nhà cung cấp không tồn tại' });

        // Xóa nhà cung cấp khỏi các sản phẩm liên quan
        await Product.updateMany(
            { suppliers: req.params.id },
            { $pull: { suppliers: req.params.id } }
        );

        await Supplier.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Nhà cung cấp đã được xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách sản phẩm của một nhà cung cấp cụ thể
const getProductsBySupplierId = async (req, res) => {
    try {
        const supplierId = req.params.supplierId;

        // Tìm nhà cung cấp và populate danh sách sản phẩm
        const supplier = await Supplier.findById(supplierId).populate('products');
        if (!supplier) {
            return res.status(404).json({ message: 'Nhà cung cấp không tồn tại' });
        }

        // Trả về danh sách sản phẩm của nhà cung cấp
        res.status(200).json({ products: supplier.products });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Export các hàm controller
module.exports = {
    createSupplier,
    getAllSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    getProductsBySupplierId
};