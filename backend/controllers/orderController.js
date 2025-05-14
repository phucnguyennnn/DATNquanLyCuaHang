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
      paymentMethod = "cash",
      amountPaid = 0,
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
        quantity: requestedQuantity,
        units: selectedUnitName,
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
      let totalBatchDiscountAmount = 0;

      // Lấy tất cả batch trên quầy, sắp xếp theo hạn sử dụng gần nhất
      const availableBatchesOnShelf = await Batch.find({
        product: productId,
        quantity_on_shelf: { $gt: 0 },
      }).sort({ expiry_day: 1 });

      if (!availableBatchesOnShelf || availableBatchesOnShelf.length === 0) {
        return res.status(400).json({
          message: `Không đủ số lượng sản phẩm ${product.name} trên quầy để đáp ứng đơn hàng (cần ${expectedBaseQuantity})`,
        });
      }

      let totalAvailable = availableBatchesOnShelf.reduce(
        (sum, batch) => sum + batch.quantity_on_shelf,
        0
      );
      if (totalAvailable < remainingQuantityNeeded) {
        return res.status(400).json({
          message: `Không đủ số lượng sản phẩm ${product.name} trên quầy để đáp ứng đơn hàng (cần ${expectedBaseQuantity}, hiện có ${totalAvailable})`,
        });
      }

      // Gom các batch cùng loại giảm giá thành từng nhóm để chia thành nhiều mặt hàng nếu cần
      let batchGroups = [];
      let lastDiscountKey = null;
      let group = null;

      for (const batch of availableBatchesOnShelf) {
        if (remainingQuantityNeeded <= 0) break;
        const takeQty = Math.min(batch.quantity_on_shelf, remainingQuantityNeeded);

        // Xác định key giảm giá của batch (giá trị giảm + loại giảm)
        let discountKey = "no_discount";
        if (batch.discountInfo && batch.discountInfo.isDiscounted) {
          discountKey = `${batch.discountInfo.discountType}_${batch.discountInfo.discountValue}`;
        }

        // Nếu khác nhóm giảm giá thì tạo nhóm mới
        if (discountKey !== lastDiscountKey) {
          if (group) batchGroups.push(group);
          group = {
            discountKey,
            discountInfo: batch.discountInfo && batch.discountInfo.isDiscounted
              ? {
                discountType: batch.discountInfo.discountType,
                discountValue: batch.discountInfo.discountValue,
              }
              : null,
            batches: [],
            totalQty: 0,
          };
          lastDiscountKey = discountKey;
        }

        group.batches.push({
          batch,
          takeQty,
        });
        group.totalQty += takeQty;
        remainingQuantityNeeded -= takeQty;
      }
      if (group) batchGroups.push(group);

      // Tạo từng mặt hàng riêng biệt cho từng nhóm batch
      for (const batchGroup of batchGroups) {
        let groupBatchDiscountAmount = 0;
        let groupItemTotal = 0;
        let groupBatchesUsed = [];
        let groupOriginalUnitPrice = selectedUnitInfo.salePrice;
        let groupDiscount = productDiscount;

        for (const { batch, takeQty } of batchGroup.batches) {
          let baseUnitPrice =
            product.units.find((u) => u.ratio === 1)?.salePrice || product.price;
          let batchDiscountPerUnit = 0;

          if (batch.discountInfo && batch.discountInfo.isDiscounted) {
            if (batch.discountInfo.discountType === "percentage") {
              batchDiscountPerUnit =
                baseUnitPrice * (batch.discountInfo.discountValue / 100);
            } else if (batch.discountInfo.discountType === "fixed_amount") {
              batchDiscountPerUnit = batch.discountInfo.discountValue;
            }
          }

          groupBatchDiscountAmount += batchDiscountPerUnit * takeQty;
          groupBatchesUsed.push({
            batchId: batch._id,
            quantity: takeQty,
            unitPrice: baseUnitPrice - batchDiscountPerUnit,
            discountAmount: batchDiscountPerUnit,
          });

          groupItemTotal += (baseUnitPrice - batchDiscountPerUnit) * takeQty;
        }

        // Áp dụng thêm discount của sản phẩm nếu có
        const additionalDiscountAmount =
          groupOriginalUnitPrice * (groupDiscount / 100) * (batchGroup.totalQty / selectedUnitInfo.ratio);
        const finalItemTotal = groupItemTotal - additionalDiscountAmount;
        const unitPriceAfterAllDiscounts = finalItemTotal / (batchGroup.totalQty / selectedUnitInfo.ratio);

        orderProducts.push({
          productId,
          quantity: batchGroup.totalQty / selectedUnitInfo.ratio,
          selectedUnitName,
          batchesUsed: groupBatchesUsed,
          discount: groupDiscount,
          itemTotal: finalItemTotal,
          unitPrice: unitPriceAfterAllDiscounts,
          originalUnitPrice: groupOriginalUnitPrice,
        });

        totalAmount += groupOriginalUnitPrice * (batchGroup.totalQty / selectedUnitInfo.ratio);
        discountAmount += groupBatchDiscountAmount + additionalDiscountAmount;
      }
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
      paymentMethod: paymentMethod,
      depositAmount: 0,
      amountPaid: amountPaid,
      notes: notes,
      orderNumber: uuidv4(),
    };

    if (paymentMethod === "cash" && amountPaid >= finalAmount) {
      orderData.paymentStatus = "paid";
      orderData.status = "completed";

      // Trừ số lượng khỏi các batch đã sử dụng
      for (const productItem of orderProducts) {
        for (const batchUsed of productItem.batchesUsed) {
          await Batch.findByIdAndUpdate(batchUsed.batchId, {
            $inc: {
              quantity_on_shelf: -batchUsed.quantity,
              sold_quantity: batchUsed.quantity,
            },
          });
        }
      }
    } else {
      orderData.paymentStatus = initialPaymentStatus || "pending";
      orderData.status = initialStatus || "waiting";
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
      .populate("products.productId") // Đảm bảo productId được populate
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
    const { $or: orQuery, ...otherQueries } = req.query;
    const query = { ...otherQueries };
    let orders = await Order.find(query)
      .populate("customerId", "fullName")
      .populate("employeeId", "fullName")
      .populate("products.productId", "name")
      .sort({ createdAt: -1 }); // Sắp xếp mới nhất lên trên

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
