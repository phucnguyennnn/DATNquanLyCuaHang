const Product = require('../models/Product');
const Category = require('../models/Category');

// Lấy danh sách sản phẩm
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('categoryId', 'name')  // Populate để lấy tên danh mục
            .exec();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy sản phẩm theo ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('categoryId', 'name')  // Populate để lấy tên danh mục
            .exec();
        if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// exports.createProduct = async (req, res) => {
//     try {
//         const { name, categoryName, description, price, SKU, unit, image } = req.body;

//         // Tìm danh mục theo tên
//         const category = await Category.findOne({ name: categoryName });
//         if (!category) return res.status(400).json({ message: 'Danh mục không tồn tại' });

//         // Tạo sản phẩm mới với categoryId
//         const newProduct = new Product({
//             name,
//             categoryId: category._id,  // Lấy categoryId từ danh mục tìm thấy
//             description,
//             price,
//             SKU,
//             unit,
//             image
//         });

//         // Lưu sản phẩm vào cơ sở dữ liệu
//         await newProduct.save();
//         res.status(201).json(newProduct);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

exports.createProduct = async (req, res) => {
    try {
        const { name, categoryName, description, price, SKU, unit, image, batch } = req.body;

        // Tìm danh mục theo tên
        const category = await Category.findOne({ name: categoryName });
        if (!category) return res.status(400).json({ message: 'Danh mục không tồn tại' });

        // Xử lý upload ảnh lên Cloudinary (nếu có ảnh)
        let imageUrl = '';
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { folder: 'product_images' });
            imageUrl = result.secure_url;
        }

        // Tạo sản phẩm mới
        const newProduct = new Product({
            name,
            categoryId: category._id,
            description,
            price,
            SKU,
            unit,
            image,
            batch
        });

        // Lưu sản phẩm vào cơ sở dữ liệu
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// exports.updateProduct = async (req, res) => {
//     try {
//         const updatedProduct = await Product.findByIdAndUpdate(
//             req.params.id,
//             req.body,
//             { new: true }
//         );
//         if (!updatedProduct) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
//         res.status(200).json(updatedProduct);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });

        let imageUrl = product.image;

        // Nếu có ảnh mới, xóa ảnh cũ trên Cloudinary
        if (req.file) {
            if (product.image) {
                const publicId = product.image.split('/').pop().split('.')[0]; // Lấy public_id của ảnh cũ
                await cloudinary.uploader.destroy(`product_images/${publicId}`);
            }
            imageUrl = req.file.path; // Cập nhật ảnh mới
        }

        // Cập nhật sản phẩm
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { ...req.body, image: imageUrl },
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
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
        res.status(200).json({ message: 'Xóa sản phẩm thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
