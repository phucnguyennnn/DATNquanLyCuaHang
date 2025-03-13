const authController = require('../controllers/authController');
const middlewareController = require('../middlewares/middelwareController');
const router = require('express').Router();


router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/refresh', authController.requestRefeshToken);
router.post('/logout', middlewareController.verifyToken, authController.accountLogout);


module.exports = router;