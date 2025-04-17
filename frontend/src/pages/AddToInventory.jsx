import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';

const ConfirmGoodReceiptPage = () => {
  const [goodReceipts, setGoodReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    const fetchGoodReceipts = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get('http://localhost:8000/api/goodReceipt', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGoodReceipts(response.data.filter((receipt) => receipt.status === 'draft'));
      } catch (error) {
        console.error('Lỗi khi lấy phiếu nhập kho:', error);
      }
    };

    fetchGoodReceipts();
  }, []);

  const handleConfirm = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.patch(
        `http://localhost:8000/api/goodReceipt/confirm/${selectedReceipt._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Xác nhận nhập kho thành công.');
      setOpenDialog(false);
      window.location.reload();
    } catch (error) {
      console.error('Lỗi khi xác nhận nhập kho:', error);
      alert('Xác nhận nhập kho thất bại.');
    }
  };

  const handleOpenDialog = (receipt) => {
    setSelectedReceipt(receipt);
    setOpenDialog(true);
  };

  const filteredGoodReceipts = goodReceipts.filter((receipt) =>
    receipt.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <h2>Xác nhận phiếu nhập kho</h2>
      <TextField
        label="Tìm kiếm theo nhà cung cấp"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2, width: '100%' }}
      />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã phiếu nhập</TableCell>
              <TableCell>Nhà cung cấp</TableCell>
              <TableCell>Ngày nhập</TableCell>
              <TableCell>Sản phẩm</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGoodReceipts.map((receipt) => (
              <TableRow key={receipt._id}>
                <TableCell>{receipt._id}</TableCell>
                <TableCell>{receipt.supplier.name}</TableCell>
                <TableCell>{new Date(receipt.receiptDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  {receipt.items.map((item) => (
                    <div key={item._id}>
                      {item.product.name} - SL: {item.quantity}
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  <Button variant="contained" color="primary" onClick={() => handleOpenDialog(receipt)}>
                    Xác nhận nhập kho
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>Xác nhận phiếu nhập kho</DialogTitle>
        <DialogContent>
          {selectedReceipt && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell>Số lượng</TableCell>
                    <TableCell>Ngày sản xuất</TableCell>
                    <TableCell>Ngày hết hạn</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedReceipt.items.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{new Date(item.manufactureDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(item.expiryDate).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleConfirm}>
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConfirmGoodReceiptPage;