import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const OAuth2SuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

if (token) {
  localStorage.setItem('token', token);
  navigate('/me/boards', { replace: true });
} else {
  navigate('/auth', { replace: true });
}
  }, [location.search, navigate]);

  return <div>Авторизация через Яндекс выполнена, перенаправление...</div>;
};