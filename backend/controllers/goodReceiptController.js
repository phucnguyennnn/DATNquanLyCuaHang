// controllers/goodReceiptController.js
const mongoose = require("mongoose");
const GoodReceipt = require("../models/GoodReceipt");
const Batch = require("../models/Batch");
const Product = require("../models/Product");
const PurchaseOrder = require("../models/PurchaseOrder");
const Inventory = require("../models/Inventory");
const Supplier = require("../models/Supplier");
const { v4: uuidv4 } = require("uuid");

const goodReceiptController = {
  createGoodReceiptFromPurchaseOrder: async (req, res) => {
    try {
      const { purchaseOrderId, receivedBy, items, notes } = req.body;
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
      res.status(201).json(savedGoodReceipt);
    } catch (error) {
      console.error("Lỗi khi tạo phiếu nhập kho:", error);
      res.status(500).json({ error: error.message });
    }
  },
  getAllGoodReceipts: async (req, res) => {
    try {
      const receipts = await GoodReceipt.find().populate("supplier").populate({
        path: "items.product",
        strictPopulate: false,
      });
      res.status(200).json(receipts);
    } catch (error) {
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
      res.status(200).json(receipt);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  confirmGoodReceipt: async (req, res) => {
    try {
      const receipt = await GoodReceipt.findById(req.params.id);
      if (!receipt)
        return res.status(404).json({ message: "Phiếu nhập không tồn tại." });
      if (receipt.status === "received") {
        return res
          .status(400)
          .json({ message: "Phiếu nhập đã được xác nhận trước đó." });
      }
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
      const batchPromises = receipt.items.map(async (item) => {
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
          let inventory = await Inventory.findOne({ product: product._id });
          if (!inventory) {
            inventory = new Inventory({
              product: product._id,
              total_warehouse_stock: item.quantity,
              total_shelf_stock: 0,
              sold_stock: 0,
              reserved_stock: 0,
            });
          } else {
            inventory.total_warehouse_stock += item.quantity;
            await inventory.save();
          }
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
      res.status(200).json(receipt);
    } catch (error) {
      console.error("Lỗi khi cập nhật phiếu nhập kho:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = goodReceiptController;
