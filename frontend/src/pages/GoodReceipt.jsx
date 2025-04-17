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
} from "@mui/material";
import axios from "axios";

const CreateGoodReceipt = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [batchInfo, setBatchInfo] = useState([]);
  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Hàm fetchOrders được tách ra để tái sử dụng
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await axios.get("http://localhost:8000/api/purchaseOrder", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Khi chọn phiếu đặt mua
  const handleSelectOrder = async (orderId) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await axios.get(
        `http://localhost:8000/api/purchaseOrder/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSelectedOrder(res.data);

      // Khởi tạo batch info
      setBatchInfo(
        res.data.items.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          manufacture_day: "",
          expiry_day: "",
        }))
      );
    } catch (error) {
      console.error(error);
    }
  };

  // Xử lý thay đổi thông tin lô hàng
  const handleBatchChange = (index, field, value) => {
    const updated = [...batchInfo];
    updated[index][field] = value;
    setBatchInfo(updated);
  };

  // Gửi phiếu nhập kho
  const handleSubmit = async () => {
    if (!selectedOrder) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      await axios.post(
        "http://localhost:8000/api/goodReceipt/from-purchase-order/" +
          selectedOrder._id,
        {
          items: batchInfo.map((item) => ({
            product: item.productId,
            quantity: item.quantity,
            manufactureDate: item.manufacture_day,
            expiryDate: item.expiry_day,
          })),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Tạo phiếu nhập kho thành công!");
      setSelectedOrder(null);
      setBatchInfo([]);
      fetchOrders(); // Load lại danh sách phiếu đặt mua chưa hoàn thành
    } catch (error) {
      console.error(error);
      alert("Tạo phiếu thất bại");
    } finally {
      setLoading(false);
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
              {order._id} - {order.supplierName || "Không rõ nhà cung cấp"}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Hiển thị chi tiết sản phẩm */}
      {selectedOrder && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Danh sách sản phẩm
          </Typography>

          <Stack spacing={3}>
            {selectedOrder.items.map((item, index) => (
              <Paper
                key={item.product._id}
                elevation={2}
                sx={{ p: 2, backgroundColor: "#fff" }}
              >
                <Typography fontWeight="bold" mb={2}>
                  {item.product?.name}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Số lượng"
                      type="number"
                      fullWidth
                      value={batchInfo[index]?.quantity || ""}
                      onChange={(e) =>
                        handleBatchChange(index, "quantity", e.target.value)
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Ngày sản xuất"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={batchInfo[index]?.manufacture_day || ""}
                      onChange={(e) =>
                        handleBatchChange(
                          index,
                          "manufacture_day",
                          e.target.value
                        )
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Hạn sử dụng"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={batchInfo[index]?.expiry_day || ""}
                      onChange={(e) =>
                        handleBatchChange(index, "expiry_day", e.target.value)
                      }
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>

          <Box textAlign="right" mt={4}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading}
              size="large"
            >
              {loading ? "Đang xử lý..." : "Tạo phiếu nhập kho"}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default CreateGoodReceipt;