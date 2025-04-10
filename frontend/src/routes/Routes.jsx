import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import App from "../App";
import Dashboard from "../pages/Dashboard";
import Page404 from "../pages/Notfound404";
import GoodReceipt from "../pages/GoodReceipt";
import AddToInventoy from "../pages/AddToInventory";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";
import Supplier from "../pages/Supplier";
import RegisterPage from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import User from "../pages/User";
import ProductManager from "../pages/ProductManager";
import ProductsPage from "../pages/ProductsPage";
const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    const checkLogin = () => {
      const authToken = localStorage.getItem("authToken");
      setIsLoggedIn(!!authToken);
    };
    checkLogin();
  }, []);

  return isLoggedIn;
};

const AppRouter = () => {
  const isLoggedIn = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="*" element={<App />} />
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/ " /> : <App />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/homepage/*" element={<HomePage />} />
        <Route path="/products_manager" element={<ProductManager />} />
        <Route path="/products_page" element={<ProductsPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/supplier" element={<Supplier />} />
        <Route path="/users" element={<User />} />
        <Route path="/inventory/purchase-order/*" element={<Dashboard />} />
        <Route path="/inventory/receipt/*" element={<GoodReceipt />} />
        <Route path="/inventory/add-shipment" element={<AddToInventoy />} />
       
     
        {/* <Route path="/dashboard/*" element={isLoggedIn ? <Dashboard/> : <Navigate to="/" />} /> */}
        <Route path="*" element={<Page404 />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
