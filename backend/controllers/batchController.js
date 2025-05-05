const Batch = require("../models/Batch");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const { Mongoose } = require("mongoose");

exports.createBatch = async (req, res) => {
  try {
    const {
      manufacture_day,
      expiry_day,
      quantity,
      status,
      supplierName,
      productName,
      initial_quantity, // Thêm trường initial_quantity nếu có
      remaining_quantity, // Thêm trường remaining_quantity nếu có
      sold_quantity, // Thêm trường sold_quantity nếu có
      lost_quantity, // Thêm trường lost_quantity nếu có
      quantity_on_shelf, // Thêm trường quantity_on_shelf nếu có
      discountInfo, // Thêm trường discountInfo nếu có
      goodReceipt, // Thêm trường goodReceipt nếu có
    } = req.body;

    const supplier = await Supplier.findOne({ name: supplierName });
    if (!supplier) {
      return res.status(400).json({ message: "Nhà cung cấp không tồn tại" });
    }

    const product = await Product.findOne({ name: productName });
    if (!product) {
      return res.status(400).json({ message: "Sản phẩm không tồn tại" });
    }

    if (new Date(manufacture_day) >= new Date(expiry_day)) {
      return res
        .status(400)
        .json({ message: "Ngày sản xuất phải trước ngày hết hạn" });
    }

    if (quantity <= 0 && initial_quantity <= 0) {
      return res.status(400).json({ message: "Số lượng phải lớn hơn 0" });
    }

    const newBatch = new Batch({
      manufacture_day,
      expiry_day,
      initial_quantity: initial_quantity || quantity, // Ưu tiên initial_quantity nếu có, không thì dùng quantity
      remaining_quantity: remaining_quantity || initial_quantity || quantity, // Tương tự
      sold_quantity: sold_quantity || 0,
      lost_quantity: lost_quantity || 0,
      quantity_on_shelf: quantity_on_shelf || 0,
      status,
      supplier: supplier._id,
      product: product._id,
      discountInfo,
      goodReceipt,
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
    const { search, status } = req.query;
    const query = {};
    const orConditions = [];

    if (status) {
      query.status = status;
    }

    if (search) {
      const isObjectId = Mongoose.Types.ObjectId.isValid(search);

      // Tìm kiếm theo ID nếu là ObjectId hợp lệ
      if (isObjectId) {
        orConditions.push({ _id: search });
      }

      // Tìm kiếm theo tên sản phẩm hoặc SKU
      const products = await Product.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { SKU: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      if (products.length > 0) {
        orConditions.push({ product: { $in: products.map((p) => p._id) } });
      }

      // Kết hợp điều kiện tìm kiếm
      if (orConditions.length > 0) {
        query.$or = orConditions;
      }
    }

    const batches = await Batch.find(query)
      .populate("product", "name SKU description createdAt updatedAt images")
      .populate("supplier", "name")
      .populate("goodReceipt", "receiptNumber");

    res.status(200).json(batches);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách lô hàng:", error);
    res.status(500).json({ message: "Lỗi khi tải dữ liệu lô hàng." });
  }
};
exports.updateBatch = async (req, res) => {
  try {
    const updatedBatch = await Batch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate("product", "name SKU description createdAt updatedAt images ")
      .populate("supplier", "name")
      .populate("goodReceipt", "receiptNumber");
    if (!updatedBatch)
      return res.status(404).json({ message: "Lô hàng không tồn tại" });
    res.status(200).json(updatedBatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const deletedBatch = await Batch.findByIdAndDelete(req.params.id);
    if (!deletedBatch)
      return res.status(404).json({ message: "Lô hàng không tồn tại" });
    res.status(200).json({ message: "Lô hàng đã được xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const batchId = req.params.id;

    const batch = await Batch.findById(batchId)
      .populate("product", "name SKU description createdAt updatedAt images ")
      .populate("supplier", "name")
      .populate("goodReceipt", "receiptNumber");

    if (!batch) {
      return res.status(404).json({ message: "Batch không tồn tại" });
    }

    res.status(200).json(batch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
