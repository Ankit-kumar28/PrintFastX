// pages/ShopRegister.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ShopRegister() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
}