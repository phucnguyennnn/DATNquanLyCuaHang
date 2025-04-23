const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryConttroller");
const { body } = require("express-validator");

const createInventoryValidation = [
  body("product").isMongoId().withMessage("ID sản phẩm không hợp lệ."),
];

const updateInventoryValidation = [
  body("total_warehouse_stock")
    .isInt({ min: 0 })
    .optional()
    .withMessage("Số lượng trong kho không hợp lệ."),
  body("total_shelf_stock")
    .isInt({ min: 0 })
    .optional()
    .withMessage("Số lượng trên quầy không hợp lệ."),
  body("reserved_stock")
    .isInt({ min: 0 })
    .optional()
    .withMessage("Số lượng đã giữ không hợp lệ."),
  body("sold_stock")
    .isInt({ min: 0 })
    .optional()
    .withMessage("Số lượng đã bán không hợp lệ."),
];

const transferToShelfValidation = [
  body("productId").isMongoId().withMessage("ID sản phẩm không hợp lệ."),
  body("quantityToTransfer")
    .isInt({ min: 1 })
    .withMessage("Số lượng cần chuyển phải lớn hơn 0."),
];

router.post(
  "/",
  createInventoryValidation,
  inventoryController.createInventory
);
router.get("/", inventoryController.getAllInventories);
router.get("/:id", inventoryController.getInventoryById);
router.put(
  "/:id",
  updateInventoryValidation,
  inventoryController.updateInventory
);
router.post(
  "/transfer-to-shelf",
  transferToShelfValidation,
  inventoryController.transferToShelf
);

module.exports = router;
