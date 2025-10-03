import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../helpers/api';

const PrivateRoute = ({ children }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        await api.get('/user');
        setIsAuthenticated(true);
      } catch (err) {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('authUser');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
    // eslint-disable-next-line
  }, []);

  if (loading) return <div>Loading...</div>;
  return isAuthenticated ? children : null;
};

export default PrivateRoute;
