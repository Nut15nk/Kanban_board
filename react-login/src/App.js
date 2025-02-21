import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import "./App.css";
import CreateBoard from "./CreateBoard";
import Login from "./Login";
import Register from "./Register";
import ResetPassword from "./ResetPassword";
import GetBoards from "./Getboards";
import Home from "./Home";
import Notification from "./Notification";

const NotFound = () => <h2>404 - Page Not Found</h2>;

const ProtectedRoute = ({ element, token }) => {
  return token ? element : <Navigate to="/login" replace />;
};

const AppContent = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const handleCloseNotification = async (notificationId) => {
    try {
      await fetch(`http://localhost:3333/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchNotifications = async () => {
      if (!token) return;
      try {
        const response = await fetch("http://localhost:3333/api/notifications", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.notifications) {
          console.log("Fetched notifications:", data.notifications);
          setNotifications(data.notifications.filter((n) => n.status === "unread"));
        } else {
          setNotifications([]);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, [isLoggedIn, token]);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsLoggedIn(true);
    navigate("/home");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setIsLoggedIn(false);
    setNotifications([]);
    navigate("/login");
  };

  const toggleNotifications = async () => {
    if (!showNotifications) {
      const response = await fetch("http://localhost:3333/api/notifications", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await response.json();
      setNotifications(data.notifications.filter((n) => n.status === "unread"));
    }
    setShowNotifications(!showNotifications);
  };

  // เพิ่มฟังก์ชัน handleOutsideClick
  const handleOutsideClick = (e) => {
    // ตรวจสอบว่าคลิกนอก notification-container หรือ notification-overlay
    if (
      e.target.className === "notification-container" ||
      e.target.className.includes("notification-item") ||
      e.target.className.includes("close-button")
    ) {
      return;
    }
    setShowNotifications(false);
  };

  return (
    <div className="app-container" onClick={handleOutsideClick}>
      <h1 className="app-title">Kanban App</h1>
      <div className="link-container">
        {!isLoggedIn ? (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")}>
              Login
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? "active" : "")}>
              Register
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/create-board" className={({ isActive }) => (isActive ? "active" : "")}>
              Create Board
            </NavLink>
            <NavLink to="/boards" className={({ isActive }) => (isActive ? "active" : "")}>
              View Boards
            </NavLink>
            <NavLink to="/home" className={({ isActive }) => (isActive ? "active" : "")}>
              Home
            </NavLink>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
            <button onClick={toggleNotifications} className="notification-button">
              Notifications ({notifications.length})
            </button>
          </>
        )}
      </div>
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home token={token} />} />
        <Route path="/create-board" element={<ProtectedRoute element={<CreateBoard />} token={token} />} />
        <Route path="/boards" element={<ProtectedRoute element={<GetBoards token={token} />} token={token} />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {isLoggedIn && showNotifications && (
        <div className="notification-overlay">
          <Notification
            notifications={notifications}
            onClose={handleCloseNotification}
            onCloseModal={() => setShowNotifications(false)} // เพิ่ม prop สำหรับปุ่ม Close
          />
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;