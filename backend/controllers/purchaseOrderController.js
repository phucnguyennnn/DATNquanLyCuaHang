// controllers/purchaseOrderController.js
const PurchaseOrder = require('../models/PurchaseOrder');
const nodemailer = require('nodemailer');
require('dotenv').config();

const purchaseOrderController = {
  createPurchaseOrder: async (req, res) => {
    try {
      const { supplierId, items, sendEmail } = req.body;

      if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Vui lòng cung cấp supplierId và danh sách sản phẩm.' });
      }

      const totalPrice = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

      const order = new PurchaseOrder({
        supplierId,
        items,
        totalPrice,
      });

      const savedOrder = await order.save();

      const populatedOrder = await PurchaseOrder.findById(savedOrder._id)
        .populate('items.productId')
        .populate('supplierId');

      const supplier = populatedOrder.supplierId;
      const supplierEmail = supplier.contact?.email;

      if (sendEmail && supplierEmail) {
        await sendOrderEmail(supplierEmail, populatedOrder, supplier.name);
      }

      res.status(201).json(populatedOrder);
    } catch (error) {
      console.error('Lỗi tạo phiếu đặt mua:', error);
      res.status(500).json({ error: error.message });
    }
  },

  getPurchaseOrderById: async (req, res) => {
    try {
      const order = await PurchaseOrder.findById(req.params.id)
        .populate('items.productId')
        .populate('supplierId');

      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy phiếu đặt mua.' });
      }

      res.status(200).json(order);
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết phiếu:', error);
      res.status(500).json({ error: error.message });
    }
  },

  getAllPurchaseOrders: async (req, res) => {
    try {
      const orders = await PurchaseOrder.find()
        .populate('items.productId')
        .populate('supplierId');

      res.status(200).json(orders);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách phiếu:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

const sendOrderEmail = async (toEmail, order, supplierName) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const itemsListHtml = order.items.map((item, idx) => {
      const productName = item.productId?.name || 'Không rõ';
      return `<li>Sản phẩm ${idx + 1}: ${productName} - Số lượng: ${item.quantity} </li>`;
    }).join('');

    const mailOptions = {
      from: `"Hệ thống Đặt Hàng" <${process.env.EMAIL}>`,
      to: toEmail,
      subject: 'Xác nhận phiếu đặt hàng mới',
      html: `
        <p>Chào ${supplierName},</p>
        <p>Bạn có một phiếu đặt hàng mới từ hệ thống:</p>
        <ul>${itemsListHtml}</ul>
        <p>Trân trọng,<br/>Phòng Vật tư</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Đã gửi email xác nhận đến:', toEmail);
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
  }
};

module.exports = purchaseOrderController;
