const Account = require('../models/Account');

const accountController = {
    // Get all account
    getAllAccount: async (req, res) => {
        try {
            const account = await Account.find();
            res.status(200).json(account);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Delete account
    deleteAccount: async (req, res) => {
        try {
            const { id } = req.params;
            const account = await Account.findByIdAndDelete(id);
            if (!account) {
                return res.status(404).json({ error: 'Account not found' });
            }
            res.status(200).json({ message: 'Account deleted' });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
};

module.exports = accountController;