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
    Autocomplete,
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useFormik } from "formik";
import * as yup from "yup";

const productSchema = yup.object({
    name: yup.string().required("Tên sản phẩm là bắt buộc"),
    category: yup.string().required("Danh mục là bắt buộc"),
    SKU: yup.string().required("SKU là bắt buộc"),
    units: yup.array().of(
        yup.object().shape({
            name: yup.string().required("Tên đơn vị là bắt buộc"),
            ratio: yup.number().min(1, "Tỷ lệ phải lớn hơn hoặc bằng 1").required("Tỷ lệ là bắt buộc"),
            salePrice: yup.number().min(0, "Giá bán phải lớn hơn hoặc bằng 0").required("Giá bán là bắt buộc"),
        })
    ).required("Đơn vị là bắt buộc"),
    description: yup.string(),
    active: yup.boolean(),
    suppliers: yup.array().of(
        yup.object().shape({
            supplier: yup.string().required("Nhà cung cấp là bắt buộc"),
            minOrderQuantity: yup.number().min(1, "Số lượng tối thiểu phải lớn hơn hoặc bằng 1"),
            leadTime: yup.number().min(0, "Thời gian giao hàng phải lớn hơn hoặc bằng 0"),
            isPrimary: yup.boolean(),
        })
    ),
    barcode: yup.string(),
});

const defaultUnits = [
    { name: "cái", ratio: 1, salePrice: 0 },
];

const validateUnits = (units) => {
    const ratioSet = new Set();
    let hasRatio1 = false;

    for (const unit of units) {
        if (ratioSet.has(unit.ratio)) return false;
        ratioSet.add(unit.ratio);
        if (unit.ratio === 1) hasRatio1 = true;
    }

    return hasRatio1;
};

const ProductManager = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success",
    });
    const [imagePreviews, setImagePreviews] = useState([]);
    const [selectedImages, setSelectedImages] = useState([]);
    const [showOptionalFields, setShowOptionalFields] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: "", description: "" });
    const token = localStorage.getItem("authToken");

    const predefinedUnits = ["cái", "gói", "bao", "thùng", "chai", "lọ", "hộp", "kg", "gram", "liter", "ml"];

    const toggleOptionalFields = () => {
        setShowOptionalFields(!showOptionalFields);
    };

    const handleOpenCategoryDialog = () => {
        setNewCategory({ name: "", description: "" });
        setOpenCategoryDialog(true);
    };

    const handleCloseCategoryDialog = () => {
        setOpenCategoryDialog(false);
    };

    const handleCreateCategory = async () => {
        try {
            const response = await axios.post("http://localhost:8000/api/categories", newCategory, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCategories([...categories, response.data]);
            setSnackbar({
                open: true,
                message: "Tạo danh mục mới thành công",
                severity: "success",
            });
            handleCloseCategoryDialog();
        } catch (error) {
            console.error("Error creating category:", error);
            setSnackbar({
                open: true,
                message: "Lỗi khi tạo danh mục mới",
                severity: "error",
            });
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
                    axios.get("http://localhost:8000/api/products", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get("http://localhost:8000/api/categories", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get("http://localhost:8000/api/suppliers", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                setProducts(Array.isArray(productsRes.data.data) ? productsRes.data.data : []);
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
            SKU: "",
            units: defaultUnits,
            suppliers: [],
            active: false,
            images: [],
            barcode: "",
        },
        validationSchema: productSchema,
        validate: (values) => {
            const errors = {};
            if (!validateUnits(values.units)) {
                errors.units = "Đơn vị phải có ít nhất một đơn vị với tỷ lệ là 1 và không được trùng tỷ lệ.";
            }
            return errors;
        },
        onSubmit: async (values) => {
            try {
                const formData = new FormData();
                formData.append("name", values.name);
                formData.append("category", values.category);
                formData.append("description", values.description || "");
                formData.append("SKU", values.SKU);
                formData.append("active", values.active);
                formData.append("barcode", values.barcode || "");

                values.units.forEach((unit, index) => {
                    formData.append(`units[${index}][name]`, unit.name);
                    formData.append(`units[${index}][ratio]`, unit.ratio);
                    formData.append(`units[${index}][salePrice]`, unit.salePrice);
                });

                const processedSuppliers = values.suppliers.map((s) => ({
                    supplier: s.supplier,
                    isPrimary: s.isPrimary || false,
                }));
                formData.append("suppliers", JSON.stringify(processedSuppliers));

                selectedImages.forEach((image) => {
                    formData.append("images", image);
                });

                const config = {
                    headers: {
                        Authorization: `Bearer ${token}`,
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

                setSnackbar({
                    open: true,
                    message: currentProduct
                        ? "Cập nhật sản phẩm thành công"
                        : "Thêm sản phẩm thành công",
                    severity: "success",
                });

                handleCloseDialog();
                const updatedProducts = await axios.get("http://localhost:8000/api/products", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProducts(Array.isArray(updatedProducts.data.data) ? updatedProducts.data.data : []);
            } catch (error) {
                console.error("Lỗi khi gửi dữ liệu đến API:", error.response?.data || error.message);
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
            [field]: value,
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
        formik.setFieldValue("units", defaultUnits);
        setImagePreviews([]);
        setSelectedImages([]);
        setOpenDialog(true);
    };

    const handleOpenEditDialog = (product) => {
        setCurrentProduct(product);
        formik.setValues({
            name: product.name,
            category: product.category?._id || product.category || "",
            description: product.description || "",
            SKU: product.SKU || "",
            units: product.units || [],
            suppliers: (product.suppliers || []).map((s) => ({
                supplier: s.supplier?._id || s.supplier || "",
                minOrderQuantity: s.minOrderQuantity || 1,
                leadTime: s.leadTime || 0,
                isPrimary: s.isPrimary || false,
            })),
            active: product.active,
            images: [],
            barcode: product.barcode || "",
        });
        setImagePreviews(product.images || []);
        setSelectedImages([]);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setImagePreviews([]);
        setSelectedImages([]);
    };

    const handleDeleteProduct = async (id) => {
        const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?");
        if (!confirmDelete) return;

        try {
            await axios.patch(
                `http://localhost:8000/api/products/${id}`,
                { active: false },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setProducts(
                products.map((p) => (p._id === id ? { ...p, active: false } : p))
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
            { supplier: "", minOrderQuantity: 1, leadTime: 0, isPrimary: false },
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

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenDetailsDialog = (product) => {
        setCurrentProduct(product);
        setOpenDetailsDialog(true);
    };

    const handleCloseDetailsDialog = () => {
        setOpenDetailsDialog(false);
        setCurrentProduct(null);
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
                    Danh mục sản phẩm
                </Typography>
                <TextField
                    variant="outlined"
                    size="small"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ marginRight: 2 }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddDialog}
                >
                    Thêm Sản phẩm
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>STT</TableCell>
                            <TableCell>Tên sản phẩm</TableCell>
                            <TableCell>Danh mục</TableCell>
                            <TableCell>Giá bán theo đơn vị</TableCell>
                            <TableCell>SKU</TableCell>
                            <TableCell>Đơn vị</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Hành động</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Array.isArray(filteredProducts) &&
                            filteredProducts
                                .sort((a, b) => {
                                    if (a.active === b.active) return 0;
                                    return a.active ? -1 : 1;
                                })
                                .map((product, index) => (
                                    <TableRow key={product._id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{product.name}</TableCell>
                                        <TableCell>{product.category?.name || "Không có danh mục"}</TableCell>
                                        <TableCell>
                                            {product.units && product.units.length > 0
                                                ? product.units[0].salePrice.toLocaleString("vi-VN", {
                                                    style: "currency",
                                                    currency: "VND",
                                                })
                                                : "Chưa có giá"}
                                        </TableCell>
                                        <TableCell>{product.SKU}</TableCell>
                                        <TableCell>
                                            {(product.units || []).map((unit) => unit.name).join(", ")}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={product.active ? "Hoạt động" : "Không hoạt động"}
                                                color={product.active ? "success" : "error"}
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
                                            <Button
                                                variant="text"
                                                color="primary"
                                                onClick={() => handleOpenDetailsDialog(product)}
                                            >
                                                Xem chi tiết
                                            </Button>
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
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Hình ảnh sản phẩm
                                </Typography>
                                <input
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    id="contained-button-file"
                                    multiple
                                    type="file"
                                    onChange={handleImageChange}
                                />
                                <label htmlFor="contained-button-file">
                                    <Button variant="contained" color="primary" component="span">
                                        Thêm hình ảnh
                                    </Button>
                                </label>
                                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {imagePreviews.map((preview, index) => (
                                        <Box key={index} sx={{ position: 'relative' }}>
                                            <img src={preview} alt={`Preview ${index}`} style={{ width: 100, height: 100, objectFit: 'cover' }} />
                                            <IconButton
                                                size="small"
                                                sx={{ position: 'absolute', top: -10, right: -10, backgroundColor:'error.main', color: 'white', '&:hover': { backgroundColor: 'error.dark' } }}
                                                onClick={() => {
                                                    const newPreviews = [...imagePreviews];
                                                    newPreviews.splice(index, 1);
                                                    setImagePreviews(newPreviews);
                                                    const newSelectedImages = [...selectedImages];
                                                    newSelectedImages.splice(index, 1);
                                                    setSelectedImages(newSelectedImages);
                                                }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Thông tin cơ bản
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    id="name"
                                    name="name"
                                    label="Tên sản phẩm *"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    error={formik.touched.name && Boolean(formik.errors.name)}
                                    helperText={formik.touched.name && formik.errors.name}
                                    margin="normal"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth margin="normal">
                                    <InputLabel id="category-label">Danh mục *</InputLabel>
                                    <Select
                                        labelId="category-label"
                                        id="category"
                                        name="category"
                                        value={formik.values.category}
                                        onChange={formik.handleChange}
                                        error={formik.touched.category && Boolean(formik.errors.category)}
                                    >
                                        {Array.isArray(categories) &&
                                            categories.map((category) => (
                                                <MenuItem key={category._id} value={category._id}>
                                                    {category.category_name || category.name || "Không rõ danh mục"}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                    {formik.touched.category && formik.errors.category && (
                                        <Typography color="error" variant="caption">
                                            {formik.errors.category}
                                        </Typography>
                                    )}
                                </FormControl>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleOpenCategoryDialog}
                                    sx={{ mt: 1 }}
                                >
                                    Tạo danh mục mới
                                </Button>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    id="SKU"
                                    name="SKU"
                                    label="SKU *"
                                    value={formik.values.SKU}
                                    onChange={formik.handleChange}
                                    error={formik.touched.SKU && Boolean(formik.errors.SKU)}
                                    helperText={formik.touched.SKU && formik.errors.SKU}
                                    margin="normal"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth margin="normal">
                                    <InputLabel id="status-label">Trạng thái *</InputLabel>
                                    <Select
                                        labelId="status-label"
                                        id="status"
                                        name="status"
                                        value={formik.values.active ? "active" : "inactive"}
                                        onChange={(e) =>
                                            formik.setFieldValue("active", e.target.value === "active")
                                        }
                                    >
                                        <MenuItem value="active">Hoạt động</MenuItem>
                                        <MenuItem value="inactive">Không hoạt động</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    id="barcode"
                                    name="barcode"
                                    label="Mã vạch"
                                    value={formik.values.barcode}
                                    onChange={formik.handleChange}
                                    error={formik.touched.barcode && Boolean(formik.errors.barcode)}
                                    helperText={formik.touched.barcode && formik.errors.barcode}
                                    margin="normal"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Đơn vị sản phẩm *
                                </Typography>
                            </Grid>
                            {formik.values.units.map((unit, index) => (
                                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                                    <Grid item xs={4}>
                                        <Autocomplete
                                            freeSolo
                                            options={predefinedUnits}
                                            value={unit.name}
                                            onChange={(event, newValue) => {
                                                const newUnits = [...formik.values.units];
                                                newUnits[index].name = newValue || "";
                                                formik.setFieldValue("units", newUnits);
                                            }}
                                            renderInput={(params) => (
                                                <TextField 
                                                    {...params} 
                                                    label="Tên đơn vị *" 
                                                    error={!unit.name}
                                                    helperText={!unit.name && "Tên đơn vị là bắt buộc"}
                                                    onChange={(e) => {
                                                        if (e.target.value !== undefined) {
                                                            const newUnits = [...formik.values.units];
                                                            newUnits[index].name = e.target.value;
                                                            formik.setFieldValue("units", newUnits);
                                                        }
                                                    }}
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <TextField
                                            fullWidth
                                            label="Tỷ lệ *"
                                            type="number"
                                            value={unit.ratio}
                                            onChange={(e) => {
                                                const newUnits = [...formik.values.units];
                                                newUnits[index].ratio = parseFloat(e.target.value) || 0;
                                                formik.setFieldValue("units", newUnits);
                                            }}
                                            error={!unit.ratio || unit.ratio < 1}
                                            helperText={
                                                (!unit.ratio || unit.ratio < 1) && "Tỷ lệ phải lớn hơn hoặc bằng 1"
                                            }
                                            disabled={unit.ratio === 1}
                                        />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <TextField
                                            fullWidth
                                            label="Giá bán *"
                                            type="number"
                                            value={unit.salePrice}
                                            onChange={(e) => {
                                                const newUnits = [...formik.values.units];
                                                newUnits[index].salePrice = parseFloat(e.target.value) || 0;
                                                formik.setFieldValue("units", newUnits);
                                            }}
                                            error={!unit.salePrice || unit.salePrice < 0}
                                            helperText={
                                                (!unit.salePrice || unit.salePrice < 0) &&
                                                "Giá bán phải lớn hơn hoặc bằng 0"
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={2}>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={() => {
                                                const newUnits = [...formik.values.units];
                                                newUnits.splice(index, 1);
                                                formik.setFieldValue("units", newUnits);
                                            }}
                                            disabled={formik.values.units.length === 1 || unit.ratio === 1}
                                        >
                                            Xóa
                                        </Button>
                                    </Grid>
                                </Grid>
                            ))}
                            <Grid item xs={12}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                        // Ensure new units don't have ratio 1
                                        const hasRatio1 = formik.values.units.some(unit => unit.ratio === 1);
                                        formik.setFieldValue("units", [
                                            ...formik.values.units,
                                            { name: "cái", ratio: hasRatio1 ? 2 : 1, salePrice: 0 },
                                        ]);
                                    }}
                                >
                                    Thêm đơn vị
                                </Button>
                                {formik.errors.units && (
                                    <Typography color="error" variant="caption">
                                        {formik.errors.units}
                                    </Typography>
                                )}
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Nhà cung cấp *
                                </Typography>
                            </Grid>
                            {formik.values.suppliers.map((supplier, index) => (
                                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                                    <Grid item xs={4}>
                                        <FormControl fullWidth>
                                            <InputLabel id={`supplier-label-${index}`}>Nhà cung cấp *</InputLabel>
                                            <Select
                                                labelId={`supplier-label-${index}`}
                                                value={supplier.supplier}
                                                onChange={(e) =>
                                                    handleSupplierChange(index, "supplier", e.target.value)
                                                }
                                                error={!supplier.supplier}
                                            >
                                                {Array.isArray(suppliers) &&
                                                    suppliers.map((s) => (
                                                        <MenuItem key={s._id} value={s._id}>
                                                            {s.name || s.supplier_name || "Không rõ nhà cung cấp"}
                                                        </MenuItem>
                                                    ))}
                                            </Select>
                                            {!supplier.supplier && (
                                                <Typography color="error" variant="caption">
                                                    Nhà cung cấp là bắt buộc
                                                </Typography>
                                            )}
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <TextField
                                            fullWidth
                                            label="Số lượng tối thiểu"
                                            type="number"
                                            value={supplier.minOrderQuantity || ""}
                                            onChange={(e) =>
                                                handleSupplierChange(index, "minOrderQuantity", parseInt(e.target.value))
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <TextField
                                            fullWidth
                                            label="Thời gian giao hàng (ngày)"
                                            type="number"
                                            value={supplier.leadTime || ""}
                                            onChange={(e) =>
                                                handleSupplierChange(index, "leadTime", parseInt(e.target.value))
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={1}>
                                        <IconButton
                                            onClick={() => handleSupplierChange(index, "isPrimary", !supplier.isPrimary)}
                                            color={supplier.isPrimary ? "primary" : "default"}
                                        >
                                            <Typography variant="caption">Chính</Typography>
                                        </IconButton>
                                    </Grid>
                                    <Grid item xs={2}>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={() => handleRemoveSupplier(index)}
                                        >
                                            Xóa
                                        </Button>
                                    </Grid>
                                </Grid>
                            ))}
                            <Grid item xs={12}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleAddSupplier}
                                >
                                    Thêm nhà cung cấp
                                </Button>
                            </Grid>

                            {showOptionalFields && (
                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom>
                                        Thông tin chi tiết
                                    </Typography>
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
                                    <TextField
                                        fullWidth
                                        id="barcode-optional"
                                        name="barcode"
                                        label="Mã vạch"
                                        value={formik.values.barcode}
                                        onChange={formik.handleChange}
                                        margin="normal"
                                    />
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel id="status-label-optional">Trạng thái</InputLabel>
                                        <Select
                                            labelId="status-label-optional"
                                            id="status-optional"
                                            name="status"
                                            value={formik.values.active ? "active" : "inactive"}
                                            onChange={(e) =>
                                                formik.setFieldValue("active", e.target.value === "active")
                                            }
                                        >
                                            <MenuItem value="active">Hoạt động</MenuItem>
                                            <MenuItem value="inactive">Không hoạt động</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}
                            <Grid item xs={12}>
                                <Button
                                    variant="text"
                                    onClick={toggleOptionalFields}
                                >
                                    {showOptionalFields ? "Ẩn chi tiết" : "Thêm chi tiết"}
                                </Button>
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

            <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} fullWidth maxWidth="md">
                <DialogTitle>{currentProduct?.name}</DialogTitle>
                <DialogContent dividers>
                    {currentProduct && (
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">Danh mục: {currentProduct.category?.name || "Không có"}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">SKU: {currentProduct.SKU}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">Trạng thái: {currentProduct.active ? "Hoạt động" : "Không hoạt động"}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">Mã vạch: {currentProduct.barcode || "Không có"}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">Đơn vị: {(currentProduct.units || []).map(unit => `${unit.name} (tỷ lệ: ${unit.ratio}, giá: ${unit.salePrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })})`).join(", ")}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">Nhà cung cấp: {(currentProduct.suppliers || []).map(s => s.supplier?.name || s.supplier).join(", ")}</Typography>
                            </Grid>
                            {currentProduct.description && (
                                <Grid item xs={12}>
                                    <Typography variant="body2">Mô tả: {currentProduct.description}</Typography>
                                </Grid>
                            )}
                            {currentProduct.images && currentProduct.images.length > 0 && (
                                <Grid item xs={12}>
                                    <Typography variant="subtitle1">Hình ảnh:</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {currentProduct.images.map((image, index) => (
                                            <img key={index} src={image} alt={`Sản phẩm ${index}`} style={{ maxWidth: '100px', height: 'auto' }} />
                                        ))}
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetailsDialog}>Đóng</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openCategoryDialog} onClose={handleCloseCategoryDialog}>
                <DialogTitle>Tạo danh mục mới</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Tên danh mục"
                        fullWidth
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Mô tả"
                        fullWidth
                        multiline
                        rows={3}
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCategoryDialog}>Hủy</Button>
                    <Button onClick={handleCreateCategory} variant="contained">
                        Tạo mới
                    </Button>
                </DialogActions>
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