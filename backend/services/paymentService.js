const crypto = require('crypto');
const axios = require('axios');

class PaymentService {
    constructor() {
        this.vnpay = {
            tmnCode: process.env.VNPAY_TMN_CODE || 'your_tmn_code',
            secretKey: process.env.VNPAY_SECRET_KEY || 'your_secret_key',
            url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
            returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/payment/vnpay-return',
            api: {
                querydr: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
            }
        };

        this.momo = {
            partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
            accessKey: process.env.MOMO_ACCESS_KEY || 'your_access_key',
            secretKey: process.env.MOMO_SECRET_KEY || 'your_secret_key',
            endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
            redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment/momo-return',
            ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:8000/api/payment/momo-ipn'
        };
    }

    // Tạo URL thanh toán VNPay
    createVNPayPayment(orderId, amount, orderInfo, ipAddr) {
        const date = new Date();
        const createDate = this.formatDate(date);
        const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000)); // 15 phút

        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = this.vnpay.tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = orderInfo;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100; // VNPay yêu cầu amount * 100
        vnp_Params['vnp_ReturnUrl'] = this.vnpay.returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        vnp_Params['vnp_ExpireDate'] = expireDate;

        vnp_Params = this.sortObject(vnp_Params);

        const signData = new URLSearchParams(vnp_Params).toString();
        const hmac = crypto.createHmac('sha512', this.vnpay.secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
        vnp_Params['vnp_SecureHash'] = signed;

        return this.vnpay.url + '?' + new URLSearchParams(vnp_Params).toString();
    }

    // Tạo thanh toán MoMo QR
    async createMoMoQRPayment(orderId, amount, orderInfo) {
        const requestId = orderId + new Date().getTime();
        const extraData = '';
        const orderGroupId = '';
        const autoCapture = true;
        const lang = 'vi';

        const rawSignature = `accessKey=${this.momo.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.momo.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.momo.partnerCode}&redirectUrl=${this.momo.redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

        const signature = crypto
            .createHmac('sha256', this.momo.secretKey)
            .update(rawSignature)
            .digest('hex');

        const requestBody = {
            partnerCode: this.momo.partnerCode,
            partnerName: 'Test',
            storeId: 'MomoTestStore',
            requestId: requestId,
            amount: amount,
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: this.momo.redirectUrl,
            ipnUrl: this.momo.ipnUrl,
            lang: lang,
            requestType: 'captureWallet',
            autoCapture: autoCapture,
            extraData: extraData,
            orderGroupId: orderGroupId,
            signature: signature
        };

        try {
            const response = await axios.post(this.momo.endpoint, requestBody);
            return response.data;
        } catch (error) {
            throw new Error(`MoMo API Error: ${error.message}`);
        }
    }

    // Xác thực callback VNPay
    verifyVNPayCallback(vnpParams) {
        const secureHash = vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHashType'];

        vnpParams = this.sortObject(vnpParams);
        const signData = new URLSearchParams(vnpParams).toString();
        const hmac = crypto.createHmac('sha512', this.vnpay.secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        return secureHash === signed;
    }

    // Xác thực callback MoMo
    verifyMoMoCallback(momoParams) {
        const { signature, ...params } = momoParams;
        const rawSignature = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const expectedSignature = crypto
            .createHmac('sha256', this.momo.secretKey)
            .update(rawSignature)
            .digest('hex');

        return signature === expectedSignature;
    }

    // Utility functions
    sortObject(obj) {
        const sorted = {};
        const str = [];
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                str.push(encodeURIComponent(key));
            }
        }
        str.sort();
        for (let key = 0; key < str.length; key++) {
            sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
        }
        return sorted;
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }
}

module.exports = new PaymentService();
