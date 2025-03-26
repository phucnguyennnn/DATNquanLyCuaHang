const nodemailer = require('nodemailer');

// Tạo transporter để gửi email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL, 
    pass: process.env.EMAIL_PASSWORD, 
  },
});

// Hàm gửi email xác nhận
const sendVerificationEmail = async (email, verificationCode) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Xác nhận đăng ký tài khoản',
    html: `<p>Mã xác nhận của bạn là: <strong>${verificationCode}</strong></p>
           <p>Mã này sẽ hết hạn sau 5 phút.</p>`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };