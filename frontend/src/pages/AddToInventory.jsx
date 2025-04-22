import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Divider,
  Chip,
  useMediaQuery,
  useTheme,
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import { format } from 'date-fns';

const AddToInventory = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [createdBatches, setCreatedBatches] = useState([]);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('http://localhost:8000/api/goodreceipt',
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      const pendingReceipts = res.data.filter(r => r.status === 'draft' || r.status === 'partially_received');
      setReceipts(pendingReceipts);
    } catch (error) {
      console.error('Error fetching good receipts:', error);
      setError(error.response?.data?.message || 'Failed to load good receipts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleConfirm = async (receiptId) => {
    try {
      setProcessingId(receiptId);
      setError(null);
      
      // Add authorization header if needed
      const token = localStorage.getItem('accessToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const res = await axios.patch(`http://localhost:8000/api/goodreceipt/confirm/${receiptId}`, {}, config);
      
      if (res.data.batches && Array.isArray(res.data.batches)) {
        // Map through batches to ensure consistent property names
        const formattedBatches = res.data.batches.map(batch => ({
          ...batch,
          productName: batch.productName || (batch.product && batch.product.name) || '',
          manufactureDate: batch.manufacture_day || batch.manufactureDate,
          expiryDate: batch.expiry_day || batch.expiryDate,
          import_price: batch.unitPrice || batch.import_price || 0
        }));
        setCreatedBatches(formattedBatches);
      }
      
      fetchReceipts();
      
      alert('Lô hàng đã được chuyển vào kho thành công!');
    } catch (error) {
      console.error('Error confirming good receipt:', error);
      setError(error.response?.data?.message || error.response?.data?.error || 'Failed to confirm good receipt. Please try again.');
      alert('Xác nhận thất bại: ' + (error.response?.data?.message || error.response?.data?.error || 'Đã xảy ra lỗi'));
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Chuyển phiếu nhập kho vào kho hàng
      </Typography>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffebee' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {loading && receipts.length === 0 ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : receipts.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">Không có phiếu nhập kho nào đang chờ xử lý</Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            maxHeight: '500px',
            overflowY: 'auto',
            mb: 4,
          }}
        >
          {receipts.map((receipt) => (
            <Paper 
              key={receipt._id} 
              sx={{ 
                p: 3, 
                mb: 2, 
                border: '1px solid #ddd',
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: 3,
                  borderColor: theme.palette.primary.light
                }
              }}
            >
              <Stack direction={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} spacing={2}>
                <Box flex={1}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Phiếu #{receipt.receiptDate ? formatDate(receipt.receiptDate) : 'N/A'}
                  </Typography>
                  <Typography>ID: {receipt._id}</Typography>
                  <Typography>Nhà cung cấp: {receipt.supplier?.name || 'N/A'}</Typography>
                  <Typography>Số lượng mặt hàng: {receipt.items?.length || 0}</Typography>
                  <Typography>Tổng tiền: {receipt.totalAmount?.toLocaleString('vi-VN')} VNĐ</Typography>
                  <Box mt={1}>
                    <Chip
                      label={receipt.status === 'draft' ? 'Chờ xử lý' : 'Đã nhận một phần'}
                      color={receipt.status === 'draft' ? 'primary' : 'warning'}
                      size="small"
                    />
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  disabled={processingId === receipt._id}
                  onClick={() => handleConfirm(receipt._id)}
                  startIcon={processingId === receipt._id ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{ minWidth: 150 }}
                >
                  {processingId === receipt._id ? 'Đang xử lý...' : 'Xác nhận nhập kho'}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Box>
      )}

      {createdBatches.length > 0 && (
        <Box mt={5}>
          <Divider />
          <Typography variant="h6" mt={3} mb={2} fontWeight="bold">
            Lô hàng đã được tạo:
          </Typography>
          <Stack spacing={2}>
            {createdBatches.map((batch) => (
              <Paper key={batch._id} sx={{ p: 3, bgcolor: '#f1f8e9', borderLeft: '4px solid #689f38' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Lô hàng ID: {batch._id}
                </Typography>
                <Stack direction={isMobile ? "column" : "row"} spacing={3} flexWrap="wrap">
                  <Box minWidth={200}>
                    <Typography><strong>Sản phẩm:</strong> {batch.productName || batch.product?.name || batch.productId}</Typography>
                    <Typography><strong>Số lượng:</strong> {batch.quantity}</Typography>
                  </Box>
                  <Box minWidth={200}>
                    <Typography><strong>Ngày SX:</strong> {formatDate(batch.manufactureDate)}</Typography>
                    <Typography><strong>Hạn SD:</strong> {formatDate(batch.expiryDate)}</Typography>
                  </Box>
                  <Box>
                    <Typography><strong>Đơn giá:</strong> {batch.import_price?.toLocaleString('vi-VN') || 'N/A'} VNĐ</Typography>
                    <Typography><strong>Trạng thái:</strong> {batch.status || 'active'}</Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default AddToInventory;