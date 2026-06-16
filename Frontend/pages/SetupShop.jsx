// pages/SetupShop.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SetupShop() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shop, setShop] = useState(null);
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    whatsappNumber: '',
    address: '',
    referralCode: '',
    state: ''
  });

  const statesList = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
  ];

  // Auth guard and initial state check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const shopData = localStorage.getItem('shop');
    if (!token || !shopData) {
      navigate('/login');
      return;
    }
    const parsedShop = JSON.parse(shopData);
    setShop(parsedShop);
    
    // If approved, go to dashboard
    if (parsedShop.onboarded && parsedShop.status === 'approved') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'shopName') {
      // Letters, numbers, and spaces only
      const cleanVal = value.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 24);
      setFormData(prev => ({ ...prev, [name]: cleanVal }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDetectAddress = () => {
    if (navigator.geolocation) {
      toast.loading("Detecting location...", { id: "geo" });
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            toast.dismiss("geo");
            if (data && data.display_name) {
              setFormData(prev => ({ ...prev, address: data.display_name }));
              toast.success("Location detected!");
            } else {
              toast.error("Failed to parse address.");
            }
          } catch {
            toast.dismiss("geo");
            toast.error("Reverse geocoding failed.");
          }
        },
        () => {
          toast.dismiss("geo");
          toast.error("Geolocation access denied or failed.");
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.state) {
      toast.error("Please select your state");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/api/shops/onboard`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('shop', JSON.stringify(res.data.shop));
      setShop(res.data.shop);
      toast.success("Profile submitted for approval!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logs out the shopkeeper during the onboarding setup phase.
   * Clears auth credentials, returns to the login screen, and replaces
   * the current history record to protect dashboard access.
   */
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
    toast.success("Logged out successfully");
  };

  if (!shop) return null;

  // Pending Approval State Screen
  if (shop.onboarded && shop.status === 'pending') {
    return (
      <div className="setup-shop-page" style={styles.page}>
        <div className="setup-shop-card" style={styles.card}>
          <div style={styles.iconCircle}>
            <span style={{ fontSize: '36px' }}>⏳</span>
          </div>
          <h2 style={styles.title}>Waiting for Approval</h2>
          <p style={styles.subtitle}>
            Your shop profile details are submitted and pending admin review. You'll get full dashboard access once approved.
          </p>

          <div style={styles.detailsCard}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Shop ID:</span>
              <span style={styles.detailValue}>{shop.shopId || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Shop Name:</span>
              <span style={styles.detailValue}>{shop.shopName}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Status:</span>
              <span style={{ ...styles.detailValue, color: '#f59e0b', fontWeight: 700 }}>PENDING</span>
            </div>
          </div>

          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Reject State Screen
  if (shop.onboarded && shop.status === 'rejected') {
    return (
      <div className="setup-shop-page" style={styles.page}>
        <div className="setup-shop-card" style={styles.card}>
          <div style={{ ...styles.iconCircle, background: '#fee2e2' }}>
            <span style={{ fontSize: '36px' }}>❌</span>
          </div>
          <h2 style={styles.title}>Application Rejected</h2>
          <p style={styles.subtitle}>
            Unfortunately, your request to open a print shop has been rejected by the admin. Please contact support for more details.
          </p>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Onboarding Setup Form Screen
  return (
    <div className="setup-shop-page" style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 480px) {
          .setup-shop-page {
            padding: 16px !important;
          }
          .setup-shop-card {
            padding: 24px 16px !important;
            border-radius: 16px !important;
          }
        }
      `}</style>
      <div className="setup-shop-card" style={styles.card}>
        <div style={styles.formIconBox}>
          <span style={{ fontSize: '24px' }}>🏪</span>
        </div>
        <h2 style={styles.formTitle}>Setup Your Print Shop</h2>
        <p style={styles.formSubtitle}>You're almost there! Create a profile to start receiving orders.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Shop Name</label>
            <input
              type="text"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              required
              placeholder="e.g. Sharma Printouts"
              style={styles.input}
            />
            <span style={styles.hint}>Letters, numbers and spaces only · {formData.shopName.length}/24</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Owner Name</label>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              required
              placeholder="e.g. Mohan Sharma"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Whatsapp Number</label>
            <input
              type="tel"
              name="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={handleChange}
              required
              pattern="[0-9]{10}"
              placeholder="e.g. 9876673210"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Shop Address</label>
            <div style={styles.addressWrapper}>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="Shop No, Landmark, City, District"
                style={{ ...styles.input, flex: 1, paddingRight: '90px' }}
              />
              <button type="button" onClick={handleDetectAddress} style={styles.detectBtn}>
                📍 Detect
              </button>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Referral Code <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
            <input
              type="text"
              name="referralCode"
              value={formData.referralCode}
              onChange={handleChange}
              placeholder="E.G. PRINTDECK12345"
              style={styles.input}
            />
            <span style={styles.hint}>If someone referred you, enter their code here.</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>State</label>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              style={styles.select}
            >
              <option value="">Select State</option>
              {statesList.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Submitting...' : 'Create Shop & Opens Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Styles ── */
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '460px',
  },
  iconCircle: {
    width: '80px',
    height: '80px',
    background: '#fef3c7',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#021a36',
    textAlign: 'center',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: '32px',
  },
  detailsCard: {
    background: '#f8fafc',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    marginBottom: '32px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  detailLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#64748b',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#021a36',
  },
  logoutBtn: {
    width: '100%',
    padding: '12px',
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  formIconBox: {
    width: '48px',
    height: '48px',
    background: '#eff6ff',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  formTitle: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#021a36',
    marginBottom: '6px',
  },
  formSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    padding: '12px 14px',
    border: '1.5px solid #cbd5e1',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  addressWrapper: {
    position: 'relative',
    display: 'flex',
  },
  detectBtn: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  select: {
    padding: '12px 14px',
    border: '1.5px solid #cbd5e1',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#fff',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  hint: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  submitBtn: {
    marginTop: '10px',
    padding: '14px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};
