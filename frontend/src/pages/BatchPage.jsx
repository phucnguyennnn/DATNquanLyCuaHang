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
  IconButton,
  Collapse,
} from "@mui/material";
import { format, isBefore, addDays } from "date-fns";
import axios from "axios";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const EXPIRY_THRESHOLD_DAYS = 30;
const LOW_QUANTITY_THRESHOLD = 1;

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
  const [openRows, setOpenRows] = useState({});

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
      } else if (sortColumn === "batchCode") {
        valueA = a._id || "";
        valueB = b._id || "";
      } else if (sortColumn === "shelfQuantity") {
        valueA = a.quantity_on_shelf;
        valueB = b.quantity_on_shelf;
      } else if (sortColumn === "warehouseQuantity") {
        valueA = a.remaining_quantity;
        valueB = b.remaining_quantity;
      } else if (sortColumn === "totalQuantity") {
        valueA = (a.quantity_on_shelf || 0) + (a.remaining_quantity || 0);
        valueB = (b.quantity_on_shelf || 0) + (b.remaining_quantity || 0);
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

  const groupedByProduct = useMemo(() => {
    const grouped = {};

    sortedShelfData.forEach((item) => {
      if (!item.product) return;

      const productId = item.product._id;
      const productName = item.product.name;

      if (!grouped[productId]) {
        grouped[productId] = {
          productId,
          productName,
          batches: [],
          totalShelfQuantity: 0,
          totalWarehouseQuantity: 0,
          warnings: new Set(),
          earliestExpiryDate: null,
          latestManufactureDate: null,
        };
      }

      // Add batch to group
      grouped[productId].batches.push(item);
      grouped[productId].totalShelfQuantity += item.quantity_on_shelf;
      grouped[productId].totalWarehouseQuantity += item.remaining_quantity;

      // Track earliest expiry date
      if (item.expiry_day) {
        const expiryDate = new Date(item.expiry_day);
        if (!grouped[productId].earliestExpiryDate || 
            expiryDate < new Date(grouped[productId].earliestExpiryDate)) {
          grouped[productId].earliestExpiryDate = item.expiry_day;
        }
      }
      
      // Track latest manufacture date
      if (item.manufacture_day) {
        const manufactureDate = new Date(item.manufacture_day);
        if (!grouped[productId].latestManufactureDate || 
            manufactureDate > new Date(grouped[productId].latestManufactureDate)) {
          grouped[productId].latestManufactureDate = item.manufacture_day;
        }
      }

      // Collect warnings
      item.warnings.forEach((warning) => {
        grouped[productId].warnings.add(warning);
      });
    });

    // Calculate total quantity for each product
    let groupedArray = Object.values(grouped);
    groupedArray.forEach(product => {
      product.totalQuantity = product.totalShelfQuantity + product.totalWarehouseQuantity;
      
      // Sort the batches within each group if sortColumn is specified
      if (sortColumn) {
        product.batches.sort((a, b) => {
          let valueA, valueB;

          if (sortColumn === "batchCode") {
            valueA = a._id || "";
            valueB = b._id || "";
          } else if (sortColumn === "shelfQuantity") {
            valueA = a.quantity_on_shelf;
            valueB = b.quantity_on_shelf;
          } else if (sortColumn === "warehouseQuantity") {
            valueA = a.remaining_quantity;
            valueB = b.remaining_quantity;
          } else if (sortColumn === "totalQuantity") {
            valueA = (a.quantity_on_shelf || 0) + (a.remaining_quantity || 0);
            valueB = (b.quantity_on_shelf || 0) + (b.remaining_quantity || 0);
          } else if (sortColumn === "manufactureDay") {
            valueA = a.manufacture_day ? new Date(a.manufacture_day) : null;
            valueB = b.manufacture_day ? new Date(b.manufacture_day) : null;
          } else if (sortColumn === "expiryDay") {
            valueA = a.expiry_day ? new Date(a.expiry_day) : null;
            valueB = b.expiry_day ? new Date(b.expiry_day) : null;
          } else if (sortColumn === "status") {
            valueA = a.status || "";
            valueB = b.status || "";
          } else {
            return 0; // No sort
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
      }
    });
    
    // Sort product groups by the selected sort column
    if (sortColumn) {
      groupedArray.sort((a, b) => {
        let valueA, valueB;
        
        if (sortColumn === "productName") {
          valueA = a.productName || "";
          valueB = b.productName || "";
        } else if (sortColumn === "totalQuantity") {
          valueA = a.totalQuantity;
          valueB = b.totalQuantity;
        } else if (sortColumn === "shelfQuantity" || sortColumn === "totalShelfQuantity") {
          valueA = a.totalShelfQuantity;
          valueB = b.totalShelfQuantity;
        } else if (sortColumn === "warehouseQuantity" || sortColumn === "totalWarehouseQuantity") {
          valueA = a.totalWarehouseQuantity;
          valueB = b.totalWarehouseQuantity;
        } else if (sortColumn === "manufactureDay") {
          valueA = a.latestManufactureDate ? new Date(a.latestManufactureDate) : null;
          valueB = b.latestManufactureDate ? new Date(b.latestManufactureDate) : null;
        } else if (sortColumn === "expiryDay") {
          valueA = a.earliestExpiryDate ? new Date(a.earliestExpiryDate) : null;
          valueB = b.earliestExpiryDate ? new Date(b.earliestExpiryDate) : null;
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
    }

    return groupedArray;
  }, [sortedShelfData, sortColumn, sortDirection]);

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

  const toggleRow = (productId) => {
    setOpenRows((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
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
            label="Tìm kiếm (Tên/Mã Lô hàng)"
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
                  <TableCell width="30px"></TableCell>
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
                    align="right"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("totalQuantity")}
                  >
                    Tổng số Lượng{" "}
                    {sortColumn === "totalQuantity" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("totalShelfQuantity")}
                  >
                    Tổng số Lượng Trên Quầy{" "}
                    {sortColumn === "totalShelfQuantity" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("totalWarehouseQuantity")}
                  >
                    Tổng số Lượng Trong Kho{" "}
                    {sortColumn === "totalWarehouseQuantity" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("manufactureDay")}
                  >
                    Ngày Sản Xuất gần nhất{" "}
                    {sortColumn === "manufactureDay" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("expiryDay")}
                  >
                    Hạn Sử Dụng gần nhất{" "}
                    {sortColumn === "expiryDay" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell>Cảnh báo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedByProduct.map((group, index) => (
                  <React.Fragment key={group.productId}>
                    <TableRow>
                      <TableCell>
                        <IconButton
                          aria-label="expand row"
                          size="small"
                          onClick={() => toggleRow(group.productId)}
                        >
                          {openRows[group.productId] ? (
                            <KeyboardArrowUpIcon />
                          ) : (
                            <KeyboardArrowDownIcon />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell
                        component="th"
                        scope="row"
                        style={{
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                        onClick={() => handleProductClick(group.productId)}
                      >
                        {group.productName}
                      </TableCell>
                      <TableCell align="right">
                        {group.totalQuantity}
                      </TableCell>
                      <TableCell align="right">
                        {group.totalShelfQuantity}
                      </TableCell>
                      <TableCell align="right">
                        {group.totalWarehouseQuantity}
                      </TableCell>
                      <TableCell>
                        {group.latestManufactureDate 
                          ? format(new Date(group.latestManufactureDate), "dd/MM/yyyy") 
                          : "-"}
                      </TableCell>
                      <TableCell
                        style={
                          group.earliestExpiryDate &&
                          isBefore(
                            new Date(group.earliestExpiryDate),
                            addDays(new Date(), EXPIRY_THRESHOLD_DAYS)
                          )
                            ? { color: "red" }
                            : {}
                        }
                      >
                        {group.earliestExpiryDate 
                          ? format(new Date(group.earliestExpiryDate), "dd/MM/yyyy") 
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {Array.from(group.warnings).map((warning, idx) => (
                          <Chip
                            key={idx}
                            label={warning}
                            color="warning"
                            size="small"
                            sx={{ mr: 0.5 }}
                          />
                        ))}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                        colSpan={10}
                      >
                        <Collapse in={openRows[group.productId]} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                              Chi tiết lô hàng
                            </Typography>
                            <Table size="small" aria-label="batch details">
                              <TableHead>
                                <TableRow>
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
                                {group.batches.map((batch) => (
                                  <TableRow key={batch._id}>
                                    <TableCell
                                      style={{
                                        cursor: "pointer",
                                        color: "blue",
                                        textDecoration: "underline",
                                      }}
                                      onClick={() => handleBatchClick(batch._id)}
                                    >
                                      {batch._id}
                                    </TableCell>
                                    <TableCell align="right">
                                      {batch.quantity_on_shelf}
                                    </TableCell>
                                    <TableCell align="right">
                                      {batch.remaining_quantity}
                                    </TableCell>
                                    <TableCell>
                                      {batch.manufacture_day
                                        ? format(new Date(batch.manufacture_day), "dd/MM/yyyy")
                                        : "-"}
                                    </TableCell>
                                    <TableCell
                                      style={
                                        batch.expiry_day &&
                                        isBefore(
                                          new Date(batch.expiry_day),
                                          addDays(new Date(), EXPIRY_THRESHOLD_DAYS)
                                        )
                                          ? { color: "red" }
                                          : {}
                                      }
                                    >
                                      {batch.expiry_day
                                        ? format(new Date(batch.expiry_day), "dd/MM/yyyy")
                                        : "-"}
                                    </TableCell>
                                    <TableCell>{batch.status}</TableCell>
                                    <TableCell>
                                      {batch.warnings.map((warning, idx) => (
                                        <Chip
                                          key={idx}
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
                                        onClick={() => handleOpenTransferDialog(batch)}
                                        disabled={batch.remaining_quantity <= 0}
                                      >
                                        chuyển lên quầy
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
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

    </Container>
  );
}

export default ShelfInventoryPage;
