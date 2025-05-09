const Order = require("../models/Order");
const Product = require("../models/Product");
const Batch = require("../models/Batch");
const Cart = require("../models/Cart");
const { v4: uuidv4 } = require("uuid");

exports.createOrder = async (req, res) => {
  try {
    const {
      customerId,
      items,
      paymentMethod,
      depositAmount,
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
      taxRate = 0,
      notes,
    } = req.body;
    const orderProducts = [];
    let totalAmount = 0;
    let discountAmount = 0;

    for (const itemData of items) {
      const {
        product: productId,
        quantity: requestedQuantity, // Số lượng đơn vị lớn (ví dụ: 1 thùng)
        units: selectedUnitName, // Đơn vị lớn đã chọn (ví dụ: "thùng 30")
        discount: productDiscount = 0,
      } = itemData;

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Không tìm thấy sản phẩm với ID: ${productId}` });
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
      let remainingQuantityNeeded = expectedBaseQuantity;
      const itemBatches = [];
      let totalBatchDiscountAmount = 0;

      // Tìm các lô hàng có sẵn và sắp xếp theo hạn sử dụng
      const availableBatches = await Batch.find({
        product: productId,
        remaining_quantity: { $gt: 0 },
      }).sort({ expiry_day: 1 });

      for (const batch of availableBatches) {
        if (remainingQuantityNeeded <= 0) {
          break;
        }
        const quantityToUse = Math.min(
          remainingQuantityNeeded,
          batch.remaining_quantity
        );
        if (quantityToUse > 0) {
          let baseUnitPrice =
            product.units.find((u) => u.ratio === 1)?.salePrice ||
            product.price;
          let batchDiscountPerUnit = 0;

          if (batch.discountInfo && batch.discountInfo.isDiscounted) {
            if (batch.discountInfo.discountType === "percentage") {
              batchDiscountPerUnit =
                baseUnitPrice * (batch.discountInfo.discountValue / 100);
            } else if (batch.discountInfo.discountType === "fixed_amount") {
              batchDiscountPerUnit = batch.discountInfo.discountValue;
            }
          }

          totalBatchDiscountAmount += batchDiscountPerUnit * quantityToUse;
          itemBatches.push({
            batchId: batch._id,
            quantity: quantityToUse,
            unitPrice: baseUnitPrice - batchDiscountPerUnit,
            discountAmount: batchDiscountPerUnit,
          });
          remainingQuantityNeeded -= quantityToUse;
        }
      }

      if (remainingQuantityNeeded > 0) {
        return res.status(400).json({
          message: `Không đủ số lượng sản phẩm ${
            product.name
          } trong kho để đáp ứng đơn hàng (cần ${expectedBaseQuantity}, chỉ còn ${
            expectedBaseQuantity - remainingQuantityNeeded
          } khả dụng)`,
        });
      }

      const originalUnitPrice = selectedUnitInfo.salePrice; // Giá cho 1 đơn vị lớn
      const additionalDiscountAmount =
        originalUnitPrice * (productDiscount / 100) * requestedQuantity;
      const itemTotal =
        originalUnitPrice * requestedQuantity -
        totalBatchDiscountAmount -
        additionalDiscountAmount;
      const unitPriceAfterAllDiscounts = itemTotal / requestedQuantity;

      orderProducts.push({
        productId,
        quantity: requestedQuantity,
        selectedUnitName,
        batchesUsed: itemBatches,
        discount: productDiscount,
        itemTotal: itemTotal, // Tổng tiền cho số lượng đơn vị lớn đã mua
        unitPrice: unitPriceAfterAllDiscounts, // Giá của một đơn vị lớn sau tất cả giảm giá
      });

      totalAmount += originalUnitPrice * requestedQuantity;
      discountAmount += totalBatchDiscountAmount + additionalDiscountAmount;
    }

    const finalAmount =
      totalAmount - discountAmount + (totalAmount - discountAmount) * taxRate;
    const orderData = {
      customerId: customerId,
      products: orderProducts,
      totalAmount,
      discountAmount,
      finalAmount,
      taxRate,
      taxAmount: (totalAmount - discountAmount) * taxRate,
      employeeId: req.user ? req.user._id : null,
      paymentMethod: paymentMethod || "cash",
      depositAmount: depositAmount || 0,
      notes: notes,
      orderNumber: uuidv4(),
    };

    if (initialStatus === "deposit") {
      orderData.status = "deposit";
      orderData.paymentStatus = "partial";
    } else if (
      initialStatus === "completed" &&
      initialPaymentStatus === "paid"
    ) {
      orderData.status = "completed";
      orderData.paymentStatus = "paid";
    } else {
      orderData.status = initialStatus || "waiting";
      orderData.paymentStatus = initialPaymentStatus || "pending";
    }

    const order = new Order(orderData);
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi khi tạo đơn hàng", error: error.message });
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
    const orders = await Order.find(req.query)
      .populate("customerId")
      .populate("employeeId");
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

exports.addItemToHoldOrder = async (req, res) => {
  try {
    const { items: newItems } = req.body;
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "waiting")
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
        units: selectedUnitName, // Lấy tên đơn vị đã chọn từ request body
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

      // Tìm thông tin đơn vị đã chọn
      const selectedUnitInfo = product.units.find(
        (unit) => unit.name === selectedUnitName
      );
      if (!selectedUnitInfo || selectedUnitInfo.salePrice === undefined) {
        return res.status(400).json({
          message: `Không tìm thấy giá bán cho đơn vị "${selectedUnitName}" của sản phẩm ${productId}`,
        });
      }

      // Kiểm tra xem tổng số lượng từ các lô có khớp với số lượng yêu cầu * theo hệ số quy đổi hay không
      const expectedBaseQuantity = requestedQuantity * selectedUnitInfo.ratio;
      if (totalQuantityFromBatches !== expectedBaseQuantity) {
        return res.status(400).json({
          message: `Tổng số lượng từ các lô (<span class="math-inline">\{totalQuantityFromBatches\}\) không khớp với số lượng yêu cầu \(</span>{requestedQuantity} ${selectedUnitName} = ${expectedBaseQuantity} đơn vị cơ bản) cho sản phẩm ${product.name}`,
        });
      }

      const originalUnitPrice = selectedUnitInfo.salePrice; // Giá bán theo đơn vị đã chọn
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
        existingProducts[existingProductIndex].selectedUnitName =
          selectedUnitName;
      } else {
        existingProducts.push({
          productId,
          quantity: requestedQuantity,
          unitPrice,
          selectedUnitName,
          batchesUsed: itemBatches,
          discount: productDiscount,
          itemTotal,
        });
      }
      totalAmount += originalUnitPrice * requestedQuantity;
      discountAmount += totalBatch;
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
      status: "preorder",
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

exports.processOnlinePaymentSuccess = async (req, res) => {
  try {
    const { orderId } = req.params;
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
