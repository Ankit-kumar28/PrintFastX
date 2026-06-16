// pages/ShopLogin.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '744386797332-mevp3fbv1l2c9pooi5sf52tgjg1t4b9m.apps.googleusercontent.com';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * ShopLogin page component.
 * Features a dynamic dual-panel split layout on desktop:
 * - Left panel: Features list highlighting key value propositions.
 * - Right panel: Google authentication trigger with premium CSS effects.
 * Includes professional JSDoc annotations and comments.
 * 
 * @returns {React.ReactElement} ShopLogin component
 */
export default function ShopLogin() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef(null);

  /* ── Load Google GSI script + render button ── */
  useEffect(() => {
    const scriptId = 'google-gsi-script';
    // If the script is already loaded, initialize the button immediately
    if (document.getElementById(scriptId)) {
      initGoogleBtn();
      return;
    }
    // Dynamically inject the Google GSI OAuth client library script
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogleBtn;
    document.body.appendChild(script);
  }, []);

  /**
   * Initializes the Google Identity Services credential dialog.
   * Renders the native secure credential button within our button wrapper.
   */
  function initGoogleBtn() {
    if (!window.google || !googleBtnRef.current) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline',
      size: 'large',
      width: googleBtnRef.current.offsetWidth || 320,
      text: 'continue_with',
      shape: 'rectangular',
    });
  }

  /**
   * Google Credential Callback.
   * Receives authorization jwt credential and submits it to backend authentication endpoints.
   * 
   * @param {object} payload - Google response parameters containing credential JWT
   */
  async function handleGoogleCredential({ credential }) {
    setGoogleLoading(true);
    try {
      const res = await axios.post(`${API}/api/shops/google-auth`, { credential });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('shop', JSON.stringify(res.data.shop));

      if (!res.data.shop.onboarded) {
        toast.success('Successfully authenticated! Please set up your print shop.');
        navigate('/setup-shop', { replace: true });
      } else if (res.data.shop.status !== 'approved') {
        toast('Your shop details are submitted and pending admin approval.', { icon: '⏳' });
        navigate('/setup-shop', { replace: true });
      } else {
        toast.success('Welcome back!');
        navigate('/dashboard', { replace: true });
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .login-card {
          display: flex;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          width: 100%;
          max-width: 880px;
          min-height: 520px;
          position: relative;
        }
        .left-panel {
          width: 50%;
          background: linear-gradient(135deg, #0f766e 0%, #042f2e 100%);
          padding: 44px;
          color: #ccfbf1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .left-panel::before {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, transparent 70%);
          top: -100px;
          left: -100px;
          pointer-events: none;
        }
        .right-panel {
          width: 50%;
          padding: 44px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #ffffff;
        }
        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          text-align: left;
        }
        .feature-icon {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .feature-text-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .feature-title {
          font-weight: 700;
          color: #ffffff;
          font-size: 15px;
          margin: 0;
        }
        .feature-desc {
          font-size: 13px;
          color: #99f6e4;
          line-height: 1.5;
          margin: 0;
        }
        @media (max-width: 768px) {
          .login-card {
            flex-direction: column;
            max-width: 440px;
            min-height: auto;
          }
          .left-panel {
            width: 100%;
            padding: 32px 24px;
          }
          .right-panel {
            width: 100%;
            padding: 36px 24px;
          }
        }
      `}</style>
      <div className="login-card">
        {/* Close Button (x) */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            right: '20px',
            top: '20px',
            background: '#f1f5f9',
            border: 'none',
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#64748b',
            fontWeight: 'bold',
            zIndex: 10,
            transition: 'background 0.2s',
          }}
          title="Go to Home"
          onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
          onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}
        >
          &times;
        </button>

        {/* Left Panel - Features Description */}
        <div className="left-panel">
          <div>
            <div style={styles.logoRowLeft}>
              <div style={styles.logoBoxLeft}>P</div>
              <h2 style={styles.logoTextLeft}>PrintFastX</h2>
            </div>
            
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '28px', lineHeight: 1.3, textAlign: 'left' }}>
              Supercharge your print shop in seconds
            </h3>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <div className="feature-text-container">
                  <h4 className="feature-title">Instant QR Queue</h4>
                  <p className="feature-desc">Customers scan codes and upload PDF files directly. No configuration delays.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🔒</div>
                <div className="feature-text-container">
                  <h4 className="feature-title">Privacy-First Experience</h4>
                  <p className="feature-desc">Stop sharing your WhatsApp number or private email. Customers get secure tokens anonymously.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <div className="feature-text-container">
                  <h4 className="feature-title">Live Control Dashboard</h4>
                  <p className="feature-desc">Manage files, calculate rates, read PDF page counts, and track daily revenue on the fly.</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#5eead4', opacity: 0.8, textAlign: 'left' }}>
            © 2026 PrintFastX Technologies. All rights reserved.
          </div>
        </div>

        {/* Right Panel - Google Authentication triggers */}
        <div className="right-panel">
          <div style={{ width: '100%', maxWidth: '320px' }}>
            <h2 className="login-title" style={styles.title}>Welcome Back </h2>
            <p style={styles.subtitle}>Sign in with your Google Account to open or manage your shop dashboard.</p>

            <div style={styles.googleWrapper}>
              {googleLoading ? (
                <div style={styles.googleLoadingBtn}>
                  <span style={styles.spinner} />
                  Authenticating...
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
              OAuth authentication is secured by Google. By proceeding, you agree to our terms & privacy guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── UI Inline Styles ── */
const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at 50% 50%, #f0fdfa 0%, #f8fafc 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },
  logoRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '36px',
  },
  logoBoxLeft: {
    width: 36,
    height: 36,
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 900,
    fontSize: '18px',
  },
  logoTextLeft: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#021a36',
    margin: '0 0 8px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '32px',
    lineHeight: 1.5,
    textAlign: 'center',
  },
  googleWrapper: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
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
    textAlign: 'center',
  },
};