import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Collapse,
  CircularProgress
} from '@mui/material';
import { Search, Add, Edit, Delete, ExpandMore, ExpandLess } from '@mui/icons-material';

const ProductManagement = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [openCategories, setOpenCategories] = useState({});
  const [formData, setFormData] = useState({ name: '', category: '', price: '', SKU: '', description: '', suppliers: [] });
  const [editMode, setEditMode] = useState(false);
  const [openSupplierDialog, setOpenSupplierDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
  });
// <<<<<<< Duong
// =======
//   const [imagePreviews, setImagePreviews] = useState([]);
//   const [selectedImages, setSelectedImages] = useState([]);
//   const token = localStorage.getItem("authToken");
// >>>>>>> main

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
// <<<<<<< Duong
//           api.get('/products'),
//           api.get('/categories'),
//           api.get('/suppliers')
//         ]);
//         setProducts(productsRes.data.data);
//         setCategories(categoriesRes.data.data);
// =======
//           axios.get("http://localhost:8000/api/products", {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           axios.get("http://localhost:8000/api/categories", {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           axios.get("http://localhost:8000/api/suppliers", {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//         ]);

//         // Log dữ liệu trả về để kiểm tra
//         console.log("Products API response:", productsRes.data);

//         // Đảm bảo dữ liệu là mảng trước khi gán
//         setProducts(Array.isArray(productsRes.data.data) ? productsRes.data.data : []);
//         setCategories(categoriesRes.data);
// >>>>>>> main
        setSuppliers(suppliersRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Fetch data error:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e) => setSearchTerm(e.target.value.toLowerCase());

  const handleOpen = () => {
    setOpen(true);
    setEditMode(false);
    setFormData({ name: '', category: '', price: '', SKU: '', description: '', suppliers: [] });
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      const method = editMode ? 'patch' : 'post';
      const url = editMode ? `/products/${formData._id}` : '/products';
      const response = await api[method](url, formData);
      
      if (editMode) {
        setProducts(products.map(p => p._id === formData._id ? response.data.data : p));
      } else {
        setProducts([...products, response.data.data]);
      }
      handleClose();
    } catch (error) {
      console.error('Save product error:', error);
    }
  };

  const handleEdit = (product) => {
    setFormData({ ...product, category: product.category._id });
    setEditMode(true);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter(p => p._id !== id));
    } catch (error) {
      console.error('Delete product error:', error);
    }
  };

  const toggleCategory = (categoryId) => {
    setOpenCategories({ ...openCategories, [categoryId]: !openCategories[categoryId] });
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm) ||
    p.SKU.toLowerCase().includes(searchTerm) ||
    p.category.name.toLowerCase().includes(searchTerm)
  );

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          variant="outlined"
          placeholder="Search products..."
          InputProps={{ startAdornment: <Search /> }}
          onChange={handleSearch}
          sx={{ width: 400 }}
        />
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>Add Product</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#3f51b5', color: 'white' }}>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Suppliers</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
// <<<<<<< Duong
//             {categories.map(category => (
//               <React.Fragment key={category._id}>
//                 <TableRow sx={{ backgroundColor: '#e8eaf6', cursor: 'pointer' }} onClick={() => toggleCategory(category._id)}>
//                   <TableCell colSpan={6}>
//                     <Box display="flex" alignItems="center">
//                       {openCategories[category._id] ? <ExpandLess /> : <ExpandMore />}
//                       <Typography variant="h6">{category.name}</Typography>
//                     </Box>
//                   </TableCell>
//                 </TableRow>
//                 <TableRow>
//                   <TableCell colSpan={6} sx={{ p: 0 }}>
//                     <Collapse in={openCategories[category._id]}>
//                       <Table>
//                         <TableBody>
//                           {filteredProducts.filter(p => p.category._id === category._id).map(product => (
//                             <TableRow key={product._id}>
//                               <TableCell>{product.name}</TableCell>
//                               <TableCell>{product.SKU}</TableCell>
//                               <TableCell>${product.price}</TableCell>
//                               <TableCell>{product.category.name}</TableCell>
//                               <TableCell>
//                                 {product.suppliers.map(s => s.supplier.name).join(', ')}
//                               </TableCell>
//                               <TableCell>
//                                 <IconButton onClick={() => handleEdit(product)}><Edit color="primary" /></IconButton>
//                                 <IconButton onClick={() => handleDelete(product._id)}><Delete color="error" /></IconButton>
//                               </TableCell>
//                             </TableRow>
//                           ))}
//                         </TableBody>
//                       </Table>
//                     </Collapse>
//                   </TableCell>
//                 </TableRow>
//               </React.Fragment>
// =======
//             {Array.isArray(products) && products.map((product, index) => (
//               <TableRow key={product._id}>
//                 <TableCell>{index + 1}</TableCell>
//                 <TableCell>{product.category_name}</TableCell>
//                 <TableCell>
//                   {product.category?.category_name || "N/A"}
//                 </TableCell>
//                 <TableCell>{product.price.toLocaleString()} VND</TableCell>
//                 <TableCell>{product.SKU}</TableCell>
//                 <TableCell>{product.unit}</TableCell>
//                 <TableCell>
//                   <Chip
//                     label={
//                       product.status === "active"
//                         ? "Hoạt động"
//                         : "Không hoạt động"
//                     }
//                     color={product.status === "active" ? "success" : "error"}
//                     size="small"
//                   />
//                 </TableCell>
//                 <TableCell>
//                   <IconButton onClick={() => handleOpenEditDialog(product)}>
//                     <EditIcon color="primary" />
//                   </IconButton>
//                   <IconButton onClick={() => handleDeleteProduct(product._id)}>
//                     <DeleteIcon color="error" />
//                   </IconButton>
//                 </TableCell>
//               </TableRow>
// >>>>>>> main
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="normal" label="Product Name" name="name" 
            value={formData.name} onChange={handleChange} />
          <TextField select fullWidth margin="normal" label="Category" name="category" 
            value={formData.category} onChange={handleChange}>
            {categories.map(category => (
              <MenuItem key={category._id} value={category._id}>{category.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="normal" label="Price" name="price" type="number" 
            value={formData.price} onChange={handleChange} />
          <TextField fullWidth margin="normal" label="SKU" name="SKU" 
            value={formData.SKU} onChange={handleChange} />
          <TextField fullWidth margin="normal" label="Description" name="description" multiline rows={3} 
            value={formData.description} onChange={handleChange} />
          <Box mt={2}>
            <Button variant="outlined" onClick={() => setOpenSupplierDialog(true)}>Add Suppliers</Button>
            {formData.suppliers.map(supplier => (
              <Box key={supplier.supplier._id} mt={1}>
                {supplier.supplier.name} - ${supplier.importPrice}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} color="primary" variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <SupplierDialog 
        open={openSupplierDialog}
        onClose={() => setOpenSupplierDialog(false)}
        suppliers={suppliers}
        selectedSuppliers={formData.suppliers}
        onSelect={selected => setFormData({ ...formData, suppliers: selected })}
      />
    </Box>
  );
};

const SupplierDialog = ({ open, onClose, suppliers, selectedSuppliers, onSelect }) => {
  const [selected, setSelected] = useState(selectedSuppliers);
  const [prices, setPrices] = useState({});

  const handleSelect = (supplier) => {
    const exists = selected.find(s => s.supplier._id === supplier._id);
    if (exists) {
      setSelected(selected.filter(s => s.supplier._id !== supplier._id));
    } else {
      setSelected([...selected, { supplier, importPrice: 0 }]);
    }
  };

  const handlePriceChange = (id, price) => setPrices({ ...prices, [id]: price });

  const handleSave = () => {
    const updated = selected.map(s => ({
      supplier: s.supplier,
      importPrice: prices[s.supplier._id] || s.importPrice
    }));
    onSelect(updated);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Suppliers</DialogTitle>
      <DialogContent>
        {suppliers.map(supplier => (
          <Box key={supplier._id} display="flex" alignItems="center" mb={1}>
            <input 
              type="checkbox" 
              checked={!!selected.find(s => s.supplier._id === supplier._id)} 
              onChange={() => handleSelect(supplier)} 
            />
            <Box ml={2} flexGrow={1}>{supplier.name}</Box>
            {selected.find(s => s.supplier._id === supplier._id) && (
              <TextField
                type="number"
                label="Import Price"
                value={prices[supplier._id] || ''}
                onChange={e => handlePriceChange(supplier._id, e.target.value)}
                sx={{ width: 120 }}
              />
            )}
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductManagement;