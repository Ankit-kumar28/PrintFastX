// pages/ShopDashboard.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import PrintQRPoster from '../components/PrintQRPoster';
import { 
  LayoutDashboard, 
  QrCode, 
  BarChart3, 
  Settings, 
  LogOut, 
  Printer, 
  Download, 
  RefreshCw, 
  Bookmark, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Trash2,
  Menu,
  FileText
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const statesList = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
];

export default function ShopDashboard() {
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('Dashboard'); // 'Dashboard', 'QR Code', 'Analytics', 'Settings'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Expandable file list state per order token
  const [expandedOrders, setExpandedOrders] = useState({});
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isBlockedByAdmin, setIsBlockedByAdmin] = useState(false);

  // Active Print Popover State
  const [activePrintOrder, setActivePrintOrder] = useState(null);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState(null);

  // Settings Toggles & Form State
  const [editPricing, setEditPricing] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    bwRate: 2,
    colorRate: 8,
    priorityFee: 10,
    autoDeleteHours: 24,
    shopName: '',
    ownerName: '',
    whatsappNumber: '',
    state: ''
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const pollRef = useRef(null);

  /* ── Fetch profile from database ── */
  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API}/api/shops/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedShop = res.data;
      localStorage.setItem('shop', JSON.stringify(updatedShop));
      setShop(updatedShop);
      setSettingsForm({
        bwRate: updatedShop.pricing?.bwRate || 2,
        colorRate: updatedShop.pricing?.colorRate || 8,
        priorityFee: updatedShop.pricing?.priorityFee || 10,
        autoDeleteHours: updatedShop.autoDeleteHours || 24,
        shopName: updatedShop.shopName || '',
        ownerName: updatedShop.ownerName || '',
        whatsappNumber: updatedShop.whatsappNumber || '',
        state: updatedShop.state || ''
      });
    } catch (err) {
      console.error('Failed to sync profile', err);
    }
  }, []);

  /**
   * Generates dynamic styling for the token display box.
   * If the order is marked as completed, it uses a green styling.
   * If pending and marked as high-priority, it gets a golden amber glow.
   * Otherwise, it defaults to a soft red style.
   * 
   * @param {string} status - Current order status ('completed' or 'pending')
   * @param {boolean} priority - Priority flag of the order
   * @returns {object} React inline style object
   */
  const tokenLabelStyle = (status, priority) => {
    const isCompleted = status === 'completed';
    if (isCompleted) {
      return {
        background: '#e8fff8',
        color: '#0d9488',
        border: '2px solid #0d9488',
        fontWeight: 800,
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '20px',
        fontFamily: 'monospace',
        backdropFilter: 'blur(4px)',
        display: 'inline-block',
      };
    }
    if (priority) {
      return {
        background: '#fef3c7',
        color: '#b45309',
        border: '2px solid #f59e0b',
        boxShadow: '0 0 12px rgba(245, 158, 11, 0.5)',
        fontWeight: 800,
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '20px',
        fontFamily: 'monospace',
        backdropFilter: 'blur(4px)',
        display: 'inline-block',
      };
    }
    return {
      background: '#f64a4a2c',
      color: '#ff0000ff',
      border: '2px solid #f64a4a',
      fontWeight: 800,
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '20px',
      fontFamily: 'monospace',
      backdropFilter: 'blur(4px)',
      display: 'inline-block',
    };
  };

  /* ── Auth guard & Shop loading ── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const shopData = localStorage.getItem('shop');
    if (!token || !shopData) {
      navigate('/');
      return;
    }
    const parsed = JSON.parse(shopData);
    if (!parsed.onboarded) {
      navigate('/setup-shop');
      return;
    }
    if (parsed.status !== 'approved') {
      navigate('/setup-shop');
      return;
    }
    if (parsed.isBlocked) {
      setIsBlockedByAdmin(true);
    }
    setShop(parsed);
    setSettingsForm({
      bwRate: parsed.pricing?.bwRate || 2,
      colorRate: parsed.pricing?.colorRate || 8,
      priorityFee: parsed.pricing?.priorityFee || 10,
      autoDeleteHours: parsed.autoDeleteHours || 24,
      shopName: parsed.shopName || '',
      ownerName: parsed.ownerName || '',
      whatsappNumber: parsed.whatsappNumber || '',
      state: parsed.state || ''
    });
    fetchProfile();
  }, [navigate, fetchProfile]);

  /* ── Fetch orders ── */
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const shopData = JSON.parse(localStorage.getItem('shop'));
      const res = await axios.get(`${API}/api/orders/${shopData.shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
      setIsBlockedByAdmin(false); // reset block if loaded successfully
    } catch (err) {
      if (err.response?.status === 403) {
        setIsBlockedByAdmin(true);
      } else {
        if (!silent) toast.error('Failed to load orders');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  /* ── Poll active orders ── */
  useEffect(() => {
    if (!shop) return;
    fetchOrders();
    pollRef.current = setInterval(() => fetchOrders(true), 10000);
    return () => clearInterval(pollRef.current);
  }, [shop, fetchOrders]);

  /* ── Fetch QR Code Info ── */
  useEffect(() => {
    if (!shop) return;
    const uploadUrl = `${window.location.origin}/upload/${shop.shopId}`;
    const fetchQR = async () => {
      try {
        const res = await axios.get(`${API}/api/qr/${shop.shopId}/data`);
        setQrData(res.data);
      } catch {
        setQrData({
          qrDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(uploadUrl)}&color=0f172a&bgcolor=ffffff`,
          uploadUrl,
          shopId: shop.shopId,
          shopName: shop.shopName,
        });
      } finally {
        setQrLoading(false);
      }
    };
    fetchQR();
  }, [shop]);

  const toggleExpand = (token) => {
    setExpandedOrders(prev => ({ ...prev, [token]: !prev[token] }));
  };

  const handleCopy = async () => {
    if (qrData) {
      await navigator.clipboard.writeText(qrData.uploadUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (shop) {
      window.open(`${API}/api/qr/${shop.shopId}/download`, '_blank');
    }
  };

  /* ── Toggle Bookmark/Mark Order ── */
  const toggleMarkOrder = async (order) => {
    try {
      const token = localStorage.getItem('token');
      const newMarked = !order.marked;
      
      // Optimistic update
      setOrders(prev => prev.map(o => o.token === order.token ? { ...o, marked: newMarked } : o));

      await axios.patch(`${API}/api/orders/${encodeURIComponent(order.token)}/mark`, { marked: newMarked }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(newMarked ? 'Order Bookmarked' : 'Bookmark Removed');
    } catch {
      toast.error('Failed to update bookmark status');
      fetchOrders(true);
    }
  };

  /* ── Toggle Order Status (Pending / Completed) ── */
  const handleToggleStatus = async (order) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = order.status === 'completed' ? 'pending' : 'completed';
      
      // Optimistic update
      setOrders(prev => prev.map(o => o.token === order.token ? { ...o, status: newStatus } : o));

      await axios.patch(`${API}/api/orders/${encodeURIComponent(order.token)}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Order marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update order status');
      fetchOrders(true);
    }
  };

  /* ── Delete/Dismiss Order ── */
  const deleteOrder = async (token) => {
    try {
      const authToken = localStorage.getItem('token');
      await axios.delete(`${API}/api/orders/${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setOrders(prev => prev.filter(o => o.token !== token));
    } catch {
      toast.error('Failed to dismiss order');
    }
  };

  /* ── Trigger File Printing/Download ── */
  const handlePrintFile = (order, file) => {
    const fileUrl = `${API}/api/orders/${order.token}/file/${file._id || file.id}`;
    window.open(fileUrl, '_blank');
    
    // Auto delete after 12 hours unless marked
    if (!order.marked) {
      const TWELVE_HOURS = 12 * 60 * 60 * 1000; // 43,200,000 ms

      setTimeout(() => {
        deleteOrder(order.token);
      }, TWELVE_HOURS);
    }
  };

  const handleDownloadFile = async (order, file) => {
    const fileUrl = `${API}/api/orders/${order.token}/file/${file._id || file.id}`;
    try {
      toast.loading("Downloading file...", { id: `download-${file._id || file.fileName}` });
      const res = await axios.get(fileUrl, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started", { id: `download-${file._id || file.fileName}` });

      // Auto delete after downloading unless marked
      if (!order.marked) {
        const TWELVE_HOURS = 12 * 60 * 60 * 1000; // 43,200,000 ms
        setTimeout(() => {
          deleteOrder(order.token);
        }, TWELVE_HOURS);
      }
    } catch (err) {
      toast.error("Failed to download file", { id: `download-${file._id || file.fileName}` });
      window.open(fileUrl, '_blank'); // fallback
    }
  };

  const handleDownloadAllFiles = (order) => {
    if (!order || !order.files) return;
    order.files.forEach(file => {
      handleDownloadFile(order, file);
    });
  };

  /* ── Save Settings ── */
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSettingsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(`${API}/api/shops/settings`, settingsForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem('shop', JSON.stringify(res.data.shop));
      setShop(res.data.shop);
      toast.success('Settings updated successfully!');
      setEditPricing(false);
      setEditProfile(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  // The A4 QR code poster printing logic has been extracted into a separate component.
  // See components/PrintQRPoster.jsx for the template structure and printing trigger.

  /**
   * Performs shopowner logout.
   * Clears auth tokens from localStorage, redirects directly to the login
   * screen, and replaces the navigation history entry to prevent back-button access.
   */
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
    toast.success('Logged out successfully');
  };

  // Derive stats for Dashboard / Analytics views
  const totalRevenue = orders.reduce((s, o) => s + (o.amount || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  
  // Date-based Analytics calculations
  const now = new Date();
  
  const todayOrdersList = orders.filter(o => 
    new Date(o.createdAt).toDateString() === now.toDateString()
  );
  const todayOrders = todayOrdersList.length;
  const todayRevenue = todayOrdersList.reduce((s, o) => s + (o.amount || 0), 0);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayOrdersList = orders.filter(o => 
    new Date(o.createdAt).toDateString() === yesterdayDate.toDateString()
  );
  const yesterdayOrders = yesterdayOrdersList.length;
  const yesterdayRevenue = yesterdayOrdersList.reduce((s, o) => s + (o.amount || 0), 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const weeklyOrdersList = orders.filter(o => 
    new Date(o.createdAt) >= sevenDaysAgo
  );
  const weeklyOrders = weeklyOrdersList.length;
  const weeklyRevenue = weeklyOrdersList.reduce((s, o) => s + (o.amount || 0), 0);

  // SVG Chart data calculation
  let bwPages = 0;
  let colorPages = 0;
  orders.forEach(order => {
    order.files?.forEach(file => {
      const p = (file.pages || 1) * (file.copies || 1);
      if (file.colorMode === 'color') colorPages += p;
      else bwPages += p;
    });
  });
  const totalPagesForChart = bwPages + colorPages;
  const bwPercent = totalPagesForChart > 0 ? Math.round((bwPages / totalPagesForChart) * 100) : 50;
  const colorPercent = totalPagesForChart > 0 ? Math.round((colorPages / totalPagesForChart) * 100) : 50;

  // Donut SVG circumference calculation
  const radius = 35;
  const circumference = 2 * Math.PI * radius; // ~219.9
  const colorDash = (colorPercent / 100) * circumference;
  const bwDash = circumference - colorDash;

  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    const tokenMatch = o.token?.toLowerCase().includes(term);
    const fileMatch = o.files?.some(f => f.fileName?.toLowerCase().includes(term));
    const statusMatch = filterStatus === 'all' || o.status === filterStatus;
    return (tokenMatch || fileMatch) && statusMatch;
  });

  if (!shop) return null;

  if (isBlockedByAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Outfit', 'Inter', sans-serif"
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
          border: '1px solid #fee2e2',
          padding: '44px 36px',
          width: '100%',
          maxWidth: '460px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: '#fee2e2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '36px'
          }}>🚫</div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#991b1b', marginBottom: '12px' }}>Your Shop is Blocked</h2>
          <p style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: 1.6, marginBottom: '32px' }}>
            Your access has been temporarily suspended by the administrator. Please contact admin support or verify your settings.
          </p>
          <button 
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '14px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Logout to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Outfit', sans-serif; background-color: #f8fafc; }
        .sidebar-item { transition: all 0.2s; cursor: pointer; }
        .sidebar-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .order-row { transition: all 0.15s; }
        .order-row:hover { background-color: #f8fafc; }
        .btn-action { transition: all 0.2s; cursor: pointer; }
        .btn-action:hover { filter: brightness(0.9); }
        .btn-sidebar-active { background: #0d9488 !important; color: #fff !important; font-weight: 700; }
        .edit-card { border: 1.5px solid #cbd5e1; padding: 24px; border-radius: 16px; background: #fff; margin-bottom: 20px; transition: border-color 0.2s; }
        .edit-card.editing { border-color: #0d9488; }

        .sidebar-container {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Outfit', 'Inter', sans-serif;
        }
        .sidebar-el {
          width: 260px;
          padding: 24px 16px;
          background: #021a36;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          border-right: 1px solid #1e293b;
          transition: all 0.3s ease-in-out;
          overflow: hidden;
          flex-shrink: 0;
          z-index: 100;
        }
        .sidebar-el.collapsed {
          width: 0px;
          padding-left: 0px;
          padding-right: 0px;
          border-right: none;
        }
        .main-area-el {
          flex-grow: 1;
          padding: 32px 40px;
          overflow-y: auto;
          height: 100vh;
          transition: all 0.3s ease-in-out;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .two-col-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 32px;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          align-items: start;
        }
        .sidebar-backdrop {
          display: none;
        }

        @media (max-width: 1024px) {
          .main-area-el {
            padding: 24px;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .two-col-grid, .settings-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
        @media (max-width: 768px) {
          .sidebar-el {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            height: 100vh;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          }
          .sidebar-el.collapsed {
            width: 0px;
            padding-left: 0px;
            padding-right: 0px;
            border-right: none;
          }
          .main-area-el {
            padding: 20px 16px;
          }
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            z-index: 90;
          }
        }
      `}</style>

      {/* Sidebar Backdrop for Mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar-el ${sidebarOpen ? '' : 'collapsed'}`}>
        <div style={styles.sidebarBrand}>
          <div style={styles.logoBox}>P</div>
          <span style={styles.brandText}>PrintFast<span style={{ color: '#0d9488' }}>X</span></span>
        </div>

        <div style={styles.shopInfoCard}>
          <p style={styles.shopNameText}>{shop.shopName}</p>
          <p style={styles.shopIdText}>ID: {shop.shopId}</p>
        </div>

        <nav style={styles.sidebarNav}>
          {[
            { id: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { id: 'QR Code', icon: <QrCode size={18} /> },
            { id: 'Analytics', icon: <BarChart3 size={18} /> },
            { id: 'Settings', icon: <Settings size={18} /> }
          ].map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sidebar-item ${activeTab === tab.id ? 'btn-sidebar-active' : ''}`}
              style={{
                ...styles.sidebarItem,
                ...(activeTab === tab.id ? { color: '#fff' } : {})
              }}
            >
              {tab.icon}
              <span>{tab.id}</span>
            </div>
          ))}
        </nav>

        <div onClick={handleLogout} className="sidebar-item" style={styles.sidebarLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="main-area-el">
        
        {/* HEADER BAR */}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#021a36',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <Menu size={24} />
            </button>
            <h2 style={styles.headerTitle}>{activeTab}</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={styles.headerStatus}>
              <span style={styles.liveIndicatorDot} />
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Auto-Refreshing</span>
            </div>
            
            {/* Shop Name in right corner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f2421ff' }}>{shop.shopName}</span>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: '#78b698ff',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '16px',
                border: '1.5px solid #111d3bff'
              }}>
                {shop.shopName?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* TAB CONDITIONAL RENDERING */}

        {/* ── TAB: DASHBOARD (Merged with Orders) ── */}
        {activeTab === 'Dashboard' && (
          <div style={styles.card}>
            {/* Filter controls */}
            <div style={styles.filterRow}>
              <input
                type="text"
                placeholder="Search by token or filename..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <button 
                onClick={() => { fetchOrders(); toast.success('Orders refreshed'); }}
                style={styles.refreshBtn}
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            {/* Orders list */}
            {loading ? (
              <div style={styles.emptyContainer}>
                <div style={styles.spinner} />
                <p style={{ marginTop: '12px', color: '#94a3b8' }}>Loading live orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={styles.emptyContainer}>
                <span style={{ fontSize: '40px' }}>📋</span>
                <h4 style={{ color: '#475569', margin: '12px 0 4px', fontSize: '16px' }}>No Orders Found</h4>
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Waiting for customer file uploads...</p>
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>TOKEN</th>
                      <th style={styles.th}>ACTION</th>
                      <th style={styles.th}>FILE</th>
                      <th style={styles.th}>PAGES</th>
                      <th style={styles.th}>COPIES</th>
                      <th style={styles.th}>MODE</th>
                      <th style={styles.th}>AMOUNT</th>
                      <th style={styles.th}>MARK/VIEW</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => {
                      const isExpanded = !!expandedOrders[order.token];
                      const totalPages = order.files?.reduce((acc, f) => acc + (f.pages || 1) * (f.copies || 1), 0) || 0;
                      const totalCopies = order.files?.reduce((acc, f) => acc + (f.copies || 1), 0) || 0;
                      const hasColor = order.files?.some(f => f.colorMode === 'color');
                      
                      const fileNameDisplay = order.files?.length === 1 
                        ? order.files[0].fileName 
                        : `${order.files?.length} Files (Batch)`;
                      
                      const copiesDisplay = order.files?.length === 1 
                        ? order.files[0].copies 
                        : 'Mixed';

                      const modeDisplay = order.files?.length === 1 
                        ? (order.files[0].colorMode === 'color' ? 'Color' : 'B&W') 
                        : (hasColor ? 'Mixed' : 'B&W');

                      const isPriorityPending = order.priority && order.status !== 'completed';

                      return (
                        <>
                          <tr 
                            key={order.token} 
                            className="order-row" 
                            style={{
                              ...styles.tableRow,
                              ...(isPriorityPending ? { background: '#fffbeb' } : {})
                            }}
                          >
                            <td style={{
                              ...styles.td,
                              ...(isPriorityPending ? { borderLeft: '4px solid #d97706' } : {})
                            }}>
                              <span 
                                onClick={() => handleToggleStatus(order)}
                                style={{
                                  ...tokenLabelStyle(order.status, order.priority),
                                  cursor: 'pointer'
                                }}
                                title="Click to toggle status (Completed / Pending)"
                              >
                                {order.token}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <button 
                                onClick={() => setActivePrintOrder(order)}
                                className="btn-action"
                                style={styles.printBtn}
                              >
                                <Printer size={14} /> Print
                              </button>
                            </td>
                            <td style={styles.td}>
                              <div 
                                onClick={() => toggleExpand(order.token)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                              >
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                  {fileNameDisplay}
                                </span>
                                {order.files?.length > 1 && (
                                  <span style={{ color: '#0d9488', fontSize: '11px', background: '#e6f4f1', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    Batch
                                  </span>
                                )}
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </div>
                            </td>
                            <td style={styles.td}>
                              <span style={{ fontWeight: 600, color: '#475569' }}>{totalPages}</span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ fontWeight: 600, color: '#475569' }}>{copiesDisplay}</span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.badge(modeDisplay === 'Color' ? '#ede9fe' : '#f1f5f9', modeDisplay === 'Color' ? '#7c3aed' : '#475569')}>
                                {modeDisplay}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.costText}>₹{order.amount}</span>
                            </td>

                            <td style={styles.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button 
                                  onClick={() => toggleMarkOrder(order)}
                                  className="btn-action"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: order.marked ? '#0d9488' : '#cbd5e1',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title={order.marked ? 'Bookmarked' : 'Bookmark Order'}
                                >
                                  <Bookmark size={20} fill={order.marked ? '#0d9488' : 'none'} />
                                </button>
                                <button 
                                  onClick={() => setConfirmDeleteOrder(order)}
                                  className="btn-action"
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                  title="Dismiss Order"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded File Rows */}
                          {isExpanded && order.files?.map((file, idx) => (
                            <tr 
                              key={`${order.token}-file-${idx}`} 
                              style={{
                                ...styles.expandedRow,
                                ...(isPriorityPending ? { background: '#fffbeb' } : {})
                              }}
                            >
                              <td style={{
                                ...styles.td,
                                ...(isPriorityPending ? { borderLeft: '4px solid #d97706' } : {})
                              }}></td>
                              <td style={styles.td}></td>
                              <td style={styles.td} colSpan={4}>
                                <div style={{ paddingLeft: '16px', fontSize: '13px', color: '#475569' }}>
                                  📄 <span style={{ fontWeight: 600 }}>{file.fileName}</span>
                                  <span style={{ marginLeft: '10px', color: '#94a3b8' }}>
                                    {file.pages} pages &times; {file.copies} copies ({file.sides === 'double' ? 'Double' : 'Single'} Side)
                                  </span>
                                </div>
                              </td>
                              <td style={styles.td}>
                                <span style={{ fontSize: '13px', color: '#64748b' }}>
                                  {file.colorMode === 'color' ? 'Color' : 'B&W'}
                                </span>
                              </td>
                              <td style={styles.td}></td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: QR CODE ── */}
        {activeTab === 'QR Code' && (
          <div className="two-col-grid">
            <div style={styles.card}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Store Front Poster</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                Print and paste this poster near your printing desk. Customers scan this QR to instantly upload documents and get printing tokens without sharing phone numbers.
              </p>

              <div style={styles.qrActionsList}>
                <PrintQRPoster shop={shop} qrData={qrData} />
                <button onClick={handleDownloadQR} style={styles.btnSecondaryLarge}>
                  <Download size={18} /> Download QR Code PNG
                </button>
              </div>

              <div style={{ marginTop: '32px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Customer Upload Link</p>
                <div style={styles.urlDisplayRow}>
                  <span style={styles.urlText}>{qrData?.uploadUrl}</span>
                  <button onClick={handleCopy} style={styles.copyBtn}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Live QR Preview</p>
              {qrLoading ? (
                <div style={styles.spinner} />
              ) : (
                <div style={styles.qrFrame}>
                  <img src={qrData?.qrDataUrl} alt="Shop QR code" style={{ width: '220px', height: '220px' }} />
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>Scan to start uploads</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: ANALYTICS (Overhauled with detailed comparisons & pie chart) ── */}
        {activeTab === 'Analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Stats Cards Row */}
            <div className="stats-grid">
              {[
                { label: 'Total Submissions', value: orders.length, color: '#0f172a', bg: '#f8fafc' },
                { label: 'Pending Printing', value: pendingCount, color: '#ea580c', bg: '#fff7ed' },
                { label: "Today's Orders", value: todayOrders, color: '#0d9488', bg: '#f0fdf4' },
                { label: 'Cumulative Revenue', value: `₹${totalRevenue}`, color: '#7c3aed', bg: '#f5f3ff' },
              ].map(stat => (
                <div key={stat.label} style={{ ...styles.statCard, background: stat.bg }}>
                  <p style={styles.statLabel}>{stat.label}</p>
                  <p style={{ ...styles.statValue, color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="two-col-grid">
              {/* Detailed Period Comparisons */}
              <div style={styles.card}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>Period metrics analysis</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { label: "Today's Metrics", orders: todayOrders, revenue: todayRevenue, color: '#0d9488', bg: '#f0fdf4' },
                    { label: "Yesterday's Metrics", orders: yesterdayOrders, revenue: yesterdayRevenue, color: '#64748b', bg: '#f8fafc' },
                    { label: "Last 7 Days (Weekly)", orders: weeklyOrders, revenue: weeklyRevenue, color: '#7c3aed', bg: '#f5f3ff' }
                  ].map(period => (
                    <div key={period.label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 20px',
                      background: period.bg,
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{period.label}</p>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>{period.orders} total orders submitted</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: period.color, margin: 0 }}>₹{period.revenue}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Estimated Value</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* B&W vs Color Custom Pie Chart Card */}
              <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '20px', alignSelf: 'flex-start' }}>
                  Print Distribution (B&W vs Color Pages)
                </h3>
                
                {totalPagesForChart > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    {/* SVG Donut Chart */}
                    <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                      <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                        {/* Background segment (Black & White) */}
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="none"
                          stroke="#0f172a"
                          strokeWidth="12"
                        />
                        {/* Color segment overlay */}
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="none"
                          stroke="#0d9488"
                          strokeWidth="12"
                          strokeDasharray={`${colorDash} ${circumference}`}
                          strokeDashoffset={-bwDash}
                        />
                      </svg>
                      {/* Percent Center Display */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'inherit'
                      }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#021a36' }}>{colorPercent}%</span>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Color</span>
                      </div>
                    </div>

                    {/* Chart Legend */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', background: '#0f172a', borderRadius: '3px' }} />
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', margin: 0 }}>B&W Pages</p>
                          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{bwPages} pg ({bwPercent}%)</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', background: '#0d9488', borderRadius: '3px' }} />
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', margin: 0 }}>Color Pages</p>
                          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{colorPages} pg ({colorPercent}%)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    <span style={{ fontSize: '32px' }}>📊</span>
                    <p style={{ fontSize: '13px', marginTop: '10px' }}>No pages printed yet to compile distribution analysis.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: SETTINGS (Edit-in-Place Cards) ── */}
        {activeTab === 'Settings' && (
          <div className="settings-grid">
            
            {/* Column 1: Pricing Rates Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className={`edit-card ${editPricing ? 'editing' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💰</span> Pricing Rates & Timeout Presets
                  </h3>
                  {!editPricing && (
                    <button 
                      onClick={() => setEditPricing(true)}
                      style={{
                        padding: '6px 14px',
                        background: '#e6f4f1',
                        color: '#0d9488',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Edit 📝 
                    </button>
                  )}
                </div>

                {!editPricing ? (
                  /* Read-Only Pricing View */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Black & White Print Rate:</span>
                      <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800 }}>₹ {settingsForm.bwRate} / page</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Color Print Rate:</span>
                      <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800 }}>₹ {settingsForm.colorRate} / page</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Priority Order Fee:</span>
                      <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800 }}>₹ {settingsForm.priorityFee}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Auto-Delete Pending Queue:</span>
                      <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800 }}>{settingsForm.autoDeleteHours} hours</span>
                    </div>
                  </div>
                ) : (
                  /* Editable Pricing Form */
                  <form onSubmit={handleSaveSettings} style={styles.settingsForm}>
                    <div style={styles.formGroup}>
                      <label style={styles.settingsLabel}>Black & White Rate (₹ per page)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={settingsForm.bwRate}
                        onChange={e => setSettingsForm({ ...settingsForm, bwRate: parseFloat(e.target.value) })}
                        style={styles.settingsInput}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.settingsLabel}>Color Rate (₹ per page)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={settingsForm.colorRate}
                        onChange={e => setSettingsForm({ ...settingsForm, colorRate: parseFloat(e.target.value) })}
                        style={styles.settingsInput}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.settingsLabel}>Priority Order Fee (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={settingsForm.priorityFee}
                        onChange={e => setSettingsForm({ ...settingsForm, priorityFee: parseFloat(e.target.value) })}
                        style={styles.settingsInput}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.settingsLabel}>Auto-Delete Queue Timeout (Hours)</label>
                      <input
                        type="number"
                        min="1"
                        value={settingsForm.autoDeleteHours}
                        onChange={e => setSettingsForm({ ...settingsForm, autoDeleteHours: parseInt(e.target.value) })}
                        style={styles.settingsInput}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPricing(false);
                          setSettingsForm(prev => ({
                            ...prev,
                            bwRate: shop.pricing?.bwRate || 2,
                            colorRate: shop.pricing?.colorRate || 8,
                            priorityFee: shop.pricing?.priorityFee || 10,
                            autoDeleteHours: shop.autoDeleteHours || 24
                          }));
                        }}
                        style={{
                          flex: 1,
                          padding: '11px',
                          background: '#f1f5f9',
                          border: 'none',
                          color: '#475569',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={settingsSaving}
                        style={{
                          flex: 2,
                          padding: '11px',
                          background: '#0d9488',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {settingsSaving ? 'Saving...' : 'Save Presets'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Column 2: Profile details & Logout actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className={`edit-card ${editProfile ? 'editing' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🏪</span> Shop Profile details
                  </h3>
                  {!editProfile && (
                    <button 
                      onClick={() => setEditProfile(true)}
                      style={{
                        padding: '6px 14px',
                        background: '#e6f4f1',
                        color: '#0d9488',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                {!editProfile ? (
                  /* Read-Only Profile View */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Shop Name:</span>
                      <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 705 }}>{settingsForm.shopName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Owner Name:</span>
                      <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 705 }}>{settingsForm.ownerName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>WhatsApp Number:</span>
                      <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 705 }}>+91 {settingsForm.whatsappNumber}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Location State:</span>
                      <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 705 }}>{settingsForm.state || 'N/A'}</span>
                    </div>
                  </div>
                ) : (
                  /* Editable Profile Form */
                  <form onSubmit={handleSaveSettings} style={styles.settingsForm}>
                    <div style={styles.formGroup}>
                      <label style={styles.settingsLabel}>Shop Name</label>
                      <input
                        type="text"
                        value={settingsForm.shopName}
                        onChange={e => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                        style={styles.settingsInput}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.settingsLabel}>Owner Name</label>
                      <input
                        type="text"
                        value={settingsForm.ownerName}
                        onChange={e => setSettingsForm({ ...settingsForm, ownerName: e.target.value })}
                        style={styles.settingsInput}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.settingsLabel}>WhatsApp Number</label>
                      <input
                        type="tel"
                        pattern="[0-9]{10}"
                        value={settingsForm.whatsappNumber}
                        onChange={e => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                        style={styles.settingsInput}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.settingsLabel}>State</label>
                      <select
                        value={settingsForm.state}
                        onChange={e => setSettingsForm({ ...settingsForm, state: e.target.value })}
                        style={{ ...styles.settingsInput, background: '#fff', cursor: 'pointer' }}
                        required
                      >
                        <option value="">Select State</option>
                        {statesList.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditProfile(false);
                          setSettingsForm(prev => ({
                            ...prev,
                            shopName: shop.shopName || '',
                            ownerName: shop.ownerName || '',
                            whatsappNumber: shop.whatsappNumber || '',
                            state: shop.state || ''
                          }));
                        }}
                        style={{
                          flex: 1,
                          padding: '11px',
                          background: '#f1f5f9',
                          border: 'none',
                          color: '#475569',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={settingsSaving}
                        style={{
                          flex: 2,
                          padding: '11px',
                          background: '#0d9488',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {settingsSaving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Session Log Out Card */}
            
            </div>
          </div>
        )}

      </main>

      {/* ── PRINTING OVERLAY MODAL (POPUP DIALOG CARD) ── */}
      {activePrintOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }} onClick={() => setActivePrintOrder(null)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '460px',
            padding: '28px 24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            fontFamily: "'Outfit', sans-serif",
            border: '1px solid #cbd5e1'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#021a36', margin: 0 }}>
                <span style={{ color: '#ff0000', marginRight: '6px' }}>{activePrintOrder.token}</span> Select File to Print
              </h3>
              <button 
                onClick={() => setActivePrintOrder(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#64748b', 
                  fontSize: '24px', 
                  lineHeight: '1',
                  fontWeight: 'bold',
                  padding: '4px' 
                }}
              >
                &times;
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px', fontWeight: 500 }}>
              Tip: Use system dialog settings for paper size & color.
            </p>

            {/* Files List mapping */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
              {activePrintOrder.files?.map((file, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  gap: '12px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.fileName}
                    </p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{file.pages} pages</span>
                      <span>&bull;</span>
                      <span style={{
                        background: file.colorMode === 'color' ? '#f5f3ff' : '#f1f5f9',
                        color: file.colorMode === 'color' ? '#7c3aed' : '#475569',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '10px'
                      }}>
                        {file.colorMode === 'color' ? 'Color' : 'B&W'}
                      </span>
                      {file.copies > 1 && (
                        <>
                          <span>&bull;</span>
                          <span style={{ fontWeight: 700 }}>{file.copies} copies</span>
                        </>
                      )}
                      <span>&bull;</span>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                    </p>
                  </div>
                  
                  {/* Print and download action icon controls */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleDownloadFile(activePrintOrder, file)}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        cursor: 'pointer',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Download File"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => handlePrintFile(activePrintOrder, file)}
                      style={{
                        background: '#0d9488',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        cursor: 'pointer',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Print File"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer action button */}
            <button
              onClick={() => handleDownloadAllFiles(activePrintOrder)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Download size={16} /> Download All Files
            </button>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION OVERLAY MODAL ── */}
      {confirmDeleteOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }} onClick={() => setConfirmDeleteOrder(null)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '400px',
            padding: '32px 28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            fontFamily: "'Outfit', sans-serif",
            border: '1px solid #cbd5e1',
            textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: '56px',
              height: '56px',
              background: '#fee2e2',
              color: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '24px'
            }}>⚠️</div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#021a36', marginBottom: '8px' }}>
              Delete Order
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '28px' }}>
              Are you sure you want to delete order <strong style={{ color: '#ef4444' }}>{confirmDeleteOrder.token}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setConfirmDeleteOrder(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const token = confirmDeleteOrder.token;
                  setConfirmDeleteOrder(null);
                  await deleteOrder(token);
                  toast.success(`Order ${token} dismissed`);
                }}
                style={{
                  flex: 1.5,
                  padding: '12px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  sidebarBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
    padding: '0 8px',
  },
  logoBox: {
    width: 32,
    height: 32,
    background: '#0d9488',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 900,
    fontSize: '16px',
    flexShrink: 0,
  },
  brandText: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.5px',
  },
  shopInfoCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '24px',
  },
  shopNameText: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  shopIdText: {
    fontSize: '16px',
    color: '#dde5efff',
    fontFamily: 'monospace',
    margin: '4px 0 0',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexGrow: 1,
  },
  sidebarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#94a3b8',
    textDecoration: 'none',
  },
  sidebarLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: 600,
    color:'#c80909ff',
    marginTop: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '28px',
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#021a36',
    margin: 0,
  },
  headerStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#fff',
    padding: '8px 16px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    border: '1px solid #e2e8f0',
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    background: '#22c55e',
    borderRadius: '50%',
  },
  card: {
    background: '#fff',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
    padding: '24px 28px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '20px',
  },
  searchInput: {
    flexGrow: 1,
    padding: '11px 16px',
    border: '1.5px solid #cbd5e1',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 18px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    color: '#475569',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeaderRow: {
    borderBottom: '2px solid #e2e8f0',
  },
  th: {
    padding: '14px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.08em',
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9',
  },
  expandedRow: {
    background: '#f8fafc',
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '16px',
    verticalAlign: 'middle',
  },
  tokenLabel: {
    background: '#f64a4a2c',
    color: '#ff0000ff',
    fontWeight: 800,
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '20px',
    fontFamily: 'monospace',
    border: '2px solid #f64a4a',
    backdropFilter: 'blur(4px)',
  },
  printBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#0d9488',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 600,
  },
  costText: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#0f172a',
  },
  badge: (bg, color) => ({
    background: bg,
    color: color,
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    display: 'inline-block',
  }),
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #e2e8f0',
    borderTopColor: '#0d9488',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    margin: '0 auto',
  },
  statCard: {
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
    border: '1px solid rgba(0,0,0,0.02)',
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: 600,
    margin: '0 0 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 800,
    margin: 0,
  },
  qrActionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '320px',
  },
  // btnPrimaryLarge styling has been moved to components/PrintQRPoster.jsx
  btnSecondaryLarge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  urlDisplayRow: {
    display: 'flex',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '8px 12px',
    alignItems: 'center',
    gap: '12px',
  },
  urlText: {
    flexGrow: 1,
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#475569',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  copyBtn: {
    background: '#e6f4f1',
    border: 'none',
    color: '#0d9488',
    borderRadius: '8px',
    padding: '6px',
    cursor: 'pointer',
    display: 'flex',
  },
  qrFrame: {
    background: '#fff',
    border: '1.5px solid #e2e8f0',
    borderRadius: '16px',
    padding: '24px',
  },
  settingsForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '100%',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  settingsLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#475569',
  },
  settingsInput: {
    padding: '11px 14px',
    border: '1.5px solid #cbd5e1',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#334155'
  }
};