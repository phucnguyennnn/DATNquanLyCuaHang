const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

const router = express.Router();
router.use(authMiddleware.protect);

router.get("/", authMiddleware.restrictTo("admin"), userController.getAllUsers);
router.get("/me", userController.getCurrentUser);
router.get("/:id", userController.getUserById);
router.put("/:id", upload.single("profileImage"), userController.updateUser);
router.delete(
  "/:id",
  authMiddleware.restrictTo("admin"),
  userController.deleteUser
);
router.patch("/change-password", userController.changePassword);

module.exports = router;
