const Inventory = require("../models/Inventory");
const Product = require("../models/Product");
const Batch = require("../models/Batch");

exports.createInventory = async (req, res) => {
  try {
    const { product } = req.body;

    const existingProduct = await Product.findById(product);
    if (!existingProduct) {
      return res.status(400).json({ message: "Sản phẩm không tồn tại" });
    }

    const existingInventory = await Inventory.findOne({ product: product });
    if (existingInventory) {
      return res
        .status(400)
        .json({ message: "Inventory cho sản phẩm này đã tồn tại" });
    }

    const newInventory = new Inventory({
      product: product,
    });

    const savedInventory = await newInventory.save();
    res.status(201).json(savedInventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllInventories = async (req, res) => {
  try {
    const inventories = await Inventory.find().populate("product", "name SKU");
    res.status(200).json(inventories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInventoryById = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id).populate(
      "product",
      "name SKU"
    );
    if (!inventory) {
      return res.status(404).json({ message: "Inventory không tồn tại" });
    }
    res.status(200).json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const updatedInventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("product", "name SKU");
    if (!updatedInventory) {
      return res.status(404).json({ message: "Inventory không tồn tại" });
    }
    res.status(200).json(updatedInventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.transferToShelf = async (req, res) => {
  try {
    const { productId, quantityToTransfer } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      return res
        .status(404)
        .json({ message: "Inventory cho sản phẩm này không tồn tại" });
    }

    const batchesInWarehouse = await Batch.find({ product: productId }).sort({
      manufacture_day: 1,
    });
    let transferred = 0;

    for (const batch of batchesInWarehouse) {
      const canTransfer = Math.min(
        quantityToTransfer - transferred,
        batch.remaining_quantity
      );
      if (canTransfer > 0) {
        batch.remaining_quantity -= canTransfer;
        batch.quantity_on_shelf += canTransfer;
        await batch.save();
        transferred += canTransfer;
        inventory.total_warehouse_stock -= canTransfer;
        inventory.total_shelf_stock += canTransfer;
        await inventory.save();
      }
      if (transferred === quantityToTransfer) {
        break;
      }
    }

    if (transferred < quantityToTransfer) {
      return res
        .status(400)
        .json({
          message: `Không đủ số lượng trong kho để chuyển. Đã chuyển ${transferred} trên ${quantityToTransfer}`,
        });
    }

    res
      .status(200)
      .json({
        message: `Đã chuyển ${quantityToTransfer} sản phẩm ${product.name} lên quầy`,
      });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
