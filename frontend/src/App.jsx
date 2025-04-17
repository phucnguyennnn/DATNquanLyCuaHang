import React from "react";
import { Box, Typography } from "@mui/material";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import SalesPage from "./pages/SalesPage";

function App() {
  const isAuthenticated = !!localStorage.getItem("authToken");
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/homepage" /> : <LoginPage />
          }
        />
        <Route
          path="/homepage/*"
          element={isAuthenticated ? <HomePage /> : <Navigate to="/" />}
        />
        <Route path="/sales" element={<SalesPage />} />
      </Routes>
    </>
  );
}

export default App;
