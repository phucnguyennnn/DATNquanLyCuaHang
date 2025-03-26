const User = require('../models/User');
const bcrypt = require('bcrypt');

const userController = {
    // Lấy tất cả người dùng
    getAllUsers: async (req, res) => {
        try {
            const users = await User.find();
            res.status(200).json(users);
        } catch (error) {
            console.error('Error in getAllUsers:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Lấy thông tin người dùng bằng ID
    getUserById: async (req, res) => {
        try {
            const { id } = req.params;
            const user = await User.findById(id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.status(200).json(user);
        } catch (error) {
            console.error('Error in getUserById:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Cập nhật thông tin người dùng
    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            const { fullName, email, phone, address, username, password, role } = req.body;

            let updateData = { fullName, email, phone, address, username, role };

            if (password) {
                const salt = await bcrypt.genSalt(10);
                updateData.password = await bcrypt.hash(password, salt);
            }

            const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });

            if (!updatedUser) return res.status(404).json({ error: 'User not found' });

            res.status(200).json(updatedUser);
        } catch (error) {
            console.error('Error in updateUser:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Xóa người dùng
    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await User.findByIdAndDelete(id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            res.status(200).json({ message: 'User deleted' });
        } catch (error) {
            console.error('Error in deleteUser:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
};

module.exports = userController;