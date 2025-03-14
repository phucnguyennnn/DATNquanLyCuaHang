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
  useTheme
} from '@mui/material';
import axios from 'axios';

const ConfirmGoodReceipt = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [createdBatches, setCreatedBatches] = useState([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchReceipts = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/goodReceipt');
      const pending = res.data.filter((r) => r.status !== 'received');
      setReceipts(pending);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleConfirm = async (receiptId) => {
    try {
      setLoading(true);
      const res = await axios.patch(`http://localhost:8000/api/goodReceipt/confirm/${receiptId}`);
      alert('Xác nhận thành công! Lô hàng đã được chuyển vào kho.');
      setCreatedBatches(res.data.batches);
      setSelectedReceipt(receiptId);
      fetchReceipts(); // cập nhật danh sách
    } catch (error) {
      console.error(error);
      alert('Xác nhận thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Xác nhận chuyển lô hàng từ phiếu nhập kho vào kho hàng
      </Typography>

      <Stack spacing={3}>
        <Box
          sx={{
            maxHeight: '500px', // Giới hạn chiều cao của Box
            overflowY: 'auto', // Thêm cuộn dọc nếu cần
            mb: 4, // Thêm khoảng cách dưới
          }}
        >
          {receipts.map((receipt) => (
            <Paper key={receipt._id} sx={{ p: 2, mb: 2, border: '1px solid #ddd' }}>
              <Stack direction={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems="center" spacing={2}>
                <Box>
                  <Typography fontWeight="bold">Phiếu nhập: {receipt._id}</Typography>
                  <Typography>Nhà cung cấp: {receipt.supplierId?.name}</Typography>
                  <Typography>Số mặt hàng: {receipt.items.length}</Typography>
                  <Chip
                    label={receipt.status}
                    color={receipt.status === 'completed' ? 'warning' : 'default'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  onClick={() => handleConfirm(receipt._id)}
                  size="large"
                >
                  {loading && selectedReceipt === receipt._id
                    ? 'Đang xác nhận...'
                    : 'Xác nhận nhập kho'}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Box>
      </Stack>

      {/* Danh sách lô hàng được tạo */}
      {createdBatches.length > 0 && (
        <Box mt={5}>
          <Divider />
          <Typography variant="h6" mt={3} mb={2} fontWeight="bold">
            Danh sách lô hàng được tạo:
          </Typography>
          <Stack spacing={2}>
            {createdBatches.map((batch) => (
              <Paper key={batch._id} sx={{ p: 2, backgroundColor: '#f1f8e9' }}>
                <Typography fontWeight="bold">Lô hàng: {batch._id}</Typography>
                <Typography>Sản phẩm: {batch.productId}</Typography>
                <Typography>Số lượng: {batch.quantity}</Typography>
                <Typography>Ngày sản xuất: {batch.manufacture_day}</Typography>
                <Typography>Hạn sử dụng: {batch.expiry_day}</Typography>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default ConfirmGoodReceipt;