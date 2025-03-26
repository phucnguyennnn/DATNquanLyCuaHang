const purchaseOrderController = require("../controllers/purchaseOrderController");
const middlewareController = require("../middlewares/middelwareController");
const router = require("express").Router();

// Tạo phiếu đặt mua
router.post(
  "/",
  //middlewareController.verifyToken,
  purchaseOrderController.createPurchaseOrder
);

// Lấy tất cả phiếu đặt mua
router.get(
  "/",
 // middlewareController.verifyToken,
  purchaseOrderController.getAllPurchaseOrders
);

// Lấy chi tiết phiếu đặt mua theo ID
router.get(
  "/:id",
 // middlewareController.verifyToken,
  purchaseOrderController.getPurchaseOrderById
);

module.exports = router;
