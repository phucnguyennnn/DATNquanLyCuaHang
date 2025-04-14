const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const Batch = require("../models/Batch");
const Inventory = require("../models/Inventory");
const { isValidObjectId } = require("mongoose");

// Helper function to parse JSON fields
const parseJsonField = (field) => {
  if (!field) return undefined;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (error) {
      throw new Error(`Invalid JSON format in ${field}`);
    }
  }
  return field;
};

exports.createProduct = async (req, res) => {
  try {
    // Parse all JSON string fields
    let expiryDiscountRules = parseJsonField(req.body.expiryDiscountRules);
    let suppliers = parseJsonField(req.body.suppliers);
    let discount = parseJsonField(req.body.discount);

    // Extract other fields
    const {
      name,
      category,
      description,
      price,
      costPrice,
      SKU,
      barcode,
      unit,
      minStockLevel,
      reorderLevel,
      weight,
      dimensions,
      taxRate,
      tags
    } = req.body;

    // Validate required fields
    const requiredFields = { name, category, price, SKU, unit };
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({ 
          success: false,
          message: `${field} is a required field.` 
        });
      }
    }

    if (!isValidObjectId(category)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid category ID format." 
      });
    }

    // Check if category exists
    const categoryExists = await Category.exists({ _id: category });
    if (!categoryExists) {
      return res.status(404).json({ 
        success: false,
        message: "Category not found." 
      });
    }

    // Check for duplicate SKU or barcode
    const existingProduct = await Product.findOne({
      $or: [
        { SKU: SKU },
        ...(barcode ? [{ barcode: barcode }] : [])
      ]
    });
    if (existingProduct) {
      return res.status(400).json({ 
        success: false,
        message: "Product with this SKU or barcode already exists." 
      });
    }

    // Process and validate suppliers
    let supplierInfo = [];
    if (suppliers && Array.isArray(suppliers)) {
      for (const [index, supplier] of suppliers.entries()) {
        if (!supplier || typeof supplier !== 'object') {
          return res.status(400).json({
            success: false,
            message: `Invalid supplier format at position ${index + 1}`,
            invalidEntry: supplier
          });
        }

        if (!supplier.supplier) {
          return res.status(400).json({
            success: false,
            message: `Supplier ID is required at position ${index + 1}`,
            invalidEntry: supplier
          });
        }

        if (!isValidObjectId(supplier.supplier)) {
          return res.status(400).json({
            success: false,
            message: `Invalid supplier ID format at position ${index + 1}`,
            invalidEntry: supplier
          });
        }

        const supplierExists = await Supplier.exists({ _id: supplier.supplier });
        if (!supplierExists) {
          return res.status(404).json({ 
            success: false,
            message: `Supplier not found: ${supplier.supplier}`,
            invalidEntry: supplier
          });
        }

        supplierInfo.push({
          supplier: supplier.supplier,
          importPrice: Number(supplier.importPrice) || 0,
          minOrderQuantity: Number(supplier.minOrderQuantity) || 1,
          leadTime: Number(supplier.leadTime) || 0,
          isPrimary: Boolean(supplier.isPrimary)
        });
      }
    }

    // Validate expiryDiscountRules
    if (expiryDiscountRules && !Array.isArray(expiryDiscountRules)) {
      return res.status(400).json({
        success: false,
        message: "expiryDiscountRules must be an array"
      });
    }

    // Create new product
    const newProduct = new Product({
      name,
      category,
      description,
      price,
      costPrice,
      SKU,
      barcode,
      unit,
      minStockLevel,
      reorderLevel,
      weight,
      dimensions,
      taxRate,
      tags,
      expiryDiscountRules,
      discount,
      suppliers: supplierInfo,
      images: req.files?.map(file => file.path) || []
    });

    await newProduct.save();

    // Update suppliers with this product reference
    if (supplierInfo.length > 0) {
      await Supplier.updateMany(
        { _id: { $in: supplierInfo.map(s => s.supplier) } },
        { $addToSet: { products: newProduct._id } }
      );
    }

    // Create initial inventory record
    const newInventory = new Inventory({
      product: newProduct._id,
      warehouse_stock: 0,
      shelf_stock: 0,
      reserved_stock: 0,
      sold_stock: 0
    });
    await newInventory.save();

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: newProduct
    });

  } catch (error) {
    console.error("Create product error:", error);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate key error",
        field: Object.keys(error.keyPattern)[0]
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const queryObj = { ...req.query, active: true };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    let query = Product.find(JSON.parse(queryStr))
      .populate({
        path: 'category',
        select: 'name description'
      })
      .populate({
        path: 'suppliers.supplier',
        select: 'name company contact.phone contact.email'
      });

    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    const products = await query;

    return res.status(200).json({
      success: true,
      results: products.length,
      data: products
    });

  } catch (error) {
    console.error("Get products error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error." 
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const products = await Product.find()
      .populate({
        path: 'category',
        select: 'name description'
      })
      .populate({
        path: 'suppliers.supplier',
        select: 'name company contact.phone contact.email'
      })
      .populate({
        path: 'batches',
        select: 'manufacture_day expiry_day remaining_quantity status'
      });

    return res.status(200).json({
      success: true,
      results: products.length,
      data: products
    });

  } catch (error) {
    console.error("Get all products error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error." 
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid product ID." 
      });
    }

    const product = await Product.findById(id)
      .populate({
        path: 'category',
        select: 'name description parentCategory'
      })
      .populate({
        path: 'suppliers.supplier',
        select: 'name company contact.phone contact.email paymentTerms'
      })
      .populate({
        path: 'batches',
        match: { status: 'active' },
        select: 'manufacture_day expiry_day remaining_quantity status import_price discountInfo'
      });

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found." 
      });
    }

    const inventory = await Inventory.findOne({ product: id })
      .select('warehouse_stock shelf_stock reserved_stock sold_stock stock_status');

    return res.status(200).json({
      success: true,
      data: {
        ...product.toObject(),
        inventory
      }
    });

  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error." 
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid product ID." 
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found." 
      });
    }

    // Parse JSON fields
    if (typeof updates.expiryDiscountRules === 'string') {
      updates.expiryDiscountRules = parseJsonField(updates.expiryDiscountRules);
    }
    if (typeof updates.suppliers === 'string') {
      updates.suppliers = parseJsonField(updates.suppliers);
    }
    if (typeof updates.discount === 'string') {
      updates.discount = parseJsonField(updates.discount);
    }

    // Handle category update
    if (updates.category) {
      if (!isValidObjectId(updates.category)) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid category ID." 
        });
      }

      const categoryExists = await Category.findById(updates.category);
      if (!categoryExists) {
        return res.status(404).json({ 
          success: false,
          message: "Category not found." 
        });
      }
    }

    // Handle SKU/barcode uniqueness
    if (updates.SKU || updates.barcode) {
      const existingProduct = await Product.findOne({
        $and: [
          { _id: { $ne: id } },
          {
            $or: [
              ...(updates.SKU ? [{ SKU: updates.SKU }] : []),
              ...(updates.barcode ? [{ barcode: updates.barcode }] : [])
            ]
          }
        ]
      });

      if (existingProduct) {
        return res.status(400).json({ 
          success: false,
          message: "Another product with this SKU or barcode already exists." 
        });
      }
    }

    // Handle suppliers update
    if (updates.suppliers !== undefined) {
      if (!Array.isArray(updates.suppliers)) {
        return res.status(400).json({
          success: false,
          message: "Suppliers must be an array"
        });
      }

      const oldSupplierIds = product.suppliers.map(s => s.supplier.toString());
      const newSupplierIds = [];
      const validSuppliers = [];

      for (const [index, supplier] of updates.suppliers.entries()) {
        if (!supplier || typeof supplier !== 'object') {
          return res.status(400).json({
            success: false,
            message: `Invalid supplier format at position ${index + 1}`,
            invalidEntry: supplier
          });
        }

        if (!supplier.supplier) {
          return res.status(400).json({
            success: false,
            message: `Supplier ID is required at position ${index + 1}`,
            invalidEntry: supplier
          });
        }

        if (!isValidObjectId(supplier.supplier)) {
          return res.status(400).json({
            success: false,
            message: `Invalid supplier ID format at position ${index + 1}`,
            invalidEntry: supplier
          });
        }

        const supplierExists = await Supplier.findById(supplier.supplier);
        if (!supplierExists) {
          return res.status(404).json({ 
            success: false,
            message: `Supplier not found: ${supplier.supplier}`,
            invalidEntry: supplier
          });
        }

        validSuppliers.push({
          supplier: supplier.supplier,
          importPrice: Number(supplier.importPrice) || 0,
          minOrderQuantity: Number(supplier.minOrderQuantity) || 1,
          leadTime: Number(supplier.leadTime) || 0,
          isPrimary: Boolean(supplier.isPrimary)
        });

        newSupplierIds.push(supplier.supplier.toString());
      }

      // Determine suppliers to add/remove
      const suppliersToAdd = newSupplierIds.filter(id => !oldSupplierIds.includes(id));
      const suppliersToRemove = oldSupplierIds.filter(id => !newSupplierIds.includes(id));

      // Update product's suppliers
      product.suppliers = validSuppliers;

      // Update supplier references
      if (suppliersToAdd.length > 0) {
        await Supplier.updateMany(
          { _id: { $in: suppliersToAdd } },
          { $addToSet: { products: id } }
        );
      }

      if (suppliersToRemove.length > 0) {
        await Supplier.updateMany(
          { _id: { $in: suppliersToRemove } },
          { $pull: { products: id } }
        );
      }
    }

    // Handle images update
    if (req.files && req.files.length > 0) {
      product.images = [...product.images, ...req.files.map(file => file.path)];
    }

    // Update other fields
    const allowedUpdates = [
      'name', 'category', 'description', 'price', 'costPrice', 
      'SKU', 'barcode', 'unit', 'minStockLevel', 'reorderLevel',
      'weight', 'dimensions', 'taxRate', 'tags', 'expiryDiscountRules',
      'discount', 'active'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        product[field] = updates[field];
      }
    });

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: product
    });

  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error.",
      error: error.message 
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid product ID." 
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found." 
      });
    }

    // Remove product reference from suppliers
    await Supplier.updateMany(
      { products: id },
      { $pull: { products: id } }
    );

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully.",
      data: product
    });

  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error." 
    });
  }
};

exports.getProductInventory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid product ID." 
      });
    }

    const inventory = await Inventory.findOne({ product: id })
      .populate({
        path: 'product',
        select: 'name SKU barcode'
      });

    if (!inventory) {
      return res.status(404).json({ 
        success: false,
        message: "Inventory record not found for this product." 
      });
    }

    return res.status(200).json({
      success: true,
      data: inventory
    });

  } catch (error) {
    console.error("Get product inventory error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error." 
    });
  }
};

exports.getProductBatches = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid product ID." 
      });
    }

    const query = { product: id };
    if (status) {
      query.status = status;
    }

    const batches = await Batch.find(query)
      .populate({
        path: 'supplier',
        select: 'name contact.phone'
      })
      .sort('-manufacture_day');

    return res.status(200).json({
      success: true,
      results: batches.length,
      data: batches
    });

  } catch (error) {
    console.error("Get product batches error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error." 
    });
  }
};