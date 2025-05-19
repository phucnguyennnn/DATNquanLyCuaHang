      const Order = require("../models/Order");
const Product = require("../models/Product");
const Batch = require("../models/Batch");
const { v4: uuidv4 } = require("uuid");
const cron = require("node-cron");

exports.createOrder = async (req, res) => {
  try {
    const { orderType = "instore", ...rest } = req.body;
    if (orderType === "preorder") return this.handlePreorder(req, res);
    return this.handleInstoreOrder(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

exports.handlePreorder = async (req, res) => {
  const { items, expirationDays = 3 } = req.body;
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + parseInt(expirationDays));

  const orderProducts = await Promise.all(
    items.map(async (item) => {
      const product = await Product.findById(item.product);
      const baseUnit = product.units.find((u) => u.ratio === 1);
      return {
        productId: item.product,
        quantity: item.quantity,
        selectedUnitName: baseUnit.name,
        unitPrice: baseUnit.salePrice,
        originalUnitPrice: baseUnit.salePrice,
        batchesUsed: [],
        itemTotal: item.quantity * baseUnit.salePrice,
      };
    })
  );

  const order = new Order({
    ...req.body,
    orderType: "preorder", // Đặt là preorder
    expirationDate,
    products: orderProducts,
    paymentStatus: "unpaid",
    status: "pending", // Trạng thái pending
    orderNumber: uuidv4(),
  });

  await order.save();
  res.status(201).json(order);
};

exports.handleInstoreOrder = async (req, res) => {
  try {
    const { items, taxRate = 0 } = req.body;
    const orderProducts = [];
    let totalAmount = 0;
    let discountAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      const selectedUnit = product.units.find(
        (u) => u.name === item.selectedUnit.name
      );

      if (!selectedUnit)
        throw new Error(`Đơn vị ${item.selectedUnit.name} không tồn tại`);
      if (!selectedUnit.salePrice)
        throw new Error(
          `Không tìm thấy giá cho đơn vị ${item.selectedUnit.name}`
        );

      let batchesUsedForProduct;
      if (
        item.batchesUsed &&
        Array.isArray(item.batchesUsed) &&
        item.batchesUsed.length > 0
      ) {
        // Sử dụng batches đã được chọn từ frontend
        batchesUsedForProduct = item.batchesUsed.map((batchInfo) => ({
          batchId: batchInfo.batchId,
          quantity: batchInfo.quantity,
        }));
      } else {
        // Nếu không có thông tin batch từ frontend, tự động chọn
        const baseUnit = product.units.find((u) => u.ratio === 1);
        const baseQuantity = item.quantity * selectedUnit.ratio;
        const selectedBatches = await this.selectGoodBatches(
          item.product,
          baseQuantity
        );
        batchesUsedForProduct = selectedBatches.map((b) => ({
          batchId: b.batchId,
          quantity: b.quantity,
        }));
      }

      // Tính toán giá dựa trên batches đã chọn
      let itemTotal = 0;
      for (const batchInfo of batchesUsedForProduct) {
        const batch = await Batch.findById(batchInfo.batchId);
        if (batch) {
          itemTotal +=
            ((batch.getDiscountedPrice
              ? await batch.getDiscountedPrice()
              : batch.unitPrice) *
              batchInfo.quantity) /
            selectedUnit.ratio;
        } else {
          console.warn(`Không tìm thấy batch với ID: ${batchInfo.batchId}`);
          // Xử lý trường hợp không tìm thấy batch
        }
      }

      const baseUnit = product.units.find((u) => u.ratio === 1);
      const originalUnitPrice = baseUnit.salePrice * selectedUnit.ratio;
      const unitPrice = itemTotal / item.quantity;
      const originalTotal = originalUnitPrice * item.quantity;

      orderProducts.push({
        productId: item.product,
        quantity: item.quantity,
        selectedUnitName: selectedUnit.name,
        unitRatio: selectedUnit.ratio,
        batchesUsed: batchesUsedForProduct.map((b) => ({
          batchId: b.batchId,
          quantity: b.quantity,
          unitPrice: (async () => {
            const batch = await Batch.findById(b.batchId);
            return batch
              ? (batch.getDiscountedPrice
                  ? await batch.getDiscountedPrice()
                  : batch.unitPrice) / selectedUnit.ratio
              : 0;
          })(), // Cần xử lý bất đồng bộ ở đây hoặc tính toán trước
        })),
        itemTotal: parseFloat(itemTotal.toFixed(2)),
        originalUnitPrice: parseFloat(originalUnitPrice.toFixed(2)),
        unitPrice: parseFloat(unitPrice.toFixed(2)),
      });

      totalAmount += originalTotal;
      discountAmount += originalTotal - itemTotal;
    }

    // Tính toán thuế và tổng cuối
    const taxAmount = (totalAmount - discountAmount) * taxRate;
    const finalAmount = totalAmount - discountAmount + taxAmount;

    const order = new Order({
      ...req.body,
      employeeId: req.user,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      taxRate: parseFloat(taxRate.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2)),
      products: orderProducts,
      status: "completed", // Đặt là completed
      paymentStatus: req.body.paymentMethod === "cash" ? "paid" : "pending",
      orderNumber: uuidv4(),
    });

    await order.save();

    // Cập nhật số lượng tồn kho
    for (const product of orderProducts) {
      for (const batchInfo of product.batchesUsed) {
        const resolvedUnitPrice = await batchInfo.unitPrice;
        await Batch.findByIdAndUpdate(batchInfo.batchId, {
          $inc: {
            quantity_on_shelf: -(batchInfo.quantity / product.unitRatio),
            sold_quantity: batchInfo.quantity / product.unitRatio,
          },
        });
      }
    }

    res.status(201).json(order);
  } catch (error) {
    console.error("Lỗi nghiêm trọng khi tạo đơn:", error);
    res.status(500).json({
      message: error.message.startsWith("Lỗi hệ thống")
        ? error.message
        : "Lỗi khi xử lý đơn hàng",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

exports.selectGoodBatches = async (productId, requiredBaseQty) => {
  const batches = await Batch.find({
    product: productId,
    status: "hoạt động",
    expiry_day: { $gte: new Date(Date.now() + 14 * 86400000) },
    quantity_on_shelf: { $gte: requiredBaseQty },
  }).sort({ expiry_day: 1 });

  let remaining = requiredBaseQty;
  const selected = [];

  for (const batch of batches) {
    const take = Math.min(batch.quantity_on_shelf, remaining);
    const unitPrice = await batch.getDiscountedPrice();

    selected.push({
      batchId: batch._id,
      quantity: take,
      unitPrice: unitPrice,
    });

    remaining -= take;
    if (remaining === 0) break;
  }

  if (remaining > 0) throw new Error("Không đủ hàng trên quầy");
  return selected;
};

cron.schedule("0 0 * * *", async () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expiredOrders = await Order.find({
    orderType: "preorder",
    status: "pending", // Tìm các đơn hàng pending
    expirationDate: { $lte: now },
  });

  for (const order of expiredOrders) {
    order.status = "cancelled";
    await order.save();
  }
});

exports.updateBatchQuantities = async (batches) => {
  for (const { batchId, quantity } of batches) {
    await Batch.findByIdAndUpdate(batchId, {
      $inc: {
        quantity_on_shelf: -quantity,
        sold_quantity: quantity,
      },
    }).catch((err) => {
      throw new Error("Lỗi cập nhật tồn kho");
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("customerId")
      .populate("employeeId")
      .populate("products.productId")
      .populate("products.batchesUsed.batchId");
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi lấy thông tin đơn hàng",
      error: error.message,
    });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { $or: orQuery, startDate, endDate, ...otherQueries } = req.query;
    const query = { ...otherQueries };

    // Xử lý filter theo thời gian
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    let orders = await Order.find(query)
      .populate("customerId", "fullName")
      .populate("employeeId", "fullName")
      .populate("products.productId", "name")
      .sort({ createdAt: -1 });

    if (orQuery) {
      const filteredOrders = orders.filter((order) => {
        const customerName = order.customerId?.fullName || "";
        const employeeName = order.employeeId?.fullName || "";
        const orderNumberMatch = order.orderNumber
          .toLowerCase()
          .includes(orQuery.toLowerCase());
        const customerNameMatch = customerName
          .toLowerCase()
          .includes(orQuery.toLowerCase());
        const employeeNameMatch = employeeName
          .toLowerCase()
          .includes(orQuery.toLowerCase());
        return orderNumberMatch || customerNameMatch || employeeNameMatch;
      });
      return res.status(200).json(filteredOrders);
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi lấy danh sách đơn hàng",
      error: error.message,
    });
  }
};


