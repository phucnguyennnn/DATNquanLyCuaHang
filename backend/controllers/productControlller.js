const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const { isValidObjectId } = require("mongoose");

// Create a new product
exports.createProduct = async (req, res) => {
    try {
      const {
        name,
        category,
        description,
        price,
        SKU,
        unit,
        status = "active",
      } = req.body;
  
      if (!name || !category || !price || !SKU || !unit) {
        return res.status(400).json({ message: "Missing required fields." });
      }
  
      if (!isValidObjectId(category)) {
        return res.status(400).json({ message: "Invalid category ID." });
      }
  
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({ message: "Category not found." });
      }
  
      // Parse suppliers from form-data or JSON
      let suppliers = [];
      try {
        suppliers = req.body.suppliers
          ? typeof req.body.suppliers === "string"
            ? JSON.parse(req.body.suppliers)
            : req.body.suppliers
          : [];
      } catch (e) {
        console.error("Error parsing suppliers:", e);
        return res.status(400).json({ message: "Invalid suppliers format." });
      }
  
      // Validate and process suppliers
      const validSuppliers = [];
      for (const s of suppliers) {
        if (!s.supplier || !isValidObjectId(s.supplier)) {
          continue;
        }
  
        const supplierExists = await Supplier.findById(s.supplier);
        if (!supplierExists) {
          continue;
        }
  
        validSuppliers.push({
          supplier: s.supplier,
          importPrice: Number(s.importPrice) || 0,
        });
      }
  
      const imageUrls = req.files?.map((file) => file.path) || [];
  
      const newProduct = new Product({
        name,
        category,
        description,
        price,
        SKU,
        unit,
        images: imageUrls,
        suppliers: validSuppliers,
        status,
      });
  
      await newProduct.save();
  
      // Update suppliers with this product
      if (validSuppliers.length > 0) {
        const supplierIds = validSuppliers.map((s) => s.supplier);
        await Supplier.updateMany(
          { _id: { $in: supplierIds } },
          { $addToSet: { products: newProduct._id } }
        );
      }
  
      return res.status(201).json({
        message: "Product created successfully.",
        product: newProduct,
      });
    } catch (error) {
      console.error("Create product error:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  };
  
  // Update a product
  exports.updateProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, category, description, price, SKU, unit, status } = req.body;
  
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid product ID." });
      }
  
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }
  
      // Parse suppliers from form-data or JSON
      let suppliers = [];
      try {
        suppliers = req.body.suppliers
          ? typeof req.body.suppliers === "string"
            ? JSON.parse(req.body.suppliers)
            : req.body.suppliers
          : [];
      } catch (e) {
        console.error("Error parsing suppliers:", e);
        return res.status(400).json({ message: "Invalid suppliers format." });
      }
  
      // Process category if provided
      if (category) {
        if (!isValidObjectId(category)) {
          return res.status(400).json({ message: "Invalid category ID." });
        }
  
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
          return res.status(404).json({ message: "Category not found." });
        }
        product.category = category;
      }
  
      // Process images
      const imageUrls = req.files?.map((file) => file.path) || [];
      if (imageUrls.length > 0) {
        product.images = [...product.images, ...imageUrls];
      }
  
      // Update basic fields
      if (name) product.name = name;
      if (description) product.description = description;
      if (price) product.price = price;
      if (SKU) product.SKU = SKU;
      if (unit) product.unit = unit;
      if (status) product.status = status;
  
      // Process suppliers
      const validSuppliers = [];
      const newSupplierIds = [];
  
      for (const s of suppliers) {
        if (!s.supplier || !isValidObjectId(s.supplier)) {
          continue;
        }
  
        const supplierExists = await Supplier.findById(s.supplier);
        if (!supplierExists) {
          continue;
        }
  
        validSuppliers.push({
          supplier: s.supplier,
          importPrice: Number(s.importPrice) || 0,
        });
        newSupplierIds.push(s.supplier);
      }
  
      // Get old supplier IDs for comparison
      const oldSupplierIds = product.suppliers.map((s) => s.supplier.toString());
  
      // Update product's suppliers
      product.suppliers = validSuppliers;
  
      // Determine which suppliers to add/remove
      const suppliersToAdd = newSupplierIds.filter(
        (id) => !oldSupplierIds.includes(id)
      );
      const suppliersToRemove = oldSupplierIds.filter(
        (id) => !newSupplierIds.includes(id)
      );
  
      // Update suppliers' product lists
      if (suppliersToAdd.length > 0) {
        await Supplier.updateMany(
          { _id: { $in: suppliersToAdd } },
          { $addToSet: { products: product._id } }
        );
      }
  
      if (suppliersToRemove.length > 0) {
        await Supplier.updateMany(
          { _id: { $in: suppliersToRemove } },
          { $pull: { products: product._id } }
        );
      }
  
      await product.save();
      return res.status(200).json({ message: "Product updated.", product });
    } catch (error) {
      console.error("Update product error:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  };
  
// Get all products (both active and inactive)
exports.getAll = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category")

      .populate("suppliers.supplier", "name contact");

    return res.status(200).json(products);
  } catch (error) {
    console.error("Get all products error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
// Get all products (active only)
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: "active" })
      .populate("category")

      .populate("suppliers.supplier", "name contact");

    return res.status(200).json(products);
  } catch (error) {
    console.error("Get products error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Get a product by ID (if active)
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const product = await Product.findOne({ _id: id, status: "active" })
      .populate("category", "name")
      .populate("suppliers.supplier", "name contact");

    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found or inactive." });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    product.status = "inactive";
    await product.save();

    return res
      .status(200)
      .json({ message: "Product has been marked as inactive." });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
