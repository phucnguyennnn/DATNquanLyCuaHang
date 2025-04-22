const GoodReceipt = require("../models/Goodreceipt");
const Batch = require("../models/Batch");
const Product = require("../models/Product");
const PurchaseOrder = require("../models/PurchaseOrder");
const Inventory = require("../models/Inventory");
const Supplier = require("../models/Supplier");

const goodReceiptController = {
  // Tạo phiếu nhập kho
  createGoodReceipt: async (req, res) => {
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

      res.status(201).json(goodReceipt);
    } catch (error) {
      console.error("Lỗi khi tạo phiếu nhập kho:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Lấy tất cả phiếu nhập kho
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

  // Lấy chi tiết phiếu nhập kho theo ID
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

      const batchPromises = receipt.items.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product)
          throw new Error(`Không tìm thấy sản phẩm ID: ${item.productId}`);

        const supplier = await Supplier.findById(receipt.supplierId);
        if (!supplier)
          throw new Error(
            `Không tìm thấy nhà cung cấp ID: ${receipt.supplierId}`
          );

        // Tạo lô hàng mới
        const batch = new Batch({
          manufacture_day: item.manufacture_day,
          expiry_day: item.expiry_day,
          quantity: item.quantity,
          status: "active",
          product: product._id,
          supplier: supplier._id,
          goodReceiptId: receipt._id,
        });

        const savedBatch = await batch.save();

        // Thêm batch vào product.batches
        product.batches = product.batches || [];
        product.batches.push(savedBatch._id);
        await product.save();

        // Cập nhật tồn kho
        let inventory = await Inventory.findOne({ productId: item.productId });
        if (!inventory) {
          inventory = new Inventory({
            productId: item.productId,
            warehouse_stock: item.quantity,
            shelf_stock: 0,
            total_stock: item.quantity,
          });
        } else {
          inventory.warehouse_stock += item.quantity;
          inventory.total_stock += item.quantity;
        }

        await inventory.save();

        return savedBatch;
      });

      const createdBatches = await Promise.all(batchPromises);

      // Cập nhật trạng thái phiếu nhập
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
