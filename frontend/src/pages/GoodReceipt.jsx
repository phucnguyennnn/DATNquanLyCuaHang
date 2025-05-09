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
  IconButton,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import { format } from "date-fns";

const CreateGoodReceipt = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [batchInfo, setBatchInfo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [createdBatches, setCreatedBatches] = useState([]);
  const [error, setError] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [additionalItems, setAdditionalItems] = useState([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const token = localStorage.getItem("authToken");

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
      const res = await axios.get("http://localhost:8000/api/purchaseOrder", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const approvedOrders = res.data.filter((o) => o.status === "approved");
      setOrders(approvedOrders);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchSupplierProducts = async (supplierId) => {
    if (!isTokenValid() || !supplierId) return;

    try {
      const allProductsResponse = await axios.get(
        "http://localhost:8000/api/products",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const supplierResponse = await axios.get(
        `http://localhost:8000/api/suppliers/${supplierId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (supplierResponse.data && supplierResponse.data.suppliedProducts) {
        const suppliedProductIds = supplierResponse.data.suppliedProducts.map(
          (item) => item.product
        );

        const filteredProducts = allProductsResponse.data.data.filter(
          (product) =>
            product.active !== false && suppliedProductIds.includes(product._id)
        );

        setSupplierProducts(filteredProducts);
      } else {
        const response = await axios.get(
          `http://localhost:8000/api/products/supplier/${supplierId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setSupplierProducts(response.data);
      }
    } catch (error) {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/products/supplier/${supplierId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setSupplierProducts(response.data);
      } catch (fallbackError) {
        setSupplierProducts([]);
      }
    }
  };

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
      setAdditionalItems([]);

      if (res.data.supplier && res.data.supplier._id) {
        fetchSupplierProducts(res.data.supplier._id);
      }

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
      alert(
        "Không thể lấy thông tin chi tiết phiếu đặt hàng. Vui lòng thử lại!"
      );
    }
  };

  const handleBatchChange = (index, field, value) => {
    const updated = [...batchInfo];
    updated[index][field] = value;

    if (field === "quantity" || field === "unit") {
      const selectedUnit = selectedOrder.items[index]?.product?.units?.find(
        (u) => u.name === updated[index].unit
      );
      const ratio = selectedUnit?.ratio || 1;
      updated[index].calculatedQuantity = Number(updated[index].quantity) * ratio;
    }

    setBatchInfo(updated);
  };

  const addItem = () => {
    if (supplierProducts.length === 0) return;

    setAdditionalItems([
      ...additionalItems,
      {
        product: "",
        productName: "",
        productSKU: "",
        quantity: 1,
        unit: "",
        unitPrice: 0,
        totalPrice: 0,
        manufacture_day: "",
        expiry_day: "",
      },
    ]);
  };

  const removeItem = (index) => {
    const updatedItems = [...additionalItems];
    updatedItems.splice(index, 1);
    setAdditionalItems(updatedItems);
  };

  const handleAdditionalItemChange = (index, field, value) => {
    const updatedItems = [...additionalItems];
    updatedItems[index][field] = value;

    if (field === "product") {
      const selectedProduct = supplierProducts.find((p) => p._id === value);
      if (selectedProduct) {
        updatedItems[index].productName = selectedProduct.name;
        updatedItems[index].productSKU = selectedProduct.SKU;
        updatedItems[index].unit = selectedProduct.unit;
        if (selectedProduct.price) {
          updatedItems[index].unitPrice = selectedProduct.price;
        }
      }
    }

    if (field === "quantity" || field === "unit") {
      const selectedUnit = supplierProducts.find(p => p._id === updatedItems[index].product)?.units?.find(
        (u) => u.name === updatedItems[index].unit
      );
      const ratio = selectedUnit?.ratio || 1;
      updatedItems[index].calculatedQuantity = Number(updatedItems[index].quantity) * ratio;
    }

    if (field === "quantity" || field === "unitPrice") {
      updatedItems[index].totalPrice =
        Number(updatedItems[index].quantity) *
        Number(updatedItems[index].unitPrice);
    }

    setAdditionalItems(updatedItems);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (error) {
      return dateString;
    }
  };

  const handleSubmit = async () => {
    if (!isTokenValid() || !selectedOrder) return;

    const isDataComplete = batchInfo.every(
      (item) =>
        item.product &&
        item.quantity > 0 &&
        item.manufacture_day &&
        item.expiry_day
    );

    const isAdditionalDataComplete = additionalItems.every(
      (item) =>
        item.product &&
        item.quantity > 0 &&
        item.unitPrice > 0 &&
        item.manufacture_day &&
        item.expiry_day
    );

    if (!isDataComplete || !isAdditionalDataComplete) {
      alert("Vui lòng nhập đầy đủ thông tin cho tất cả sản phẩm!");
      return;
    }

    const hasValidDates =
      batchInfo.every((item) => {
        const mfgDate = new Date(item.manufacture_day);
        const expDate = new Date(item.expiry_day);
        return expDate > mfgDate;
      }) &&
      additionalItems.every((item) => {
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

      const userID = localStorage.getItem("userID");
      if (!userID) {
        alert("Không thể xác định người dùng, vui lòng đăng nhập lại");
        setLoading(false);
        return;
      }

      const allItems = [
        ...batchInfo.map((item) => ({
          productId: item.product,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * Number(item.quantity),
          manufactureDate: item.manufacture_day,
          expiryDate: item.expiry_day,
          productName: item.productName,
          productSKU: item.productSKU,
        })),
        ...additionalItems.map((item) => ({
          productId: item.product,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.unitPrice) * Number(item.quantity),
          manufactureDate: item.manufacture_day,
          expiryDate: item.expiry_day,
          productName: item.productName,
          productSKU: item.productSKU,
        })),
      ];

      const additionalTotal = additionalItems.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
        0
      );
      const totalAmount = selectedOrder.totalAmount + additionalTotal;

      const requestData = {
        purchaseOrderId: selectedOrder._id,
        supplierId: selectedOrder.supplier?._id || selectedOrder.supplierId,
        receivedBy: userID,
        totalAmount: totalAmount,
        items: allItems,
      };

      const response = await axios.post(
        "http://localhost:8000/api/goodreceipt/from-po",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setConfirming(true);
      const confirmResponse = await axios.patch(
        `http://localhost:8000/api/goodreceipt/confirm/${response.data._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (confirmResponse.data.batches) {
        setCreatedBatches(confirmResponse.data.batches);
      }

      alert("Tạo phiếu nhập kho thành công!");
      setSelectedOrder(null);
      setBatchInfo([]);
      setAdditionalItems([]);
      fetchOrders();
    } catch (error) {
      let errorMessage = "Tạo phiếu thất bại";
      if (error.response) {
        errorMessage += `: ${error.response.status} - ${error.response.data.message}`;
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
        <Paper sx={{ p: 2, mb: 3, bgcolor: "#ffebee" }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Box sx={{ mb: 3 }}>
        {orders.length === 0 ? (
          <Paper
            elevation={3}
            sx={{ p: 2, textAlign: "center", backgroundColor: "#fff8e1" }}
          >
            <Typography variant="body1" color="text.secondary">
              Hiện tại không có phiếu đặt mua đã duyệt nào
            </Typography>
          </Paper>
        ) : (
          <FormControl fullWidth>
            <InputLabel>Chọn phiếu đặt mua</InputLabel>
            <Select
              value={selectedOrder?._id || ""}
              label="Chọn phiếu đặt mua"
              onChange={(e) => handleSelectOrder(e.target.value)}
            >
              {orders.map((order) => (
                <MenuItem key={order._id} value={order._id}>
                  {order._id} -{" "}
                  {order.supplier?.name || "Không rõ nhà cung cấp"} -
                  {format(new Date(order.createdAt), "dd/MM/yyyy")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

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
                    {item.product?.name ||
                      item.productName ||
                      "Sản phẩm không xác định"}
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
                    Thành tiền:{" "}
                    {(item.quantity * item.unitPrice)?.toLocaleString() || 0} đ
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
                        const current = batchInfo[index];
                        if (
                          current.expiry_day &&
                          new Date(current.expiry_day) <= new Date(newDate)
                        ) {
                          const expDate = new Date(newDate);
                          expDate.setMonth(expDate.getMonth() + 6);
                          handleBatchChange(
                            index,
                            "expiry_day",
                            expDate.toISOString().split("T")[0]
                          );
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Hạn sử dụng"
                      type="date"
                      fullWidth
                      error={
                        batchInfo[index]?.manufacture_day &&
                        batchInfo[index]?.expiry_day &&
                        new Date(batchInfo[index].expiry_day) <=
                          new Date(batchInfo[index].manufacture_day)
                      }
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

          <Box mt={4}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Thêm sản phẩm khác
                </Typography>
                {selectedOrder?.supplier && (
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Nhà cung cấp: <strong>{selectedOrder.supplier.name}</strong>
                    {selectedOrder.supplier.email &&
                      ` (${selectedOrder.supplier.email})`}
                  </Typography>
                )}
              </Box>
              <Button
                variant="outlined"
                startIcon={<AddCircleOutlineIcon />}
                onClick={addItem}
                disabled={supplierProducts.length === 0}
              >
                Thêm sản phẩm
              </Button>
            </Box>

            {additionalItems.length > 0 && (
              <Stack spacing={3} mt={2}>
                {additionalItems.map((item, index) => (
                  <Paper
                    key={`additional-${index}`}
                    elevation={2}
                    sx={{
                      p: 2,
                      backgroundColor: "#fff",
                      borderLeft: "4px solid #2196f3",
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Sản phẩm bổ sung #{index + 1}
                      </Typography>
                      <IconButton
                        color="error"
                        onClick={() => removeItem(index)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Chọn sản phẩm</InputLabel>
                          <Select
                            value={item.product || ""}
                            label="Chọn sản phẩm"
                            onChange={(e) =>
                              handleAdditionalItemChange(
                                index,
                                "product",
                                e.target.value
                              )
                            }
                          >
                            {supplierProducts.map((product) => (
                              <MenuItem key={product._id} value={product._id}>
                                {product.name} ({product.SKU})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField
                          label="Số lượng"
                          type="number"
                          fullWidth
                          value={item.quantity || ""}
                          onChange={(e) =>
                            handleAdditionalItemChange(
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <FormControl fullWidth>
                          <InputLabel>Đơn vị</InputLabel>
                          <Select
                            value={item.unit || ""}
                            label="Đơn vị"
                            onChange={(e) =>
                              handleAdditionalItemChange(
                                index,
                                "unit",
                                e.target.value
                              )
                            }
                            disabled={!item.product}
                          >
                            {supplierProducts
                              .find((p) => p._id === item.product)
                              ?.units?.map((u) => (
                                <MenuItem key={u.name} value={u.name}>
                                  {u.name}
                                </MenuItem>
                              )) || []}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="Đơn giá"
                          type="number"
                          fullWidth
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            handleAdditionalItemChange(
                              index,
                              "unitPrice",
                              e.target.value
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Thành tiền"
                          type="number"
                          fullWidth
                          value={item.totalPrice || 0}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Ngày sản xuất"
                          type="date"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          value={item.manufacture_day || ""}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            handleAdditionalItemChange(
                              index,
                              "manufacture_day",
                              newDate
                            );
                            const current = additionalItems[index];
                            if (
                              current.expiry_day &&
                              new Date(current.expiry_day) <= new Date(newDate)
                            ) {
                              const expDate = new Date(newDate);
                              expDate.setMonth(expDate.getMonth() + 6);
                              handleAdditionalItemChange(
                                index,
                                "expiry_day",
                                expDate.toISOString().split("T")[0]
                              );
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Hạn sử dụng"
                          type="date"
                          fullWidth
                          error={
                            item.manufacture_day &&
                            item.expiry_day &&
                            new Date(item.expiry_day) <=
                              new Date(item.manufacture_day)
                          }
                          InputLabelProps={{ shrink: true }}
                          value={item.expiry_day || ""}
                          onChange={(e) =>
                            handleAdditionalItemChange(
                              index,
                              "expiry_day",
                              e.target.value
                            )
                          }
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 4,
            }}
          >
            <Typography variant="h6">
              Tổng giá trị:{" "}
              {(
                selectedOrder.totalAmount +
                additionalItems.reduce(
                  (sum, item) =>
                    sum +
                    Number(item.quantity || 0) * Number(item.unitPrice || 0),
                  0
                )
              )?.toLocaleString() || 0}{" "}
              đ
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading || confirming}
              size="large"
              startIcon={
                loading || confirming ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              {loading
                ? "Đang tạo phiếu..."
                : confirming
                ? "Đang nhập kho..."
                : "Tạo phiếu và nhập kho"}
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
                      <strong>Sản phẩm:</strong> {batch.productName}
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
                  </Box>
                  <Box>
                    <Typography>
                      <strong>Đơn giá:</strong>{" "}
                      {batch.import_price?.toLocaleString("vi-VN")} đ
                    </Typography>
                    <Typography>
                      <strong>Trạng thái:</strong> {batch.status || "active"}
                    </Typography>
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
