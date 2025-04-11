import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Box,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useFormik } from "formik";
import * as yup from "yup";

const productSchema = yup.object({
  name: yup.string().required("Tên sản phẩm là bắt buộc"),
  category: yup.string().required("Danh mục là bắt buộc"),
  price: yup
    .number()
    .min(0, "Giá phải lớn hơn hoặc bằng 0")
    .required("Giá là bắt buộc"),
  SKU: yup.string().required("SKU là bắt buộc"),
  unit: yup.string().required("Đơn vị là bắt buộc"),
  description: yup.string(),
  status: yup.string().oneOf(["active", "inactive"], "Trạng thái không hợp lệ"),
  suppliers: yup.array().of(
    yup.object().shape({
      supplier: yup.string().required("Nhà cung cấp là bắt buộc"),
      importPrice: yup
        .number()
        .min(0, "Giá nhập phải lớn hơn hoặc bằng 0")
        .required("Giá nhập là bắt buộc"),
    })
  ),
});

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
          axios.get("http://localhost:8000/api/products/product/all"),
          axios.get("http://localhost:8000/api/categories"),
          axios.get("http://localhost:8000/api/suppliers"),
        ]);

        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
        setSuppliers(suppliersRes.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setSnackbar({
          open: true,
          message: "Lỗi khi tải dữ liệu",
          severity: "error",
        });
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formik = useFormik({
    initialValues: {
      name: "",
      category: "",
      description: "",
      price: 0,
      SKU: "",
      unit: "piece",
      suppliers: [],
      status: "active",
      images: [],
    },
    validationSchema: productSchema,
    onSubmit: async (values) => {
      try {
        const formData = new FormData();

        // Append basic fields
        formData.append("name", values.name);
        formData.append("category", values.category);
        formData.append("description", values.description || "");
        formData.append("price", values.price);
        formData.append("SKU", values.SKU);
        formData.append("unit", values.unit);
        formData.append("status", values.status);

        // Process suppliers - ensure correct format
        const processedSuppliers = values.suppliers.map((s) => ({
          supplier: s.supplier,
          importPrice: Number(s.importPrice),
        }));
        formData.append("suppliers", JSON.stringify(processedSuppliers));

        // Add images to formData
        selectedImages.forEach((image) => {
          formData.append("images", image);
        });

        const config = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };

        let response;
        if (currentProduct) {
          response = await axios.patch(
            `http://localhost:8000/api/products/${currentProduct._id}`,
            formData,
            config
          );
        } else {
          response = await axios.post(
            "http://localhost:8000/api/products",
            formData,
            config
          );
        }

        if (currentProduct) {
          setProducts(
            products.map((p) =>
              p._id === currentProduct._id ? response.data.product : p
            )
          );
        } else {
          setProducts([...products, response.data.product]);
        }

        setSnackbar({
          open: true,
          message: currentProduct
            ? "Cập nhật sản phẩm thành công"
            : "Thêm sản phẩm thành công",
          severity: "success",
        });

        handleCloseDialog();
      } catch (error) {
        console.error("Error saving product:", error);
        setSnackbar({
          open: true,
          message: error.response?.data?.message || "Lỗi khi lưu sản phẩm",
          severity: "error",
        });
      }
    },
  });

  const handleSupplierChange = (index, field, value) => {
    const newSuppliers = [...formik.values.suppliers];
    newSuppliers[index] = {
      ...newSuppliers[index],
      [field]: field === "importPrice" ? Number(value) || 0 : value,
    };
    formik.setFieldValue("suppliers", newSuppliers);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedImages(files);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleOpenAddDialog = () => {
    setCurrentProduct(null);
    formik.resetForm();
    setImagePreviews([]);
    setSelectedImages([]);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (product) => {
    setCurrentProduct(product);
    formik.setValues({
      name: product.name,
      category: product.category._id || product.category,
      description: product.description || "",
      price: product.price,
      SKU: product.SKU,
      unit: product.unit,
      suppliers: product.suppliers.map((s) => ({
        supplier: s.supplier._id || s.supplier,
        importPrice: s.importPrice,
      })),
      status: product.status,
      images: [],
    });
    setImagePreviews(product.images || []);
    setSelectedImages([]);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleDeleteProduct = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/products/${id}`);
      setProducts(
        products.map((p) => (p._id === id ? { ...p, status: "inactive" } : p))
      );
      setSnackbar({
        open: true,
        message: "Sản phẩm đã được đánh dấu là không hoạt động",
        severity: "success",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      setSnackbar({
        open: true,
        message: "Lỗi khi xóa sản phẩm",
        severity: "error",
      });
    }
  };

  const handleAddSupplier = () => {
    formik.setFieldValue("suppliers", [
      ...formik.values.suppliers,
      { supplier: "", importPrice: 0 },
    ]);
  };

  const handleRemoveSupplier = (index) => {
    const newSuppliers = [...formik.values.suppliers];
    newSuppliers.splice(index, 1);
    formik.setFieldValue("suppliers", newSuppliers);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (isLoading) {
    return (
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          Quản lý Sản phẩm
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Thêm Sản phẩm
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Tên sản phẩm</TableCell>
              <TableCell>Danh mục</TableCell>
              <TableCell>Giá</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Đơn vị</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={product._id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{product.category_name}</TableCell>
                <TableCell>
                  {product.category?.category_name || "N/A"}
                </TableCell>
                <TableCell>{product.price.toLocaleString()} VND</TableCell>
                <TableCell>{product.SKU}</TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell>
                  <Chip
                    label={
                      product.status === "active"
                        ? "Hoạt động"
                        : "Không hoạt động"
                    }
                    color={product.status === "active" ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenEditDialog(product)}>
                    <EditIcon color="primary" />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteProduct(product._id)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {currentProduct ? "Chỉnh sửa Sản phẩm" : "Thêm Sản phẩm Mới"}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="name"
                  name="name"
                  label="Tên sản phẩm"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                  margin="normal"
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel id="category-label">Danh mục</InputLabel>
                  <Select
                    labelId="category-label"
                    id="category"
                    name="category"
                    value={formik.values.category}
                    onChange={formik.handleChange}
                    error={
                      formik.touched.category && Boolean(formik.errors.category)
                    }
                  >
                    {categories.map((category) => (
                      <MenuItem key={category._id} value={category._id}>
                        {category.category_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.category && formik.errors.category && (
                    <Typography color="error" variant="caption">
                      {formik.errors.category}
                    </Typography>
                  )}
                </FormControl>

                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Mô tả"
                  multiline
                  rows={3}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="price"
                  name="price"
                  label="Giá bán"
                  type="number"
                  value={formik.values.price}
                  onChange={formik.handleChange}
                  error={formik.touched.price && Boolean(formik.errors.price)}
                  helperText={formik.touched.price && formik.errors.price}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  id="SKU"
                  name="SKU"
                  label="SKU"
                  value={formik.values.SKU}
                  onChange={formik.handleChange}
                  error={formik.touched.SKU && Boolean(formik.errors.SKU)}
                  helperText={formik.touched.SKU && formik.errors.SKU}
                  margin="normal"
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel id="unit-label">Đơn vị</InputLabel>
                  <Select
                    labelId="unit-label"
                    id="unit"
                    name="unit"
                    value={formik.values.unit}
                    onChange={formik.handleChange}
                    error={formik.touched.unit && Boolean(formik.errors.unit)}
                  >
                    <MenuItem value="piece">Cái</MenuItem>
                    <MenuItem value="kg">Kg</MenuItem>
                    <MenuItem value="liter">Lít</MenuItem>
                    <MenuItem value="box">Hộp</MenuItem>
                    <MenuItem value="set">Bộ</MenuItem>
                    <MenuItem value="bottle">Chai</MenuItem>
                    <MenuItem value="pack">Gói</MenuItem>
                    <MenuItem value="carton">Thùng</MenuItem>
                    <MenuItem value="pair">Đôi</MenuItem>
                  </Select>
                  {formik.touched.unit && formik.errors.unit && (
                    <Typography color="error" variant="caption">
                      {formik.errors.unit}
                    </Typography>
                  )}
                </FormControl>

                <FormControl fullWidth margin="normal">
                  <InputLabel id="status-label">Trạng thái</InputLabel>
                  <Select
                    labelId="status-label"
                    id="status"
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                  >
                    <MenuItem value="active">Hoạt động</MenuItem>
                    <MenuItem value="inactive">Không hoạt động</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Hình ảnh sản phẩm
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
                  {imagePreviews.map((img, index) => (
                    <Box
                      key={index}
                      sx={{ position: "relative", width: 100, height: 100 }}
                    >
                      <img
                        src={img}
                        alt={`Preview ${index}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </Box>
                  ))}
                </Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                >
                  Tải lên hình ảnh
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Nhà cung cấp</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddSupplier}
                  >
                    Thêm nhà cung cấp
                  </Button>
                </Box>

                {formik.values.suppliers.map((supplier, index) => (
                  <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={5}>
                      <FormControl fullWidth>
                        <InputLabel id={`supplier-label-${index}`}>
                          Nhà cung cấp
                        </InputLabel>
                        <Select
                          labelId={`supplier-label-${index}`}
                          value={supplier.supplier}
                          onChange={(e) =>
                            handleSupplierChange(
                              index,
                              "supplier",
                              e.target.value
                            )
                          }
                          error={
                            formik.touched.suppliers?.[index]?.supplier &&
                            Boolean(formik.errors.suppliers?.[index]?.supplier)
                          }
                        >
                          {suppliers.map((s) => (
                            <MenuItem key={s._id} value={s._id}>
                              {s.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {formik.touched.suppliers?.[index]?.supplier &&
                          formik.errors.suppliers?.[index]?.supplier && (
                            <Typography color="error" variant="caption">
                              {formik.errors.suppliers[index].supplier}
                            </Typography>
                          )}
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Giá nhập"
                        type="number"
                        value={supplier.importPrice}
                        onChange={(e) =>
                          handleSupplierChange(
                            index,
                            "importPrice",
                            e.target.value
                          )
                        }
                        error={
                          formik.touched.suppliers?.[index]?.importPrice &&
                          Boolean(formik.errors.suppliers?.[index]?.importPrice)
                        }
                        helperText={
                          formik.touched.suppliers?.[index]?.importPrice &&
                          formik.errors.suppliers?.[index]?.importPrice
                        }
                      />
                    </Grid>

                    <Grid
                      item
                      xs={12}
                      sm={3}
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        onClick={() => handleRemoveSupplier(index)}
                      >
                        Xóa
                      </Button>
                    </Grid>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Hủy</Button>
            <Button type="submit" color="primary" variant="contained">
              {currentProduct ? "Cập nhật" : "Thêm mới"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProductManager;