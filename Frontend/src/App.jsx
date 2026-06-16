// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Home from '../pages/Home';
import UploadPage from '../pages/UploadPage';
import ShopLogin from '../pages/ShopLogin';
import ShopRegister from '../pages/ShopRegister';
import SetupShop from '../pages/SetupShop';
import ShopDashboard from '../pages/ShopDashboard';
import AdminLogin from '../pages/AdminLogin';
import AdminDashboard from '../pages/AdminDashboard';
import Contact from '../pages/Contact';
import Privacy from '../pages/Privacy';
import Terms from '../pages/Terms';
import Refund from '../pages/Refund';

/**
 * Guard wrapper for pages requiring valid shopowner credentials.
 * Redirects unauthenticated users directly to `/login`.
 * 
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Guarded component
 * @returns {React.ReactElement} Guarded component or Navigate redirect
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const shopData = localStorage.getItem('shop');
  
  if (!token || !shopData) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

/**
 * Guard wrapper for entry-only pages (Login / Register).
 * Automatically redirects already authenticated shopowners to their dashboard.
 * 
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Guest-only component
 * @returns {React.ReactElement} Guest-only component or Navigate redirect
 */
function PublicRoute({ children }) {
  const token = localStorage.getItem('token');
  const shopData = localStorage.getItem('shop');
  
  if (token && shopData) {
    try {
      const parsed = JSON.parse(shopData);
      if (!parsed.onboarded || parsed.status !== 'approved') {
        return <Navigate to="/setup-shop" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    } catch (e) {
      // Fallback in case of parse errors
      return children;
    }
  }
  
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/upload/:shopId" element={<UploadPage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refund" element={<Refund />} />

        {/* Shop Owner Routes */}
        <Route path="/register" element={<PublicRoute><ShopRegister /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><ShopLogin /></PublicRoute>} />
        <Route path="/setup-shop" element={<ProtectedRoute><SetupShop /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><ShopDashboard /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>

      <Toaster position="top-center" />
    </Router>
  );
}

export default App;