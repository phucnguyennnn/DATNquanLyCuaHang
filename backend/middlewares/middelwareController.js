const jwt = require('jsonwebtoken');

const middlewareController = {
    // Xác thực token
    verifyToken: (req, res, next) => {
        const authHeader = req.headers.token; // Sử dụng tiêu đề "Authorization"
        if (authHeader) {
            const token = authHeader.split(" ")[1]; // Lấy token từ "Bearer <token>"
            jwt.verify(token, process.env.JWT_SECRET, (err, account) => {
                if (err) {
                    return res.status(403).json({ message: "Token không hợp lệ" });
                }
                req.account = account; // Lưu thông tin tài khoản vào req.account
                next();
            });
        } else {
            return res.status(401).json({ message: "Bạn chưa được xác thực" });
        }
    },

    // Kiểm tra quyền admin
    verifyTokenAndAdmin: (req, res, next) => {
        middlewareController.verifyToken(req, res, () => {
            if (req.account.isAdmin) {
                next(); // Cho phép tiếp tục nếu là admin
            } else {
                return res.status(403).json({ message: "Bạn không có quyền truy cập" });
            }
        });
    },

    // Kiểm tra quyền tài khoản hoặc admin
    verifyTokenAndAuthorization: (req, res, next) => {
        middlewareController.verifyToken(req, res, () => {
            if (req.account.id === req.params.id || req.account.isAdmin) {
                next(); // Cho phép tiếp tục nếu là chính tài khoản hoặc admin
            } else {
                return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này" });
            }
        });
    },
};

module.exports = middlewareController;