const authController = require('../controllers/authController');
const middlewareController = require('../controllers/middelwareController');
const router = require('express').Router();
const middelwereController = require('../controllers/middelwareController');


router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/refresh', authController.requestRefeshToken);
router.post('/logout', middlewareController.verifyToken, authController.accountLogout);


module.exports = router;