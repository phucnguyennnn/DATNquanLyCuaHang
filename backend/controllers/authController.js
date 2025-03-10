const Account = require('../models/Account');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let refreshTokens = [];
const authController = {
    registerUser: async (req, res) => {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            // Tạo một account mới
            const newAccount = new Account({
                username: req.body.username,
                password: hashedPassword,
            });
            // Lưu account vào database
            const account = await newAccount.save();
            res.status(200).json(account);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Generate access token
    generateAccessToken: (account) => {
        return jwt.sign({ id: account.id, isAdmin: account.isAdmin },
            process.env.JWT_SECRET, { expiresIn: '5m' }
        );
    },
    // Generate refresh token   
    generateRefreshToken: (account) => {
        return jwt.sign({ id: account.id, isAdmin: account.isAdmin },
            process.env.JWT_REFRESH_SECRET, { expiresIn: '365d' }
        );
    },

    loginUser: async (req, res) => {
        try {
            // Tìm account trong database
            const account = await Account.findOne
                ({ username: req.body.username });
            // Nếu không tìm thấy account       
            if (!account) {
                return res.status(400).json('Username is not found');
            }
            // So sánh password
            const validPassword = await bcrypt.compare
                (req.body.password, account.password);
            // Nếu password không đúng  
            if (!validPassword) {
                return res.status(404).json('Password is not correct');
            }
            if (account && validPassword) {
                const accessToken = authController.generateAccessToken(account);
                // Tạo refresh token
                const refreshToken = authController.generateRefreshToken(account);
                refreshTokens.push(refreshToken);
                res.cookie("refreshToken", refreshToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    path: '/'
                });
                // Xóa password trước khi trả về
                const { password, ...others } = account._doc;
                res.status(200).json({ ...others, accessToken });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // Refresh token
    requestRefeshToken: async (req, res) => {
        // take the refresh token from the user
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.status(401).json("you are not authenticated");
        if (!refreshTokens.includes(refreshToken)) {
            return res.status(403).json("Refresh token is not valid!");
        }
        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, account) => {
            if (err) {
                console.log(err);
            }
            refreshTokens = refreshTokens.filter(token => token !== refreshToken);
            const newAccessToken = authController.generateAccessToken(account);
            const newRefreshToken = authController.generateRefreshToken(account);
            refreshTokens.push(newRefreshToken);
            res.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
                path: '/',
            });
            res.status(200).json({ accessToken: newAccessToken });
        });
    },
    accountLogout: async (req, res) => {
        res.clearCookie("refreshToken");
        refreshTokens = refreshTokens.filter(token => token !== req.cookies.refreshToken);
        res.status(200).json("You logged out");
    }
};

// store token


module.exports = authController;