import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const QRPayment = ({ open, onClose, order, onPaymentSuccess }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPaymentData(null);
    setError('');
  };

  const createVNPayPayment = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(
        'http://localhost:8000/api/payment/vnpay/create',
        {
          orderId: order._id,
          amount: order.finalAmount,
          orderInfo: `Thanh toán đơn hàng ${order.orderNumber}`
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        // Mở tab mới với URL thanh toán VNPay
        window.open(response.data.paymentUrl, '_blank');
        startPaymentStatusCheck();
      }
    } catch (error) {
      setError('Lỗi khi tạo thanh toán VNPay: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const createMoMoPayment = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(
        'http://localhost:8000/api/payment/momo/create',
        {
          orderId: order._id,
          amount: order.finalAmount,
          orderInfo: `Thanh toán đơn hàng ${order.orderNumber}`
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setPaymentData({
          qrCodeUrl: response.data.qrCodeUrl,
          payUrl: response.data.payUrl,
          deeplink: response.data.deeplink
        });
        startPaymentStatusCheck();
      }
    } catch (error) {
      setError('Lỗi khi tạo thanh toán MoMo: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const startPaymentStatusCheck = () => {
    setCheckingStatus(true);
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/payment/status/${order._id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (response.data.paymentStatus === 'paid') {
          clearInterval(interval);
          setCheckingStatus(false);
          onPaymentSuccess();
          onClose();
        } else if (response.data.paymentStatus === 'failed') {
          clearInterval(interval);
          setCheckingStatus(false);
          setError('Thanh toán thất bại');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000); // Kiểm tra mỗi 3 giây

    // Dừng kiểm tra sau 10 phút
    setTimeout(() => {
      clearInterval(interval);
      setCheckingStatus(false);
    }, 600000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Thanh toán đơn hàng #{order?.orderNumber}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">
            Tổng tiền: {formatCurrency(order?.finalAmount || 0)}
          </Typography>
        </Box>

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="VNPay" />
          <Tab label="MoMo" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {checkingStatus && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={20} />
              <Typography>Đang kiểm tra trạng thái thanh toán...</Typography>
            </Box>
          </Alert>
        )}

        {/* VNPay Tab */}
        {activeTab === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thanh toán qua VNPay
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nhấn nút bên dưới để chuyển đến trang thanh toán VNPay
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={createVNPayPayment}
                disabled={loading}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Thanh toán VNPay'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* MoMo Tab */}
        {activeTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thanh toán qua MoMo
              </Typography>
              
              {!paymentData ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Tạo mã QR để thanh toán qua ví MoMo
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={createMoMoPayment}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={24} /> : 'Tạo mã QR MoMo'}
                  </Button>
                </>
              ) : (
                <Box textAlign="center">
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Quét mã QR bằng ứng dụng MoMo để thanh toán
                  </Typography>
                  
                  {paymentData.qrCodeUrl ? (
                    <img
                      src={paymentData.qrCodeUrl}
                      alt="MoMo QR Code"
                      style={{ maxWidth: '200px', height: 'auto' }}
                    />
                  ) : (
                    <QRCodeSVG value={paymentData.payUrl || ''} size={200} />
                  )}
                  
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => window.open(paymentData.deeplink, '_blank')}
                      sx={{ mr: 1 }}
                    >
                      Mở ứng dụng MoMo
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => window.open(paymentData.payUrl, '_blank')}
                    >
                      Thanh toán web
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRPayment;
