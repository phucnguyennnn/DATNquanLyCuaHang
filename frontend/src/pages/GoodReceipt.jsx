import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Paper,
  Stack,
  Grid,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

const CreateGoodReceipt = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createdBatches, setCreatedBatches] = useState([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const token = localStorage.getItem("authToken");
  const userID = localStorage.getItem("userID");

  const isTokenValid = () => {
    if (!token) {
      alert("Vui lòng đăng nhập để tiếp tục.");
      return false;
    }
    return true;
  };

  const fetchOrders = async () => {
    if (!isTokenValid()) return;
    try {
      const res = await axios.get("http://localhost:8000/api/purchaseorder", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const approvedOrders = res.data.filter((o) => o.status === "approved");
      setOrders(approvedOrders);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách phiếu đặt mua:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSelectOrder = async (orderId) => {
    if (!isTokenValid()) return;
    try {
      const res = await axios.get(
        `http://localhost:8000/api/purchaseorder/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSelectedOrder(res.data);
      setReceiptItems(
        res.data.items.map((item) => ({
          product: item.product?._id || item.product,
          productName: item.product?.name || item.productName,
          productSKU: item.product?.SKU || item.productSKU,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          manufactureDate: new Date().toISOString().split('T')[0], // Giá trị mặc định
          expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0], // Giá trị mặc định
        }))
      );
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết phiếu đặt hàng:", error);
      alert("Không thể lấy thông tin chi tiết phiếu đặt hàng. Vui lòng thử lại!");
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...receiptItems];
    updatedItems[index][field] = value;
    setReceiptItems(updatedItems);
  };

  const handleSubmit = async () => {
    if (!isTokenValid() || !selectedOrder || !userID) {
      alert("Vui lòng chọn phiếu đặt mua và đảm bảo bạn đã đăng nhập!");
      return;
    }

    const itemsToSend = receiptItems.map(item => ({
      product: item.product,
      quantity: Number(item.quantity),
      manufactureDate: item.manufactureDate,
      expiryDate: item.expiryDate,
    }));

    const requestData = {
      purchaseOrderId: selectedOrder._id,
      supplier: selectedOrder.supplier._id,
      receivedBy: userID,
      items: itemsToSend,
    };

    try {
      setLoading(true);
      const response = await axios.post(
        "http://localhost:8000/api/goodReceipt/from-po",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Phản hồi từ server:", response.data);
      
      // Store created batches if returned from the API
      if (response.data.batches && Array.isArray(response.data.batches)) {
        setCreatedBatches(response.data.batches.map(batch => ({
          ...batch,
          productName: receiptItems.find(item => item.product === batch.product)?.productName || "Sản phẩm",
          productSKU: receiptItems.find(item => item.product === batch.product)?.productSKU || "",
        })));
      } else if (response.data.receipt?.items) {
        // Alternative approach if batches are inside receipt items
        const newBatches = response.data.receipt.items
          .filter(item => item.batch)
          .map(item => ({
            _id: item.batch,
            product: item.product._id || item.product,
            productName: item.product.name || receiptItems.find(ri => ri.product === item.product)?.productName,
            productSKU: item.product.SKU || receiptItems.find(ri => ri.product === item.product)?.productSKU,
            quantity: item.quantity,
            manufactureDate: item.manufactureDate,
            expiryDate: item.expiryDate,
            unitPrice: item.unitPrice || selectedOrder.items.find(oi => oi.product._id === item.product)?.unitPrice,
          }));
        setCreatedBatches(newBatches);
      }
      
      alert("Tạo phiếu nhập kho thành công!");
      setSelectedOrder(null);
      setReceiptItems([]);
      fetchOrders();
    } catch (error) {
      console.error("Lỗi khi tạo phiếu nhập kho:", error);
      let errorMessage = "Tạo phiếu nhập kho thất bại!";
      if (error.response) {
        errorMessage += ` ${error.response.status} - ${error.response.data?.message || JSON.stringify(error.response.data)}`;
      } else if (error.request) {
        errorMessage += " Không có phản hồi từ server.";
      } else {
        errorMessage += ` ${error.message}`;
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        height: "100vh",
        overflow: "auto",
        backgroundColor: "#f9f9f9",
      }}
    >
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Chuyển phiếu đặt mua thành phiếu nhập kho
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Chọn phiếu đặt mua</InputLabel>
        <Select
          value={selectedOrder?._id || ""}
          label="Chọn phiếu đặt mua"
          onChange={(e) => handleSelectOrder(e.target.value)}
        >
          {orders.map((order) => (
            <MenuItem key={order._id} value={order._id}>
              {order._id} - {order.supplier?.name || "Không rõ nhà cung cấp"}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedOrder && selectedOrder.items && receiptItems.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Thông tin chi tiết phiếu nhập kho
          </Typography>
          <Stack spacing={3}>
            {receiptItems.map((item, index) => (
              <Paper
                key={item.product || index}
                elevation={2}
                sx={{ p: 2, backgroundColor: "#fff" }}
              >
                <Box mb={2}>
                  <Typography fontWeight="bold" variant="h6">
                    {item.productName || "Sản phẩm không xác định"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mã sản phẩm: {item.productSKU || "N/A"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Đơn vị: {item.unit || "N/A"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Số lượng đặt: {selectedOrder.items[index]?.quantity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Đơn giá: {item.unitPrice?.toLocaleString() || 0} đ
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Thành tiền: {(selectedOrder.items[index]?.quantity * item.unitPrice)?.toLocaleString() || 0} đ
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Số lượng nhập"
                      type="number"
                      fullWidth
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      helperText="Số lượng nhập hàng thực tế"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Ngày sản xuất"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={item.manufactureDate}
                      onChange={(e) => handleItemChange(index, "manufactureDate", e.target.value)}
                      required
                      helperText="Ngày sản xuất của lô hàng"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Hạn sử dụng"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={item.expiryDate}
                      onChange={(e) => handleItemChange(index, "expiryDate", e.target.value)}
                      required
                      helperText="Hạn sử dụng của lô hàng"
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
            <Typography variant="h6">
              Tổng giá trị đơn hàng: {selectedOrder.totalAmount?.toLocaleString() || 0} đ
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading}
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? "Đang xử lý..." : "Tạo phiếu và nhập hàng vào kho"}
            </Button>
          </Box>
        </Paper>
      )}

      {createdBatches.length > 0 && (
        <Box mt={5}>
          <Divider />
          <Typography variant="h6" mt={3} mb={2} fontWeight="bold">
            Lô hàng đã được tạo:
          </Typography>
          <Stack spacing={2}>
            {createdBatches.map((batch) => (
              <Paper
                key={batch._id}
                sx={{
                  p: 3,
                  bgcolor: "#f1f8e9",
                  borderLeft: "4px solid #689f38",
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Lô hàng ID: {batch._id}
                </Typography>
                <Stack
                  direction={isMobile ? "column" : "row"}
                  spacing={3}
                  flexWrap="wrap"
                >
                  <Box minWidth={200}>
                    <Typography>
                      <strong>Sản phẩm:</strong>{" "}
                      {batch.productName || "Sản phẩm"}
                    </Typography>
                    <Typography>
                      <strong>Mã SKU:</strong> {batch.productSKU || "N/A"}
                    </Typography>
                    <Typography>
                      <strong>Số lượng:</strong> {batch.quantity}
                    </Typography>
                  </Box>
                  <Box minWidth={200}>
                    <Typography>
                      <strong>Ngày SX:</strong>{" "}
                      {formatDate(batch.manufactureDate)}
                    </Typography>
                    <Typography>
                      <strong>Hạn SD:</strong> {formatDate(batch.expiryDate)}
                    </Typography>
                    <Typography>
                      <strong>Đơn giá nhập:</strong>{" "}
                      {batch.unitPrice?.toLocaleString() || batch.import_price?.toLocaleString() || "N/A"} đ
                    </Typography>
                  </Box>
                  <Box>
                    <Chip 
                      label={batch.status || "Hoạt động"} 
                      color="success" 
                      size="small"
                      sx={{ mt: 1 }}
                    />
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

export default CreateGoodReceipt;