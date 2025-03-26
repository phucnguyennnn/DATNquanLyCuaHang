const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let refreshTokens = [];

const authController = {
    // Đăng ký người dùng mới
    registerUser: async (req, res) => {
        try {
            const { username, password, fullName, email, phone, address, role } = req.body;

            // Kiểm tra username hoặc email đã tồn tại chưa
            const existingUsername = await User.findOne({ username });
            if (existingUsername) return res.status(400).json({ error: 'Username already exists' });

            const existingEmail = await User.findOne({ email });
            if (existingEmail) return res.status(400).json({ error: 'Email already exists' });

            // Tạo người dùng mới
            const newUser = new User({
                username,
                password,
                fullName,
                email,
                phone,
                address,
                role,
            });

            const savedUser = await newUser.save();
            res.status(200).json(savedUser);
        } catch (error) {
            console.error('Error in registerUser:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Tạo access token
    generateAccessToken: (user) => {
        return jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        );
    },

    // Tạo refresh token
    generateRefreshToken: (user) => {
        return jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '365d' }
        );
    },

    // Đăng nhập
    loginUser: async (req, res) => {
        try {
            const { username, password } = req.body;

            // Tìm người dùng trong database
            const user = await User.findOne({ username });
            if (!user) return res.status(400).json({ error: 'Username is not found' });

            // So sánh mật khẩu
            const validPassword = await user.comparePassword(password);
            if (!validPassword) return res.status(404).json({ error: 'Password is not correct' });

            // Tạo access token và refresh token
            const accessToken = authController.generateAccessToken(user);
            const refreshToken = authController.generateRefreshToken(user);

            // Lưu refresh token vào mảng (hoặc database nếu cần)
            refreshTokens.push(refreshToken);

            // Gửi refresh token qua cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Sử dụng secure cookie trong production
                sameSite: 'strict',
                path: '/',
            });

            // Xóa password trước khi trả về
            const { password: _, ...userInfo } = user._doc;
            res.status(200).json({ ...userInfo, accessToken });
        } catch (error) {
            console.error('Error in loginUser:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Yêu cầu refresh token
    requestRefreshToken: async (req, res) => {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.status(401).json({ error: 'You are not authenticated' });

        // Kiểm tra refresh token có hợp lệ không
        if (!refreshTokens.includes(refreshToken)) {
            return res.status(403).json({ error: 'Refresh token is not valid' });
        }

        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Invalid refresh token' });

            // Xóa refresh token cũ
            refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

            // Tạo access token và refresh token mới
            const newAccessToken = authController.generateAccessToken(user);
            const newRefreshToken = authController.generateRefreshToken(user);

            // Lưu refresh token mới vào mảng
            refreshTokens.push(newRefreshToken);

            // Gửi refresh token mới qua cookie
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
            });

            res.status(200).json({ accessToken: newAccessToken });
        });
    },

    // Đăng xuất
    logoutUser: async (req, res) => {
        // Xóa refresh token khỏi cookie
        res.clearCookie('refreshToken');

        // Xóa refresh token khỏi mảng
        refreshTokens = refreshTokens.filter((token) => token !== req.cookies.refreshToken);

        res.status(200).json({ message: 'You have been logged out' });
    },
};

module.exports = authController;