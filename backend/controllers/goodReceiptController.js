// backend/controllers/goodReceiptController.js
const mongoose = require("mongoose");
const GoodReceipt = require("../models/GoodReceipt");
const Batch = require("../models/Batch");
const Product = require("../models/Product");
const PurchaseOrder = require("../models/PurchaseOrder");
const Supplier = require("../models/Supplier");
const { v4: uuidv4 } = require("uuid");

const goodReceiptController = {
  createGoodReceiptFromPurchaseOrder: async (req, res) => {
    try {
      const { purchaseOrderId, receivedBy, items, notes } = req.body;
      console.log("Dữ liệu nhận được khi tạo phiếu nhập:", req.body); // Log dữ liệu request body

      if (!purchaseOrderId) {
        return res.status(400).json({ message: "Thiếu ID phiếu đặt hàng" });
      }
      const order = await PurchaseOrder.findById(purchaseOrderId);
      if (!order) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy phiếu đặt hàng" });
      }
      const goodReceipt = new GoodReceipt({
        purchaseOrder: purchaseOrderId,
        supplier: order.supplier,
        receivedBy,
        items: items.map((item) => ({
          product: item.productId || item.product,
          quantity: item.quantity,
          manufactureDate: item.manufactureDate || item.manufacture_day,
          expiryDate: item.expiryDate || item.expiry_day,
        })),
        notes,
      });
      const savedGoodReceipt = await goodReceipt.save();
      await PurchaseOrder.findByIdAndUpdate(
        purchaseOrderId,
        { status: "completed" },
        { new: true }
      );
      console.log("Phiếu nhập kho đã được tạo:", savedGoodReceipt); // Log phiếu nhập đã tạo
      res.status(201).json(savedGoodReceipt);
    } catch (error) {
      console.error("Lỗi khi tạo phiếu nhập kho:", error); // Sử dụng console.error cho lỗi
      res.status(500).json({ error: error.message });
    }
  },
  getAllGoodReceipts: async (req, res) => {
    try {
      const receipts = await GoodReceipt.find().populate("supplier").populate({
        path: "items.product",
        strictPopulate: false,
      });
      console.log("Tất cả phiếu nhập kho:", receipts); // Log tất cả phiếu nhập kho
      res.status(200).json(receipts);
    } catch (error) {
      console.error("Lỗi khi lấy tất cả phiếu nhập kho:", error);
      res.status(500).json({ error: error.message });
    }
  },
  getGoodReceiptById: async (req, res) => {
    try {
      const receipt = await GoodReceipt.findById(req.params.id)
        .populate("supplier")
        .populate({
          path: "items.product",
          strictPopulate: false,
        });
      if (!receipt) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy phiếu nhập kho." });
      }
      console.log("Chi tiết phiếu nhập kho ID:", req.params.id, receipt); // Log chi tiết phiếu nhập kho
      res.status(200).json(receipt);
    } catch (error) {
      console.error("Lỗi khi lấy phiếu nhập kho theo ID:", error);
      res.status(500).json({ error: error.message });
    }
  },
  confirmGoodReceipt: async (req, res) => {
    try {
      const receiptId = req.params.id;
      console.log("Bắt đầu xác nhận phiếu nhập kho ID:", receiptId); // Log ID phiếu nhập đang xác nhận
      const receipt = await GoodReceipt.findById(receiptId);
      if (!receipt)
        return res.status(404).json({ message: "Phiếu nhập không tồn tại." });
      if (receipt.status === "received") {
        return res
          .status(400)
          .json({ message: "Phiếu nhập đã được xác nhận trước đó." });
      }

      console.log("Dữ liệu receipt trước khi tạo batch:", receipt); // Log toàn bộ dữ liệu receipt
      console.log("Các items trong receipt:", receipt.items); // Log các items

      for (let i = 0; i < receipt.items.length; i++) {
        const item = receipt.items[i];
        if (!item.product) {
          return res.status(400).json({
            message: `Sản phẩm có vấn đề tại mục #${i + 1
              }: ID sản phẩm không xác định.`,
            itemIndex: i,
            item: item,
          });
        }
        const productExists = await Product.exists({ _id: item.product });
        if (!productExists) {
          return res.status(404).json({
            message: `Không tìm thấy sản phẩm với ID: ${item.product
              } tại mục #${i + 1}.`,
            itemIndex: i,
            productId: item.product,
            item: item,
          });
        }
      }
      const supplierExists = await Supplier.exists({ _id: receipt.supplier });
      if (!supplierExists) {
        return res.status(404).json({
          message: `Không tìm thấy nhà cung cấp với ID: ${receipt.supplier}.`,
          supplierId: receipt.supplier,
        });
      }
      const batchPromises = receipt.items.map(async (item, index) => {
        console.log(`Đang xử lý item thứ ${index + 1}:`, item); // Log từng item trước khi tạo batch
        const product = await Product.findById(item.product);
        const supplier = await Supplier.findById(receipt.supplier);
        const manufactureDate = item.manufactureDate;
        const expiryDate = item.expiryDate;
        const batchCode = `BATCH-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 7) // Lấy 7 ký tự từ vị trí thứ 2
          .toUpperCase()}`;

        console.log("Giá trị batchCode trước khi tạo instance:", batchCode);
        const batch = new Batch({
          batchCode: batchCode,
          product: product._id,
          supplier: supplier._id,
          manufacture_day: manufactureDate,
          expiry_day: expiryDate,
          initial_quantity: item.quantity,
          remaining_quantity: item.quantity,
          sold_quantity: 0,
          lost_quantity: 0,
          quantity_on_shelf: 0,
          status: "active",
          goodReceipt: receipt._id,
          import_price: item.unitPrice || 0,
        });
        console.log("Đối tượng batch trước khi lưu:", batch);
        try {
          const savedBatch = await batch.save();
          console.log("Lô hàng đã được lưu thành công:", savedBatch);
          product.batches = product.batches || [];
          product.batches.push(savedBatch._id);
          await product.save();
          return {
            ...savedBatch.toObject(),
            productName: product.name,
            unitPrice: item.unitPrice,
            import_price: item.unitPrice,
          };
        } catch (saveError) {
          console.error("Lỗi khi lưu lô hàng:", saveError);
          throw saveError; // Re-throw lỗi để catch ở cấp cao hơn
        }
      });
      const createdBatches = await Promise.all(batchPromises);
      console.log("Các lô hàng đã tạo:", createdBatches); // Log các lô hàng đã tạo
      receipt.status = "received";
      await receipt.save();
      res.json({
        message: "Xác nhận nhập kho thành công. Các lô hàng đã được tạo.",
        batches: createdBatches,
      });
    } catch (error) {
      console.error("Lỗi xác nhận nhập kho:", error);
      res.status(500).json({ error: error.message });
    }
  },
  updateGoodReceipt: async (req, res) => {
    try {
      const receipt = await GoodReceipt.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      )
        .populate("supplier")
        .populate({
          path: "items.product",
          strictPopulate: false,
        });
      if (!receipt) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy phiếu nhập kho." });
      }
      console.log("Phiếu nhập kho đã được cập nhật:", receipt); // Log phiếu nhập sau khi cập nhật
      res.status(200).json(receipt);
    } catch (error) {
      console.error("Lỗi khi cập nhật phiếu nhập kho:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = goodReceiptController;