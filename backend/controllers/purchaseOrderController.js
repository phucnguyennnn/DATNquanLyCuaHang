const PurchaseOrder = require('../models/PurchaseOrder');
const { sendEmail } = require('../config/nodemailer');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const GoodReceipt = require('../models/GoodReceipt');

const purchaseOrderController = {
  createPurchaseOrder: async (req, res) => {
    try {
      const { supplier, items, expectedDeliveryDate, notes, deliveryAddress, paymentMethod, sendEmailFlag } = req.body;

      if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin: nhà cung cấp và danh sách sản phẩm.' });
      }

      const supplierData = await Supplier.findById(supplier);
      if (!supplierData) {
        return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp.' });
      }

      let totalAmount = 0;
      for (const item of items) {
        if (!item.product || !item.quantity || !item.unit || !item.conversionRate) {
          return res.status(400).json({ message: 'Thiếu thông tin cho một sản phẩm trong đơn hàng.' });
        }

        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({ message: `Không tìm thấy sản phẩm với ID: ${item.product}` });
        }

        // Find the unit with the matching name and get its salePrice
        const unit = product.units.find(u => u.name === item.unit);
        if (!unit) {
          return res.status(400).json({ message: `Không tìm thấy đơn vị '${item.unit}' cho sản phẩm ${product.name}.` });
        }

        const itemTotal = unit.salePrice * item.quantity;
        totalAmount += itemTotal;
      }

      const newOrder = new PurchaseOrder({
        supplier,
        supplierName: supplierData.name,
        createdBy: req.user.id,
        createdByName: req.user.fullName,
        items,
        totalAmount,
        expectedDeliveryDate,
        notes,
        deliveryAddress,
        paymentMethod,
      });

      const savedOrder = await newOrder.save();
      const populatedOrder = await PurchaseOrder.findById(savedOrder._id)
        .populate({
          path: 'items.product',
          populate: {
            path: 'suppliers',
          },
        })
        .populate('supplier', 'name contact');

      if (sendEmailFlag && supplierData.contact && supplierData.contact.email) {
        await sendPurchaseOrderEmail(supplierData.contact.email, populatedOrder);
      }

      res.status(201).json(populatedOrder);
    } catch (error) {
      console.error('Lỗi tạo phiếu đặt hàng:', error);
      res.status(500).json({ message: 'Lỗi khi tạo phiếu đặt hàng', error: error.message });
    }
  },

  getAllPurchaseOrders: async (req, res) => {
    try {
      const orders = await PurchaseOrder.find()
        .populate({
          path: 'items.product',
          populate: {
            path: 'suppliers.supplier', // Make sure this matches the schema
          },
        })
        .populate('supplier', 'name contact'); // NOT supplierId, but supplier

      res.status(200).json(orders);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách phiếu đặt hàng:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách phiếu đặt hàng', error: error.message });
    }
  },

  getPurchaseOrderById: async (req, res) => {
    try {
      const order = await PurchaseOrder.findById(req.params.id)
        .populate({
          path: 'items.product',
          populate: {
            path: 'suppliers.supplier', // Make sure this matches the schema
          },
        })
        .populate('supplier', 'name contact'); // NOT supplierId, but supplier

      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy phiếu đặt hàng.' });
      }

      res.status(200).json(order);
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết phiếu đặt hàng:', error);
      res.status(500).json({ message: 'Lỗi khi lấy chi tiết phiếu đặt hàng', error: error.message });
    }
  },

  updatePurchaseOrder: async (req, res) => {
    try {
      const { expectedDeliveryDate, ...rest } = req.body;
      const orderId = req.params.id;

      const order = await PurchaseOrder.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy phiếu đặt hàng để cập nhật.' });
      }

      if (expectedDeliveryDate) {
        const expectedDate = new Date(expectedDeliveryDate);
        if (expectedDate.getTime() <= order.orderDate.getTime()) {
          return res.status(400).json({ message: 'Ngày giao hàng dự kiến phải lớn hơn ngày đặt hàng.' });
        }
      }

      const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
        orderId,
        { ...rest, expectedDeliveryDate },
        { new: true, runValidators: true }
      )
        .populate({
          path: 'items.product',
          populate: {
            path: 'suppliers',
          },
        })
        .populate('supplier', 'name contact');

      res.status(200).json(updatedOrder);
    } catch (error) {
      console.error('Lỗi cập nhật phiếu đặt hàng:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật phiếu đặt hàng', error: error.message });
    }
  },

  deletePurchaseOrder: async (req, res) => {
    try {
      const orderId = req.params.id;
      const deletedOrder = await PurchaseOrder.findByIdAndDelete(orderId);

      if (!deletedOrder) {
        return res.status(404).json({ message: 'Không tìm thấy phiếu đặt hàng để xóa.' });
      }

      res.status(200).json({ message: 'Phiếu đặt hàng đã được xóa thành công.' });
    } catch (error) {
      console.error('Lỗi xóa phiếu đặt hàng:', error);
      res.status(500).json({ message: 'Lỗi khi xóa phiếu đặt hàng', error: error.message });
    }
  },

  resendPurchaseOrderEmail: async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = await PurchaseOrder.findById(orderId)
        .populate({
          path: 'items.product',
          populate: {
            path: 'suppliers',
          },
        })
        .populate('supplier', 'name contact');

      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy phiếu đặt hàng.' });
      }

      if (order.supplier && order.supplier.contact && order.supplier.contact.email) {
        await sendPurchaseOrderEmail(order.supplier.contact.email, order);
        res.status(200).json({ message: 'Email đã được gửi lại thành công.' });
      } else {
        res.status(400).json({ message: 'Không tìm thấy email của nhà cung cấp.' });
      }
    } catch (error) {
      console.error('Lỗi khi gửi lại email đơn hàng:', error);
      res.status(500).json({ message: 'Lỗi khi gửi lại email đơn hàng', error: error.message });
    }
  },

  splitPurchaseOrder: async (req, res) => {
    try {
      const orderId = req.params.id;
      const { splitQuantities } = req.body; // Expect split quantities from the request body

      const order = await PurchaseOrder.findById(orderId).populate({
        path: 'items.product',
        populate: { path: 'units' },
      });
      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy phiếu đặt hàng." });
      }

      if (order.status === "hoàn thành") {
        return res.status(400).json({ message: "Phiếu đã hoàn thành, không thể chia." });
      }

      // Validate splitQuantities
      if (!Array.isArray(splitQuantities) || splitQuantities.length !== order.items.length) {
        return res.status(400).json({ message: "Dữ liệu số lượng chia không hợp lệ." });
      }

      const splitItems = order.items.map((item, index) => {
        const splitQuantity = splitQuantities[index];
        const unit = item.product.units.find((u) => u.name === item.unit);
        const ratio = unit?.ratio || 1;
        const adjustedQuantity = splitQuantity * ratio; // Adjust quantity based on unit ratio

        if (splitQuantity == null || splitQuantity <= 0) {
          throw new Error(`Số lượng chia phải lớn hơn 0 cho sản phẩm ${item.productName}.`);
        }
        if (adjustedQuantity > item.quantity - item.receivedQuantity) {
          throw new Error(`Số lượng chia vượt quá số lượng còn lại cho sản phẩm ${item.productName}.`);
        }
        return {
          product: item.product._id,
          quantity: adjustedQuantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: adjustedQuantity * item.unitPrice,
        };
      });

      const remainingItems = order.items.map((item, index) => ({
        ...item.toObject(),
        receivedQuantity: (item.receivedQuantity || 0) + splitItems[index].quantity,
      }));

      const newReceipt = new GoodReceipt({
        purchaseOrder: order._id,
        supplier: order.supplier,
        receivedBy: req.user.id,
        items: splitItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          manufactureDate: new Date(),
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        })),
        status: "draft",
        notes: "Phiếu nhập kho được tạo từ việc chia phiếu đặt hàng.",
      });

      await newReceipt.save();

      // Update the purchase order to reflect the received quantities and status
      order.items = remainingItems;
      order.status = remainingItems.every((item) => item.receivedQuantity === item.quantity)
        ? "hoàn thành"
        : "đã nhận 1 phần";
      await order.save();

      res.status(201).json({ message: "Chia phiếu thành công.", newReceipt });
    } catch (error) {
      console.error("Lỗi khi chia phiếu đặt hàng:", error);
      res.status(500).json({ message: "Lỗi khi chia phiếu đặt hàng.", error: error.message });
    }
  },
};

const sendPurchaseOrderEmail = async (toEmail, order) => {
  try {
    const itemsListHtml = order.items.map((item, index) => {
      const productName = item.product ? item.product.name : 'Không rõ';
      const unit = item.product?.units.find(u => u.name === item.unit);
      const salePrice = unit ? unit.salePrice : 0;
      const itemTotal = salePrice * item.quantity;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${productName}</td>
          <td>${item.quantity} ${item.unit}</td>
          <td>${salePrice.toLocaleString()} đ</td>
          <td>${item.conversionRate}</td>
          <td>${itemTotal.toLocaleString()} đ</td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      to: toEmail,
      subject: 'Xác nhận đơn đặt hàng mới',
      html: `
        <p>Kính gửi quý đối tác,</p>
        <p>Chúng tôi xin trân trọng thông báo về đơn đặt hàng mới của quý vị. Chi tiết đơn hàng như sau:</p>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Sản phẩm</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Quy đổi</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml}
          </tbody>
        </table>
        <p>Tổng giá trị đơn hàng: <strong>${order.totalAmount.toLocaleString()} đ</strong></p>
        <p>Xin chân thành cảm ơn sự hợp tác của quý vị.</p>
        <p>Trân trọng,</p>
        <p>Phòng mua hàng</p>
      `,
    };

    await sendEmail(mailOptions);
    console.log(`Đã gửi email đơn hàng đến: ${toEmail}`);
  } catch (error) {
    console.error('Lỗi khi gửi email đơn hàng:', error);
  }
};

module.exports = purchaseOrderController;