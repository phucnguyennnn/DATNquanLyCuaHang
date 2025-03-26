const Product = require('../models/Product');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');
const Supplier = require('../models/Supplier');

// Tạo sản phẩm mới
exports.createProduct = async (req, res) => {
    try {
        const { name, categoryName, description, price, SKU, unit, batch, suppliers } = req.body;

        // Kiểm tra danh mục
        const category = await Category.findOne({ name: categoryName });
        if (!category) return res.status(400).json({ message: 'Danh mục không tồn tại' });

        // Kiểm tra SKU trùng lặp
        const existingProduct = await Product.findOne({ SKU });
        if (existingProduct) return res.status(400).json({ message: 'SKU đã tồn tại' });

        // Xử lý upload ảnh
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(file.path, { folder: 'product_images' });
                imageUrls.push(result.secure_url);
            }
        }

        // Tạo sản phẩm mới
        const newProduct = new Product({
            name,
            categoryId: category._id,
            description,
            price,
            SKU,
            unit,
            image: imageUrls,
            batch,
            suppliers
        });

        await newProduct.save();
        if (suppliers && suppliers.length > 0) {
            await Supplier.updateMany(
                { _id: { $in: suppliers } }, 
                { $push: { products: newProduct._id } } 
            );
        }

        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Lấy tất cả sản phẩm
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('categoryId', 'name')
            .populate('suppliers', 'name');
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy sản phẩm theo ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('categoryId', 'name')
            .populate('suppliers', 'name');
        if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });

        // Xử lý ảnh cũ
        if (req.files && req.files.length > 0) {
            // Xóa ảnh cũ trên Cloudinary
            if (product.image && product.image.length > 0) {
                for (const imageUrl of product.image) {
                    const publicId = imageUrl.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(`product_images/${publicId}`);
                }
            }

            // Upload ảnh mới
            let imageUrls = [];
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(file.path, { folder: 'product_images' });
                imageUrls.push(result.secure_url);
            }
            product.image = imageUrls;
        }

        // Cập nhật thông tin sản phẩm
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { ...req.body, image: product.image },
            { new: true }
        );

        res.status(200).json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });

        // Xóa ảnh trên Cloudinary
        if (product.image && product.image.length > 0) {
            for (const imageUrl of product.image) {
                const publicId = imageUrl.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`product_images/${publicId}`);
            }
        }

        // Xóa sản phẩm
        await Product.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Xóa sản phẩm thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};