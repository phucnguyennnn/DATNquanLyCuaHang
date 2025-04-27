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
  Alert,
} from "@mui/material";
import axios from "axios";

const CreateGoodReceipt = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createdBatches, setCreatedBatches] = useState([]);
  const [createdReceiptId, setCreatedReceiptId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState({
    receiptId: null,
    itemIndex: null,
    showDetails: false,
  });

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
      setError(null);
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
      
      let receiptId = null;
      // Store created receipt ID for automatic confirmation
      if (response.data.receipt && response.data.receipt._id) {
        receiptId = response.data.receipt._id;
        setCreatedReceiptId(receiptId);
      }
      
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
      
      // Automatically confirm and add to inventory right after creating receipt
      if (receiptId) {
        await confirmReceipt(receiptId);
      } else {
        alert("Tạo phiếu nhập kho thành công! Tuy nhiên không thể tự động xác nhận nhập kho.");
      }
      
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
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // New function for automatic confirmation
  const confirmReceipt = async (receiptId) => {
    if (!receiptId) {
      return;
    }

    try {
      setConfirmLoading(true);
      
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const res = await axios.patch(
        `http://localhost:8000/api/goodreceipt/confirm/${receiptId}`,
        {},
        config
      );

      if (res.data.batches && Array.isArray(res.data.batches)) {
        const formattedBatches = res.data.batches.map(batch => ({
          ...batch,
          productName: receiptItems.find(item => item.product === batch.product)?.productName || "Sản phẩm",
          productSKU: receiptItems.find(item => item.product === batch.product)?.productSKU || "",
          manufactureDate: batch.manufacture_day || batch.manufactureDate,
          expiryDate: batch.expiry_day || batch.expiryDate,
          import_price: batch.import_price !== undefined ? batch.import_price : batch.unitPrice !== undefined ? batch.unitPrice : 0,
          batchStatus: batch.status,
        }));
        setCreatedBatches(formattedBatches);
      }

      alert("Phiếu nhập kho đã được tạo và xác nhận thành công! Hàng hóa đã được nhập vào kho.");
      setCreatedReceiptId(null);
      setSelectedOrder(null);
      setReceiptItems([]);
      fetchOrders();
    } catch (error) {
      console.error("Lỗi khi xác nhận phiếu nhập kho:", error);
      
      let errorMessage = "Xác nhận thất bại: ";

      if (error.response?.data?.itemIndex !== undefined) {
        const itemIndex = error.response.data.itemIndex;
        errorMessage += `${error.response.data.message}\n\n`;
        errorMessage += `Vui lòng kiểm tra lại thông tin phiếu nhập kho và đảm bảo tất cả sản phẩm có ID hợp lệ.`;

        setErrorDetails({
          receiptId: receiptId,
          itemIndex: itemIndex,
          showDetails: true,
        });
      } else {
        errorMessage +=
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Đã xảy ra lỗi không xác định";
      }

      setError(errorMessage);
      
      // Keep the receipt ID so the user can try to confirm manually
      setCreatedReceiptId(receiptId);
    } finally {
      setConfirmLoading(false);
    }
  };

  // We keep the manual confirmation function for fallback purposes
  const handleConfirmReceipt = async () => {
    if (!createdReceiptId) {
      alert("Không có phiếu nhập kho để xác nhận!");
      return;
    }

    await confirmReceipt(createdReceiptId);
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

  const renderErrorDetails = () => {
    if (!errorDetails.showDetails) return null;

    const item = receiptItems[errorDetails.itemIndex];
    if (!item) return null;

    return (
      <Paper sx={{ p: 2, mb: 3, bgcolor: "#fff3e0", mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Chi tiết mục có vấn đề:
        </Typography>
        <Box ml={2}>
          <Typography>
            <strong>Tên sản phẩm:</strong> {item.productName || "N/A"}
          </Typography>
          <Typography>
            <strong>Mã SKU:</strong> {item.productSKU || "Không có SKU"}
          </Typography>
          <Typography>
            <strong>ID sản phẩm:</strong> {item.product || "Không xác định"}
          </Typography>
          <Typography>
            <strong>Số lượng:</strong> {item.quantity}
          </Typography>
          <Typography>
            <strong>Ngày sản xuất:</strong> {formatDate(item.manufactureDate)}
          </Typography>
          <Typography>
            <strong>Hạn sử dụng:</strong> {formatDate(item.expiryDate)}
          </Typography>
        </Box>
        <Box mt={1} p={1} bgcolor="#fff8e1" borderRadius={1}>
          <Typography color="error">
            <strong>Vấn đề:</strong> ID sản phẩm không tồn tại hoặc không hợp lệ. Vui lòng kiểm tra lại phiếu đặt hàng gốc và đảm bảo mã sản phẩm chính xác.
          </Typography>
        </Box>
        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => setErrorDetails((prev) => ({ ...prev, showDetails: false }))}
          >
            Ẩn chi tiết
          </Button>
        </Box>
      </Paper>
    );
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
        Tạo và xác nhận phiếu nhập kho
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, whiteSpace: "pre-line" }}>
          {error}
          {errorDetails.showDetails && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              sx={{ mt: 1, ml: 2 }}
              onClick={() => setErrorDetails((prev) => ({ ...prev, showDetails: !prev.showDetails }))}
            >
              {errorDetails.showDetails ? "Ẩn chi tiết" : "Hiển thị chi tiết"}
            </Button>
          )}
        </Alert>
      )}

      {errorDetails.showDetails && renderErrorDetails()}

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
              disabled={loading || confirmLoading}
              size="large"
              startIcon={(loading || confirmLoading) ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? "Đang xử lý..." : confirmLoading ? "Đang xác nhận..." : "Tạo phiếu và nhập hàng vào kho"}
            </Button>
          </Box>
        </Paper>
      )}

      {createdReceiptId && (
        <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: "#ffebee" }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="error.main">
            Xác nhận tự động thất bại!
          </Typography>
          <Typography variant="body1" paragraph>
            Phiếu nhập kho đã được tạo nhưng chưa được xác nhận. Bạn có thể thử xác nhận lại thủ công.
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmReceipt}
            disabled={confirmLoading}
            size="large"
            startIcon={confirmLoading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ mt: 2 }}
          >
            {confirmLoading ? "Đang xử lý..." : "Thử xác nhận lại"}
          </Button>
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
                      {batch.import_price?.toLocaleString() || batch.unitPrice?.toLocaleString() || "N/A"} đ
                    </Typography>
                  </Box>
                  <Box>
                    <Chip 
                      label={batch.batchStatus || batch.status || "Hoạt động"} 
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