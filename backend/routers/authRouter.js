const express = require('express');
const authController = require('../controllers/authController'); // Import authController
const router = express.Router();


router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/refresh', authController.requestRefreshToken);
router.post('/logout', authController.logoutUser);

module.exports = router;