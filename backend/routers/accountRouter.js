const router = require('express').Router();
const accountController = require('../controllers/accountController');
const middlewareController = require('../middlewares/middelwareController');


// Get all account
router.get('/', accountController.getAllAccount);

// delete account
router.delete('/:id', middlewareController.verifyTokenAndAuthorization, accountController.deleteAccount);


module.exports = router;