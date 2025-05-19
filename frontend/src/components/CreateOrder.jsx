// frontend/src/components/CreateOrder.js
import React, { useState, useEffect } from "react";
import {
  Container,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Grid,
  Divider,
  Autocomplete,
  FormHelperText,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const CreateOrder = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState({});
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [token] = useState(localStorage.getItem("authToken"));
  const [hasUserSelectedBatch, setHasUserSelectedBatch] = useState(false);
  const [cashReceivedError, setCashReceivedError] = useState("");
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productsRes = await axios.get(
          "http://localhost:8000/api/products/batch/products-with-batches",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Lọc các sản phẩm có ít nhất một lô hàng với quantity_on_shelf > 0
        const productsWithStock = productsRes.data.data.filter((product) =>
          product.batches.some((batch) => batch.quantity_on_shelf > 0)
        );

        setProducts(productsWithStock);
        setFilteredProducts(productsWithStock);
      } catch (error) {
        console.error(error);
      }
      setLoading(false);

      setLoadingCustomers(true);
      try {
        const customersRes = await axios.get(
          "http://localhost:8000/api/user?role=customer",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCustomers(customersRes.data);
      } catch (error) {
        console.error(error);
      }
      setLoadingCustomers(false);
    };
    fetchData();
  }, [token]);
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.startsWith("BATCH-")) {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/products/batch/${value}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const productWithStock = {
          ...res.data.data.product,
          warehouse: res.data.data.batch.remaining_quantity,
          shelf: res.data.data.batch.quantity_on_shelf,
          searchedBatch: res.data.data.batch,
        };
        setFilteredProducts([productWithStock]);
      } catch (error) {
        setFilteredProducts([]);
      }
    } else {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const handleProductClick = async (product) => {
    setLoading(true);
    try {
      let availableBatches = [];

      if (product.searchedBatch) {
        if (product.searchedBatch.quantity_on_shelf > 0) {
          availableBatches = [product.searchedBatch];
        }
      } else {
        const res = await axios.get(
          `http://localhost:8000/api/batches/product/${product.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        availableBatches = res.data.filter((b) => b.quantity_on_shelf > 0);
      }

      setBatches(availableBatches);
      setSelectedProduct(product);
      setSelectedBatches({});
      setSelectedUnit(product.units[0]);
      setHasUserSelectedBatch(false);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };
  const handleBatchQtyChange = (batchId, value) => {
    const batch = batches.find((b) => b._id === batchId);
    const maxQty = Math.floor(
      batch.quantity_on_shelf / (selectedUnit?.ratio || 1)
    );

    const newValue = Math.min(Math.max(1, parseInt(value || 1)), maxQty);
    setSelectedBatches((prev) => ({
      ...prev,
      [batchId]: newValue,
    }));
    setHasUserSelectedBatch(true);
  };

  const autoSelectBatches = () => {
    if (!selectedProduct || !selectedUnit) return [];

    const requiredBaseQty = 1 * selectedUnit.ratio;
    const goodBatches = batches
      .filter((b) => b.quantity_on_shelf >= requiredBaseQty)
      .sort((a, b) => new Date(a.expiry_day) - new Date(b.expiry_day));
    if (goodBatches.length > 0) {
      const bestBatch = goodBatches[0];
      const baseUnit = selectedProduct.units.find((u) => u.ratio === 1);
      const discount = bestBatch.discountInfo || {};
      const unitPriceBase = discount.isDiscounted
        ? baseUnit.salePrice * (1 - discount.discountValue / 100)
        : baseUnit.salePrice;

      const selectedBatchInfo = {
        ...bestBatch,
        _id: bestBatch._id,
        batchCode: bestBatch.batchCode,
        discountInfo: bestBatch.discountInfo,
        quantity: requiredBaseQty,
        unitPrice: unitPriceBase * selectedUnit.ratio,
        unitName: selectedUnit.name,
      };
      return [selectedBatchInfo];
    }
    return [];
  };
  const handleAddToOrder = () => {
    if (!selectedProduct || !selectedUnit) return;

    let selected;
    if (!hasUserSelectedBatch) {
      selected = autoSelectBatches();
      if (selected.length === 0) {
        alert(
          `Không có lô phù hợp cho sản phẩm ${selectedProduct.name} (${selectedUnit.name})`
        );
        return;
      }
    } else {
      selected = batches
        .filter((b) => selectedBatches[b._id] > 0)
        .map((b) => {
          const baseUnit = selectedProduct.units.find((u) => u.ratio === 1);
          const discount = b.discountInfo || {};
          const unitPriceBase = discount.isDiscounted
            ? baseUnit.salePrice * (1 - discount.discountValue / 100)
            : baseUnit.salePrice;

          return {
            ...b,
            quantity: selectedBatches[b._id] * (selectedUnit?.ratio || 1),
            unitPrice: unitPriceBase * selectedUnit.ratio,
            unitName: selectedUnit.name,
          };
        });
    }

    const updatedOrderItems = [...orderItems];

    selected.forEach((batch) => {
      const existingItemIndex = updatedOrderItems.findIndex(
        (item) =>
          item.product.id === selectedProduct.id &&
          item.selectedUnit.name === selectedUnit.name &&
          item.batches.some((b) => b._id === batch._id)
      );

      if (existingItemIndex !== -1) {
        const existingBatchIndex = updatedOrderItems[
          existingItemIndex
        ].batches.findIndex((b) => b._id === batch._id);

        if (existingBatchIndex !== -1) {
          updatedOrderItems[existingItemIndex].batches[
            existingBatchIndex
          ].quantity += batch.quantity;
        } else {
          updatedOrderItems[existingItemIndex].batches.push(batch);
        }

        updatedOrderItems[existingItemIndex].total = updatedOrderItems[
          existingItemIndex
        ].batches.reduce(
          (sum, b) =>
            sum + b.unitPrice * (b.quantity / item.selectedUnit.ratio),
          0
        );
      } else {
        const newItem = {
          product: selectedProduct,
          selectedUnit,
          batches: [batch],
          total: batch.unitPrice * (batch.quantity / selectedUnit.ratio),
        };
        updatedOrderItems.push(newItem);
      }
    });

    setOrderItems(updatedOrderItems);
    setSelectedProduct(null);
    setSelectedUnit(null);
    setSelectedBatches({});
    setHasUserSelectedBatch(false);
  };
  const handleRemoveItem = (index) => {
    setOrderItems((items) => items.filter((_, i) => i !== index));
  };
  const handleUpdateQuantity = (itemIndex, batchIndex, newValue) => {
    const updatedItems = [...orderItems];
    const item = updatedItems[itemIndex];
    const batch = item.batches[batchIndex];

    const maxQty = Math.floor(
      batch.quantity_on_shelf / item.selectedUnit.ratio
    );

    let newQty = parseInt(newValue || 1);
    if (isNaN(newQty)) newQty = 1;
    newQty = Math.max(1, Math.min(newQty, maxQty));

    batch.quantity = newQty * item.selectedUnit.ratio;
    item.total = item.batches.reduce(
      (sum, b) => sum + b.unitPrice * (b.quantity / item.selectedUnit.ratio),
      0
    );

    setOrderItems(updatedItems);
  };

  const handleSubmitOrder = async () => {
    if (!cashReceived) {
      setCashReceivedError("Vui lòng nhập số tiền khách đưa.");
      return;
    }

    const paidAmount = parseFloat(cashReceived);
    if (isNaN(paidAmount) || paidAmount < 0) {
      setCashReceivedError("Số tiền không hợp lệ.");
      return;
    }

    if (paidAmount < subtotal) {
      setCashReceivedError("Số tiền khách đưa không đủ.");
      return;
    }

    setCashReceivedError("");

    const orderData = {
      items: orderItems.map((item) => ({
        product: item.product.id,
        quantity:
          item.batches.reduce((sum, b) => sum + b.quantity, 0) /
          item.selectedUnit.ratio,
        selectedUnit: {
          name: item.selectedUnit.name,
          ratio: item.selectedUnit.ratio,
        },
        batchesUsed: item.batches.map((b) => ({
          batchId: b._id,
          quantity: b.quantity,
          unitPrice: b.unitPrice,
        })),
      })),
      paymentMethod,
      amountPaid: paidAmount,
      customerId: selectedCustomer?.id || null,
      orderType: "instore",
    };

    try {
      const res = await axios.post(
        "http://localhost:8000/api/orders",
        orderData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert(`Đơn hàng ${res.data.orderNumber} tạo thành công!`);
      setOrderItems([]);
      setCashReceived("");
    } catch (error) {
      console.error(error);
      alert("Tạo đơn thất bại!");
    }
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const change = cashReceived ? parseFloat(cashReceived) - subtotal : 0;

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: 4,
        height: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Paper
        sx={{
          p: 3,
          mb: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Autocomplete
            sx={{ flex: 1 }}
            options={customers}
            getOptionLabel={(option) => `${option.fullName} (${option.phone})`}
            loading={loadingCustomers}
            value={selectedCustomer}
            onChange={(_, newValue) => setSelectedCustomer(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Chọn khách hàng"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingCustomers ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <TextField
            sx={{ flex: 2 }}
            variant="outlined"
            label="Tìm kiếm sản phẩm hoặc mã lô"
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{ endAdornment: <SearchIcon /> }}
          />
        </Box>

        <Grid container spacing={2} sx={{ flex: 1, overflow: "hidden" }}>
          <Grid item xs={6} sx={{ height: "100%", overflow: "hidden" }}>
            <Typography variant="h6">Danh sách sản phẩm</Typography>
            <Box
              sx={{
                height: "calc(100% - 40px)",
                overflow: "auto",
                pr: 1,
              }}
            >
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <Paper
                    key={product._id}
                    sx={{
                      p: 2,
                      mb: 1,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                    onClick={() => handleProductClick(product)}
                  >
                    <Typography variant="subtitle1">{product.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {product.category?.name || product.category}
                      {product.warehouse !== undefined &&
                        ` | Kho: ${product.warehouse} | Quầy: ${product.shelf}`}
                    </Typography>
                    {product.units?.[0]?.salePrice && (
                      <Typography variant="body2" color="primary">
                        {product.units[0].salePrice.toLocaleString()}đ/
                        {product.units[0].name}
                      </Typography>
                    )}
                  </Paper>
                ))
              ) : (
                <Typography
                  variant="body1"
                  color="textSecondary"
                  sx={{ p: 2, textAlign: "center", fontStyle: "italic" }}
                >
                  Hiện không có sản phẩm nào còn hàng trên quầy.
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid
            item
            xs={6}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Đơn hàng
            </Typography>

            <List
              sx={{
                flex: 1,
                overflow: "auto",
                border: "1px solid rgba(0, 0, 0, 0.12)",
                borderRadius: 1,
                mb: 2,
                pr: 1,
              }}
            >
              {orderItems.map((item, itemIndex) => (
                <ListItem key={itemIndex} divider>
                  <ListItemText
                    primary={item.product.name}
                    secondary={
                      <>
                        <Typography variant="body2">
                          Đơn vị: {item.selectedUnit.name} (1
                          {item.selectedUnit.name} = {item.selectedUnit.ratio}
                          {item.product.units.find((u) => u.ratio === 1)?.name})
                        </Typography>
                        {item.batches.map((batch, batchIndex) => {
                          const currentQty =
                            batch.quantity / item.selectedUnit.ratio;
                          const maxQty = Math.floor(
                            batch.quantity_on_shelf / item.selectedUnit.ratio
                          );
                          const truncateString = (str, maxLength = 10) => {
                            return str.length > maxLength
                              ? str.substring(0, maxLength - 3) + "..."
                              : str;
                          };
                          return (
                            <Box
                              key={batch._id}
                              sx={{
                                mt: 1,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <Chip
                                label={`${truncateString(
                                  batch.batchCode
                                )} - ${currentQty.toFixed(0)}${
                                  item.selectedUnit.name
                                } × ${batch.unitPrice.toLocaleString()}đ`}
                                size="small"
                                sx={{ mr: 1, maxWidth: 150 }}
                              />
                              <TextField
                                type="number"
                                value={currentQty}
                                onChange={(e) =>
                                  handleUpdateQuantity(
                                    itemIndex,
                                    batchIndex,
                                    e.target.value
                                  )
                                }
                                inputProps={{
                                  min: 0,
                                  max: maxQty,
                                  style: {
                                    textAlign: "center",
                                    padding: "6px 10px",
                                  },
                                }}
                                sx={{
                                  width: 80,
                                  mr: 1,
                                  "& input[type=number]": {
                                    MozAppearance: "textfield",
                                  },
                                  "& input[type=number]::-webkit-outer-spin-button":
                                    {
                                      WebkitAppearance: "none",
                                      margin: 0,
                                    },
                                  "& input[type=number]::-webkit-inner-spin-button":
                                    {
                                      WebkitAppearance: "none",
                                      margin: 0,
                                    },
                                }}
                                error={currentQty > maxQty || currentQty < 0}
                                helperText={
                                  (currentQty > maxQty &&
                                    `Tối đa: ${maxQty}`) ||
                                  (currentQty < 0 && "Không hợp lệ")
                                }
                              />
                              {batch.discountInfo?.isDiscounted && (
                                <Typography
                                  variant="caption"
                                  color="success.main"
                                >
                                  (Giảm {batch.discountInfo.discountValue}%)
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </>
                    }
                  />
                  <Typography sx={{ minWidth: 100, textAlign: "right" }}>
                    {item.total.toLocaleString()}đ
                  </Typography>
                  <IconButton onClick={() => handleRemoveItem(itemIndex)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </ListItem>
              ))}
            </List>

            <Box
              sx={{
                p: 2,
                bgcolor: "background.paper",
                boxShadow: 1,
                borderRadius: 1,
                flexShrink: 0,
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Tiền khách đưa"
                    value={cashReceived}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setCashReceived(value);
                      if (!value) {
                        setCashReceivedError(
                          "Vui lòng nhập số tiền khách đưa."
                        );
                      } else if (parseFloat(value) < subtotal) {
                        setCashReceivedError("Số tiền khách đưa không đủ.");
                      } else {
                        setCashReceivedError("");
                      }
                    }}
                    InputProps={{ endAdornment: "đ" }}
                    error={!!cashReceivedError}
                    helperText={cashReceivedError}
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Phương thức TT</InputLabel>
                    <Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <MenuItem value="cash">Tiền mặt</MenuItem>
                      <MenuItem value="card">Thẻ</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="h6">Tổng cộng:</Typography>
                    <Typography variant="h6" color="primary">
                      {subtotal.toLocaleString()}đ
                    </Typography>
                  </Box>
                  {cashReceived && !cashReceivedError && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mt: 1,
                      }}
                    >
                      <Typography>Tiền thừa:</Typography>
                      <Typography
                        color={change >= 0 ? "success.main" : "error"}
                      >
                        {Math.abs(change).toLocaleString()}đ
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSubmitOrder}
                    disabled={
                      orderItems.length === 0 ||
                      !!cashReceivedError ||
                      !cashReceived
                    }
                  >
                    Tạo đơn hàng ({orderItems.length})
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Dialog open={!!selectedProduct} fullWidth maxWidth="md">
        <DialogTitle>
          Chọn lô hàng - {selectedProduct?.name}
          <FormControl sx={{ minWidth: 120, ml: 2 }}>
            <InputLabel>Đơn vị</InputLabel>
            <Select
              value={selectedUnit?.name || ""}
              onChange={(e) => {
                const unit = selectedProduct.units.find(
                  (u) => u.name === e.target.value
                );
                setSelectedUnit(unit);
                setSelectedBatches({});
                setHasUserSelectedBatch(false);
              }}
            >
              {selectedProduct?.units?.map((unit) => (
                <MenuItem key={unit.name} value={unit.name}>
                  {unit.name} (1{unit.name} = {unit.ratio}{" "}
                  {selectedProduct.units.find((u) => u.ratio === 1)?.name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogTitle>
        <DialogContent>
          {batches.length === 0 ? (
            <Typography
              variant="body1"
              color="textSecondary"
              sx={{
                p: 2,
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              Hiện không có lô hàng nào trên quầy
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Mã lô</TableCell>
                    <TableCell>HSD</TableCell>
                    <TableCell>Giá gốc</TableCell>
                    <TableCell>Giảm giá</TableCell>
                    <TableCell>Kho</TableCell>
                    <TableCell>Quầy</TableCell>
                    <TableCell>Số lượng</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batches.map((batch) => {
                    const baseUnit = selectedProduct?.units?.find(
                      (u) => u.ratio === 1
                    );
                    const discount = batch.discountInfo || {};
                    const daysRemaining = batch.daysUntilExpiry || 0;

                    return (
                      <TableRow key={batch._id}>
                        <TableCell>{batch.batchCode}</TableCell>
                        <TableCell>
                          {format(new Date(batch.expiry_day), "dd/MM/yyyy", {
                            locale: vi,
                          })}
                          <Typography variant="caption" color="textSecondary">
                            ({daysRemaining} ngày)
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {(
                            (baseUnit?.salePrice || 0) *
                            (selectedUnit?.ratio || 1)
                          ).toLocaleString()}
                          đ
                        </TableCell>
                        <TableCell sx={{ color: "success.main" }}>
                          {discount.isDiscounted && (
                            <>
                              {discount.discountValue}%
                              <Typography variant="caption">
                                {discount.discountReason}
                              </Typography>
                            </>
                          )}
                        </TableCell>
                        <TableCell>{batch.remaining_quantity}</TableCell>
                        <TableCell>{batch.quantity_on_shelf}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={selectedBatches[batch._id] || 1}
                            onChange={(e) =>
                              handleBatchQtyChange(batch._id, e.target.value)
                            }
                            inputProps={{ min: 1 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedProduct(null)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleAddToOrder}
            disabled={!selectedProduct || batches.length === 0}
          >
            Thêm vào đơn (
            {!hasUserSelectedBatch
              ? 1
              : Object.values(selectedBatches).reduce((a, b) => a + b, 0)}
            )
          </Button>
        </DialogActions>
      </Dialog>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      )}
    </Container>
  );
};

export default CreateOrder;
