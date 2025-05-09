import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Divider,
  Snackbar,
  Alert,
  InputAdornment
} from '@mui/material';
import { useSettings } from '../contexts/SettingsContext';

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const [expiryThreshold, setExpiryThreshold] = useState(settings.expiryThresholdDays.toString());
  const [quantityThreshold, setQuantityThreshold] = useState(settings.lowQuantityThreshold.toString());
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const handleExpiryChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    setExpiryThreshold(value);
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    setQuantityThreshold(value);
  };

  const handleSave = () => {
    const expiryValue = parseInt(expiryThreshold, 10);
    const quantityValue = parseInt(quantityThreshold, 10);
    
    if (isNaN(expiryValue) || expiryValue <= 0) {
      setNotification({
        open: true,
        message: 'Số ngày cảnh báo hết hạn không hợp lệ',
        severity: 'error'
      });
      return;
    }
    
    if (isNaN(quantityValue) || quantityValue <= 0) {
      setNotification({
        open: true,
        message: 'Ngưỡng số lượng thấp không hợp lệ',
        severity: 'error'
      });
      return;
    }
    
    updateSettings({
      expiryThresholdDays: expiryValue,
      lowQuantityThreshold: quantityValue
    });
    
    setNotification({
      open: true,
      message: 'Đã lưu cài đặt thành công',
      severity: 'success'
    });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Cài đặt hệ thống
      </Typography>
      
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Cài đặt ngưỡng cảnh báo hàng tồn kho
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Ngưỡng cảnh báo sắp hết hạn"
            value={expiryThreshold}
            onChange={handleExpiryChange}
            fullWidth
            helperText="Số ngày trước khi sản phẩm hết hạn sẽ hiển thị cảnh báo"
            InputProps={{
              endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
            }}
          />
          
          <Alert severity="info" sx={{ mt: -2 }}>
            <Typography variant="body2">
              Lưu ý: Những sản phẩm đạt đến ngưỡng sắp hết hạn sẽ được tự động giảm giá 30%. Nhân viên có thể bỏ hoặc thêm tùy chọn giảm giá trong khi bán sản phẩm.
            </Typography>
          </Alert>
          
          <TextField
            label="Ngưỡng cảnh báo số lượng thấp"
            value={quantityThreshold}
            onChange={handleQuantityChange}
            fullWidth
            helperText="Số lượng tồn kho thấp sẽ hiển thị cảnh báo"
            InputProps={{
              endAdornment: <InputAdornment position="end">sản phẩm</InputAdornment>,
            }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSave}
            >
              Lưu cài đặt
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;