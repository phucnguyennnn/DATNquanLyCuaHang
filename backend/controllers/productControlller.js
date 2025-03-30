const Product = require('../models/Product');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');
const Supplier = require('../models/Supplier');
const Inventory = require('../models/Inventory');

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

// Lấy tất cả sản phẩm và kèm theo thông tin tồn kho
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('categoryId', 'name')
            .populate('suppliers', 'name');

        // Lấy số lượng tồn kho cho mỗi sản phẩm
        const productListWithStock = await Promise.all(products.map(async (product) => {
            const inventory = await Inventory.findOne({ productId: product._id });
            return {
                ...product.toObject(), // Chuyển đổi sản phẩm thành object để có thể merge thêm thông tin
                warehouse_stock: inventory ? inventory.warehouse_stock : 0,
                shelf_stock: inventory ? inventory.shelf_stock : 0,
                total_stock: inventory ? inventory.total_stock : 0
            };
        }));

        res.status(200).json(productListWithStock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};




// Lấy sản phẩm theo ID và kèm theo thông tin tồn kho
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('categoryId', 'name')
            .populate('suppliers', 'name');

        if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });

        // Lấy thông tin tồn kho
        const inventory = await Inventory.findOne({ productId: product._id });

        const productWithStock = {
            ...product.toObject(),
            warehouse_stock: inventory ? inventory.warehouse_stock : 0,
            shelf_stock: inventory ? inventory.shelf_stock : 0,
            total_stock: inventory ? inventory.total_stock : 0
        };

        res.status(200).json(productWithStock);
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
// Trừ tồn kho khi bán sản phẩm
exports.deductInventoryOnSale = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        // Kiểm tra tồn kho
        const inventory = await Inventory.findOne({ productId });
        if (!inventory) return res.status(404).json({ message: 'Không tìm thấy thông tin tồn kho' });

        // Kiểm tra xem có đủ hàng trên kệ và kho để bán không
        if (inventory.shelf_stock < quantity) {
            // Nếu không đủ hàng trên kệ, lấy thêm từ kho
            const remainingQuantity = quantity - inventory.shelf_stock;
            if (inventory.warehouse_stock < remainingQuantity) {
                return res.status(400).json({ message: 'Tồn kho không đủ' });
            }

            // Cập nhật tồn kho (giảm hàng trên kệ và kho)
            inventory.shelf_stock = 0; // Đã bán hết trên kệ
            inventory.warehouse_stock -= remainingQuantity; // Lấy thêm từ kho
            inventory.total_stock -= quantity; // Tổng số lượng giảm
        } else {
            // Nếu đủ hàng trên kệ, chỉ giảm trên kệ
            inventory.shelf_stock -= quantity;
            inventory.total_stock -= quantity;
        }

        await inventory.save(); // Lưu lại thông tin tồn kho
        res.status(200).json({ message: 'Trừ tồn kho thành công', inventory });
    } catch (error) {
        console.error('Error in deductInventoryOnSale:', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// Hàm bán sản phẩm và trừ tồn kho
exports.sellProduct = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        // Gọi hàm trừ tồn kho khi bán sản phẩm
        await this.deductInventoryOnSale(req, res);

        // Xử lý các logic khác như tạo hóa đơn, thông báo thành công, v.v.
        res.status(200).json({ message: 'Bán hàng thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi bán sản phẩm' });
    }
};

