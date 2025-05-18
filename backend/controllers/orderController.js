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

exports.fulfillPreorder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "products.productId"
    );
    if (order.status !== "pending")
      // Kiểm tra trạng thái pending
      return res.status(400).json({ message: "Đơn hàng không hợp lệ" });

    for (const item of order.products) {
      const product = await Product.findById(item.productId);
      const batches = await this.selectGoodBatches(
        item.productId._id,
        item.quantity * product.units.find((u) => u.ratio === 1).ratio
      );
      item.batchesUsed = batches.map((b) => ({
        batchId: b.batchId,
        quantity: b.quantity,
        unitPrice: b.unitPrice,
      }));
      await this.updateBatchQuantities(batches);
    }

    order.status = "completed"; // Chuyển sang trạng thái completed
    order.paymentStatus = "paid";
    await order.save();
    res.json({ message: "Nhận hàng thành công", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

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

exports.addItemToHoldOrder = async (req, res) => {
  try {
    const { items: newItems } = req.body;
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "pending")
      // Chỉ cho phép thêm vào đơn hàng pending
      return res.status(400).json({
        message: "Chỉ có thể thêm sản phẩm vào đơn hàng ở trạng thái chờ",
      });
    const existingProducts = [...order.products];
    let totalAmount = order.totalAmount || 0;
    let discountAmount = order.discountAmount || 0;

    for (const itemData of newItems) {
      const {
        product: productId,
        quantity: requestedQuantity,
        batchesUsed,
        discount: productDiscount = 0,
        units: selectedUnitName,
      } = itemData;

      const product = await Product.findById(productId);
      if (!product)
        return res
          .status(404)
          .json({ message: `Không tìm thấy sản phẩm với ID: ${productId}` });
      if (!Array.isArray(batchesUsed) || batchesUsed.length === 0)
        return res.status(400).json({
          message: `Vui lòng cung cấp thông tin lô hàng đã sử dụng cho sản phẩm ${product.name}`,
        });
      let totalQuantityFromBatches = 0;
      for (const batchInfo of batchesUsed) {
        totalQuantityFromBatches += batchInfo.quantity;
        const batch = await Batch.findById(batchInfo.batchId);
        if (!batch)
          return res.status(404).json({
            message: `Không tìm thấy lô hàng với ID: ${batchInfo.batchId}`,
          });
      }

      const selectedUnitInfo = product.units.find(
        (unit) => unit.name === selectedUnitName
      );
      if (!selectedUnitInfo || selectedUnitInfo.salePrice === undefined) {
        return res.status(400).json({
          message: `Không tìm thấy giá bán cho đơn vị "${selectedUnitName}" của sản phẩm ${productId}`,
        });
      }

      const expectedBaseQuantity = requestedQuantity * selectedUnitInfo.ratio;
      if (totalQuantityFromBatches !== expectedBaseQuantity) {
        return res.status(400).json({
          message: `Tổng số lượng từ các lô (${totalQuantityFromBatches}) không khớp với số lượng yêu cầu (${requestedQuantity} ${selectedUnitName} = ${expectedBaseQuantity} đơn vị cơ bản) cho sản phẩm ${product.name}`,
        });
      }

      const originalUnitPrice = selectedUnitInfo.salePrice;
      let currentItemTotal = 0;
      let totalBatchDiscountAmount = 0;
      const itemBatches = [];
      for (const batchUsed of batchesUsed) {
        const batch = await Batch.findById(batchUsed.batchId);
        let batchUnitPrice = originalUnitPrice;
        let batchDiscountAmount = 0;
        if (batch.discountInfo && batch.discountInfo.isDiscounted) {
          if (batch.discountInfo.discountType === "percentage") {
            batchUnitPrice =
              originalUnitPrice * (1 - batch.discountInfo.discountValue / 100);
            batchDiscountAmount =
              originalUnitPrice * (batch.discountInfo.discountValue / 100);
          } else if (batch.discountInfo.discountType === "fixed_amount") {
            batchUnitPrice = Math.max(
              0,
              originalUnitPrice - batch.discountInfo.discountValue
            );
            batchDiscountAmount = originalUnitPrice - batchUnitPrice;
          }
        }
        currentItemTotal += batchUnitPrice * batchUsed.quantity;
        totalBatchDiscountAmount += batchDiscountAmount * batchUsed.quantity;
        itemBatches.push({
          batchId: batchUsed.batchId,
          quantity: batchUsed.quantity,
          unitPrice: batchUnitPrice,
          discountAmount: batchDiscountAmount,
        });
      }
      const unitPrice =
        (currentItemTotal / expectedBaseQuantity) * selectedUnitInfo.ratio;
      const additionalDiscountAmount =
        unitPrice * (productDiscount / 100) * requestedQuantity;
      const itemTotal = currentItemTotal - additionalDiscountAmount;
      const existingProductIndex = existingProducts.findIndex(
        (p) => p.productId.toString() === productId.toString()
      );
      if (existingProductIndex > -1) {
        existingProducts[existingProductIndex].quantity += requestedQuantity;
        existingProducts[existingProductIndex].itemTotal += itemTotal;
        existingProducts[existingProductIndex].batchesUsed = [
          ...existingProducts[existingProductIndex].batchesUsed,
          ...itemBatches,
        ];
        existingProducts[existingProductIndex].unitPrice = unitPrice;
        existingProducts[existingProductIndex].originalUnitPrice =
          originalUnitPrice;
        existingProducts[existingProductIndex].selectedUnitName =
          selectedUnitName;
      } else {
        existingProducts.push({
          productId,
          quantity: requestedQuantity,
          selectedUnitName,
          batchesUsed: itemBatches,
          discount: productDiscount,
          itemTotal,
          unitPrice,
          originalUnitPrice: originalUnitPrice,
        });
      }
      totalAmount += originalUnitPrice * requestedQuantity;
      discountAmount += totalBatchDiscountAmount + additionalDiscountAmount;
    }
    const newFinalAmount =
      totalAmount -
      discountAmount +
      (totalAmount - discountAmount) * order.taxRate;
    order.products = existingProducts;
    order.totalAmount = totalAmount;
    order.discountAmount = discountAmount;
    order.finalAmount = newFinalAmount;
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi thêm sản phẩm vào đơn hàng chờ",
      error: error.message,
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

exports.processPaymentSuccess = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    if (order.status === "completed" && order.paymentStatus === "paid") {
      return res.status(400).json({
        message: "Đơn hàng này đã được thanh toán và hoàn thành trước đó",
      });
    }

    // Cập nhật số lượng đã bán và còn lại trong các lô
    for (const productItem of order.products) {
      const product = await Product.findById(productItem.productId);
      const selectedUnitInfo = product.units.find(
        (unit) => unit.name === productItem.selectedUnitName
      );
      const baseQuantitySold =
        productItem.quantity * (selectedUnitInfo ? selectedUnitInfo.ratio : 1);

      for (const batchUsed of productItem.batchesUsed) {
        await Batch.findByIdAndUpdate(batchUsed.batchId, {
          $inc: {
            remaining_quantity: -batchUsed.quantity,
            sold_quantity: batchUsed.quantity,
          },
        });
      }
    }

    order.status = "completed";
    order.paymentStatus = "paid";
    await order.save();

    res.status(200).json({
      message: "Thanh toán thành công và đã cập nhật số lượng lô hàng",
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi xử lý thanh toán thành công và cập nhật lô hàng",
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

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: "cancelled" },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.status(200).json({ message: "Đơn hàng đã được hủy", order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi khi hủy đơn hàng", error: error.message });
  }
};

exports.holdOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: "pending_hold" },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res
      .status(200)
      .json({ message: "Đơn hàng đã được chuyển sang trạng thái chờ", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi chuyển đơn hàng sang trạng thái chờ",
      error: error.message,
    });
  }
};

exports.resumeOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: "pending" },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.status(200).json({ message: "Đơn hàng đã được tiếp tục", order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi khi tiếp tục đơn hàng", error: error.message });
  }
};

exports.recordDeposit = async (req, res) => {
  try {
    const { depositAmount } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status: "deposit",
        depositAmount: depositAmount,
        paymentStatus: "partial",
      },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.status(200).json({ message: "Đã ghi nhận đặt cọc", order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi khi ghi nhận đặt cọc", error: error.message });
  }
};

exports.createDepositOrderFromCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Giỏ hàng đang trống" });
    const { depositAmount, paymentMethod, taxRate = 0 } = req.body;
    if (!depositAmount)
      return res.status(400).json({ message: "Vui lòng cung cấp số tiền cọc" });
    const orderProducts = [];
    let totalAmount = 0;
    let discountAmount = 0;
    for (const cartItem of cart.items) {
      const { product, quantity } = cartItem;
      const availableBatches = await Batch.find({
        product: product._id,
        remaining_quantity: { $gt: 0 },
      }).sort({ expiry_day: 1 });
      const batchesUsed = [];
      let remainingToFulfill = quantity;
      let selectedUnitInfoForCart = product.units.find(
        (unit) => unit.ratio === 1
      ); // Mặc định lấy đơn vị cơ bản từ giỏ hàng
      // Bạn có thể cần logic phức tạp hơn nếu muốn người dùng chọn đơn vị trong giỏ hàng

      if (
        !selectedUnitInfoForCart ||
        selectedUnitInfoForCart.salePrice === undefined
      )
        return res.status(400).json({
          message: `Không tìm thấy giá bán cho sản phẩm ${product._id}`,
        });

      for (const batch of availableBatches) {
        if (remainingToFulfill <= 0) break;
        const fulfillQuantity = Math.min(
          remainingToFulfill,
          batch.remaining_quantity
        );
        if (fulfillQuantity > 0) {
          batchesUsed.push({ batchId: batch._id, quantity: fulfillQuantity });
          remainingToFulfill -= fulfillQuantity;
        }
      }
      if (remainingToFulfill > 0)
        return res.status(400).json({
          message: `Không đủ số lượng cho sản phẩm ${product.name} trong kho.`,
        });

      const originalUnitPrice = selectedUnitInfoForCart.salePrice;
      let currentItemTotal = 0;
      let totalBatchDiscountAmount = 0;
      let productDiscount = 0;
      const itemBatches = [];
      for (const batchUsed of batchesUsed) {
        const batch = await Batch.findById(batchUsed.batchId);
        let batchUnitPrice = originalUnitPrice;
        let batchDiscountAmount = 0;
        if (batch.discountInfo && batch.discountInfo.isDiscounted) {
          if (batch.discountInfo.discountType === "percentage") {
            batchUnitPrice =
              originalUnitPrice * (1 - batch.discountInfo.discountValue / 100);
            batchDiscountAmount =
              originalUnitPrice * (batch.discountInfo.discountValue / 100);
          } else if (batch.discountInfo.discountType === "fixed_amount") {
            batchUnitPrice = Math.max(
              0,
              originalUnitPrice - batch.discountInfo.discountValue
            );
            batchDiscountAmount = originalUnitPrice - batchUnitPrice;
          }
        }
        currentItemTotal += batchUnitPrice * batchUsed.quantity;
        totalBatchDiscountAmount += batchDiscountAmount * batchUsed.quantity;
        itemBatches.push({
          batchId: batchUsed.batchId,
          quantity: batchUsed.quantity,
          unitPrice: batchUnitPrice,
          discountAmount: batchDiscountAmount,
        });
      }
      const unitPrice = currentItemTotal / quantity;
      const additionalDiscountAmount =
        unitPrice * (productDiscount / 100) * quantity;
      const itemTotal = currentItemTotal - additionalDiscountAmount;
      orderProducts.push({
        productId: product._id,
        quantity,
        unitPrice,
        selectedUnitName: selectedUnitInfoForCart.name, // Lưu tên đơn vị cơ bản từ giỏ hàng
        batchesUsed: itemBatches,
        discount: productDiscount,
        itemTotal,
      });
      totalAmount += originalUnitPrice * quantity;
      discountAmount += totalBatchDiscountAmount + additionalDiscountAmount;
    }
    const finalAmount =
      totalAmount - discountAmount + (totalAmount - discountAmount) * taxRate;
    const orderData = {
      customerId: userId,
      products: orderProducts,
      totalAmount,
      discountAmount,
      finalAmount,
      taxRate,
      taxAmount: (totalAmount - discountAmount) * taxRate,
      employeeId: req.user._id,
      status: "preorder", // Đặt trạng thái là preorder
      paymentMethod: paymentMethod || "online",
      paymentStatus: "partial",
      depositAmount,
    };
    const order = new Order(orderData);
    await order.save();
    await Cart.deleteOne({ user: userId });
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi tạo đơn hàng đặt trước từ giỏ hàng",
      error: error.message,
    });
  }
};

// Thêm các hàm mới

/**
 * Lấy thông tin chi tiết đơn hàng theo ID, bao gồm cả thông tin sản phẩm và lô hàng.
 * @param {string} orderId - ID của đơn hàng cần lấy.
 * @returns {Promise<Order>} - Đối tượng đơn hàng đã được populate.
 */
async function getOrderDetails(orderId) {
  return Order.findById(orderId)
    .populate("customerId")
    .populate("employeeId")
    .populate("products.productId")
    .populate("products.batchesUsed.batchId");
}

/**
 * Chọn lô hàng tối ưu cho sản phẩm dựa trên số lượng yêu cầu và hạn sử dụng.
 * @param {string} productId - ID của sản phẩm.
 * @param {number} requiredQuantity - Số lượng sản phẩm yêu cầu (đơn vị cơ bản).
 * @returns {Promise<Array>} - Mảng các lô hàng được chọn, mỗi lô có thông tin batchId và quantity.
 */
async function selectOptimalBatches(productId, requiredQuantity) {
  // Logic chọn lô hàng tối ưu (tương tự như selectGoodBatches nhưng có thể điều chỉnh)
  const batches = await Batch.find({
    product: productId,
    status: "hoạt động",
    expiry_day: { $gte: new Date(Date.now() + 14 * 86400000) },
    quantity_on_shelf: { $gte: requiredQuantity },
  }).sort({ expiry_day: 1 }); // Sắp xếp theo hạn sử dụng tăng dần

  let remaining = requiredQuantity;
  const selectedBatches = [];

  for (const batch of batches) {
    const quantityToTake = Math.min(remaining, batch.quantity_on_shelf);
    selectedBatches.push({
      batchId: batch._id,
      quantity: quantityToTake,
    });
    remaining -= quantityToTake;
    if (remaining <= 0) break;
  }

  if (remaining > 0) {
    throw new Error("Không đủ số lượng sản phẩm trong kho");
  }

  return selectedBatches;
}

/**
 * Cập nhật số lượng sản phẩm trong các lô hàng.
 * @param {Array} batches - Mảng các lô hàng cần cập nhật, mỗi lô có thông tin batchId và quantity.
 * @returns {Promise<void>}
 */
async function updateQuantities(batches) {
  for (const batch of batches) {
    await Batch.findByIdAndUpdate(batch.batchId, {
      $inc: {
        quantity_on_shelf: -batch.quantity,
        sold_quantity: batch.quantity,
      },
    }).exec();
  }
}

/**
 * Tính toán giá của sản phẩm dựa trên lô hàng và đơn vị được chọn.
 * @param {Array} batchesUsed - Mảng các lô hàng đã sử dụng.
 * @param {string} selectedUnitName - Tên của đơn vị sản phẩm được chọn.
 * @param {Product} product - Đối tượng sản phẩm.
 * @returns {number} - Tổng giá của sản phẩm.
 */
async function calculateItemPrice(batchesUsed, selectedUnitName, product) {
  const selectedUnit = product.units.find(
    (unit) => unit.name === selectedUnitName
  );
  if (!selectedUnit) {
    throw new Error(`Không tìm thấy đơn vị ${selectedUnitName}`);
  }

  let itemPrice = 0;
  for (const batchInfo of batchesUsed) {
    const batch = await Batch.findById(batchInfo.batchId);
    if (!batch) {
      throw new Error(`Không tìm thấy lô hàng có ID ${batchInfo.batchId}`);
    }
    const batchPrice = batch.getDiscountedPrice
      ? await batch.getDiscountedPrice()
      : batch.unitPrice;
    itemPrice += batchPrice * batchInfo.quantity;
  }
  return itemPrice / selectedUnit.ratio;
}

/**
 * Tạo đơn hàng mới từ giỏ hàng (có thể là đặt trước hoặc mua ngay).
 * @param {object} req - Request object.
 * @param {object} res - Response object.
 * @returns {Promise<void>}
 */
exports.createOrderFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng trống" });
    }

    const {
      orderType = "instore",
      paymentMethod,
      depositAmount,
      taxRate = 0,
    } = req.body;
    const orderProducts = [];
    let totalAmount = 0;
    let discountAmount = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.product;
      const quantity = cartItem.quantity;
      const selectedUnitName = cartItem.selectedUnit.name; // Đơn vị được chọn từ giỏ hàng

      let itemBatches;
      if (orderType === "instore") {
        itemBatches = await selectOptimalBatches(product._id, quantity);
      } else {
        itemBatches = await selectOptimalBatches(product._id, quantity);
      }

      const itemPrice = await calculateItemPrice(
        itemBatches,
        selectedUnitName,
        product
      );
      const selectedUnit = product.units.find(
        (unit) => unit.name === selectedUnitName
      );
      const originalUnitPrice =
        product.units.find((unit) => unit.ratio === 1).salePrice *
        selectedUnit.ratio;
      const originalItemTotal = originalUnitPrice * quantity;

      orderProducts.push({
        productId: product._id,
        quantity: quantity,
        selectedUnitName: selectedUnitName,
        batchesUsed: itemBatches.map((batch) => ({
          batchId: batch.batchId,
          quantity: batch.quantity,
        })),
        itemTotal: itemPrice,
        unitPrice: itemPrice / quantity,
        originalUnitPrice: originalUnitPrice,
      });

      totalAmount += originalItemTotal;
      discountAmount += originalItemTotal - itemPrice;
    }
    const taxAmount = (totalAmount - discountAmount) * taxRate;
    const finalAmount = totalAmount - discountAmount + taxAmount;
    const orderData = {
      customerId: userId,
      employeeId: req.user._id,
      orderType: orderType,
      products: orderProducts,
      totalAmount: totalAmount,
      discountAmount: discountAmount,
      taxRate: taxRate,
      taxAmount: taxAmount,
      finalAmount: finalAmount,
      paymentMethod: paymentMethod,
      paymentStatus: orderType === "preorder" ? "partial" : "pending", // Trạng thái đơn hàng
      depositAmount: orderType === "preorder" ? depositAmount : 0,
      orderNumber: uuidv4(),
    };

    const order = new Order(orderData);
    await order.save();

    if (orderType === "instore") {
      await updateQuantities(orderProducts.flatMap((p) => p.batchesUsed));
    }

    await Cart.deleteOne({ user: userId }); // Xóa giỏ hàng sau khi tạo đơn hàng thành công
    res.status(201).json(order);
  } catch (error) {
    console.error("Lỗi tạo đơn hàng từ giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi tạo đơn hàng", error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await getOrderDetails(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("Lỗi lấy chi tiết đơn hàng:", error);
    res.status(500).json({
      message: "Lỗi lấy chi tiết đơn hàng",
      error: error.message,
    });
  }
};

/**
 * Cập nhật đơn hàng (ví dụ: thay đổi sản phẩm, số lượng, lô hàng).
 * @param {object} req - Request object.
 * @param {object} res - Response object.
 * @returns {Promise<void>}
 */
exports.updateOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const updatedOrderData = req.body;

    // Validate dữ liệu đầu vào (ví dụ: kiểm tra productId, quantity, batchesUsed)
    if (
      !updatedOrderData.products ||
      !Array.isArray(updatedOrderData.products)
    ) {
      return res.status(400).json({ message: "Thiếu thông tin sản phẩm" });
    }

    // Lấy thông tin đơn hàng hiện tại
    const existingOrder = await getOrderDetails(orderId);
    if (!existingOrder) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (existingOrder.status === "completed") {
      return res
        .status(400)
        .json({ message: "Không thể cập nhật đơn hàng đã hoàn thành" });
    }

    let totalAmount = 0;
    let discountAmount = 0;
    const updatedProducts = [];

    for (const updatedProductItem of updatedOrderData.products) {
      const product = await Product.findById(updatedProductItem.productId);
      if (!product) {
        return res
          .status(400)
          .json({
            message: `Không tìm thấy sản phẩm ${updatedProductItem.productId}`,
          });
      }

      const selectedUnitName = updatedProductItem.selectedUnitName;
      const selectedUnit = product.units.find(
        (unit) => unit.name === selectedUnitName
      );
      if (!selectedUnit) {
        return res.status(400).json({
          message: `Không tìm thấy đơn vị ${selectedUnitName} cho sản phẩm  ${updatedProduct.productId}`,
        });
      }
      const quantity = updatedProductItem.quantity;
      let itemBatches = updatedProductItem.batchesUsed;

      if (
        !itemBatches ||
        !Array.isArray(itemBatches) ||
        itemBatches.length === 0
      ) {
        itemBatches = await selectOptimalBatches(
          updatedProductItem.productId,
          quantity * selectedUnit.ratio
        );
      }

      const itemPrice = await calculateItemPrice(
        itemBatches,
        selectedUnitName,
        product
      );
      const originalUnitPrice =
        product.units.find((unit) => unit.ratio === 1).salePrice *
        selectedUnit.ratio;
      const originalItemTotal = originalUnitPrice * quantity;

      updatedProducts.push({
        productId: updatedProductItem.productId,
        quantity: quantity,
        selectedUnitName: selectedUnitName,
        batchesUsed: itemBatches.map((b) => ({
          batchId: b.batchId,
          quantity: b.quantity,
        })),
        itemTotal: itemPrice,
        unitPrice: itemPrice / quantity,
        originalUnitPrice: originalUnitPrice,
      });
      totalAmount += originalItemTotal;
      discountAmount += originalItemTotal - itemPrice;
    }
    const taxRate =
      updatedOrderData.taxRate !== undefined
        ? updatedOrderData.taxRate
        : existingOrder.taxRate;
    const taxAmount = (totalAmount - discountAmount) * taxRate;
    const finalAmount = totalAmount - discountAmount + taxAmount;

    const updatedOrder = {
      products: updatedProducts,
      totalAmount: totalAmount,
      discountAmount: discountAmount,
      taxRate: taxRate,
      taxAmount: taxAmount,
      finalAmount: finalAmount,
      // Các trường khác có thể được cập nhật (ví dụ: địa chỉ giao hàng, ghi chú)
      ...updatedOrderData,
    };

    await Order.findByIdAndUpdate(orderId, updatedOrder, {
      new: true,
      runValidators: true,
    });

    // Sau khi cập nhật đơn hàng thành công, cần cập nhật số lượng trong kho.
    // Lấy thông tin đơn hàng mới nhất để đảm bảo tính chính xác
    const orderAfterUpdate = await getOrderDetails(orderId);

    // Cập nhật số lượng tồn kho
    for (const product of orderAfterUpdate.products) {
      for (const batchInfo of product.batchesUsed) {
        await Batch.findByIdAndUpdate(batchInfo.batchId, {
          $inc: {
            quantity_on_shelf: -batchInfo.quantity,
            sold_quantity: batchInfo.quantity,
          },
        });
      }
    }

    res
      .status(200)
      .json({ message: "Đơn hàng đã được cập nhật", order: orderAfterUpdate });
  } catch (error) {
    console.error("Lỗi cập nhật đơn hàng:", error);
    res
      .status(500)
      .json({ message: "Lỗi cập nhật đơn hàng", error: error.message });
  }
};

/**
 * Xử lý thanh toán thành công cho đơn hàng.
 * @param {object} req - Request object.
 * @param {object} res - Response object.
 * @returns {Promise<void>}
 */
exports.processOnlinePaymentSuccess = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: "completed", paymentStatus: "paid" },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res
      .status(200)
      .json({ message: "Thanh toán trực tuyến thành công", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi xử lý thanh toán trực tuyến thành công",
      error: error.message,
    });
  }
};

/**
 * Tính toán tiền thừa cho đơn hàng.
 * @param {object} req - Request object.
 * @param {object} res - Response object.
 * @returns {Promise<void>}
 */
exports.calculateChange = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amountPaid } = req.body;
    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.finalAmount === undefined)
      return res.status(400).json({
        message: "Không thể tính tiền thừa do thiếu thông tin tổng tiền",
      });
    const change = amountPaid - order.finalAmount;
    res.status(200).json({ change: change >= 0 ? change : 0 });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi khi tính tiền thừa", error: error.message });
  }
};

/**
 * Xử lý thanh toán tiền mặt cho đơn hàng.
 * @param {object} req - Request object.
 * @param {object} res - Response object.
 * @returns {Promise<void>}
 */
exports.processCashPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amountPaid } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (amountPaid >= order.finalAmount) {
      // Cập nhật số lượng đã bán và còn lại trong các lô
      for (const productItem of order.products) {
        const product = await Product.findById(productItem.productId);
        const selectedUnitInfo = product.units.find(
          (unit) => unit.name === productItem.selectedUnitName
        );
        const baseQuantitySold =
          productItem.quantity *
          (selectedUnitInfo ? selectedUnitInfo.ratio : 1);

        for (const batchUsed of productItem.batchesUsed) {
          await Batch.findByIdAndUpdate(batchUsed.batchId, {
            $inc: {
              remaining_quantity: -batchUsed.quantity,
              sold_quantity: batchUsed.quantity,
            },
          });
        }
      }

      order.paymentStatus = "paid";
      order.status = "completed";
      await order.save();

      res.status(200).json({
        message:
          "Thanh toán tiền mặt thành công và đã cập nhật số lượng lô hàng",
        order,
      });
    } else {
      res.status(400).json({ message: "Số tiền khách trả không đủ" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi xử lý thanh toán tiền mặt và cập nhật lô hàng",
      error: error.message,
    });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: "cancelled" },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.status(200).json({ message: "Đơn hàng đã được hủy", order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi khi hủy đơn hàng", error: error.message });
  }
};

exports.holdOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: "pending_hold" },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res
      .status(200)
      .json({ message: "Đơn hàng đã được chuyển sang trạng thái chờ", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi chuyển đơn hàng sang trạng thái chờ",
      error: error.message,
    });
  }
};

exports.resumeOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: "pending" },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.status(200).json({ message: "Đơn hàng đã được tiếp tục", order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi khi tiếp tục đơn hàng", error: error.message });
  }
};

exports.recordDeposit = async (req, res) => {
  try {
    const { depositAmount } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status: "deposit",
        depositAmount: depositAmount,
        paymentStatus: "partial",
      },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.status(200).json({ message: "Đã ghi nhận đặt cọc", order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi khi ghi nhận đặt cọc", error: error.message });
  }
};
