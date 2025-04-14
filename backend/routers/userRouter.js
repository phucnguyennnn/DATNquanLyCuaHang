const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require('../middlewares/authmiddleware');
const router = express.Router();

// Middleware xác thực cho tất cả route
router.use(authMiddleware.protect);

// Lấy thông tin người dùng
router.get("/", authMiddleware.restrictTo('admin'), userController.getAllUsers);
router.get("/me", userController.getCurrentUser);
router.get("/:id", userController.getUserById);

// Cập nhật thông tin
router.put("/:id", userController.updateUser);

// Xóa người dùng (chỉ admin)
router.delete("/:id", authMiddleware.restrictTo('admin'), userController.deleteUser);

// Thay đổi mật khẩu
router.patch("/change-password", userController.changePassword);

module.exports = router;