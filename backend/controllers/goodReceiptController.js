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
      const { purchaseOrderId, supplierId, receivedBy, items } = req.body;

      console.log("Request data received:", JSON.stringify(req.body, null, 2));

      // Kiểm tra xem có ID phiếu đặt hàng không
      if (!purchaseOrderId) {
        return res.status(400).json({ message: "Thiếu ID phiếu đặt hàng" });
      }

      const order = await PurchaseOrder.findById(purchaseOrderId);
      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy phiếu đặt hàng" });
      }

      const goodReceipt = new GoodReceipt({
        purchaseOrderId,
        supplierId: supplierId || order.supplier, // Hỗ trợ cả hai cách viết
        receivedBy,
        items: items.map(item => ({
          productId: item.productId || item.product, // Hỗ trợ cả hai cách viết
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          manufacture_day: item.manufacture_day || item.manufactureDate, // Hỗ trợ cả hai cách viết
          expiry_day: item.expiry_day || item.expiryDate, // Hỗ trợ cả hai cách viết
          productName: item.productName,
          productSKU: item.productSKU
        }))
      });

      await goodReceipt.save();

      // Cập nhật trạng thái đơn mua hàng
      order.status = "completed";
      await order.save();

      res.status(201).json(savedGoodReceipt);
    } catch (error) {
      console.error("Lỗi khi tạo phiếu nhập kho:", error);
      res.status(500).json({ error: error.message });
    }
  },

  getAllGoodReceipts: async (req, res) => {
    try {
      const receipts = await GoodReceipt.find()
        .populate("supplier")
        .populate({
          path: "items.productId",
          strictPopulate: false
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
          path: "items.productId",
          strictPopulate: false
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

  // Fix the format of receipt items (normalize product/productId fields)
  fixReceiptFormat: async (req, res) => {
    try {
      const receipt = await GoodReceipt.findById(req.params.id);
      if (!receipt) {
        return res.status(404).json({ message: "Phiếu nhập không tồn tại." });
      }

      let updated = false;
      // Normalize items to use both product and productId fields
      for (let i = 0; i < receipt.items.length; i++) {
        const item = receipt.items[i];

        // If productId is missing but product exists, copy product to productId
        if (!item.productId && item.product) {
          receipt.items[i].productId = item.product;
          updated = true;
        }
        // If product is missing but productId exists, copy productId to product
        else if (!item.product && item.productId) {
          receipt.items[i].product = item.productId;
          updated = true;
        }
      }

      if (updated) {
        await receipt.save();
        return res.status(200).json({
          message: "Đã cập nhật định dạng phiếu nhập thành công.",
          receipt: receipt
        });
      } else {
        return res.status(200).json({
          message: "Không cần cập nhật, phiếu nhập đã đúng định dạng.",
          receipt: receipt
        });
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật định dạng phiếu nhập:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Xác nhận nhập kho và tạo lô hàng
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

      // Normalize all items to ensure they have productId
      for (let i = 0; i < receipt.items.length; i++) {
        // If productId is missing but product exists, use product as productId
        if (!receipt.items[i].productId && receipt.items[i].product) {
          receipt.items[i].productId = receipt.items[i].product;
        }
      }

      // Validate all items have valid product IDs before processing
      for (let i = 0; i < receipt.items.length; i++) {
        const item = receipt.items[i];

        // Check for both product and productId fields
        const productIdToCheck = item.productId || item.product;

        // Check if the productId is missing or invalid
        if (!productIdToCheck) {
          return res.status(400).json({
            message: `Sản phẩm có vấn đề tại mục #${i + 1}: ID sản phẩm không xác định.`,
            itemIndex: i,
            item: item // Include item data for debugging
          });
        }

        // Verify product exists
        const productExists = await Product.exists({ _id: productIdToCheck });
        if (!productExists) {
          return res.status(404).json({
            message: `Không tìm thấy sản phẩm với ID: ${productIdToCheck} tại mục #${i + 1}.`,
            itemIndex: i,
            productId: productIdToCheck,
            item: item // Include item data for debugging
          });
        }
      }

      // Verify supplier exists before processing batches
      const supplierIdToCheck = receipt.supplierId || receipt.supplier;
      const supplierExists = await Supplier.exists({ _id: supplierIdToCheck });
      if (!supplierExists) {
        return res.status(404).json({
          message: `Không tìm thấy nhà cung cấp với ID: ${supplierIdToCheck}.`,
          supplierId: supplierIdToCheck
        });
      }

      const batchPromises = receipt.items.map(async (item, index) => {
        // Use either productId or product field
        const productIdToUse = item.productId || item.product;
        const product = await Product.findById(productIdToUse);

        // We already verified products exist, but keeping this as a safety check
        if (!product) {
          throw new Error(`Không tìm thấy sản phẩm ID: ${productIdToUse} tại mục #${index + 1}`);
        }

        const supplier = await Supplier.findById(supplierIdToCheck);
        // We already verified supplier exists, but keeping this as a safety check
        if (!supplier) {
          throw new Error(`Không tìm thấy nhà cung cấp ID: ${supplierIdToCheck}`);
        }

        // Use the appropriate date fields
        const manufactureDate = item.manufacture_day || item.manufactureDate;
        const expiryDate = item.expiry_day || item.expiryDate;

        // Tạo lô hàng mới với đầy đủ các trường bắt buộc
        const batch = new Batch({
          product: product._id,
          supplier: supplier._id,
          manufacture_day: manufactureDate,
          expiry_day: expiryDate,
          initial_quantity: item.quantity,     // Added required field
          remaining_quantity: item.quantity,   // Added required field
          status: "active",
          goodReceipt: receipt._id,            // Fixed field name
          import_price: item.unitPrice || 0    // Added required field
        });

        const savedBatch = await batch.save();

        // Thêm batch vào product.batches
        product.batches = product.batches || [];
        product.batches.push(savedBatch._id);
        await product.save();

        // Cập nhật tồn kho
        let inventory = await Inventory.findOne({ product: productIdToUse });
        if (!inventory) {
          inventory = new Inventory({
            product: productIdToUse,  // Changed from productId to product
            warehouse_stock: item.quantity,
            shelf_stock: 0,
            total_stock: item.quantity,
          });
        } else {
          inventory.warehouse_stock += item.quantity;
          inventory.total_stock += item.quantity;
        }

        await inventory.save();

        // Return batch with additional product information for frontend display
        return {
          ...savedBatch.toObject(),
          productName: product.name,
          unitPrice: item.unitPrice,
          import_price: item.unitPrice
        };
      });

      const createdBatches = await Promise.all(batchPromises);

      receipt.status = "received";

      // Save normalized receipt with any field corrections
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