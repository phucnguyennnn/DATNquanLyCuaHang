import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';

const ListUsers = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'employee', // Mặc định là employee
  });
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    setNewEmployee({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      role: 'employee',
    });
    setCreateError('');
    setCreateSuccess(false);
  };

  const handleCreateEmployee = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await axios.post(
        'http://localhost:8000/api/auth/create-employee',
        newEmployee,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setEmployees(prevEmployees => [...prevEmployees, response.data]); // Thêm nhân viên mới vào danh sách
      setCreateSuccess(true);
      setCreateError('');
      handleCloseCreateDialog();
      fetchEmployees(); // Tải lại danh sách nhân viên sau khi tạo thành công
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Lỗi khi tạo nhân viên');
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await axios.get('http://localhost:8000/api/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { role: 'employee' }, // Lọc từ backend
      });
      setEmployees(response.data);
    } catch (err) {
      setError('Không thể tải danh sách nhân viên');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="h6" color="error" align="center" mt={4}>
        {error}
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Danh Sách Nhân Viên
        </Typography>
        <Button variant="contained" color="primary" onClick={handleOpenCreateDialog}>
          Tạo Nhân Viên
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>User name</TableCell>
              <TableCell>Họ và tên</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Vai trò</TableCell>
              <TableCell>Ngày Tạo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee._id}>
                <TableCell>{employee._id}</TableCell>
                <TableCell>{employee.username}</TableCell>
                <TableCell>{employee.fullName}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.phone}</TableCell>
                <TableCell>{employee.role}</TableCell>
                <TableCell>{new Date(employee.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog}>
        <DialogTitle>Tạo Nhân Viên Mới</DialogTitle>
        <DialogContent>
          {createError && <Alert severity="error">{createError}</Alert>}
          {createSuccess && <Alert severity="success">Tạo nhân viên thành công!</Alert>}
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            variant="outlined"
            value={newEmployee.username}
            onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Họ và tên"
            fullWidth
            variant="outlined"
            value={newEmployee.fullName}
            onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={newEmployee.email}
            onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Số điện thoại"
            fullWidth
            variant="outlined"
            value={newEmployee.phone}
            onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Hủy</Button>
          <Button onClick={handleCreateEmployee} color="primary">
            Tạo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ListUsers;