import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Divider,
  Chip,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import { format } from "date-fns";

const AddToInventory = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [createdBatches, setCreatedBatches] = useState([]);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState({
    receiptId: null,
    itemIndex: null,
    showDetails: false,
  });
  const [users, setUsers] = useState({});
  const [categories, setCategories] = useState({});

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get("http://localhost:8000/api/goodreceipt", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      const pendingReceipts = res.data.filter(
        (r) => r.status === "draft" || r.status === "partially_received"
      );
      setReceipts(pendingReceipts);
      const userIds = [
        ...new Set(pendingReceipts.map((r) => r.receivedBy)),
      ].filter((id) => id);
      fetchUserDetails(userIds);
      const categoryIds = [
        ...new Set(
          pendingReceipts
            .flatMap((r) => r.items?.map((item) => item.product?.category))
            .filter((id) => id)
        ),
      ];
      fetchCategoryDetails(categoryIds);
    } catch (error) {
      console.error("Error fetching good receipts:", error);
      setError(
        error.response?.data?.message ||
          "Failed to load good receipts. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userIds) => {
    try {
      const details = {};
      for (const id of userIds) {
        const res = await axios.get(`http://localhost:8000/api/user/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        });
        details[id] = res.data;
      }
      setUsers((prevUsers) => ({ ...prevUsers, ...details }));
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchCategoryDetails = async (categoryIds) => {
    try {
      const details = {};
      for (const id of categoryIds) {
        const res = await axios.get(
          `http://localhost:8000/api/categories/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          }
        );
        details[id] = res.data?.name;
      }
      setCategories((prevCategories) => ({ ...prevCategories, ...details }));
    } catch (error) {
      console.error("Error fetching category details:", error);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleConfirm = async (receiptId) => {
    try {
      setProcessingId(receiptId);
      setError(null);
      setErrorDetails({ receiptId: null, itemIndex: null, showDetails: false });

      const token = localStorage.getItem("authToken");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const res = await axios.patch(
        `http://localhost:8000/api/goodreceipt/confirm/${receiptId}`,
        {},
        config
      );

      if (res.data.batches && Array.isArray(res.data.batches)) {
        const formattedBatches = await Promise.all(
          res.data.batches.map(async (batch) => {
            const productRes = await axios.get(
              `http://localhost:8000/api/products/${batch.product}`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
              }
            );
            const product = productRes.data;
            return {
              ...batch,
              productName: product?.name || "",
              productSKU: product?.SKU || "",
              productCategoryName: categories[product?.category] || "",
              manufactureDate: batch.manufacture_day || batch.manufactureDate,
              expiryDate: batch.expiry_day || batch.expiryDate,
              import_price:
                batch.import_price !== undefined
                  ? batch.import_price
                  : batch.unitPrice !== undefined
                  ? batch.unitPrice
                  : 0,
              batchStatus: batch.status,
            };
          })
        );
        setCreatedBatches(formattedBatches);
      }

      fetchReceipts();

      alert("Lô hàng đã được chuyển vào kho thành công!");
    } catch (error) {
      console.error("Error confirming good receipt:", error);

      let errorMessage = "Xác nhận thất bại: ";

      if (error.response?.data?.itemIndex !== undefined) {
        const itemIndex = error.response.data.itemIndex;
        errorMessage += `${error.response.data.message}\n\n`;
        errorMessage += `Vui lòng kiểm tra lại thông tin phiếu nhập kho và đảm bảo tất cả sản phẩm có ID hợp lệ.`;

        setErrorDetails({
          receiptId: processingId,
          itemIndex: itemIndex,
          showDetails: true,
        });

        const affectedReceipt = receipts.find((r) => r._id === receiptId);
        if (
          affectedReceipt &&
          affectedReceipt.items &&
          affectedReceipt.items[itemIndex]
        ) {
          const problematicItem = affectedReceipt.items[itemIndex];
          errorMessage += `\n\nThông tin mục có vấn đề: ${
            problematicItem.product?.name || "Sản phẩm không xác định"
          } (Vị trí: ${itemIndex + 1})`;
        }
      } else {
        errorMessage +=
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Đã xảy ra lỗi không xác định";
      }

      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const renderReceiptItemDetails = () => {
    if (!errorDetails.showDetails) return null;

    const receipt = receipts.find((r) => r._id === errorDetails.receiptId);
    if (!receipt) return null;

    return (
      <Paper sx={{ p: 2, mb: 3, bgcolor: "#fff3e0", mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Chi tiết phiếu nhập có vấn đề:
        </Typography>
        <Typography>
          <strong>ID phiếu:</strong> {receipt._id}
        </Typography>
        <Typography>
          <strong>Mã phiếu đặt hàng:</strong> {receipt.purchaseOrder}
        </Typography>
        <Typography>
          <strong>Nhà cung cấp:</strong> {receipt.supplier?.name || "N/A"}
        </Typography>
        <Typography>
          <strong>Ngày tạo:</strong> {formatDate(receipt.receiptDate)}
        </Typography>
        <Typography>
          <strong>Người nhận:</strong>{" "}
          {users[receipt.receivedBy]?.fullName ||
            users[receipt.receivedBy]?.username ||
            receipt.receivedBy ||
            "N/A"}
        </Typography>
        <Typography>
          <strong>Trạng thái:</strong> {receipt.status}
        </Typography>
        <Typography>
          <strong>Ghi chú:</strong> {receipt.notes || "Không có ghi chú"}
        </Typography>

        <Box mt={2}>
          <Typography variant="subtitle1">
            <strong>Danh sách sản phẩm:</strong>
          </Typography>
          <Box sx={{ maxHeight: "300px", overflowY: "auto", pl: 2, pr: 2 }}>
            {receipt.items?.map((item, idx) => (
              <Paper
                key={idx}
                sx={{
                  p: 2,
                  my: 1,
                  bgcolor:
                    idx === errorDetails.itemIndex ? "#ffebee" : "#fafafa",
                  border:
                    idx === errorDetails.itemIndex
                      ? "1px solid #f44336"
                      : "1px solid #e0e0e0",
                }}
              >
                <Typography
                  color={
                    idx === errorDetails.itemIndex ? "error" : "textPrimary"
                  }
                >
                  <strong>Mục #{idx + 1}:</strong>{" "}
                  {idx === errorDetails.itemIndex ? "(Có vấn đề)" : ""}
                </Typography>
                <Box ml={2}>
                  <Typography>
                    <strong>Tên sản phẩm:</strong> {item.product?.name || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Mã SKU:</strong>{" "}
                    {item.product?.SKU || "Không có SKU"}
                  </Typography>
                  <Typography>
                    <strong>ID sản phẩm:</strong>{" "}
                    {item.product?._id || "Không xác định"}
                  </Typography>
                  <Typography>
                    <strong>Danh mục:</strong>{" "}
                    {categories[item.product?.category] ||
                      item.product?.category ||
                      "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Số lượng:</strong> {item.quantity}
                  </Typography>
                  <Typography>
                    <strong>Ngày sản xuất:</strong>{" "}
                    {formatDate(item.manufactureDate)}
                  </Typography>
                  <Typography>
                    <strong>Hạn sử dụng:</strong> {formatDate(item.expiryDate)}
                  </Typography>
                  {item.batch && (
                    <Typography>
                      <strong>ID Lô hàng:</strong> {item.batch}
                    </Typography>
                  )}
                </Box>
                {idx === errorDetails.itemIndex && (
                  <Box mt={1} p={1} bgcolor="#fff8e1" borderRadius={1}>
                    <Typography color="error">
                      <strong>Vấn đề:</strong> ID sản phẩm không tồn tại hoặc
                      không hợp lệ. Vui lòng kiểm tra lại phiếu đặt hàng gốc và
                      đảm bảo mã sản phẩm chính xác.
                    </Typography>
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        </Box>

        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={() =>
              setErrorDetails((prev) => ({ ...prev, showDetails: false }))
            }
          >
            Ẩn chi tiết
          </Button>
        </Box>
      </Paper>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss");
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Chuyển phiếu nhập kho vào kho hàng
      </Typography>

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: "#ffebee" }}>
          <Typography color="error" sx={{ whiteSpace: "pre-line" }}>
            {error}
          </Typography>
          {errorDetails.showDetails && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              sx={{ mt: 1 }}
              onClick={() =>
                setErrorDetails((prev) => ({
                  ...prev,
                  showDetails: !prev.showDetails,
                }))
              }
            >
              {errorDetails.showDetails ? "Ẩn chi tiết" : "Hiển thị chi tiết"}
            </Button>
          )}
        </Paper>
      )}

      {errorDetails.showDetails && renderReceiptItemDetails()}

      {loading && receipts.length === 0 ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : receipts.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6">
            Không có phiếu nhập kho nào đang chờ xử lý
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            maxHeight: "600px",
            overflowY: "auto",
            mb: 4,
          }}
        >
          {receipts.map((receipt) => (
            <Paper
              key={receipt._id}
              sx={{
                p: 3,
                mb: 2,
                border: "1px solid #ddd",
                transition: "all 0.3s",
                "&:hover": {
                  boxShadow: 3,
                  borderColor: theme.palette.primary.light,
                },
              }}
            >
              <Stack
                direction={isMobile ? "column" : "row"}
                justifyContent="space-between"
                alignItems={isMobile ? "flex-start" : "center"}
                spacing={2}
              >
                <Box flex={1}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Phiếu #
                    {receipt.receiptDate
                      ? formatDate(receipt.receiptDate)
                      : "N/A"}
                  </Typography>
                  <Typography>
                    <strong>ID phiếu:</strong> {receipt._id}
                  </Typography>
                  <Typography>
                    <strong>Mã phiếu đặt hàng:</strong> {receipt.purchaseOrder}
                  </Typography>
                  <Typography>
                    <strong>Nhà cung cấp:</strong>{" "}
                    {receipt.supplier?.name || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Ngày tạo:</strong> {formatDate(receipt.receiptDate)}
                  </Typography>
                  <Typography>
                    <strong>Người nhận:</strong>{" "}
                    {users[receipt.receivedBy]?.fullName ||
                      users[receipt.receivedBy]?.username ||
                      receipt.receivedBy ||
                      "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Trạng thái:</strong> {receipt.status}
                  </Typography>
                  <Typography>
                    <strong>Ghi chú:</strong>{" "}
                    {receipt.notes || "Không có ghi chú"}
                  </Typography>
                  <Typography>
                    <strong>Số lượng mặt hàng:</strong>{" "}
                    {receipt.items?.length || 0}
                  </Typography>
                  <Box mt={1}>
                    <Chip
                      label={
                        receipt.status === "draft"
                          ? "Chờ xử lý"
                          : receipt.status === "partially_received"
                          ? "Đã nhận một phần"
                          : receipt.status
                      }
                      color={
                        receipt.status === "draft"
                          ? "primary"
                          : receipt.status === "partially_received"
                          ? "warning"
                          : "success"
                      }
                      size="small"
                    />
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  disabled={processingId === receipt._id}
                  onClick={() => handleConfirm(receipt._id)}
                  startIcon={
                    processingId === receipt._id ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : null
                  }
                  sx={{ minWidth: 150 }}
                >
                  {processingId === receipt._id
                    ? "Đang xử lý..."
                    : "Xác nhận nhập kho"}
                </Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight="bold">
                Chi tiết sản phẩm:
              </Typography>
              <Box sx={{ ml: 2 }}>
                {receipt.items?.map((item, index) => (
                  <Paper key={index} sx={{ p: 1, mb: 1, bgcolor: "#f9f9f9" }}>
                    <Typography>
                      <strong>Sản phẩm #{index + 1}:</strong>{" "}
                      {item.product?.name || "N/A"}
                    </Typography>
                    <Typography sx={{ ml: 2 }}>
                      <strong>Mã SKU:</strong>{" "}
                      {item.product?.SKU || "Không có SKU"}
                    </Typography>
                    <Typography sx={{ ml: 2 }}>
                      <strong>Danh mục:</strong>{" "}
                      {categories[item.product?.category] ||
                        item.product?.category ||
                        "N/A"}
                    </Typography>
                    <Typography sx={{ ml: 2 }}>
                      <strong>Số lượng:</strong> {item.quantity}
                    </Typography>
                    <Typography sx={{ ml: 2 }}>
                      <strong>Ngày sản xuất:</strong>{" "}
                      {formatDate(item.manufactureDate)}
                    </Typography>
                    <Typography sx={{ ml: 2 }}>
                      <strong>Hạn sử dụng:</strong>{" "}
                      {formatDate(item.expiryDate)}
                    </Typography>
                    {item.batch && (
                      <Typography sx={{ ml: 2 }}>
                        <strong>ID Lô hàng:</strong> {item.batch}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>
            </Paper>
          ))}
        </Box>
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
                      {batch.productName ||
                        batch.product?.name ||
                        batch.productId}
                    </Typography>
                    <Typography>
                      <strong>Mã SKU:</strong> {batch.productSKU || "N/A"}
                    </Typography>
                    <Typography>
                      <strong>Danh mục:</strong>{" "}
                      {batch.productCategoryName ||
                        batch.productCategory ||
                        "N/A"}
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
                      <strong>Đơn giá nhập:</strong>{" "}
                      {batch.import_price?.toLocaleString("vi-VN") || "N/A"} VNĐ
                    </Typography>
                    <Typography>
                      <strong>Trạng thái lô:</strong>{" "}
                      {batch.batchStatus || "active"}
                    </Typography>
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

export default AddToInventory;
