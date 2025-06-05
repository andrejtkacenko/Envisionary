import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../services/api";
import axios, { AxiosError } from "axios";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/auth/check", {
          withCredentials: true,
        });
        setIsAuthenticated(response.data.isAuthenticated);
      } catch (error: unknown) {
        if (error instanceof AxiosError) {
          console.error("Auth check failed:", error.response?.data || error.message);
        } else {
          console.error("Auth check failed:", error);
        }
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      navigate("/login", { replace: true });
    } catch (error: unknown) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.detail || error.message
          : "Unknown error";
      console.error("Logout failed:", message);
      alert(`Failed to logout: ${message}`);
    }
  };

  if (isAuthenticated === null) {
    return null; // Prevent flash of content
  }

  return (
    <header className="bg-gray-800 text-white p-4 fixed top-0 w-full z-10 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/dashboard" className="text-xl font-bold">
          Envisionary
        </Link>
        <nav className="space-x-4 flex items-center">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="hover:text-gray-300">
                Dashboard
              </Link>
              <Link to="/notes" className="hover:text-gray-300">
                Notes
              </Link>
              <Link to="/projects" className="hover:text-gray-300">
                Projects
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded focus:outline-none"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-gray-300">
                Login
              </Link>
              <Link to="/register" className="hover:text-gray-300">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;