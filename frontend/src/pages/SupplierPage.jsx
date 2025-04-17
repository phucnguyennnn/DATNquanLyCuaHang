import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Snackbar,
  Alert,
  Chip,
  Typography,
  Tooltip,
  InputAdornment,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  ExpandMore,
  Business,
  ContactPhone,
  AccountBalance,
  Payment,
  Person,
  Star,
  Close
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import axios from 'axios';
import ProductSearch from '../components/ProductSearch';

const API_URL = 'http://localhost:8000/api/suppliers';
const PRODUCTS_API = 'http://localhost:8000/api/products';

const SupplierSchema = yup.object().shape({
  name: yup.string().required('Bắt buộc nhập').max(100, 'Tối đa 100 ký tự'),
  description: yup.string().max(500, 'Tối đa 500 ký tự'),
  company: yup.string(),
  taxId: yup.string(),
  address: yup.object({
    street: yup.string(),
    city: yup.string(),
    state: yup.string(),
    postalCode: yup.string(),
    country: yup.string()
  }),
  contact: yup.object({
    phone: yup.string().matches(/^[0-9]{10,15}$/, 'Số điện thoại không hợp lệ'),
    mobile: yup.string().matches(/^[0-9]{10,15}$/, 'Số di động không hợp lệ'),
    email: yup.string().email('Email không hợp lệ'),
    website: yup.string().url('URL không hợp lệ')
  }),
  primaryContactPerson: yup.object({
    name: yup.string(),
    position: yup.string(),
    phone: yup.string(),
    email: yup.string().email('Email không hợp lệ')
  }),
  paymentTerms: yup.number().min(0, 'Không được nhỏ hơn 0').required('Bắt buộc nhập'),
  bankDetails: yup.object({
    accountName: yup.string(),
    accountNumber: yup.string(),
    bankName: yup.string(),
    branch: yup.string(),
    swiftCode: yup.string()
  }),
  rating: yup.number().min(0, 'Tối thiểu 0 sao').max(5, 'Tối đa 5 sao'),
  notes: yup.string().max(1000, 'Tối đa 1000 ký tự'),
  isActive: yup.boolean().required('Bắt buộc chọn trạng thái'),
  suppliedProducts: yup.array().of(
    yup.object().shape({
      product: yup.object().required('Sản phẩm bắt buộc'),
      importPrice: yup.number().required('Giá nhập bắt buộc').min(0),
      minOrderQuantity: yup.number().min(1).default(1),
      leadTime: yup.number().min(0).default(0),
      isPrimary: yup.boolean().default(false)
    })
  )
});

const initialValues = {
  name: '',
  description: '',
  company: '',
  taxId: '',
  address: { 
    street: '', 
    city: '', 
    state: '', 
    postalCode: '', 
    country: '' 
  },
  contact: { 
    phone: '', 
    mobile: '', 
    email: '', 
    website: '' 
  },
  primaryContactPerson: { 
    name: '', 
    position: '', 
    phone: '', 
    email: '' 
  },
  paymentTerms: 30,
  bankDetails: { 
    accountName: '', 
    accountNumber: '', 
    bankName: '', 
    branch: '', 
    swiftCode: '' 
  },
  rating: 0,
  notes: '',
  isActive: true,
  suppliedProducts: []
};

const SupplierPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [products, setProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái đang xử lý

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, [searchTerm]);

  const fetchSuppliers = async () => {
    try {
      const { data } = await axios.get(API_URL, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("authToken")}` 
        },
        params: { search: searchTerm }
      });
      setSuppliers(data);
    } catch (error) {
      showSnackbar('Lỗi khi tải danh sách nhà cung cấp', 'error');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get(PRODUCTS_API, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("authToken")}` 
        }
      });
      setProducts(data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: SupplierSchema,
    onSubmit: async (values) => {
      if (isSubmitting) return; // Ngăn chặn xử lý nhiều lần
      setIsSubmitting(true); // Bắt đầu trạng thái xử lý

      try {
        // Kiểm tra dữ liệu sản phẩm trước khi gửi
        const invalidProducts = values.suppliedProducts.filter(sp => 
          !sp.product?._id || sp.importPrice < 0 || sp.minOrderQuantity < 1
        );
        if (invalidProducts.length > 0) {
          showSnackbar('Dữ liệu sản phẩm không hợp lệ', 'error');
          return;
        }

        const token = localStorage.getItem("authToken");
        const config = { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        };

        const formattedData = {
          ...values,
          suppliedProducts: values.suppliedProducts.map(sp => ({
            product: sp.product._id,
            importPrice: sp.importPrice,
            minOrderQuantity: sp.minOrderQuantity,
            leadTime: sp.leadTime,
            isPrimary: sp.isPrimary
          }))
        };

        if (editMode) {
          await axios.put(
            `${API_URL}/${selectedSupplier._id}`, 
            formattedData, 
            config
          );
        } else {
          await axios.post(API_URL, formattedData, config);
        }

        fetchSuppliers();
        handleCloseDialog();
        showSnackbar(`Nhà cung cấp ${editMode ? 'cập nhật' : 'tạo mới'} thành công`);
      } catch (error) {
        console.error('Error submitting supplier:', error); // Log lỗi chi tiết
        showSnackbar(
          error.response?.data?.message || 'Thao tác thất bại', 
          'error'
        );
      } finally {
        setIsSubmitting(false); // Kết thúc trạng thái xử lý
      }
    }
  });

  const addProductToSupplier = (product) => {
    const isExisting = formik.values.suppliedProducts.some(
      sp => sp.product._id === product._id
    );
    
    if (!isExisting) {
      const newProduct = {
        product,
        importPrice: 0,
        minOrderQuantity: 1,
        leadTime: 0,
        isPrimary: false
      };
      formik.setFieldValue('suppliedProducts', [...formik.values.suppliedProducts, newProduct]);
    }
  };

  const removeProductFromSupplier = (index) => {
    const newProducts = [...formik.values.suppliedProducts];
    newProducts.splice(index, 1);
    formik.setFieldValue('suppliedProducts', newProducts);
  };

  const handleOpenCreate = () => {
    setEditMode(false);
    formik.resetForm();
    setOpenDialog(true);
  };

  const handleOpenEdit = (supplier) => {
    setEditMode(true);
    setSelectedSupplier(supplier);
    
    const mergedData = {
      ...initialValues,
      ...supplier,
      address: { ...initialValues.address, ...supplier.address },
      contact: { ...initialValues.contact, ...supplier.contact },
      primaryContactPerson: { 
        ...initialValues.primaryContactPerson, 
        ...supplier.primaryContactPerson 
      },
      bankDetails: { 
        ...initialValues.bankDetails, 
        ...supplier.bankDetails 
      },
      suppliedProducts: supplier.suppliedProducts?.map(sp => ({
        product: products.find(p => p._id === sp.product),
        ...sp
      })) || []
    };
    
    formik.setValues(mergedData);
    setOpenDialog(true);
  };

  const handleOpenDeleteDialog = (id) => {
    setSupplierToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${supplierToDelete}`, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("authToken")}` 
        }
      });
      fetchSuppliers();
      showSnackbar('Đã xóa nhà cung cấp thành công');
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || 'Xóa thất bại', 
        'error'
      );
    } finally {
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    formik.resetForm();
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          label="Tìm kiếm nhà cung cấp"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenCreate}
        >
          Thêm mới
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell>Mã số thuế</TableCell>
              <TableCell>Sản phẩm cung cấp</TableCell>
              <TableCell>Liên hệ</TableCell>
              <TableCell>Người liên hệ</TableCell>
              <TableCell>Điều khoản TT</TableCell>
              <TableCell>Đánh giá</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier._id}>
                <TableCell>
                  <Typography fontWeight="bold">{supplier.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {supplier.company || 'Chưa cập nhật'}
                  </Typography>
                </TableCell>
                <TableCell>{supplier.taxId || 'Chưa cập nhật'}</TableCell>
                <TableCell>
                  {supplier.suppliedProducts?.length > 0 ? (
                    <Box>
                      {supplier.suppliedProducts.slice(0, 3).map(sp => (
                        <Chip 
                          key={sp.product}
                          label={`${products.find(p => p._id === sp.product)?.name || '...'} - ${sp.importPrice.toLocaleString()}`}
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                      {supplier.suppliedProducts.length > 3 && (
                        <Typography variant="caption">+ {supplier.suppliedProducts.length - 3} sản phẩm</Typography>
                      )}
                    </Box>
                  ) : 'Chưa có sản phẩm'}
                </TableCell>
                <TableCell>
                  <Box>
                    <div>{supplier.contact?.email || 'Chưa cập nhật'}</div>
                    <div>📞 {supplier.contact?.phone || 'Chưa cập nhật'}</div>
                    <div>📱 {supplier.contact?.mobile || 'Chưa cập nhật'}</div>
                  </Box>
                </TableCell>
                <TableCell>
                  {(supplier.primaryContactPerson && (
                    <Box>
                      <div>{supplier.primaryContactPerson.name || 'Chưa cập nhật'}</div>
                      <div>{supplier.primaryContactPerson.position || ''}</div>
                      <div>{supplier.primaryContactPerson.phone || ''}</div>
                    </Box>
                  )) || 'Chưa cập nhật'}
                </TableCell>
                <TableCell>{supplier.paymentTerms} ngày</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Star fontSize="small" color="warning" />
                    <Typography ml={0.5}>
                      {supplier.rating?.toFixed(1) || '0.0'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={supplier.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                    color={supplier.isActive ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Sửa">
                    <IconButton onClick={() => handleOpenEdit(supplier)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Xóa">
                    <IconButton onClick={() => handleOpenDeleteDialog(supplier._id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editMode ? 'Cập nhật nhà cung cấp' : 'Thêm nhà cung cấp mới'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Business sx={{ mr: 1 }} />
                    <Typography>Thông tin cơ bản</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      label="Tên nhà cung cấp *"
                      name="name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      error={formik.touched.name && !!formik.errors.name}
                      helperText={formik.touched.name && formik.errors.name}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Tên công ty"
                      name="company"
                      value={formik.values.company}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Mã số thuế"
                      name="taxId"
                      value={formik.values.taxId}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Mô tả"
                      name="description"
                      multiline
                      rows={3}
                      value={formik.values.description}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <ContactPhone sx={{ mr: 1 }} />
                    <Typography>Địa chỉ</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Đường/Số nhà"
                          name="address.street"
                          value={formik.values.address.street}
                          onChange={formik.handleChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Thành phố"
                          name="address.city"
                          value={formik.values.address.city}
                          onChange={formik.handleChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Tỉnh/Thành"
                          name="address.state"
                          value={formik.values.address.state}
                          onChange={formik.handleChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Mã bưu điện"
                          name="address.postalCode"
                          value={formik.values.address.postalCode}
                          onChange={formik.handleChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Quốc gia"
                          name="address.country"
                          value={formik.values.address.country}
                          onChange={formik.handleChange}
                          margin="normal"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              <Grid item xs={12} md={6}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <ContactPhone sx={{ mr: 1 }} />
                    <Typography>Thông tin liên hệ</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      label="Điện thoại bàn"
                      name="contact.phone"
                      value={formik.values.contact.phone}
                      onChange={formik.handleChange}
                      error={formik.touched.contact?.phone && !!formik.errors.contact?.phone}
                      helperText={formik.touched.contact?.phone && formik.errors.contact?.phone}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Di động *"
                      name="contact.mobile"
                      value={formik.values.contact.mobile}
                      onChange={formik.handleChange}
                      error={formik.touched.contact?.mobile && !!formik.errors.contact?.mobile}
                      helperText={formik.touched.contact?.mobile && formik.errors.contact?.mobile}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      name="contact.email"
                      value={formik.values.contact.email}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Website"
                      name="contact.website"
                      value={formik.values.contact.website}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Person sx={{ mr: 1 }} />
                    <Typography>Người liên hệ chính</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      label="Họ tên"
                      name="primaryContactPerson.name"
                      value={formik.values.primaryContactPerson.name}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Chức vụ"
                      name="primaryContactPerson.position"
                      value={formik.values.primaryContactPerson.position}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Số điện thoại"
                      name="primaryContactPerson.phone"
                      value={formik.values.primaryContactPerson.phone}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      name="primaryContactPerson.email"
                      value={formik.values.primaryContactPerson.email}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <AccountBalance sx={{ mr: 1 }} />
                    <Typography>Thông tin ngân hàng</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      label="Tên tài khoản"
                      name="bankDetails.accountName"
                      value={formik.values.bankDetails.accountName}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Số tài khoản"
                      name="bankDetails.accountNumber"
                      value={formik.values.bankDetails.accountNumber}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Tên ngân hàng"
                      name="bankDetails.bankName"
                      value={formik.values.bankDetails.bankName}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Chi nhánh"
                      name="bankDetails.branch"
                      value={formik.values.bankDetails.branch}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Mã SWIFT"
                      name="bankDetails.swiftCode"
                      value={formik.values.bankDetails.swiftCode}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>

              <Grid item xs={12}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Payment sx={{ mr: 1 }} />
                    <Typography>Sản phẩm cung cấp</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box mb={2}>
                      <ProductSearch 
                        products={products}
                        onSelect={addProductToSupplier}
                        excludeSelected={formik.values.suppliedProducts.map(sp => sp.product._id)}
                      />
                    </Box>

                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Sản phẩm</TableCell>
                          <TableCell>Giá nhập</TableCell>
                          <TableCell>Số lượng tối thiểu</TableCell>
                          <TableCell>Thời gian giao hàng</TableCell>
                          <TableCell>Chính</TableCell>
                          <TableCell>Thao tác</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formik.values.suppliedProducts.map((sp, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {sp.product?.name || 'Đang tải...'}
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                name={`suppliedProducts[${index}].importPrice`}
                                value={sp.importPrice}
                                onChange={formik.handleChange}
                                size="small"
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">₫</InputAdornment>
                                  ),
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                name={`suppliedProducts[${index}].minOrderQuantity`}
                                value={sp.minOrderQuantity}
                                onChange={formik.handleChange}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                name={`suppliedProducts[${index}].leadTime`}
                                value={sp.leadTime}
                                onChange={formik.handleChange}
                                size="small"
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">ngày</InputAdornment>
                                  ),
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                name={`suppliedProducts[${index}].isPrimary`}
                                checked={sp.isPrimary}
                                onChange={formik.handleChange}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton onClick={() => removeProductFromSupplier(index)}>
                                <Close fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Hủy bỏ</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              disabled={isSubmitting} // Vô hiệu hóa nút khi đang xử lý
            >
              {isSubmitting ? 'Đang xử lý...' : (editMode ? 'Cập nhật' : 'Tạo mới')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc chắn muốn xóa nhà cung cấp này?</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Hành động này không thể hoàn tác!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
          >
            Hủy bỏ
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error"
            variant="contained"
          >
            Xác nhận xóa
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SupplierPage;