const mongoose = require("mongoose");
const GoodReceipt = require("../models/GoodReceipt");
const Batch = require("../models/Batch");
const Product = require("../models/Product");
const PurchaseOrder = require("../models/PurchaseOrder");
const Inventory = require("../models/Inventory");
const Supplier = require("../models/Supplier");

const goodReceiptController = {
  createGoodReceiptFromPurchaseOrder: async (req, res) => {
    try {
      const { purchaseOrderId } = req.params;
      const { items } = req.body;

      const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId)
        .populate("supplier")
        .populate("items.product");

      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase Order not found" });
      }

      if (
        purchaseOrder.status === "completed" ||
        purchaseOrder.status === "cancelled"
      ) {
        return res
          .status(400)
          .json({ message: "Purchase Order is already completed or cancelled" });
      }

      const goodReceiptItems = items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        manufactureDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }));

      const goodReceipt = new GoodReceipt({
        purchaseOrder: purchaseOrderId,
        supplier: purchaseOrder.supplier._id,
        receiptDate: new Date(),
        receivedBy: req.user.id,
        status: "draft",
        items: goodReceiptItems,
        notes: `Created from Purchase Order: ${purchaseOrderId}`,
      });

      const savedGoodReceipt = await goodReceipt.save();

      res.status(201).json(savedGoodReceipt);
    } catch (error) {
      console.error(
        "Error creating Good Receipt from Purchase Order:",
        error
      );
      res.status(500).json({ error: error.message });
    }
  },

  getAllGoodReceipts: async (req, res) => {
    try {
      const receipts = await GoodReceipt.find()
        .populate("supplier")
        .populate("items.product");

      res.status(200).json(receipts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getGoodReceiptById: async (req, res) => {
    try {
      const receipt = await GoodReceipt.findById(req.params.id)
        .populate("supplier")
        .populate("items.product");

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
      const receipt = await GoodReceipt.findById(req.params.id).populate(
        "items.product"
      );
      if (!receipt)
        return res.status(404).json({ message: "Phiếu nhập không tồn tại." });

      if (receipt.status === "received") {
        return res
          .status(400)
          .json({ message: "Phiếu nhập đã được xác nhận trước đó." });
      }

      const batchPromises = receipt.items.map(async (item) => {
        const product = item.product;
        if (!product)
          throw new Error(`Không tìm thấy sản phẩm ID: ${item.product}`);

        const supplier = await Supplier.findById(receipt.supplier);
        if (!supplier)
          throw new Error(
            `Không tìm thấy nhà cung cấp ID: ${receipt.supplier}`
          );

        const batch = new Batch({
          manufacture_day: item.manufactureDate,
          expiry_day: item.expiryDate,
          initial_quantity: item.quantity,
          remaining_quantity: item.quantity,
          status: "active",
          product: product._id,
          supplier: supplier._id,
          goodReceipt: receipt._id,
        });

        const savedBatch = await batch.save();

        await Inventory.findOneAndUpdate(
          { product: product._id },
          { $inc: { warehouse_stock: item.quantity } },
          { upsert: true, new: true }
        );

        return savedBatch;
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
};

module.exports = goodReceiptController;