import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from '../helpers/api';

const AuthProtected = (props) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      try {
        await axios.get('/user'); // Assumes baseURL is /api
        setIsAuthenticated(true);
      } catch (err) {
console.log(err);
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('authUser');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) return <div></div>;
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return <>{props.children}</>;
};

export default AuthProtected;
