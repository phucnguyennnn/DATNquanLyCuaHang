const GoodReceipt = require('../models/Goodreceipt');
const Batch = require('../models/Batch');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const Inventory = require('../models/Inventory');
const Supplier = require('../models/Supplier');


const goodReceiptController = {
    // Tạo phiếu nhập kho
    createGoodReceipt: async (req, res) => {
        try {
            const { purchaseOrderId, items } = req.body;

            // Tìm phiếu đặt mua
            const order = await PurchaseOrder.findById(purchaseOrderId);
            if (!order) return res.status(404).json({ message: 'Purchase Order not found' });

            // Tạo phiếu nhập kho mới
            const goodReceipt = new GoodReceipt({
                purchaseOrderId,
                supplierId: order.supplierId,
                items,
            });

            await goodReceipt.save();

            // Cập nhật trạng thái phiếu đặt mua thành 'completed'
            order.status = 'completed';
            await order.save();

            res.status(201).json(goodReceipt);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách tất cả phiếu nhập kho
    getAllGoodReceipts: async (req, res) => {
        try {
            const receipts = await GoodReceipt.find()
                .populate('supplierId') // Populate thông tin nhà cung cấp
                .populate('items.productId'); // Populate thông tin sản phẩm

            res.status(200).json(receipts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy chi tiết một phiếu nhập kho theo ID
    getGoodReceiptById: async (req, res) => {
        try {
            const receipt = await GoodReceipt.findById(req.params.id)
                .populate('supplierId') // Populate thông tin nhà cung cấp
                .populate('items.productId'); // Populate thông tin sản phẩm

            if (!receipt) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu nhập kho.' });
            }

            res.status(200).json(receipt);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Xác nhận nhập kho và tạo lô hàng
    // confirmGoodReceipt: async (req, res) => {
    //     try {
    //         const receipt = await GoodReceipt.findById(req.params.id);
    //         if (!receipt) return res.status(404).json({ message: 'Not found' });
    //         if (receipt.status === 'received') return res.status(400).json({ message: 'Already confirmed' });

    //         // Tạo lô hàng cho từng sản phẩm
    //         const batchPromises = receipt.items.map(async (item) => {
    //             const batch = new Batch({
    //                 productId: item.productId,
    //                 quantity: item.quantity,
    //                 manufacture_day: item.manufacture_day,
    //                 expiry_day: item.expiry_day,
    //                 goodReceiptId: receipt._id,
    //                 supplierId: receipt.supplierId
    //             });

    //             const savedBatch = await batch.save();

    //             // Cập nhật sản phẩm với batch mới
    //             await Product.findByIdAndUpdate(item.productId, {
    //                 $push: { batches: savedBatch._id }
    //             });

    //             // Cập nhật số lượng tồn kho trong Inventory
    //             let inventory = await Inventory.findOne({ productId: item.productId });
    //             if (!inventory) {
    //                 inventory = new Inventory({
    //                     productId: item.productId,
    //                     warehouse_stock: item.quantity,
    //                     shelf_stock: 0,
    //                     total_stock: item.quantity
    //                 });
    //             } else {
    //                 inventory.warehouse_stock += item.quantity;
    //                 inventory.total_stock += item.quantity;
    //             }
    //             await inventory.save();

    //             return savedBatch;
    //         });

    //         const createdBatches = await Promise.all(batchPromises);

    //         // Cập nhật trạng thái phiếu nhập kho
    //         receipt.status = 'received';
    //         await receipt.save();

    //         res.json({ message: 'Confirmed. Batches created.', batches: createdBatches });
    //     } catch (error) {
    //         res.status(500).json({ error: error.message });
    //     }
    // }
    confirmGoodReceipt: async (req, res) => {
        try {
            const receipt = await GoodReceipt.findById(req.params.id);
            if (!receipt) return res.status(404).json({ message: 'Not found' });
            if (receipt.status === 'received') return res.status(400).json({ message: 'Already confirmed' });

            const batchPromises = receipt.items.map(async (item) => {
                const product = await Product.findById(item.productId);
                if (!product) throw new Error(`Product with ID ${item.productId} not found`);

                const supplier = await Supplier.findById(receipt.supplierId);
                if (!supplier) throw new Error(`Supplier with ID ${receipt.supplierId} not found`);

                // Cập nhật lại status thành 'active' hoặc 'inactive' tùy ý
                const batch = new Batch({
                    manufacture_day: item.manufacture_day,
                    expiry_day: item.expiry_day,
                    quantity: item.quantity,
                    status: 'active',  // Cập nhật status phù hợp với enum
                    supplierId: {
                        _id: supplier._id,
                        name: supplier.name,
                    },
                    productId: {
                        _id: product._id,
                        name: product.name,
                    },
                });

                const savedBatch = await batch.save();

                // Cập nhật sản phẩm với batch mới
                await Product.findByIdAndUpdate(item.productId, {
                    $push: { batches: savedBatch._id }
                });

                // Cập nhật tồn kho
                let inventory = await Inventory.findOne({ productId: item.productId });
                if (!inventory) {
                    inventory = new Inventory({
                        productId: item.productId,
                        warehouse_stock: item.quantity,
                        shelf_stock: 0,
                        total_stock: item.quantity
                    });
                } else {
                    inventory.warehouse_stock += item.quantity;
                    inventory.total_stock += item.quantity;
                }
                await inventory.save();

                return savedBatch;
            });

            const createdBatches = await Promise.all(batchPromises);

            // Cập nhật trạng thái phiếu nhập kho
            receipt.status = 'received';
            await receipt.save();

            res.json({ message: 'Confirmed. Batches created.', batches: createdBatches });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }




};

module.exports = goodReceiptController;