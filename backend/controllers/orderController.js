// controllers/orderController.js
const Order = require("../models/Order");
const Product = require("../models/Product");
const Batch = require("../models/Batch");
const Cart = require("../models/Cart"); // Import model Cart
const { v4: uuidv4 } = require("uuid");
const cron = require("node-cron");

exports.createOrder = async (req, res) => {
  try {
    const { orderType = "instore", cartId, ...rest } = req.body;
    if (orderType === "preorder") {
      if (!cartId) {
        return res
          .status(400)
          .json({ message: "Thiếu cartId cho đơn hàng preorder." });
      }
      return this.createPreorderFromCart(req, res, cartId);
    }
    return this.handleInstoreOrder(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};
exports.createPreorderFromCart = async (req, res, cartId) => {
  try {
    const cart = await Cart.findById(cartId).populate("items.product");
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng." });
    }

    const { expirationDays = 3 } = req.body;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(expirationDays));

    const orderProducts = await Promise.all(
      cart.items.map(async (cartItem) => {
        const product = cartItem.product;
        if (!product) {
          throw new Error(
            `Không tìm thấy sản phẩm với ID: ${cartItem.product}`
          );
        }
        const baseUnit = product.units.find((u) => u.ratio === 1);
        if (
          !baseUnit ||
          typeof baseUnit.ratio !== "number" ||
          baseUnit.ratio <= 0
        ) {
          throw new Error(
            `Sản phẩm ${product.name} không có đơn vị cơ bản hợp lệ.`
          );
        }

        const selectedUnit = product.units.find(
          (u) => u.name === cartItem.selectedUnitName
        );
        if (!selectedUnit || typeof selectedUnit.salePrice !== "number") {
          throw new Error(
            `Không tìm thấy đơn vị ${cartItem.selectedUnitName} hoặc giá bán cho sản phẩm ${product.name}.`
          );
        }

        const requiredBaseQty = cartItem.quantity * baseUnit.ratio;
        const selectedBatches = await this.selectGoodBatchesForPreorder(
          product._id,
          requiredBaseQty
        );

        const batchesUsedForProduct = selectedBatches.map((b) => ({
          batchId: b.batchId,
          quantity: b.quantity,
        }));

        // Tính toán itemTotal dựa trên giá của đơn vị đã chọn
        const itemTotal = parseFloat(
          (selectedUnit.salePrice * cartItem.quantity).toFixed(2)
        );

        return {
          productId: product._id,
          quantity: cartItem.quantity,
          selectedUnitName: selectedUnit.name,
          unitPrice: selectedUnit.salePrice, // Giá bán của đơn vị đã chọn
          originalUnitPrice: selectedUnit.salePrice,
          batchesUsed: batchesUsedForProduct,
          itemTotal: itemTotal,
        };
      })
    );

    const totalAmount = orderProducts.reduce(
      (sum, item) =>
        (typeof sum === "number" ? sum : 0) +
        (typeof item.itemTotal === "number" ? item.itemTotal : 0),
      0
    );

    const order = new Order({
      ...req.body,
      customerId: cart.user, // Gán customerId từ giỏ hàng
      orderType: "preorder",
      expirationDate,
      products: orderProducts,
      paymentStatus: "unpaid",
      status: "pending",
      orderNumber: uuidv4(),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      finalAmount: parseFloat(totalAmount.toFixed(2)),
    });

    await order.save();

    // Cập nhật số lượng đã đặt trước trong các batch
    for (const productInfo of order.products) {
      const product = await Product.findById(productInfo.productId);
      const baseUnit = product.units.find((u) => u.ratio === 1);
      if (
        baseUnit &&
        typeof baseUnit.ratio === "number" &&
        baseUnit.ratio > 0
      ) {
        for (const batchInfo of productInfo.batchesUsed) {
          if (typeof batchInfo.quantity === "number") {
            await Batch.findByIdAndUpdate(batchInfo.batchId, {
              $inc: {
                reserved_quantity: batchInfo.quantity / baseUnit.ratio, // Cập nhật số lượng đã đặt trước
              },
            });
          }
        }
      }
    }

    // Xóa giỏ hàng sau khi tạo đơn hàng thành công (tùy chọn)
    await Cart.findByIdAndDelete(cartId);

    res.status(201).json(order);
  } catch (error) {
    console.error("Lỗi khi tạo đơn hàng Preorder từ giỏ hàng:", error);
    res.status(400).json({ message: error.message, error });
  }
};

exports.selectGoodBatchesForPreorder = async (productId, requiredBaseQty) => {
  const batches = await Batch.find({
    product: productId,
    status: "hoạt động",
    expiry_day: { $gte: new Date(Date.now() + 14 * 86400000) },
    $expr: {
      $gte: [
        { $subtract: ["$remaining_quantity", "$reserved_quantity"] },
        requiredBaseQty,
      ],
    },
  })
    .sort({ expiry_day: 1 })
    .lean();

  let remaining = requiredBaseQty;
  const selected = [];

  for (const batch of batches) {
    const available =
      (typeof batch.remaining_quantity === "number"
        ? batch.remaining_quantity
        : 0) -
      (typeof batch.reserved_quantity === "number"
        ? batch.reserved_quantity
        : 0);
    const take = Math.min(available, remaining);
    if (take > 0) {
      let unitPrice = typeof batch.unitPrice === "number" ? batch.unitPrice : 0;
      if (batch.getDiscountedPrice) {
        const discountedPrice = await batch.getDiscountedPrice();
        unitPrice =
          typeof discountedPrice === "number" ? discountedPrice : unitPrice;
      }
      selected.push({
        batchId: batch._id,
        quantity: take,
        unitPrice: unitPrice,
      });
      remaining -= take;
    }
    if (remaining === 0) break;
  }

  if (remaining > 0) {
    throw new Error(
      "Không đủ số lượng có sẵn trong kho để đáp ứng đơn hàng preorder."
    );
  }

  return selected;
};

exports.handleInstoreOrder = async (req, res) => {
  try {
    const { items, taxRate = 0 } = req.body;
    const orderProducts = [];
    let totalAmount = 0;
    let discountAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Không tìm thấy sản phẩm với ID: ${item.product}`); // Important: Handle product not found
      }
      const selectedUnit = product.units.find(
        (u) => u.name === item.selectedUnit.name
      );
      if (!selectedUnit) {
        throw new Error(
          `Đơn vị ${item.selectedUnit.name} không tồn tại cho sản phẩm ${product.name}`
        );
      }
      if (selectedUnit.salePrice === undefined) {
        throw new Error(
          `Không tìm thấy giá bán cho đơn vị ${selectedUnit.name} của sản phẩm ${product.name}`
        );
      }

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
        if (!baseUnit) {
          throw new Error(`Sản phẩm ${product.name} không có đơn vị cơ bản.`);
        }
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
          const batchPrice = batch.getDiscountedPrice
            ? await batch.getDiscountedPrice()
            : batch.unitPrice;
          itemTotal += (batchPrice * batchInfo.quantity) / selectedUnit.ratio;
        } else {
          console.warn(`Không tìm thấy batch với ID: ${batchInfo.batchId}`);
          // Không tìm thấy batch, bỏ qua giá của batch đó.  Để itemTotal không bị sai.
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
          unitPrice: 0, // Giá sẽ được cập nhật sau
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
      employeeId: req.user._id, // changed to ._id
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      taxRate: parseFloat(taxRate.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2)),
      products: orderProducts,
      status: "completed",
      paymentStatus: req.body.paymentMethod === "cash" ? "paid" : "pending",
      orderNumber: uuidv4(),
    });

    await order.save();

    // Cập nhật số lượng tồn kho và unitPrice trong batchesUsed
    for (const product of orderProducts) {
      for (const batchInfo of product.batchesUsed) {
        const batch = await Batch.findById(batchInfo.batchId);
        if (batch) {
          const batchPrice = batch.getDiscountedPrice
            ? await batch.getDiscountedPrice()
            : batch.unitPrice;
          batchInfo.unitPrice = batchPrice / product.unitRatio; // Update the unitPrice
          await Batch.findByIdAndUpdate(batchInfo.batchId, {
            $inc: {
              quantity_on_shelf: -(batchInfo.quantity / product.unitRatio),
              sold_quantity: batchInfo.quantity / product.unitRatio,
            },
          });
        }
      }
    }
    await order.save(); // Save again to save the updated batch prices
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
    expiry_day: { $gte: new Date(Date.now() + 14 * 86400000) }, // Thêm 14 ngày
    quantity_on_shelf: { $gte: requiredBaseQty },
  })
    .sort({ expiry_day: 1 })
    .lean(); // Use lean() for performance

  let remaining = requiredBaseQty;
  const selected = [];

  for (const batch of batches) {
    const take = Math.min(batch.quantity_on_shelf, remaining);
    if (take > 0) {
      const unitPrice = batch.getDiscountedPrice
        ? batch.getDiscountedPrice
        : batch.unitPrice;
      selected.push({
        batchId: batch._id,
        quantity: take,
        unitPrice: unitPrice,
      });
      remaining -= take;
    }
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
    status: "pending",
    expirationDate: { $lte: now },
  });

  for (const order of expiredOrders) {
    order.status = "cancelled";
    await order.save();
  }
});

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

exports.updatePreorder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { products: updatedProducts, ...rest } = req.body;

    const order = await Order.findById(orderId);
    if (!order || order.orderType !== "preorder") {
      return res
        .status(404)
        .json({ message: "Không tìm thấy phiếu đặt trước." });
    }

    // Lưu trữ thông tin sản phẩm và batch hiện tại để rollback nếu cần
    const originalProducts = JSON.parse(JSON.stringify(order.products));

    // Cập nhật các trường chung của đơn hàng (ví dụ: ghi chú)
    for (const key in rest) {
      if (order[key] !== undefined) {
        order[key] = rest[key];
      }
    }

    if (updatedProducts && Array.isArray(updatedProducts)) {
      order.products = []; // Xóa sản phẩm cũ

      for (const updatedItem of updatedProducts) {
        const { productId, quantity, selectedUnitName, batchesUsed } =
          updatedItem;
        const product = await Product.findById(productId);
        if (!product) {
          throw new Error(`Không tìm thấy sản phẩm với ID: ${productId}`);
        }

        const selectedUnit = product.units.find(
          (u) => u.name === selectedUnitName
        );
        if (!selectedUnit) {
          throw new Error(
            `Không tìm thấy đơn vị ${selectedUnitName} cho sản phẩm ${product.name}.`
          );
        }

        const baseUnit = product.units.find((u) => u.ratio === 1);
        if (!baseUnit) {
          throw new Error(`Sản phẩm ${product.name} không có đơn vị cơ bản.`);
        }

        const requiredBaseQty = quantity * baseUnit.ratio;
        let newBatchesUsed = [];

        if (
          batchesUsed &&
          Array.isArray(batchesUsed) &&
          batchesUsed.length > 0
        ) {
          // Sử dụng batches được cung cấp từ request
          for (const batchInfo of batchesUsed) {
            const batch = await Batch.findById(batchInfo.batchId);
            if (!batch) {
              throw new Error(
                `Không tìm thấy batch với ID: ${batchInfo.batchId}`
              );
            }
            newBatchesUsed.push({
              batchId: batch._id,
              quantity: batchInfo.quantity,
            });
          }
        } else {
          // Tự động chọn batches nếu không có thông tin batch trong request
          newBatchesUsed = await this.selectGoodBatchesForPreorder(
            productId,
            requiredBaseQty
          );
        }

        // Tính toán lại itemTotal
        const itemTotal = parseFloat(
          (selectedUnit.salePrice * quantity).toFixed(2)
        );

        order.products.push({
          productId: product._id,
          quantity: quantity,
          selectedUnitName: selectedUnit.name,
          unitPrice: selectedUnit.salePrice,
          originalUnitPrice: selectedUnit.salePrice,
          batchesUsed: newBatchesUsed.map((b) => ({
            batchId: b.batchId,
            quantity: b.quantity,
          })),
          itemTotal: itemTotal,
        });
      }

      // Tính toán lại totalAmount và finalAmount
      order.totalAmount = parseFloat(
        order.products.reduce((sum, item) => sum + item.itemTotal, 0).toFixed(2)
      );
      order.finalAmount =
        order.totalAmount - order.discountAmount + order.taxAmount;
    }

    // Cập nhật lại số lượng đã đặt trước trong các batch (cần xử lý logic phức tạp hơn)
    // Logic này cần đảm bảo tính nhất quán khi thay đổi sản phẩm hoặc batch
    // Gợi ý:
    // 1. Lấy danh sách batch ID và số lượng đã dùng trước khi cập nhật.
    // 2. Lấy danh sách batch ID và số lượng mới sau khi cập nhật.
    // 3. So sánh và điều chỉnh trường `reserved_quantity` trong model `Batch` cho phù hợp.
    //    - Nếu một batch bị loại bỏ, giảm `reserved_quantity`.
    //    - Nếu một batch mới được thêm, tăng `reserved_quantity`.
    //    - Nếu số lượng trong batch thay đổi, điều chỉnh `reserved_quantity` tương ứng.

    // Ví dụ (cần triển khai đầy đủ):
    await this.updateReservedQuantities(originalProducts, order.products);

    await order.save();
    res.status(200).json(order);
  } catch (error) {
    console.error("Lỗi khi cập nhật phiếu đặt trước:", error);
    res.status(400).json({ message: error.message, error });
  }
};

// Hàm phụ trợ để cập nhật số lượng đã đặt trước trong batch (cần triển khai chi tiết)
exports.updateReservedQuantities = async (oldProducts, newProducts) => {
  // Logic so sánh và cập nhật reserved_quantity
  const oldBatchQuantities = {};
  oldProducts.forEach((product) => {
    product.batchesUsed.forEach((batchInfo) => {
      oldBatchQuantities[batchInfo.batchId] =
        (oldBatchQuantities[batchInfo.batchId] || 0) + batchInfo.quantity;
    });
  });

  const newBatchQuantities = {};
  newProducts.forEach((product) => {
    product.batchesUsed.forEach((batchInfo) => {
      newBatchQuantities[batchInfo.batchId] =
        (newBatchQuantities[batchInfo.batchId] || 0) + batchInfo.quantity;
    });
  });

  const allBatchIds = new Set([
    ...Object.keys(oldBatchQuantities),
    ...Object.keys(newBatchQuantities),
  ]);

  for (const batchId of allBatchIds) {
    const oldQty = oldBatchQuantities[batchId] || 0;
    const newQty = newBatchQuantities[batchId] || 0;
    const diff = newQty - oldQty;

    if (diff !== 0) {
      const product = await Product.findOne({ "units.0.ratio": 1 }); // Lấy một sản phẩm bất kỳ có đơn vị cơ bản
      if (product) {
        const baseUnitRatio =
          product.units.find((u) => u.ratio === 1)?.ratio || 1;
        await Batch.findByIdAndUpdate(batchId, {
          $inc: { reserved_quantity: diff / baseUnitRatio },
        });
      } else {
        console.warn(
          `Không tìm thấy sản phẩm có đơn vị cơ bản để cập nhật reserved_quantity cho batch ${batchId}`
        );
      }
    }
  }
};

exports.completePreorderPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amountPaid } = req.body;

    if (typeof amountPaid !== "number" || amountPaid <= 0) {
      return res
        .status(400)
        .json({ message: "Số tiền khách đưa không hợp lệ." });
    }

    const order = await Order.findById(orderId);
    if (!order || order.orderType !== "preorder") {
      return res
        .status(404)
        .json({ message: "Không tìm thấy phiếu đặt trước." });
    }

    if (order.paymentStatus === "paid") {
      return res
        .status(400)
        .json({ message: "Phiếu đặt trước này đã được thanh toán." });
    }

    order.paymentStatus = "paid";
    order.amountPaid = parseFloat(amountPaid.toFixed(2));

    // Tính toán tiền thừa (nếu có)
    const changeAmount = parseFloat(
      (amountPaid - order.finalAmount).toFixed(2)
    );
    order.changeAmount = changeAmount >= 0 ? changeAmount : 0;

    // Cập nhật số lượng tồn kho trong các batch
    for (const productInfo of order.products) {
      const product = await Product.findById(productInfo.productId);
      const baseUnit = product.units.find((u) => u.ratio === 1);
      if (
        baseUnit &&
        typeof baseUnit.ratio === "number" &&
        baseUnit.ratio > 0
      ) {
        for (const batchInfo of productInfo.batchesUsed) {
          if (typeof batchInfo.quantity === "number") {
            await Batch.findByIdAndUpdate(batchInfo.batchId, {
              $inc: {
                quantity_on_shelf: -(batchInfo.quantity / baseUnit.ratio),
                sold_quantity: batchInfo.quantity / baseUnit.ratio,
                reserved_quantity: -(batchInfo.quantity / baseUnit.ratio), // Giảm số lượng đã đặt trước
              },
            });
          }
        }
      }
    }

    await order.save();
    res
      .status(200)
      .json({ message: "Thanh toán thành công.", order, changeAmount });
  } catch (error) {
    console.error("Lỗi khi hoàn thành thanh toán:", error);
    res.status(400).json({ message: error.message, error });
  }
};
