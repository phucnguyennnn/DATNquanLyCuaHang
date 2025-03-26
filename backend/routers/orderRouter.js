const router = require("express").Router();
const orderController = require("../controllers/orderController");
const middlewareController = require("../controllers/middlewareController");

router.post("/", middlewareController.verifyToken, orderController.createOrder);
router.get("/", middlewareController.verifyToken, orderController.getOrders);
router.get("/:id", middlewareController.verifyToken, orderController.getOrderById);

module.exports = router;
