const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    
    // Lấy token từ header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        status: 'fail',
        message: 'Vui lòng đăng nhập để truy cập' 
      });
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kiểm tra người dùng tồn tại
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'Người dùng không tồn tại'
      });
    }

    // Gán user vào request
    req.user = currentUser;
    next();
  } catch (error) {
    console.error('Error in protect middleware:', error);
    return res.status(401).json({
      status: 'fail',
      message: 'Phiên đăng nhập không hợp lệ',
      error: error.message // Thêm thông báo lỗi chi tiết
    });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'Bạn không có quyền thực hiện hành động này'
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };