const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const mongoose = require("mongoose");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createSupplier = async (req, res) => {
  try {
    const { suppliedProducts, ...supplierData } = req.body;

    if (!supplierData.name) {
      return res.status(400).json({ message: "Name is required." });
    }

    const existingSupplier = await Supplier.findOne({
      name: supplierData.name,
    });
    if (existingSupplier) {
      return res
        .status(400)
        .json({ message: "Supplier with this name already exists." });
    }

    const newSupplier = new Supplier(supplierData);

    if (suppliedProducts && Array.isArray(suppliedProducts)) {
      for (const sp of suppliedProducts) {
        if (!isValidObjectId(sp.product)) {
          return res.status(400).json({
            message: `Invalid product ID: ${sp.product}`,
          });
        }

        const product = await Product.findById(sp.product);
        if (!product) {
          return res.status(404).json({
            message: `Product not found: ${sp.product}`,
          });
        }

        const supplierIndex = product.suppliers.findIndex((s) =>
          s.supplier.equals(newSupplier._id)
        );

        if (supplierIndex === -1) {
          product.suppliers.push({
            supplier: newSupplier._id,
            importPrice: sp.importPrice,
            minOrderQuantity: sp.minOrderQuantity,
            leadTime: sp.leadTime,
            isPrimary: sp.isPrimary,
          });
        } else {
          product.suppliers[supplierIndex] = {
            ...product.suppliers[supplierIndex].toObject(),
            ...sp,
          };
        }

        await product.save();
      }
      newSupplier.suppliedProducts = suppliedProducts;
    }

    await newSupplier.save();

    return res.status(201).json({
      message: "Supplier created successfully.",
      supplier: newSupplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const updateSupplier = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid supplier ID format." });
    }

    const { suppliedProducts, ...updateData } = req.body;

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found." });
    }

    const oldProducts = supplier.suppliedProducts.map((sp) =>
      sp.product.toString()
    );
    const newProducts = suppliedProducts?.map((sp) => sp.product) || [];

    const productsToRemove = oldProducts.filter(
      (p) => !newProducts.includes(p)
    );
    const productsToAdd =
      suppliedProducts?.filter((sp) => !oldProducts.includes(sp.product)) || [];

    for (const sp of productsToRemove) {
      const product = await Product.findById(sp);
      if (product) {
        product.suppliers = product.suppliers.filter(
          (s) => !s.supplier.equals(req.params.id)
        );
        await product.save();
      }
    }

    for (const sp of suppliedProducts || []) {
      if (!isValidObjectId(sp.product)) {
        return res.status(400).json({
          message: `Invalid product ID: ${sp.product}`,
        });
      }

      const product = await Product.findById(sp.product);
      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${sp.product}`,
        });
      }

      const supplierIndex = product.suppliers.findIndex((s) =>
        s.supplier.equals(req.params.id)
      );

      if (supplierIndex === -1) {
        product.suppliers.push({
          supplier: req.params.id,
          importPrice: sp.importPrice,
          minOrderQuantity: sp.minOrderQuantity,
          leadTime: sp.leadTime,
          isPrimary: sp.isPrimary,
        });
      } else {
        product.suppliers[supplierIndex] = {
          ...product.suppliers[supplierIndex].toObject(),
          ...sp,
        };
      }

      await product.save();
    }

    supplier.suppliedProducts = suppliedProducts || [];
    Object.assign(supplier, updateData);
    await supplier.save();

    return res.status(200).json({
      message: "Supplier updated successfully.",
      supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid supplier ID format." });
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found." });
    }

    for (const sp of supplier.suppliedProducts) {
      const product = await Product.findById(sp.product);
      if (product) {
        product.suppliers = product.suppliers.filter(
          (s) => !s.supplier.equals(req.params.id)
        );
        await product.save();
      }
    }

    await Supplier.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Supplier deleted successfully.",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const getAllSuppliers = async (req, res) => {
  try {
    const { active, search } = req.query;
    let query = {};

    if (active !== undefined) {
      query.isActive = active === "true";
    }

    if (search) {
      query.$text = { $search: search };
    }

    const suppliers = await Supplier.find(query)
      .select("-__v")
      .sort({ name: 1 });

    return res.status(200).json(suppliers);
  } catch (error) {
    console.error("Get suppliers error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const getSupplierById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid supplier ID format." });
    }

    const supplier = await Supplier.findById(req.params.id).populate({
      path: "products",
      select: "name SKU price active",
      match: { active: true },
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found." });
    }

    return res.status(200).json(supplier);
  } catch (error) {
    console.error("Get supplier by ID error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const toggleSupplierStatus = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid supplier ID format." });
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found." });
    }

    supplier.isActive = !supplier.isActive;
    await supplier.save();

    return res.status(200).json({
      message: `Supplier ${
        supplier.isActive ? "activated" : "deactivated"
      } successfully.`,
      supplier,
    });
  } catch (error) {
    console.error("Toggle supplier status error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const getProductsBySupplier = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid supplier ID format." });
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found." });
    }

    const products = await Product.find({ "suppliers.supplier": req.params.id })
      .select("name SKU price active category")
      .populate("category", "name");

    return res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get products by supplier error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  toggleSupplierStatus,
  deleteSupplier,
  getProductsBySupplier,
};
