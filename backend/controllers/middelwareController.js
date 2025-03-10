const jwt = require('jsonwebtoken');

const middlewareController = {
    // dung de xac thuc token
    verifyToken: (req, res, next) => {
        const authHeader = req.headers.token;
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            jwt.verify(token, process.env.JWT_SECRET, (err, account) => {
                if (err) res.status(403).json("Token is not valid!");
                req.account = account;
                next();
            });
        } else {
            return res.status(401).json("You are not authenticated!");
        }
    },
    verifyTokenAndAuthorization: (req, res, next) => {
        middlewareController.verifyToken(req, res, () => {
            console.log("Account Info:", req.account); // Kiểm tra dữ liệu token
            if (req.account.id == req.params.id || req.account.isAdmin) {
                next();
            } else {
                res.status(403).json("You are not allowed to do that!");
            }
        });
    }
};

module.exports = middlewareController;