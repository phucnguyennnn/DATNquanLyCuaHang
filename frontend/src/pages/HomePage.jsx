import React from "react";
import { Box, Container, Typography, CssBaseline } from "@mui/material";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 2, p: 3 }}>
        {/* Navbar */}
        <Navbar onLogout={handleLogout} />

        {/* Nội dung chính */}
        <Container>
          <Typography variant="h4" gutterBottom>
            Welcome to the Admin Dashboardssss
          </Typography>
          <Typography variant="body1">
            Manage your store, view reports, and adjust settings here.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
