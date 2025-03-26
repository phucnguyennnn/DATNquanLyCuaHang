const Order = require("../models/Order");

const orderController = {

    createOrder: async (req, res) => {
        try {
            const { orderDetailID, customer, totalAmount } = req.body;
            const employeeID = req.account.id; // Lấy ID từ token

            const newOrder = new Order({
                orderDetailID,
                customer: customer || null,
                totalAmount,
                employeeID
            });

            const savedOrder = await newOrder.save();
            res.status(201).json(savedOrder);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },


    getOrders: async (req, res) => {
        try {
            const orders = await Order.find()
                .populate("orderDetailID")
                .populate("customer")
                .populate("employeeID", "username");
            res.status(200).json(orders);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getOrderById: async (req, res) => {
        try {
            const order = await Order.findById(req.params.id)
                .populate("orderDetailID")
                .populate("customer")
                .populate("employeeID", "username");

            if (!order) return res.status(404).json({ error: "Order not found" });

            res.status(200).json(order);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = orderController;
