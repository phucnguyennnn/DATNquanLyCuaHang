import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ImageList,
  ImageListItem,
  Chip,
} from "@mui/material";
import { format, isBefore, addDays } from "date-fns";
import axios from "axios";

const EXPIRY_THRESHOLD_DAYS = 30;
const LOW_QUANTITY_THRESHOLD = 5;

function ShelfInventoryPage() {
  const [shelfData, setShelfData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTransferBatch, setSelectedTransferBatch] = useState(null);
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferError, setTransferError] = useState(null);

  const handleOpenTransferDialog = (batch) => {
    setSelectedTransferBatch(batch);
    setTransferDialogOpen(true);
    setTransferQuantity("");
    setTransferError(null);
  };

  const handleTransferQuantityChange = (event) => {
    setTransferQuantity(event.target.value.replace(/\D/g, ""));
  };

  const handleTransferSubmit = async () => {
    if (!transferQuantity || parseInt(transferQuantity) <= 0) {
      setTransferError("Vui lòng nhập số lượng hợp lệ");
      return;
    }
    const userId = localStorage.getItem("userId");
    try {
      await axios.put(
        `http://localhost:8000/api/batches/${selectedTransferBatch._id}/transfer-to-shelf`,
        { quantity: parseInt(transferQuantity) }
      );
      await fetchData();
      setTransferDialogOpen(false);
    } catch (err) {
      setTransferError(
        err.response?.data?.message || err.message || "Lỗi khi chuyển hàng"
      );
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("http://localhost:8000/api/batches", {
        params: { search: searchTerm, status: statusFilter },
      });
      setShelfData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Lỗi khi tải dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, statusFilter]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const productQuantities = useMemo(() => {
    const quantities = {};
    shelfData.forEach((item) => {
      const productId = item.product?._id;
      if (productId) {
        quantities[productId] = quantities[productId] || {
          initial: 0,
          shelf: 0,
          remaining: 0,
        };
        quantities[productId].initial += item.initial_quantity;
        quantities[productId].shelf += item.quantity_on_shelf;
        quantities[productId].remaining += item.remaining_quantity;
      }
    });
    return quantities;
  }, [shelfData]);

  const sortedShelfData = useMemo(() => {
    const now = new Date();

    const withWarnings = shelfData.map((item) => {
      let warnings = [];
      const expiryDate = item.expiry_day ? new Date(item.expiry_day) : null;

      if (
        expiryDate &&
        isBefore(expiryDate, addDays(now, EXPIRY_THRESHOLD_DAYS))
      ) {
        warnings.push("Sắp hết hạn");
      }

      if (item.quantity_on_shelf <= LOW_QUANTITY_THRESHOLD) {
        warnings.push("Ít trên quầy");
      }

      if (item.remaining_quantity <= LOW_QUANTITY_THRESHOLD) {
        warnings.push("Ít trong kho");
      }

      return { ...item, warnings };
    });

    const prioritizedData = [...withWarnings].sort((a, b) => {
      if (a.warnings.length > 0 && b.warnings.length === 0) {
        return -1;
      }
      if (a.warnings.length === 0 && b.warnings.length > 0) {
        return 1;
      }
      return 0;
    });

    if (!sortColumn) {
      return prioritizedData;
    }

    return prioritizedData.sort((a, b) => {
      let valueA, valueB;

      if (sortColumn === "productName") {
        valueA = a.product?.name || "";
        valueB = b.product?.name || "";
      } else if (sortColumn === "SKU") {
        valueA = a.product?.SKU || "";
        valueB = b.product?.SKU || "";
      } else if (sortColumn === "batchCode") {
        valueA = a._id || "";
        valueB = b._id || "";
      } else if (sortColumn === "shelfQuantity") {
        valueA = a.quantity_on_shelf;
        valueB = b.quantity_on_shelf;
      } else if (sortColumn === "warehouseQuantity") {
        valueA = a.remaining_quantity;
        valueB = b.remaining_quantity;
      } else if (sortColumn === "manufactureDay") {
        valueA = a.manufacture_day ? new Date(a.manufacture_day) : null;
        valueB = b.manufacture_day ? new Date(b.manufacture_day) : null;
      } else if (sortColumn === "expiryDay") {
        valueA = a.expiry_day ? new Date(a.expiry_day) : null;
        valueB = b.expiry_day ? new Date(b.expiry_day) : null;
      } else if (sortColumn === "status") {
        valueA = a.status || "";
        valueB = b.status || "";
      }

      if (valueA == null || valueB == null) {
        return valueA == null ? 1 : -1;
      }

      if (typeof valueA === "string") {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (sortDirection === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
  }, [shelfData, sortColumn, sortDirection]);

  const handleBatchClick = (batchId) => {
    const batchInfo = shelfData.find((item) => item._id === batchId);
    setSelectedBatch(batchInfo);
    setBatchDialogOpen(true);
  };

  const handleCloseBatchDialog = () => {
    setBatchDialogOpen(false);
    setSelectedBatch(null);
  };

  const handleProductClick = (productId) => {
    const productInfo = shelfData.find(
      (item) => item.product?._id === productId
    )?.product;
    const quantities = productQuantities[productId] || {
      initial: 0,
      shelf: 0,
      remaining: 0,
    };
    setSelectedProduct({
      ...productInfo,
      overallTotalQuantity: quantities.initial,
      overallShelfQuantity: quantities.shelf,
      overallWarehouseQuantity: quantities.remaining,
    });
    setProductDialogOpen(true);
  };

  const handleCloseProductDialog = () => {
    setProductDialogOpen(false);
    setSelectedProduct(null);
  };

  return (
    <Container
      maxWidth="xl"
      sx={{ height: "100vh", display: "flex", flexDirection: "column", py: 2 }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Quản lý hàng tồn kho và trên quầy
      </Typography>
      <Box mb={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Tìm kiếm (Tên/SKU/Mã Lô)"
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="status-filter-label" shrink>
              Trạng Thái Lô
            </InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={statusFilter}
              label="Trạng Thái Lô"
              onChange={handleStatusChange}
              displayEmpty
              renderValue={(value) => (value === "" ? "Tất cả" : value)}
              inputProps={{
                "aria-label": "Trạng thái lô hàng",
              }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="active">Hoạt động</MenuItem>
              <MenuItem value="inactive">Không hoạt động</MenuItem>
              <MenuItem value="expired">Hết hạn</MenuItem>
              <MenuItem value="sold_out">Hết hàng trong ko</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          flex={1}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Box sx={{ flex: 1, minHeight: 400 }}>
          <TableContainer
            component={Paper}
            sx={{
              height: "100%",
              maxHeight: "calc(100vh - 220px)",
              "& .MuiTable-root": { minWidth: 1000 },
            }}
          >
            <Table stickyHeader aria-label="shelf inventory table">
              <TableHead>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("productName")}
                  >
                    Tên Sản Phẩm{" "}
                    {sortColumn === "productName" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("SKU")}
                  >
                    SKU{" "}
                    {sortColumn === "SKU" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("batchCode")}
                  >
                    Mã Lô Hàng{" "}
                    {sortColumn === "batchCode" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("shelfQuantity")}
                  >
                    Số Lượng Trên Quầy{" "}
                    {sortColumn === "shelfQuantity" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("warehouseQuantity")}
                  >
                    Số Lượng Trong Kho{" "}
                    {sortColumn === "warehouseQuantity" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("manufactureDay")}
                  >
                    Ngày Sản Xuất{" "}
                    {sortColumn === "manufactureDay" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("expiryDay")}
                  >
                    Hạn Sử Dụng{" "}
                    {sortColumn === "expiryDay" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("status")}
                  >
                    Trạng Thái Lô{" "}
                    {sortColumn === "status" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell>Cảnh báo</TableCell>
                  <TableCell>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedShelfData?.map((item, index) => (
                  <TableRow
                    key={item._id}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell
                      component="th"
                      scope="row"
                      style={{
                        cursor: "pointer",
                        color: "blue",
                        textDecoration: "underline",
                      }}
                      onClick={() => handleProductClick(item.product?._id)}
                    >
                      {item.product?.name}
                    </TableCell>
                    <TableCell>{item.product?.SKU}</TableCell>
                    <TableCell
                      style={{
                        cursor: "pointer",
                        color: "blue",
                        textDecoration: "underline",
                      }}
                      onClick={() => handleBatchClick(item._id)}
                    >
                      {item._id}
                    </TableCell>
                    <TableCell align="right">
                      {item.quantity_on_shelf}
                    </TableCell>
                    <TableCell align="right">
                      {item.remaining_quantity}
                    </TableCell>
                    <TableCell>
                      {item.manufacture_day
                        ? format(new Date(item.manufacture_day), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell
                      style={
                        item.expiry_day &&
                        isBefore(
                          new Date(item.expiry_day),
                          addDays(new Date(), EXPIRY_THRESHOLD_DAYS)
                        )
                          ? { color: "red" }
                          : {}
                      }
                    >
                      {item.expiry_day
                        ? format(new Date(item.expiry_day), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>
                      {item.warnings.map((warning, index) => (
                        <Chip
                          key={index}
                          label={warning}
                          color="warning"
                          size="small"
                          sx={{ mr: 0.5 }}
                        />
                      ))}
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        sx={{
                          fontSize: "0.7rem",
                          padding: "2px 6px",
                          margin: "0 2px",
                          textTransform: "none",
                        }}
                        variant="contained"
                        onClick={() => handleOpenTransferDialog(item)}
                        disabled={item.remaining_quantity <= 0}
                      >
                        chuyển lên quầy
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      <Dialog open={batchDialogOpen} onClose={handleCloseBatchDialog}>
        <DialogTitle>Thông tin Lô hàng</DialogTitle>
        <DialogContent>
          {selectedBatch && (
            <Box>
              <Typography>Mã Lô: {selectedBatch._id}</Typography>
              <Typography>
                Ngày Sản Xuất:{" "}
                {selectedBatch.manufacture_day
                  ? format(
                      new Date(selectedBatch.manufacture_day),
                      "dd/MM/yyyy"
                    )
                  : "-"}
              </Typography>
              <Typography
                style={
                  selectedBatch.expiry_day &&
                  isBefore(
                    new Date(selectedBatch.expiry_day),
                    addDays(new Date(), EXPIRY_THRESHOLD_DAYS)
                  )
                    ? { color: "red" }
                    : {}
                }
              >
                Hạn Sử Dụng:{" "}
                {selectedBatch.expiry_day
                  ? format(new Date(selectedBatch.expiry_day), "dd/MM/yyyy")
                  : "-"}
              </Typography>
              <Typography>
                Số lượng ban đầu: {selectedBatch.initial_quantity}
              </Typography>
              <Typography>
                Số lượng còn lại: {selectedBatch.remaining_quantity}
              </Typography>
              <Typography>
                Số lượng đã bán: {selectedBatch.sold_quantity}
              </Typography>
              <Typography>
                Số lượng bị mất: {selectedBatch.lost_quantity}
              </Typography>
              <Typography
                style={
                  selectedBatch.quantity_on_shelf <= LOW_QUANTITY_THRESHOLD
                    ? { color: "orange" }
                    : {}
                }
              >
                Số lượng trên quầy: {selectedBatch.quantity_on_shelf}
              </Typography>
              <Typography>Trạng thái: {selectedBatch.status}</Typography>
              {selectedBatch.supplier && (
                <Typography>
                  Nhà cung cấp: {selectedBatch.supplier.name}
                </Typography>
              )}
              {selectedBatch.discountInfo?.isDiscounted && (
                <Typography>
                  Giảm giá: {selectedBatch.discountInfo.discountValue}
                  {selectedBatch.discountInfo.discountType === "percentage"
                    ? "%"
                    : ""}
                </Typography>
              )}
              <Typography>
                Ngày tạo:{" "}
                {format(
                  new Date(selectedBatch.createdAt),
                  "dd/MM/yyyy HH:mm:ss"
                )}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBatchDialog}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
      >
        <DialogTitle>Chuyển hàng lên quầy</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, pt: 2 }}>
            <TextField
              fullWidth
              label="Số lượng chuyển"
              value={transferQuantity}
              onChange={handleTransferQuantityChange}
              error={!!transferError}
              helperText={transferError}
            />
            <Typography variant="body2" color="text.secondary" mt={1}>
              Có sẵn trong kho: {selectedTransferBatch?.remaining_quantity}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={handleTransferSubmit}
            variant="contained"
            color="primary"
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={productDialogOpen} onClose={handleCloseProductDialog}>
        <DialogTitle>Thông tin Sản phẩm</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box>
              <Typography>Tên sản phẩm: {selectedProduct.name}</Typography>
              <Typography>SKU: {selectedProduct.SKU}</Typography>
              <Typography
                style={
                  selectedProduct.overallShelfQuantity <= LOW_QUANTITY_THRESHOLD
                    ? { color: "orange" }
                    : {}
                }
              >
                Tổng số lượng trên quầy: {selectedProduct.overallShelfQuantity}
              </Typography>
              <Typography
                style={
                  selectedProduct.overallWarehouseQuantity <=
                  LOW_QUANTITY_THRESHOLD
                    ? { color: "orange" }
                    : {}
                }
              >
                Tổng số lượng trong kho:{" "}
                {selectedProduct.overallWarehouseQuantity}
              </Typography>
              <Typography>
                Tổng số lượng: {selectedProduct.overallTotalQuantity}
              </Typography>
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <Box mt={2}>
                  <Typography>Hình ảnh:</Typography>
                  <ImageList rowHeight={100} cols={3}>
                    {selectedProduct.images.map((image, index) => (
                      <ImageListItem key={index}>
                        <img
                          src={image}
                          alt={`Product ${selectedProduct.name} - ${index}`}
                          loading="lazy"
                          style={{ height: "100%", objectFit: "contain" }}
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProductDialog}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ShelfInventoryPage;
