// controllers/orderController.js
const Order = require("../models/Order");
const Product = require("../models/Product");
const Batch = require("../models/Batch");

exports.createOrder = async (req, res) => {
  try {
    const {
      customer,
      customerDetails,
      items,
      paymentMethod,
      depositAmount,
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
    } = req.body;
    const orderItems = [];
    let totalAmount = 0;
    let totalDiscount = 0;

    for (const itemData of items) {
      const {
        product: productId,
        quantity: requestedQuantity,
        batch: requestedBatchId,
      } = itemData;
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Không tìm thấy sản phẩm với ID: ${productId}` });
      }

      let batchesToProcess;
      if (requestedBatchId) {
        const batch = await Batch.findById(requestedBatchId);
        if (!batch) {
          return res
            .status(404)
            .json({
              message: `Không tìm thấy lô hàng với ID: ${requestedBatchId}`,
            });
        }
        batchesToProcess = [batch];
      } else {
        batchesToProcess = await Batch.find({
          product: productId,
          remaining_quantity: { $gt: 0 },
        }).sort({ expiryDate: 1 });
      }

      let remainingToFulfill = requestedQuantity;
      let currentItemAmount = 0;
      let currentItemDiscount = 0;
      const currentItemDetails = [];

      if (!requestedBatchId) {
        const totalAvailableQuantity = batchesToProcess.reduce(
          (sum, batch) => sum + batch.remaining_quantity,
          0
        );
        if (totalAvailableQuantity < requestedQuantity) {
          return res.status(400).json({
            message: `Không đủ số lượng cho sản phẩm ${product.name}. Chỉ còn ${totalAvailableQuantity} trên tất cả các lô.`,
          });
        }
      } else if (batchesToProcess[0].remaining_quantity < requestedQuantity) {
        return res
          .status(400)
          .json({
            message: `Lô ${batchesToProcess[0].batchNumber} không đủ số lượng cho sản phẩm ${product.name}`,
          });
      }

      for (const batch of batchesToProcess) {
        if (remainingToFulfill <= 0) break;

        const fulfillQuantity = requestedBatchId
          ? Math.min(remainingToFulfill, batch.remaining_quantity)
          : Math.min(remainingToFulfill, batch.remaining_quantity);

        if (fulfillQuantity > 0) {
          const unitPrice = product.getBatchDiscountedPrice(batch);
          let appliedDiscount = null;
          if (batch.discountInfo && batch.discountInfo.isDiscounted) {
            appliedDiscount = {
              type: "batch",
              value: batch.discountInfo.discountValue,
              description: `Giảm giá ${batch.discountInfo.discountValue}${
                batch.discountInfo.discountType === "percentage" ? "%" : "đ"
              } do ${batch.discountInfo.reason} (còn ${
                batch.daysUntilExpiry
              } ngày)`,
            };
          }

          const totalPrice = unitPrice * fulfillQuantity;
          currentItemAmount += product.price * fulfillQuantity;
          currentItemDiscount += (product.price - unitPrice) * fulfillQuantity;
          currentItemDetails.push({
            product: productId,
            batch: batch._id,
            quantity: fulfillQuantity,
            originalPrice: product.price,
            unitPrice: unitPrice,
            appliedDiscount: appliedDiscount,
            totalPrice: totalPrice,
          });
          remainingToFulfill -= fulfillQuantity;
        }
        if (requestedBatchId) break; // If specific batch is requested, process only that
      }

      if (remainingToFulfill > 0 && !requestedBatchId) {
        return res
          .status(400)
          .json({
            message: `Không đủ số lượng cho sản phẩm ${product.name} sau khi kiểm tra tất cả các lô.`,
          });
      } else if (remainingToFulfill > 0 && requestedBatchId) {
        return res
          .status(400)
          .json({
            message: `Không đủ số lượng trong lô ${batchesToProcess[0].batchNumber} cho sản phẩm ${product.name}.`,
          });
      }

      currentItemDetails.forEach((detail) => orderItems.push(detail));
      totalAmount += currentItemAmount;
      totalDiscount += currentItemDiscount;
    }

    const finalAmount =
      totalAmount -
      totalDiscount +
      (req.body.taxAmount || 0) +
      (req.body.shippingFee || 0);

    const orderData = {
      customer: customer || null,
      customerDetails: customerDetails || {},
      items: orderItems,
      totalAmount,
      totalDiscount,
      taxAmount: req.body.taxAmount || 0,
      shippingFee: req.body.shippingFee || 0,
      finalAmount,
      employee: req.user._id,
      paymentMethod: paymentMethod || "cash",
    };

    if (initialStatus === "deposit" && depositAmount !== undefined) {
      orderData.status = "deposit";
      orderData.depositAmount = depositAmount;
      orderData.paymentStatus = "partial";
    } else if (
      initialStatus === "completed" &&
      initialPaymentStatus === "paid"
    ) {
      orderData.status = "completed";
      orderData.paymentStatus = "paid";
    } else {
      orderData.status = initialStatus || "pending";
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
      .populate("customer")
      .populate("employee")
      .populate("items.product")
      .populate("items.batch");
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
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status === "completed" && order.paymentStatus === "paid")
      return res
        .status(400)
        .json({
          message: "Đơn hàng này đã được thanh toán và hoàn thành trước đó",
        });
    order.status = "completed";
    order.paymentStatus = "paid";
    await order.save();
    res.status(200).json({
      message: "Thanh toán thành công và đã cập nhật trạng thái đơn hàng",
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi xử lý thanh toán thành công",
      error: error.message,
    });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find(req.query)
      .populate("customer")
      .populate("employee");
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
    // Logic hoàn trả số lượng vào kho đã được xử lý bằng middleware pre('save') trong model
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
    const { customer, customerDetails, items } = req.body;
    const order = new Order({
      customer,
      customerDetails,
      items: items || [],
      status: "pending_hold",
      employee: req.user._id,
    });
    await order.save();
    res.status(201).json({
      message: "Đơn hàng đã được đưa vào trạng thái chờ",
      orderId: order._id,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi khi tạo đơn hàng chờ", error: error.message });
  }
};

exports.resumeOrder = async (req, res) => {
  try {
    const { items: updatedItems } = req.body;
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "pending_hold")
      return res.status(400).json({
        message:
          "Không thể tiếp tục đơn hàng này vì trạng thái không phải là chờ",
      });

    const newOrderItems = [];
    let totalAmount = 0;
    let totalDiscount = 0;

    for (const itemData of updatedItems) {
      const {
        product: productId,
        quantity: requestedQuantity,
        batch: requestedBatchId,
      } = itemData;
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Không tìm thấy sản phẩm với ID: ${productId}` });
      }

      let batchesToProcess;
      if (requestedBatchId) {
        const batch = await Batch.findById(requestedBatchId);
        if (!batch) {
          return res
            .status(404)
            .json({
              message: `Không tìm thấy lô hàng với ID: ${requestedBatchId}`,
            });
        }
        batchesToProcess = [batch];
      } else {
        batchesToProcess = await Batch.find({
          product: productId,
          remaining_quantity: { $gt: 0 },
        }).sort({ expiryDate: 1 });
      }

      let remainingToFulfill = requestedQuantity;
      let currentItemAmount = 0;
      let currentItemDiscount = 0;
      const currentItemDetails = [];

      if (!requestedBatchId) {
        const totalAvailableQuantity = batchesToProcess.reduce(
          (sum, batch) => sum + batch.remaining_quantity,
          0
        );
        if (totalAvailableQuantity < requestedQuantity) {
          return res.status(400).json({
            message: `Không đủ số lượng cho sản phẩm ${product.name}. Chỉ còn ${totalAvailableQuantity} trên tất cả các lô.`,
          });
        }
      } else if (batchesToProcess[0].remaining_quantity < requestedQuantity) {
        return res
          .status(400)
          .json({
            message: `Lô ${batchesToProcess[0].batchNumber} không đủ số lượng cho sản phẩm ${product.name}`,
          });
      }

      for (const batch of batchesToProcess) {
        if (remainingToFulfill <= 0) break;

        const fulfillQuantity = requestedBatchId
          ? Math.min(remainingToFulfill, batch.remaining_quantity)
          : Math.min(remainingToFulfill, batch.remaining_quantity);

        if (fulfillQuantity > 0) {
          const unitPrice = product.getBatchDiscountedPrice(batch);
          let appliedDiscount = null;
          if (batch.discountInfo && batch.discountInfo.isDiscounted) {
            appliedDiscount = {
              type: "batch",
              value: batch.discountInfo.discountValue,
              description: `Giảm giá ${batch.discountInfo.discountValue}${
                batch.discountInfo.discountType === "percentage" ? "%" : "đ"
              } do ${batch.discountInfo.reason} (còn ${
                batch.daysUntilExpiry
              } ngày)`,
            };
          }

          const totalPrice = unitPrice * fulfillQuantity;
          currentItemAmount += product.price * fulfillQuantity;
          currentItemDiscount += (product.price - unitPrice) * fulfillQuantity;
          currentItemDetails.push({
            product: productId,
            batch: batch._id,
            quantity: fulfillQuantity,
            originalPrice: product.price,
            unitPrice: unitPrice,
            appliedDiscount: appliedDiscount,
            totalPrice: totalPrice,
          });
          remainingToFulfill -= fulfillQuantity;
        }
        if (requestedBatchId) break; // If specific batch is requested, process only that
      }

      if (remainingToFulfill > 0 && !requestedBatchId) {
        return res
          .status(400)
          .json({
            message: `Không đủ số lượng cho sản phẩm ${product.name} sau khi kiểm tra tất cả các lô.`,
          });
      } else if (remainingToFulfill > 0 && requestedBatchId) {
        return res
          .status(400)
          .json({
            message: `Không đủ số lượng trong lô ${batchesToProcess[0].batchNumber} cho sản phẩm ${product.name}.`,
          });
      }

      currentItemDetails.forEach((detail) => newOrderItems.push(detail));
      totalAmount += currentItemAmount;
      totalDiscount += currentItemDiscount;
    }

    const finalAmount =
      totalAmount -
      totalDiscount +
      (order.taxAmount || 0) +
      (order.shippingFee || 0);

    order.items = newOrderItems;
    order.totalAmount = totalAmount;
    order.totalDiscount = totalDiscount;
    order.finalAmount = finalAmount;
    order.status = "pending"; // Chuyển trạng thái về pending sau khi chỉnh sửa
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi tiếp tục chỉnh sửa đơn hàng",
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
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    res.status(200).json({ message: "Đã ghi nhận đặt cọc", order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi khi ghi nhận đặt cọc", error: error.message });
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
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    res
      .status(200)
      .json({ message: "Thanh toán trực tuyến thành công", order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: "Lỗi khi xử lý thanh toán trực tuyến thành công",
        error: error.message,
      });
  }
};
