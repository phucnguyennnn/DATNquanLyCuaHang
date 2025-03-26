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
import ListUser from "../pages/ListUser";
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
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/goodreceipt/*" element={<GoodReceipt />} />
        <Route path="/addtoinventory/*" element={<AddToInventoy />} />
        <Route path="/homepage/*" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/listuser" element={<ListUser />} />

        {/* <Route path="/dashboard/*" element={isLoggedIn ? <Dashboard/> : <Navigate to="/" />} /> */}
        <Route path="*" element={<Page404 />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
