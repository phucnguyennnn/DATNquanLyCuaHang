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
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const receiptId = req.params.id;
      const receipt = await GoodReceipt.findById(receiptId)
        .session(session)
        .select('status items supplier')
        .lean();

      if (!receipt) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Phiếu nhập không tồn tại" });
      }

      if (receipt.status === "received") {
        await session.abortTransaction();
        return res.status(400).json({ message: "Phiếu đã được xác nhận" });
      }

      const batchCreationPromises = receipt.items.map(async (item) => {
        const batch = new Batch({
          batchCode: `BATCH-${uuidv4()}`,
          product: item.product,
          supplier: receipt.supplier,
          manufacture_day: item.manufactureDate,
          expiry_day: item.expiryDate,
          initial_quantity: item.quantity,
          remaining_quantity: item.quantity,
          status: "active",
          goodReceipt: receiptId,
        });

        const savedBatch = await batch.save({ session });
        await Product.updateOne(
          { _id: item.product },
          { $push: { batches: savedBatch._id } },
          { session }
        );
        return savedBatch;
      });

      const batches = await Promise.all(batchCreationPromises);
      await GoodReceipt.updateOne(
        { _id: receiptId },
        { $set: { status: "received" } },
        { session }
      );

      await session.commitTransaction();
      res.json({ batches });
      
    } catch (error) {
      await session.abortTransaction();
      res.status(500).json({ error: error.message });
    } finally {
      session.endSession();
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