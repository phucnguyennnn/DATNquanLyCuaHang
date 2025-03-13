const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'product_images',
        format: async (req, file) => 'png', // Định dạng ảnh mặc định
        public_id: (req, file) => file.originalname.split('.')[0] // Tên file
    },
});

const upload = multer({ storage });

module.exports = upload;
