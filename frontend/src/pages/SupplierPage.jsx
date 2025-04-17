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
  Autocomplete,
  MenuItem,
  Checkbox,
  useMediaQuery 
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
  Star
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import axios from 'axios';

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
      product: yup.string().required('Bắt buộc chọn sản phẩm'),
      importPrice: yup.number().min(0, 'Không được âm').required('Bắt buộc nhập'),
      minOrderQuantity: yup.number().min(1, 'Tối thiểu 1'),
      leadTime: yup.number().min(0, 'Không được âm'),
      unit: yup.string().required('Bắt buộc chọn đơn vị'),
      conversionRate: yup.number().min(1, 'Tối thiểu 1').required('Bắt buộc nhập'),
      isPrimary: yup.boolean()
    })
  )
});

const SupplierPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchSuppliers();
    axios.get(PRODUCTS_API, {
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
    }).then(({ data }) => setProducts(data.data));
  }, [searchTerm]);

  const fetchSuppliers = async () => {
    try {
      const { data } = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        params: { search: searchTerm }
      });
      setSuppliers(data);
    } catch (error) {
      showSnackbar('Lỗi khi tải danh sách nhà cung cấp', 'error');
    }
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      company: '',
      taxId: '',
      address: { street: '', city: '', state: '', postalCode: '', country: '' },
      contact: { phone: '', mobile: '', email: '', website: '' },
      primaryContactPerson: { name: '', position: '', phone: '', email: '' },
      paymentTerms: 30,
      bankDetails: { accountName: '', accountNumber: '', bankName: '', branch: '', swiftCode: '' },
      rating: 0,
      notes: '',
      isActive: true,
      suppliedProducts: []
    },
    validationSchema: SupplierSchema,
    onSubmit: async (values) => {
      try {
        const token = localStorage.getItem("authToken");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        if (editMode) {
          await axios.put(`${API_URL}/${selectedSupplier._id}`, values, config);
        } else {
          await axios.post(API_URL, values, config);
        }

        fetchSuppliers();
        handleCloseDialog();
        showSnackbar(`Nhà cung cấp ${editMode ? 'cập nhật' : 'tạo mới'} thành công`);
      } catch (error) {
        showSnackbar(error.response?.data?.message || 'Thao tác thất bại', 'error');
      }
    }
  });

  const handleOpenCreate = () => {
    setEditMode(false);
    formik.resetForm();
    setOpenDialog(true);
  };

  const handleOpenEdit = (supplier) => {
    setEditMode(true);
    setSelectedSupplier(supplier);
    formik.setValues({
      ...supplier,
      suppliedProducts: supplier.suppliedProducts.map(sp => ({
        ...sp,
        product: sp.product._id ? sp.product._id : sp.product
      }))
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
      });
      fetchSuppliers();
      showSnackbar('Đã xóa nhà cung cấp thành công');
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Xóa thất bại', 'error');
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
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        gap: 2, 
        mb: 3 
      }}>
        <TextField
          label="Tìm kiếm nhà cung cấp"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ 
            flex: { xs: '1 1 auto', sm: '0 1 300px' },
            order: { xs: 2, sm: 1 } 
          }}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenCreate}
          sx={{ 
            order: { xs: 1, sm: 2 },
            width: { xs: '100%', sm: 'auto' } 
          }}
        >
          Thêm mới
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Mã số thuế</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Số sản phẩm</TableCell>
              <TableCell>Liên hệ</TableCell>
              <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Người liên hệ</TableCell>
              <TableCell>Điều khoản TT</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Đánh giá</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' }
                }}>
                  <Typography fontWeight="bold">{supplier.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 1 } }}>
                    {supplier.company}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{supplier.taxId}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  <Chip 
                    label={supplier.suppliedProducts?.length || 0}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}>
                    <div>{supplier.contact?.email}</div>
                    <div>{supplier.contact?.phone}</div>
                    <div>{supplier.contact?.mobile}</div>
                  </Box>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                  {supplier.primaryContactPerson && (
                    <Box>
                      <div>{supplier.primaryContactPerson.name}</div>
                      <div>{supplier.primaryContactPerson.position}</div>
                      <div>{supplier.primaryContactPerson.phone}</div>
                    </Box>
                  )}
                </TableCell>
                <TableCell>{supplier.paymentTerms} ngày</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  <Box display="flex" alignItems="center">
                    <Star fontSize="small" color="warning" />
                    <Typography ml={0.5}>{supplier.rating?.toFixed(1)}</Typography>
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
                  <Box sx={{ display: 'flex', gap: { xs: 0, sm: 1 } }}>
                    <Tooltip title="Sửa">
                      <IconButton onClick={() => handleOpenEdit(supplier)} size="small">
                        <Edit fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa">
                      <IconButton onClick={() => handleDelete(supplier._id)} size="small">
                        <Delete fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="lg" 
        fullWidth
        fullScreen={windowWidth < 600}
      >
        <DialogTitle sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
          {editMode ? 'Cập nhật nhà cung cấp' : 'Thêm nhà cung cấp mới'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent dividers sx={{ pt: { xs: 2, sm: 3 } }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Accordion defaultExpanded sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Business sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                    <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Thông tin cơ bản</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                    <TextField
                      fullWidth
                      label="Tên nhà cung cấp *"
                      name="name"
                      size="small"
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
                      size="small"
                      value={formik.values.company}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Mã số thuế"
                      name="taxId"
                      size="small"
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
                      size="small"
                      value={formik.values.description}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <ContactPhone sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                    <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Địa chỉ</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Đường/Số nhà"
                          name="address.street"
                          size="small"
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
                          size="small"
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
                          size="small"
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
                          size="small"
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
                          size="small"
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
                <Accordion defaultExpanded sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <ContactPhone sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                    <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Thông tin liên hệ</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                    <TextField
                      fullWidth
                      label="Điện thoại"
                      name="contact.phone"
                      size="small"
                      value={formik.values.contact.phone}
                      onChange={formik.handleChange}
                      error={formik.touched.contact?.phone && !!formik.errors.contact?.phone}
                      helperText={formik.touched.contact?.phone && formik.errors.contact?.phone}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Di động"
                      name="contact.mobile"
                      size="small"
                      value={formik.values.contact.mobile}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      name="contact.email"
                      size="small"
                      value={formik.values.contact.email}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Website"
                      name="contact.website"
                      size="small"
                      value={formik.values.contact.website}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Person sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                    <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Người liên hệ chính</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                    <TextField
                      fullWidth
                      label="Họ tên"
                      name="primaryContactPerson.name"
                      size="small"
                      value={formik.values.primaryContactPerson.name}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Chức vụ"
                      name="primaryContactPerson.position"
                      size="small"
                      value={formik.values.primaryContactPerson.position}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Số điện thoại"
                      name="primaryContactPerson.phone"
                      size="small"
                      value={formik.values.primaryContactPerson.phone}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      name="primaryContactPerson.email"
                      size="small"
                      value={formik.values.primaryContactPerson.email}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <AccountBalance sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                    <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Thông tin ngân hàng</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                    <TextField
                      fullWidth
                      label="Tên tài khoản"
                      name="bankDetails.accountName"
                      size="small"
                      value={formik.values.bankDetails.accountName}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Số tài khoản"
                      name="bankDetails.accountNumber"
                      size="small"
                      value={formik.values.bankDetails.accountNumber}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Tên ngân hàng"
                      name="bankDetails.bankName"
                      size="small"
                      value={formik.values.bankDetails.bankName}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Chi nhánh"
                      name="bankDetails.branch"
                      size="small"
                      value={formik.values.bankDetails.branch}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Mã SWIFT"
                      name="bankDetails.swiftCode"
                      size="small"
                      value={formik.values.bankDetails.swiftCode}
                      onChange={formik.handleChange}
                      margin="normal"
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>

              <Grid item xs={12}>
                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Payment sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                    <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Thông tin bổ sung</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Điều khoản thanh toán (ngày) *"
                          name="paymentTerms"
                          type="number"
                          size="small"
                          value={formik.values.paymentTerms}
                          onChange={formik.handleChange}
                          error={formik.touched.paymentTerms && !!formik.errors.paymentTerms}
                          helperText={formik.touched.paymentTerms && formik.errors.paymentTerms}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Đánh giá"
                          name="rating"
                          type="number"
                          size="small"
                          inputProps={{ min: 0, max: 5, step: 0.1 }}
                          value={formik.values.rating}
                          onChange={formik.handleChange}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Star color="warning" fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              name="isActive"
                              checked={formik.values.isActive}
                              onChange={formik.handleChange}
                              color="primary"
                              size="small"
                            />
                          }
                          label="Đang hoạt động"
                          labelPlacement="start"
                          sx={{ justifyContent: 'space-between', ml: 0 }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Ghi chú"
                          name="notes"
                          multiline
                          rows={4}
                          size="small"
                          value={formik.values.notes}
                          onChange={formik.handleChange}
                          margin="normal"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              <Grid item xs={12}>
                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Star sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                    <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Sản phẩm cung cấp</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        size="small"
                        onClick={() => {
                          formik.setFieldValue('suppliedProducts', [
                            ...formik.values.suppliedProducts,
                            {
                              product: '',
                              importPrice: 0,
                              minOrderQuantity: 1,
                              leadTime: 0,
                              unit: 'cái',
                              conversionRate: 1,
                              isPrimary: false
                            }
                          ]);
                        }}
                      >
                        Thêm sản phẩm
                      </Button>
                    </Box>

                    {formik.values.suppliedProducts.map((item, index) => (
                      <Paper key={index} sx={{ p: 1, mb: 2, position: 'relative' }}>
                        <Grid container spacing={1}>
                          <Grid item xs={12} md={4}>
                            <Autocomplete
                              options={products}
                              getOptionLabel={(option) => option.name}
                              value={products.find(p => p._id === item.product) || null}
                              onChange={(e, value) => {
                                formik.setFieldValue(`suppliedProducts[${index}].product`, value?._id || '');
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Chọn sản phẩm *"
                                  size="small"
                                  error={formik.touched.suppliedProducts?.[index]?.product && 
                                         !!formik.errors.suppliedProducts?.[index]?.product}
                                  helperText={formik.touched.suppliedProducts?.[index]?.product && 
                                            formik.errors.suppliedProducts?.[index]?.product}
                                />
                              )}
                            />
                          </Grid>

                          <Grid item xs={6} sm={4} md={2}>
                            <TextField
                              fullWidth
                              label="Giá nhập *"
                              type="number"
                              name={`suppliedProducts[${index}].importPrice`}
                              size="small"
                              value={item.importPrice}
                              onChange={formik.handleChange}
                              error={formik.touched.suppliedProducts?.[index]?.importPrice && 
                                    !!formik.errors.suppliedProducts?.[index]?.importPrice}
                              helperText={formik.touched.suppliedProducts?.[index]?.importPrice && 
                                       formik.errors.suppliedProducts?.[index]?.importPrice}
                            />
                          </Grid>

                          <Grid item xs={6} sm={4} md={2}>
                            <TextField
                              fullWidth
                              label="Số lượng tối thiểu *"
                              type="number"
                              name={`suppliedProducts[${index}].minOrderQuantity`}
                              size="small"
                              value={item.minOrderQuantity}
                              onChange={formik.handleChange}
                              inputProps={{ min: 1 }}
                            />
                          </Grid>

                          <Grid item xs={6} sm={4} md={2}>
                            <TextField
                              fullWidth
                              label="Thời gian giao hàng"
                              type="number"
                              name={`suppliedProducts[${index}].leadTime`}
                              size="small"
                              value={item.leadTime}
                              onChange={formik.handleChange}
                              InputProps={{ 
                                endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
                              }}
                            />
                          </Grid>

                          <Grid item xs={6} sm={4} md={2}>
                            <TextField
                              select
                              fullWidth
                              label="Đơn vị *"
                              name={`suppliedProducts[${index}].unit`}
                              size="small"
                              value={item.unit}
                              onChange={formik.handleChange}
                            >
                              {['thùng', 'bao', 'chai', 'lọ', 'hộp', 'gói', 'cái', 'kg', 'liter'].map(unit => (
                                <MenuItem key={unit} value={unit} sx={{ fontSize: '0.875rem' }}>
                                  {unit}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>

                          <Grid item xs={6} sm={4} md={2}>
                            <TextField
                              fullWidth
                              label="Tỷ lệ quy đổi *"
                              type="number"
                              name={`suppliedProducts[${index}].conversionRate`}
                              size="small"
                              value={item.conversionRate}
                              onChange={formik.handleChange}
                              inputProps={{ min: 1 }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6} md={2}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  name={`suppliedProducts[${index}].isPrimary`}
                                  checked={item.isPrimary}
                                  onChange={formik.handleChange}
                                  size="small"
                                />
                              }
                              label="Nhà cung cấp chính"
                              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                            />
                          </Grid>

                          <Box sx={{ 
                            position: { xs: 'absolute', sm: 'static' }, 
                            top: 4, 
                            right: 4 
                          }}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                const newProducts = [...formik.values.suppliedProducts];
                                newProducts.splice(index, 1);
                                formik.setFieldValue('suppliedProducts', newProducts);
                              }}
                            >
                              <Delete fontSize="small" color="error" />
                            </IconButton>
                          </Box>
                        </Grid>
                      </Paper>
                    ))}
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog} size={isMobile ? 'small' : 'medium'}>Hủy bỏ</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              size={isMobile ? 'small' : 'medium'}
            >
              {editMode ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogActions>
        </form>
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