const Account = require('../models/Account');

const accountController = {

    getAllAccount: async (req, res) => {
        try {
            const accounts = await Account.find();
            res.status(200).json(accounts);
        } catch (error) {
            res.status(500).json({ message: "Lỗi máy chủ" });
        }
    },


    deleteAccount: async (req, res) => {
        try {
            const { id } = req.params;
            const account = await Account.findByIdAndDelete(id);
            if (!account) {
                return res.status(404).json({ message: "Không tìm thấy tài khoản" });
            }
            res.status(200).json({ message: "Tài khoản đã được xóa" });
        } catch (error) {
            res.status(500).json({ message: "Lỗi máy chủ" });
        }
    },
};

module.exports = accountController;