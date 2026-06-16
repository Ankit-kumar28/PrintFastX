// pages/Home.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

/* ─── SVG Icons ─── */
const QrIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const GridIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const ZapIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const FileTextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);
const StarIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const GlobeIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

/* ─── WhatsApp icon ─── */
const WAIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="#25D366">
    <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.668 4.61 1.832 6.51L4 29l7.695-1.816A12.94 12.94 0 0 0 16 28c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 2c5.522 0 10 4.478 10 10s-4.478 10-10 10a9.96 9.96 0 0 1-5.093-1.395l-.364-.22-4.566 1.078 1.107-4.434-.237-.374A9.96 9.96 0 0 1 6 15c0-5.522 4.478-10 10-10zm-3.5 5.5c-.2 0-.52.075-.795.375S10 12.5 10 13.25c0 .75.538 1.475.613 1.575.075.1 1.037 1.638 2.537 2.238.35.15.625.237.837.3.35.112.675.1.925.062.282-.044.875-.357 1-.7.125-.344.125-.638.087-.7-.037-.063-.137-.1-.287-.175s-.875-.438-1.012-.488c-.137-.05-.237-.075-.337.075s-.387.488-.475.588-.175.112-.325.037a4.878 4.878 0 0 1-1.463-.913 5.516 5.516 0 0 1-1.012-1.275c-.1-.175-.012-.27.075-.357.081-.08.175-.212.262-.319.088-.106.116-.175.175-.294.058-.119.03-.225-.016-.319s-.337-.825-.462-1.125c-.12-.29-.245-.247-.337-.25A5.91 5.91 0 0 0 12.5 11z"/>
  </svg>
);

/* ─── Gmail icon ─── */
const GmailIcon = () => (
  <svg width="30" height="22" viewBox="0 0 30 22" fill="none">
    <path d="M2 2h26l-13 9L2 2z" fill="#EA4335"/>
    <path d="M2 2v18l7-9-7-9z" fill="#34A853"/>
    <path d="M28 2v18l-7-9 7-9z" fill="#FBBC05"/>
    <path d="M2 20h26" stroke="#4285F4" strokeWidth="2"/>
    <path d="M9 11l6 4 6-4" fill="#4285F4"/>
  </svg>
);

/* ─── Dashboard Mock UI ─── */
const DashboardMock = () => (
  <div style={{
    background: '#fff',
    borderRadius: '20px',
    boxShadow: '0 8px 48px rgba(0,0,0,0.12)',
    padding: '24px',
    width: '100%',
    maxWidth: '440px',
    fontFamily: 'Inter, sans-serif',
  }}>
    {/* Window dots */}
    <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', alignItems: 'center' }}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57', display: 'inline-block' }}/>
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E', display: 'inline-block' }}/>
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840', display: 'inline-block' }}/>
      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#fa4c39ff', fontWeight: 500 }}>Live Dashboard</span>
    </div>

    {/* Order Row 1 */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px'
    }}>
      <span style={{
        background: '#e8fff8', color: '#0d9488', fontWeight: 700, fontSize: '14px',
        borderRadius: '8px', padding: '4px 10px', minWidth: '44px', textAlign: 'center'
      }}>#33</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#ef4444', fontSize: '14px' }}>📄</span>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>SSC_GD.pdf</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>24pgs</span>
          <span style={{ fontSize: '11px', background: '#dcfce7', color: '#16a34a', borderRadius: '4px', padding: '0 6px' }}>Color</span>
          <span style={{ fontSize: '11px', color: '#6366f1' }}>+3 more files</span>
        </div>
      </div>
      <button style={{
        background: '#0d9488', color: '#fff', border: 'none', borderRadius: '8px',
        padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
      }}>Print</button>
    </div>

    {/* Order Row 2 */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px'
    }}>
      <span style={{
        background: '#e8fff8', color: '#0d9488', fontWeight: 700, fontSize: '14px',
        borderRadius: '8px', padding: '4px 10px', minWidth: '44px', textAlign: 'center'
      }}>#24</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#3b82f6', fontSize: '14px' }}>🖼</span>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>Admit Card.jpg</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>1pg</span>
          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#64748b', borderRadius: '4px', padding: '0 6px' }}>B&W</span>
        </div>
      </div>
      <button style={{
        background: '#0d9488', color: '#fff', border: 'none', borderRadius: '8px',
        padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
      }}>Print</button>
    </div>
    {/* order row 3  */}
     <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px'
    }}>
      <span style={{
        background: '#e8fff8', color: '#0d9488', fontWeight: 700, fontSize: '14px',
        borderRadius: '8px', padding: '4px 10px', minWidth: '44px', textAlign: 'center'
      }}>#55</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#ef4444', fontSize: '14px' }}>📄</span>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>Marksheet.pdf</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>19pgs</span>
          <span style={{ fontSize: '11px', background: '#dcfce7', color: '#16a34a', borderRadius: '4px', padding: '0 6px' }}>Color</span>
          <span style={{ fontSize: '11px', color: '#6366f1' }}>+1 more files</span>
        </div>
      </div>
      <button style={{
        background: '#0d9488', color: '#fff', border: 'none', borderRadius: '8px',
        padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
      }}>Print</button>
    </div>
  </div>
);

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ─── Main Component ─── */
export default function Home() {
  const navigate = useNavigate();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchShopId, setSearchShopId] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearchShop = async (e) => {
    e.preventDefault();
    const cleanId = searchShopId.trim();
    if (!cleanId) return;

    setSearching(true);
    try {
      const res = await axios.get(`${API}/api/shops/public/${cleanId}`);
      if (res.data && res.data.shopId) {
        toast.success(`Shop Found: ${res.data.shopName}`);
        setShowSearchModal(false);
        navigate(`/upload/${res.data.shopId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Shop not found or not approved");
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Outfit', 'Inter', sans-serif; }

        .pd-nav { background: #fff; border-bottom: 1px solid #e8ecf0; position: sticky; top: 0; z-index: 100; }
        .pd-nav-inner { max-width: 1120px; margin: 0 auto; padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
        .pd-logo { font-size: 22px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 2px; }
        .pd-logo-dot { color: #0d9488; }
        .pd-nav-links { display: flex; align-items: center; gap: 36px; }
        .pd-nav-link { font-size: 15px; color: #475569; font-weight: 500; text-decoration: none; transition: color 0.2s; cursor: pointer; }
        .pd-nav-link:hover { color: #0f172a; }
        .pd-btn-dark { background: #0f172a; color: #fff; border: none; border-radius: 10px; padding: 10px 22px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; text-decoration: none; display: inline-block; }
        .pd-btn-dark:hover { background: #1e293b; }

        /* Hero */
        .pd-hero { background: #f1f5f9; padding: 72px 32px 80px; }
        .pd-hero-inner { max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        .pd-chaos-badge { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 16px 6px 10px; font-size: 14px; color: #475569; font-weight: 500; margin-bottom: 24px; }
        .pd-chaos-icons { display: flex; align-items: center; gap: 4px; }
        .pd-notif-badge { background: #ef4444; color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; padding: 1px 5px; position: relative; top: -8px; margin-left: 2px; }
        .pd-hero-h1 { font-size: 52px; font-weight: 800; color: #0f172a; line-height: 1.15; margin-bottom: 20px; }
        .pd-hero-h1 .teal { color: #0d9488; }
        .pd-hero-desc { font-size: 16px; color: #64748b; line-height: 1.7; max-width: 420px; margin-bottom: 36px; }
        .pd-btn-primary { display: inline-flex; align-items: center; gap: 10px; background: #0d9488; color: #fff; border: none; border-radius: 12px; padding: 14px 28px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.15s; text-decoration: none; }
        .pd-btn-primary:hover { background: #0f766e; transform: translateY(-1px); }
        .pd-find-link { display: inline-flex; align-items: center; gap: 6px; color: #0d9488; font-size: 14px; font-weight: 500; text-decoration: none; margin-top: 14px; transition: opacity 0.2s; cursor: pointer; }
        .pd-find-link:hover { opacity: 0.75; }
        .pd-setup-row { display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 13px; margin-top: 16px; }
        .pd-setup-row a { color: #0d9488; text-decoration: none; }
        .pd-trust-row { display: flex; align-items: center; gap: 24px; margin-top: 20px; flex-wrap: wrap; }
        .pd-trust-item { display: flex; align-items: center; gap: 7px; font-size: 13px; color: #475569; font-weight: 500; }
        .pd-trust-item svg { color: #64748b; }

        /* Why Section */
        .pd-why { background: #fff; padding: 80px 32px; }
        .pd-section-inner { max-width: 1120px; margin: 0 auto; }
        .pd-section-title { text-align: center; font-size: 36px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
        .pd-section-sub { text-align: center; font-size: 16px; color: #64748b; margin-bottom: 56px; }
        .pd-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .pd-card { background: #fff; border: 1px solid #e8ecf0; border-radius: 18px; padding: 32px 28px; }
        .pd-card-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .pd-card-icon.blue { background: #2563eb; color: #fff; }
        .pd-card-icon.teal { background: #0d9488; color: #fff; }
        .pd-card-icon.purple { background: #7c3aed; color: #fff; }
        .pd-card h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
        .pd-card p { font-size: 14px; color: #64748b; line-height: 1.65; }
        .pd-card p .highlight { color: #0d9488; font-weight: 600; }

        /* Pricing */
        .pd-pricing { background: #f1f5f9; padding: 80px 32px; }
        .pd-pricing-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 900px; margin: 0 auto; }
        .pd-price-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 36px 28px; position: relative; text-align: center; }
        .pd-price-card.featured { border-color: #0d9488; border-width: 2px; }
        .pd-price-badge { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); border-radius: 999px; padding: 6px 18px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; }
        .pd-price-badge.teal { background: #0d9488; color: #fff; }
        .pd-price-badge.dark { background: #0f172a; color: #fff; }
        .pd-plan-badge { display: block; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 20px; }
        .pd-price-amount { font-size: 52px; font-weight: 800; color: #0f172a; display: flex; align-items: flex-start; justify-content: center; gap: 4px; line-height: 1; }
        .pd-price-amount .currency { font-size: 26px; font-weight: 600; margin-top: 8px; }
        .pd-price-period { font-size: 14px; color: #64748b; margin-top: 8px; margin-bottom: 28px; }
        .pd-price-features { list-style: none; text-align: left; margin-bottom: 28px; display: flex; flex-direction: column; gap: 12px; }
        .pd-price-features li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #334155; }
        .pd-price-features li .check { color: #0d9488; flex-shrink: 0; margin-top: 1px; }
        .pd-price-features li strong { color: #0f172a; }
        .pd-plan-btn { width: 100%; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 2px solid #0d9488; }
        .pd-plan-btn.outline { background: #fff; color: #0d9488; }
        .pd-plan-btn.outline:hover { background: #f0fdfa; }
        .pd-plan-btn.filled { background: #0d9488; color: #fff; border-color: #0d9488; }
        .pd-plan-btn.filled:hover { background: #0f766e; }

        /* Footer */
        .pd-footer { background: #fff; border-top: 1px solid #e2e8f0; padding: 28px 32px; }
        .pd-footer-inner { max-width: 1120px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .pd-footer-copy { font-size: 14px; color: #64748b; font-weight: 500; }
        .pd-footer-links { display: flex; gap: 28px; }
        .pd-footer-links a { font-size: 14px; color: #64748b; text-decoration: none; transition: color 0.2s; }
        .pd-footer-links a:hover { color: #0f172a; }

        @media (max-width: 900px) {
          .pd-hero-inner { grid-template-columns: 1fr; }
          .pd-hero-h1 { font-size: 38px; }
          .pd-cards { grid-template-columns: 1fr; }
          .pd-pricing-cards { grid-template-columns: 1fr; }
          .pd-nav-links { gap: 16px; }
        }
        @media (max-width: 600px) {
          .pd-hero-h1 { font-size: 30px; }
          .pd-footer-inner { flex-direction: column; align-items: flex-start; }
          .pd-nav-inner {
            height: auto;
            flex-direction: column;
            padding: 12px 16px;
            gap: 12px;
          }
          .pd-nav-links {
            width: 100%;
            justify-content: space-around;
            gap: 8px;
          }
          .pd-nav-link {
            font-size: 14px;
          }
          .pd-btn-dark {
            padding: 8px 16px;
            font-size: 13px;
          }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="pd-nav">
        <div className="pd-nav-inner">
          <div className="pd-logo">
            PrintFastX<span className="pd-logo-dot">.</span>
          </div>
          <div className="pd-nav-links">
            <a href="#features" className="pd-nav-link">Features</a>
            <a href="#pricing" className="pd-nav-link">Pricing</a>
            <Link to="/login" className="pd-btn-dark">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pd-chaos-badge pd-hero" style={{ display: 'block', background: '#f1f5f9', padding: '72px 32px 80px' }}>
        <div className="pd-hero-inner">
          {/* Left: copy */}
          <div>
            {/* Badge */}
            <div className="pd-chaos-badge">
              <span>Stop the</span>
              <div className="pd-chaos-icons">
                <span title="Mobile"><PhoneIcon /></span>
                <WAIcon />
                <GmailIcon />
              </div>
              <span className="pd-notif-badge">155+</span>
              <span>Scroll Chaos</span>
            </div>

            <h1 className="pd-hero-h1">
              Manage Your Print Shop<br />
              <span className="teal">In One Screen.</span>
            </h1>
            <p className="pd-hero-desc">
              No more scrolling through WhatsApp or Gmail to find customer files. Get organized orders, protect customer privacy, and process orders 10x faster.
            </p>

            <div>
              <Link to="/login" className="pd-btn-primary">
                <QrIcon />
                Get My Shop QR Code
              </Link>
            </div>

            <div style={{ marginTop: '14px' }}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setShowSearchModal(true); }} 
                className="pd-find-link"
              >
                <SearchIcon />
                Find Your Shop to Upload Files
              </a>
            </div>

            <div className="pd-setup-row">
              <ClockIcon />
              Setup in <a href="#">2 Minutes</a> &nbsp;•&nbsp; No payment required
            </div>

            <div className="pd-trust-row">
              <div className="pd-trust-item">
                <PhoneIcon /> No Number Sharing
              </div>
              <div className="pd-trust-item">
                <FileTextIcon /> Auto-Page Counting
              </div>
              <div className="pd-trust-item">
                <UsersIcon /> Customer Privacy
              </div>
            </div>
          </div>

          {/* Right: Dashboard Mock */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* ── WHY SECTION ── */}
      <section className="pd-why" id="features">
        <div className="pd-section-inner">
          <h2 className="pd-section-title">Why Shop Owners Switch?</h2>
          <p className="pd-section-sub">Replace chaotic chats with a professional workflow.</p>

          <div className="pd-cards">
            {/* Card 1 */}
            <div className="pd-card">
              <div className="pd-card-icon blue">
                <GridIcon />
              </div>
              <h3>One Unified Dashboard</h3>
              <p>Receive all files (PDF, IMG, DOC) in a single list. No more downloading from random chats.</p>
            </div>

            {/* Card 2 */}
            <div className="pd-card">
              <div className="pd-card-icon teal">
                <ShieldIcon />
              </div>
              <h3>Privacy First</h3>
              <p>Customers scan a QR code to upload. No need to exchange personal WhatsApp numbers.</p>
            </div>

            {/* Card 3 */}
            <div className="pd-card">
              <div className="pd-card-icon purple">
                <ZapIcon />
              </div>
              <h3>Auto-Count Pages</h3>
              <p>Our smart system counts PDF pages automatically before you even print. <span className="highlight">Accurate billing</span>.</p>
            </div>

            {/* Card 4 */}
            <div className="pd-card">
              <div className="pd-card-icon teal" style={{ background: '#ea580c', color: '#fff' }}>
                <StarIcon />
              </div>
              <h3>Priority Order Queue</h3>
              <p>Allow urgent orders to skip the queue. Charge custom priority premiums set dynamically by you.</p>
            </div>

            {/* Card 5 */}
            <div className="pd-card">
              <div className="pd-card-icon blue" style={{ background: '#2563eb', color: '#fff' }}>
                <GlobeIcon />
              </div>
              <h3>No App Install Friction</h3>
              <p>Customers upload using any default mobile browser. Fast, simple, and zero onboarding delays.</p>
            </div>

            {/* Card 6 */}
            <div className="pd-card">
              <div className="pd-card-icon purple" style={{ background: '#dc2626', color: '#fff' }}>
                <TrashIcon />
              </div>
              <h3>Auto-Cleanup Storage</h3>
              <p>Keep your system clutter-free. Customer documents are automatically deleted after checkout or custom timeout presets.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="pd-pricing" id="pricing">
        <div className="pd-section-inner">
          <h2 className="pd-section-title">Upgrade Your Workspace</h2>
          <p className="pd-section-sub">
            Unlock professional features and unlimited access. Choose the plan<br />
            that fits your business needs.
          </p>

          <div className="pd-pricing-cards">
            {/* Monthly */}
            <div className="pd-price-card">
              <span className="pd-plan-badge">MONTHLY</span>
              <div className="pd-price-amount">
                <span className="currency">₹</span>
                <span>199</span>
              </div>
              <p className="pd-price-period">per month</p>
              <ul className="pd-price-features">
                <li><span className="check"><CheckIcon /></span> QR-Based Order System</li>
                <li><span className="check"><CheckIcon /></span> Full Dashboard Access</li>
                <li><span className="check"><CheckIcon /></span> Priority Support</li>
                <li><span className="check"><CheckIcon /></span> Auto Page Detection</li>
              </ul>
              <button className="pd-plan-btn outline">Select Plan</button>
            </div>

            {/* Quarterly (Featured) */}
            <div className="pd-price-card featured">
              <span className="pd-price-badge teal" style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', borderRadius: '999px', padding: '6px 18px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>MOST POPULAR</span>
              <span className="pd-plan-badge">QUARTERLY</span>
              <div className="pd-price-amount">
                <span className="currency">₹</span>
                <span>549</span>
              </div>
              <p className="pd-price-period">for 3 months</p>
              <ul className="pd-price-features">
                <li><span className="check"><CheckIcon /></span> QR-Based Order System</li>
                <li><span className="check"><CheckIcon /></span> Full Dashboard Access</li>
                <li><span className="check"><CheckIcon /></span> Priority Support</li>
                <li><span className="check"><CheckIcon /></span> Auto Page Detection</li>
                <li><span className="check"><CheckIcon /></span> <strong>Save ₹48</strong> vs Monthly</li>
              </ul>
              <button className="pd-plan-btn filled">Select Plan</button>
            </div>

            {/* Half-Yearly */}
            <div className="pd-price-card">
              <span className="pd-price-badge dark" style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', borderRadius: '999px', padding: '6px 18px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>BEST VALUE</span>
              <span className="pd-plan-badge">HALF-YEARLY</span>
              <div className="pd-price-amount">
                <span className="currency">₹</span>
                <span>999</span>
              </div>
              <p className="pd-price-period">for 6 months</p>
              <ul className="pd-price-features">
                <li><span className="check"><CheckIcon /></span> QR-Based Order System</li>
                <li><span className="check"><CheckIcon /></span> Full Dashboard Access</li>
                <li><span className="check"><CheckIcon /></span> Priority Support</li>
                <li><span className="check"><CheckIcon /></span> Auto Page Count Detection</li>
                <li><span className="check"><CheckIcon /></span> <strong>Save ₹195</strong> vs Monthly</li>
              </ul>
              <button className="pd-plan-btn outline">Select Plan</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="pd-footer">
        <div className="pd-footer-inner">
          <span className="pd-footer-copy">
            PrintFastX © {new Date().getFullYear()}
          </span>
          <div className="pd-footer-links">
            <Link to="/contact">Contact Us</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
            <Link to="/refund">Refund Policy</Link>
          </div>
        </div>
      </footer>

      {/* ── SEARCH MODAL ── */}
      {showSearchModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)', padding: '24px'
        }} onClick={() => setShowSearchModal(false)}>
          <div style={{
            background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '400px',
            padding: '32px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            fontFamily: "'Outfit', 'Inter', sans-serif"
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#021a36', marginBottom: '8px' }}>Find Your Print Shop</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Enter the unique Shop ID (e.g. KIET376) provided by the shopkeeper.</p>
            
            <form onSubmit={handleSearchShop} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                placeholder="Enter Shop ID"
                value={searchShopId}
                onChange={e => setSearchShopId(e.target.value.toUpperCase())}
                style={{
                  padding: '12px 14px', border: '1.5px solid #cbd5e1',
                  borderRadius: '12px', fontSize: '14px', outline: 'none'
                }}
                required
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  style={{
                    flex: 1, padding: '12px', background: '#f1f5f9', border: 'none',
                    color: '#475569', borderRadius: '12px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={searching}
                  style={{
                    flex: 2, padding: '12px', background: '#0d9488', border: 'none',
                    color: '#fff', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
                    opacity: searching ? 0.7 : 1
                  }}
                >
                  {searching ? 'Finding...' : 'Go to Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}