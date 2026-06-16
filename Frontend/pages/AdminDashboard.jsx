// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shops');
  const [expandedShopId, setExpandedShopId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [shopsRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/api/shops/admin/shops`, { headers }),
        axios.get(`${API}/api/shops/admin/analytics`, { headers })
      ]);

      setShops(shopsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const updateShopStatus = async (shopId, status) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(
        `${API}/api/shops/admin/approve/${shopId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Shop status set to ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const toggleBlockStatus = async (shopId, currentBlockedStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const newBlocked = !currentBlockedStatus;
      await axios.patch(
        `${API}/api/shops/admin/block/${shopId}`,
        { isBlocked: newBlocked },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(newBlocked ? "Shop Blocked" : "Shop Unblocked");
      fetchData();
    } catch (error) {
      toast.error("Failed to update block status");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
    toast.success("Logged out successfully");
  };

  const getShopStats = (shopId) => {
    if (!analytics.shopStats) return { totalOrders: 0, totalRevenue: 0, pendingOrders: 0 };
    const stat = analytics.shopStats.find(s => s._id?.toUpperCase() === shopId?.toUpperCase());
    return stat || { totalOrders: 0, totalRevenue: 0, pendingOrders: 0 };
  };

  const toggleExpandRow = (shopId) => {
    setExpandedShopId(expandedShopId === shopId ? null : shopId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center text-white font-black text-lg">P</div>
          <span className="text-xl font-bold tracking-tight text-slate-900">PrintFastX <span className="text-teal-600 text-sm font-medium px-2 py-0.5 bg-teal-50 border border-teal-200 rounded-md ml-1">Admin</span></span>
        </div>
        <button 
          onClick={handleLogout} 
          className="px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition duration-150"
        >
          Logout to Home
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Active Shops</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{analytics.totalShops || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Platform Orders</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{analytics.totalOrders || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Gross revenue</p>
            <p className="text-3xl font-extrabold text-teal-600 mt-2">
              ₹{analytics.shopStats?.reduce((sum, item) => sum + (item.totalRevenue || 0), 0) || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Platform Health</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">Active</p>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex gap-4 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('shops')}
            className={`pb-3 px-4 font-bold text-sm tracking-wide transition duration-150 ${activeTab === 'shops' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            PARTNER SHOPS
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-4 font-bold text-sm tracking-wide transition duration-150 ${activeTab === 'analytics' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            ORDER METRICS & DISTRIBUTION
          </button>
        </div>

        {/* Shops Tab */}
        {activeTab === 'shops' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-400 tracking-wider">
                  <th className="p-4 pl-6">Shop ID</th>
                  <th className="p-4">Shop Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Revenue</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Blocked</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shops.map(shop => {
                  const isExpanded = expandedShopId === shop.shopId;
                  const stats = getShopStats(shop.shopId);
                  return (
                    <>
                      <tr 
                        key={shop.shopId} 
                        onClick={() => toggleExpandRow(shop.shopId)}
                        className={`border-b border-slate-100 hover:bg-slate-50/70 transition duration-150 cursor-pointer ${isExpanded ? 'bg-slate-50/40' : ''}`}
                      >
                        <td className="p-4 pl-6 font-mono font-bold text-slate-900">{shop.shopId}</td>
                        <td className="p-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{shop.shopName}</span>
                            <span className="text-slate-300 text-xs font-normal">▼ click to expand</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{shop.email}</td>
                        <td className="p-4 font-bold text-teal-600">₹{stats.totalRevenue}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            shop.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 
                            shop.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {shop.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            shop.isBlocked ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {shop.isBlocked ? 'Blocked' : 'No'}
                          </span>
                        </td>
                        <td className="p-4 text-center space-x-2" onClick={e => e.stopPropagation()}>
                          {/* Approval Controls */}
                          {shop.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateShopStatus(shop.shopId, 'approved')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateShopStatus(shop.shopId, 'rejected')}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          
                          {/* Blocking Controls */}
                          {shop.status === 'approved' && (
                            <button
                              onClick={() => toggleBlockStatus(shop.shopId, shop.isBlocked)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm text-white ${
                                shop.isBlocked 
                                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                                  : 'bg-rose-600 hover:bg-rose-700'
                              }`}
                            >
                              {shop.isBlocked ? 'Unblock Partner' : 'Block Partner'}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Setup & Statistics details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <td colSpan={7} className="p-6 pl-12">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Onboarding Profile details */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">🏪 SETUP INFORMATION</h4>
                                <div className="space-y-2 text-sm text-slate-600">
                                  <p><strong className="text-slate-800 font-semibold">Owner Name:</strong> {shop.ownerName || 'N/A'}</p>
                                  <p>
                                    <strong className="text-slate-800 font-semibold">WhatsApp Number:</strong>{' '}
                                    {shop.whatsappNumber ? (
                                      <a 
                                        href={`https://wa.me/91${shop.whatsappNumber}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-teal-600 font-semibold underline hover:text-teal-800"
                                      >
                                        +91 {shop.whatsappNumber}
                                      </a>
                                    ) : 'N/A'}
                                  </p>
                                  <p><strong className="text-slate-800 font-semibold">State:</strong> {shop.state || 'N/A'}</p>
                                  <p><strong className="text-slate-800 font-semibold">Referral Code:</strong> {shop.referralCode || 'None'}</p>
                                  <p><strong className="text-slate-800 font-semibold">Address:</strong> {shop.address || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Rates & Configuration */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">💰 RATES & TIMEOUTS</h4>
                                <div className="space-y-2 text-sm text-slate-600">
                                  <p><strong className="text-slate-800 font-semibold">B&W Rate:</strong> ₹{shop.pricing?.bwRate || 2} per page</p>
                                  <p><strong className="text-slate-800 font-semibold">Color Rate:</strong> ₹{shop.pricing?.colorRate || 8} per page</p>
                                  <p><strong className="text-slate-800 font-semibold">Auto-Delete Time:</strong> {shop.autoDeleteHours || 24} hours</p>
                                  <p><strong className="text-slate-800 font-semibold">Authentication Type:</strong> {shop.authProvider}</p>
                                  <p><strong className="text-slate-800 font-semibold">Created Date:</strong> {new Date(shop.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>

                              {/* Shop metrics summary */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">📊 ORDER STATISTICS</h4>
                                <div className="space-y-2 text-sm text-slate-600">
                                  <p><strong className="text-slate-800 font-semibold">Total Orders:</strong> {stats.totalOrders} submissions</p>
                                  <p><strong className="text-slate-800 font-semibold">Total Revenue:</strong> <span className="font-bold text-teal-600">₹{stats.totalRevenue}</span></p>
                                  <p><strong className="text-slate-800 font-semibold">Pending Print Queue:</strong> {stats.pendingOrders} orders</p>
                                  <p><strong className="text-slate-800 font-semibold">Token Counter:</strong> #{shop.orderCounter || 0}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Platform Order Statistics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Stats table */}
              <div className="border border-slate-200 rounded-xl p-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Shop Revenue Distribution</h4>
                <div className="space-y-4">
                  {analytics.shopStats?.map(stat => {
                    const matchedShop = shops.find(s => s.shopId?.toUpperCase() === stat._id?.toUpperCase());
                    return (
                      <div key={stat._id} className="flex justify-between items-center pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-slate-800">{matchedShop?.shopName || stat._id}</p>
                          <p className="text-xs text-slate-400">{stat.totalOrders} Orders · ID: {stat._id}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-teal-600">₹{stat.totalRevenue}</p>
                          <p className="text-xs text-slate-400">{stat.pendingOrders} pending</p>
                        </div>
                      </div>
                    );
                  })}
                  {(!analytics.shopStats || analytics.shopStats.length === 0) && (
                    <p className="text-sm text-slate-400">No order statistics recorded yet.</p>
                  )}
                </div>
              </div>

              {/* JSON preview for metrics log */}
              <div className="border border-slate-200 rounded-xl p-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Raw Aggregation Logs</h4>
                <pre className="bg-slate-50 p-4 rounded-xl text-xs font-mono text-slate-600 overflow-auto max-h-[300px]">
                  {JSON.stringify(analytics, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
