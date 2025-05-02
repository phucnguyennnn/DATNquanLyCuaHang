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
import { format } from 'date-fns';

const CreateGoodReceipt = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [batchInfo, setBatchInfo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [createdBatches, setCreatedBatches] = useState([]);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const token = localStorage.getItem("authToken");

  // Hàm kiểm tra token
  const isTokenValid = () => {
    if (!token) {
      alert("Vui lòng đăng nhập để tiếp tục.");
      return false;
    }
    return true;
  };

  // Hàm fetchOrders được tách ra để tái sử dụng
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
      console.log("Approved orders:", approvedOrders);
      // Log the first order to see its structure
      if (approvedOrders.length > 0) {
        console.log(
          "First order structure:",
          JSON.stringify(approvedOrders[0], null, 2)
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Khi chọn phiếu đặt mua
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
      console.log("Chi tiết phiếu đặt hàng:", res.data);
      setSelectedOrder(res.data);

      // Khởi tạo batch info - sử dụng optional chaining để tránh lỗi nếu dữ liệu không có cấu trúc như mong đợi
      setBatchInfo(
        res.data.items.map((item) => ({
          product: item.product?._id || item.product,
          productName: item.product?.name || item.productName,
          productSKU: item.product?.SKU || item.productSKU,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          manufacture_day: "",
          expiry_day: "",
        }))
      );
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết phiếu đặt hàng:", error);
      alert("Không thể lấy thông tin chi tiết phiếu đặt hàng. Vui lòng thử lại!");
    }
  };

  // Xử lý thay đổi thông tin lô hàng
  const handleBatchChange = (index, field, value) => {
    const updated = [...batchInfo];
    updated[index][field] = value;
    setBatchInfo(updated);
  };

  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Gửi phiếu nhập kho và xác nhận nhập kho luôn
  const handleSubmit = async () => {
    
    if (!isTokenValid() || !selectedOrder) {
      alert("Vui lòng chọn phiếu đặt mua trước khi tạo phiếu nhập kho!");
      return;
    }

    // Prevent double submission
    if (loading || confirming) {
      console.log("Đang xử lý, vui lòng đợi...");
      return;
    }

    // Kiểm tra dữ liệu trước khi gửi
    const isDataComplete = batchInfo.every(
      (item) =>
        item.product &&
        item.quantity > 0 &&
        item.manufacture_day &&
        item.expiry_day
    );

    if (!isDataComplete) {
      alert(
        "Vui lòng nhập đầy đủ thông tin cho tất cả sản phẩm (số lượng, ngày sản xuất, hạn sử dụng)!"
      );
      return;
    }

    // Kiểm tra ngày hết hạn phải sau ngày sản xuất
    const hasValidDates = batchInfo.every((item) => {
      const mfgDate = new Date(item.manufacture_day);
      const expDate = new Date(item.expiry_day);
      return expDate > mfgDate;
    });

    if (!hasValidDates) {
      alert("Ngày hết hạn phải sau ngày sản xuất cho tất cả sản phẩm!");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Đảm bảo các trường bắt buộc có giá trị
      const userID = localStorage.getItem("userID");
      if (!userID) {
        alert("Không thể xác định người dùng, vui lòng đăng nhập lại");
        setLoading(false);
        return;
      }

      // Đảm bảo dữ liệu gửi đi đáp ứng yêu cầu của API
      const requestData = {
        purchaseOrderId: selectedOrder._id,
        supplierId: selectedOrder.supplier?._id || selectedOrder.supplierId,
        receivedBy: userID,
        totalAmount: selectedOrder.totalAmount,
        items: batchInfo.map(item => ({
          productId: item.product,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * Number(item.quantity),
          manufactureDate: item.manufacture_day,
          expiryDate: item.expiry_day,
          productName: item.productName,
          productSKU: item.productSKU
        }))
      };

      console.log("Dữ liệu gửi đi:", JSON.stringify(requestData, null, 2));

      // Bước 1: Tạo phiếu nhập kho
      const response = await axios.post(
        "http://localhost:8000/api/goodreceipt/from-po",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Bước 2: Xác nhận phiếu nhập kho để tạo batch ngay lập tức
      setConfirming(true);
      const confirmResponse = await axios.patch(
        `http://localhost:8000/api/goodreceipt/confirm/${response.data._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Lưu và hiển thị batches đã tạo
      // if (confirmResponse.data.batches && confirmResponse.data.batches.length > 0) {
      //   setCreatedBatches(confirmResponse.data.batches);
      // }

      alert("Tạo phiếu nhập kho và nhập hàng vào kho thành công!");
      setSelectedOrder(null);
      setBatchInfo([]);
      fetchOrders();
      
    } catch (error) {
      console.error("Lỗi khi tạo phiếu nhập kho:", error);
      
      // Hiển thị thông tin lỗi chi tiết hơn
      let errorMessage = "Tạo phiếu thất bại";
      if (error.response) {
        console.log("Dữ liệu lỗi:", error.response.data);
        errorMessage += `: ${error.response.status} - ${
          error.response.data.message || JSON.stringify(error.response.data)
        }`;
      } else if (error.request) {
        errorMessage += ": Không nhận được phản hồi từ server";
      } else {
        errorMessage += `: ${error.message}`;
      }

      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
      setConfirming(false);
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

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffebee' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {/* Chọn phiếu đặt mua */}
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

      {/* Hiển thị chi tiết sản phẩm */}
      {selectedOrder && selectedOrder.items && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Danh sách sản phẩm
          </Typography>

          <Stack spacing={3}>
            {selectedOrder.items.map((item, index) => (
              <Paper
                key={item.product?._id || index}
                elevation={2}
                sx={{ p: 2, backgroundColor: "#fff" }}
              >
                <Box mb={2}>
                  <Typography fontWeight="bold" variant="h6">
                    {item.product?.name || item.productName || "Sản phẩm không xác định"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mã sản phẩm: {item.product?.SKU || item.productSKU || "N/A"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Đơn vị: {item.unit || "N/A"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Số lượng đặt: {item.quantity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Đơn giá: {item.unitPrice?.toLocaleString() || 0} đ
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Thành tiền: {(item.quantity * item.unitPrice)?.toLocaleString() || 0} đ
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Số lượng nhập"
                      type="number"
                      fullWidth
                      value={batchInfo[index]?.quantity || ""}
                      onChange={(e) =>
                        handleBatchChange(index, "quantity", e.target.value)
                      }
                      helperText="Số lượng nhập hàng thực tế"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Ngày sản xuất"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={batchInfo[index]?.manufacture_day || ""}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        handleBatchChange(index, "manufacture_day", newDate);
                        
                        // Tự động điều chỉnh ngày hết hạn nếu cần
                        const current = batchInfo[index];
                        if (current.expiry_day && new Date(current.expiry_day) <= new Date(newDate)) {
                          // Tính ngày hết hạn mặc định (6 tháng sau ngày sản xuất)
                          const expDate = new Date(newDate);
                          expDate.setMonth(expDate.getMonth() + 6);
                          handleBatchChange(
                            index,
                            "expiry_day",
                            expDate.toISOString().split('T')[0]
                          );
                        }
                      }}
                      required
                      helperText="Ngày sản xuất của lô hàng"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Hạn sử dụng"
                      type="date"
                      fullWidth
                      error={batchInfo[index]?.manufacture_day && batchInfo[index]?.expiry_day && 
                             new Date(batchInfo[index].expiry_day) <= new Date(batchInfo[index].manufacture_day)}
                      InputLabelProps={{ shrink: true }}
                      value={batchInfo[index]?.expiry_day || ""}
                      onChange={(e) => 
                        handleBatchChange(index, "expiry_day", e.target.value)
                      }
                      required
                      helperText={
                        batchInfo[index]?.manufacture_day && 
                        batchInfo[index]?.expiry_day && 
                        new Date(batchInfo[index].expiry_day) <= new Date(batchInfo[index].manufacture_day)
                          ? "Hạn sử dụng phải sau ngày sản xuất"
                          : "Hạn sử dụng của lô hàng"
                      }
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
              disabled={loading || confirming}
              size="large"
              startIcon={loading || confirming ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? "Đang tạo phiếu..." : confirming ? "Đang nhập kho..." : "Tạo phiếu và nhập kho"}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Hiển thị lô hàng đã tạo */}
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
                    <Typography><strong>Sản phẩm:</strong> {batch.productName}</Typography>
                    <Typography><strong>Số lượng:</strong> {batch.quantity}</Typography>
                  </Box>
                  <Box minWidth={200}>
                    <Typography><strong>Ngày SX:</strong> {formatDate(batch.manufactureDate)}</Typography>
                    <Typography><strong>Hạn SD:</strong> {formatDate(batch.expiryDate)}</Typography>
                  </Box>
                  <Box>
                    <Typography><strong>Đơn giá:</strong> {batch.import_price?.toLocaleString('vi-VN')} đ</Typography>
                    <Typography><strong>Trạng thái:</strong> {batch.status || 'active'}</Typography>
                  </Box>
                </Stack>
                <Box mt={1}>
                  <Chip
                    label="Đã nhập kho thành công"
                    color="success"
                    size="small"
                  />
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default CreateGoodReceipt;