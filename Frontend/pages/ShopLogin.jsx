// pages/ShopLogin.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '744386797332-mevp3fbv1l2c9pooi5sf52tgjg1t4b9m.apps.googleusercontent.com';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ShopLogin() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef(null);

  /* ── Load Google GSI script + render button ── */
  useEffect(() => {
    const scriptId = 'google-gsi-script';
    if (document.getElementById(scriptId)) {
      initGoogleBtn();
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogleBtn;
    document.body.appendChild(script);
  }, []);

  function initGoogleBtn() {
    if (!window.google || !googleBtnRef.current) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline',
      size: 'large',
      width: googleBtnRef.current.offsetWidth || 340,
      text: 'continue_with',
      shape: 'rectangular',
    });
  }

  /* ── Google credential callback ── */
  async function handleGoogleCredential({ credential }) {
    setGoogleLoading(true);
    try {
      const res = await axios.post(`${API}/api/shops/google-auth`, { credential });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('shop', JSON.stringify(res.data.shop));

      if (!res.data.shop.onboarded) {
        toast.success('Successfully authenticated! Please set up your print shop.');
        navigate('/setup-shop');
      } else if (res.data.shop.status !== 'approved') {
        toast('Your shop details are submitted and pending admin approval.', { icon: '⏳' });
        navigate('/setup-shop');
      } else {
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="login-page" style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 480px) {
          .login-page {
            padding: 16px !important;
          }
          .login-card {
            padding: 32px 20px !important;
            border-radius: 16px !important;
          }
          .login-title {
            font-size: 22px !important;
          }
        }
      `}</style>
      <div className="login-card" style={styles.card}>
        {/* Close Button (x) */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            right: '20px',
            top: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            color: '#94a3b8',
            fontWeight: 'bold',
            lineHeight: 1,
            padding: '4px',
          }}
          title="Close"
        >
          &times;
        </button>

        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoBox}>P</div>
          <h1 style={styles.logoText}>PrintFastX</h1>
        </div>

        <h2 className="login-title" style={styles.title}>Welcome to PrintFastX</h2>
        <p style={styles.subtitle}>Log in or register your shop using Google Account</p>

        {/* ── Google Sign-In Button ── */}
        <div style={styles.googleWrapper}>
          {googleLoading ? (
            <div style={styles.googleLoadingBtn}>
              <span style={styles.spinner} />
              Authenticating…
            </div>
          ) : (
            <div
              ref={googleBtnRef}
              id="google-signin-btn"
              style={{ width: '100%', minHeight: '44px' }}
            />
          )}
        </div>

        <p style={styles.footerText}>
          Secure authentication powered by Google. By signing in, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}

/* ── Inline styles ── */
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
    padding: '44px 36px',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center',
    position: 'relative',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  logoBox: {
    width: 44,
    height: 44,
    background: '#0d9488',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 900,
    fontSize: '22px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 900,
    color: '#021a36',
    margin: 0,
    letterSpacing: '-1px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#021a36',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '32px',
    lineHeight: 1.5,
  },
  googleWrapper: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'center',
  },
  googleLoadingBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#475569',
    background: '#fff',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #e2e8f0',
    borderTopColor: '#0d9488',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: 1.6,
    marginTop: '16px',
  },
};