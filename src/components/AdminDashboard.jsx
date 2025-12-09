import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, DollarSign, Calendar, TrendingUp, Users, FileText, CreditCard } from 'lucide-react';
import LoanCalculator from './LoanCalculator';

// Import shared utilities and context (we'll need to export these from App.jsx)
// For now, we'll duplicate the necessary functions here

// API Service URL
// Force production API URL for Vercel deployment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
console.log('🔍 AdminDashboard API_URL:', API_URL);

// Collateral assessment function
const assessCollateralValue = ({
  marketValue = 0,
  ageYears = 0,
  depreciationPctPerYear = 10,
  liquidityDiscountPct = 15,
}) => {
  const mv = Number(marketValue || 0);
  const dep = Math.max(0, 1 - (Number(depreciationPctPerYear) / 100) * Number(ageYears));
  const depreciated = mv * dep;
  const afterLiquidity = depreciated * (1 - Number(liquidityDiscountPct) / 100);
  const assessed = afterLiquidity;
  return {
    depreciated,
    afterLiquidity,
    assessed,
  };
};

// API service
const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || 'Request failed';
      } catch (parseError) {
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch (parseError) {
      console.warn('Response is not valid JSON:', parseError);
      return {};
    }
  },

  getAdminDashboard: () => api.request('/reports/dashboard'),
  getApplications: () => api.request('/admin/applications'),
  getAllLoans: () => api.request('/admin/loans'),
  getAllCollateral: () => api.request('/admin/collateral'),
  assessCollateral: (id, payload) => api.request(`/admin/collateral/${id}/assess`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  reviewApplication: (id, status, notes) => api.request(`/admin/applications/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify({ status, review_notes: notes }),
  }),
  deleteApplication: (id) => api.request(`/admin/applications/${id}`, {
    method: 'DELETE',
  }),
  createAdmin: (adminData) => api.request('/auth/create-admin', {
    method: 'POST',
    body: JSON.stringify(adminData),
  }),
  deleteCollateral: (id) => api.request(`/admin/collateral/${id}`, {
    method: 'DELETE',
  }),
};

// CollateralAssessment Component
const CollateralAssessment = ({ item, onAssess }) => {
  const [form, setForm] = useState({
    marketValue: item?.market_value || '',
    ageYears: 0,
    depreciationPctPerYear: 10,
    liquidityDiscountPct: 15,
  });

  const result = assessCollateralValue(form);

  return (
    <div className="space-y-6">
      <div className="border-t pt-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">💰 Assessment Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Market Value (ZMK)</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900" 
              type="number" 
              placeholder="Market Value" 
              value={form.marketValue} 
              onChange={e=>setForm(v=>({...v, marketValue:e.target.value}))} 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Age (years)</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900" 
              type="number" 
              placeholder="Age (years)" 
              value={form.ageYears} 
              onChange={e=>setForm(v=>({...v, ageYears:e.target.value}))} 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Depreciation (%/year)</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900" 
              type="number" 
              placeholder="Depreciation %/yr" 
              value={form.depreciationPctPerYear} 
              onChange={e=>setForm(v=>({...v, depreciationPctPerYear:e.target.value}))} 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Liquidity Discount (%)</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900" 
              type="number" 
              placeholder="Liquidity Discount %" 
              value={form.liquidityDiscountPct} 
              onChange={e=>setForm(v=>({...v, liquidityDiscountPct:e.target.value}))} 
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Assessment Results</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Depreciated Value:</span>
            <span className="text-gray-900 font-bold text-lg">ZMK {result.depreciated.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">After Liquidity Discount:</span>
            <span className="text-gray-900 font-bold text-lg">ZMK {result.afterLiquidity.toFixed(2)}</span>
          </div>
          <div className="border-t-2 border-green-300 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-green-800 font-bold text-lg">Final Assessed Value:</span>
              <span className="text-green-700 font-bold text-2xl">ZMK {result.assessed.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <button 
        className="w-full bg-indigo-600 text-white font-bold text-lg px-6 py-4 rounded-lg hover:bg-indigo-700 transition shadow-lg" 
        onClick={()=>onAssess(result.assessed)}
      >
        ✅ Save Assessment
      </button>
    </div>
  );
};

// Main AdminDashboard Component
const AdminDashboard = ({ useAuth }) => {
  const [dashboard, setDashboard] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loans, setLoans] = useState([]);
  const [adminCollateral, setAdminCollateral] = useState([]);
  const [selectedCollateral, setSelectedCollateral] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLoanCalculator, setShowLoanCalculator] = useState(false);
  const [calculatorMode, setCalculatorMode] = useState('collateral'); // 'collateral' or 'weekly'
  const [loanCalculation, setLoanCalculation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    secret_key: ''
  });
  const [branchFilter, setBranchFilter] = useState(''); // Branch filtering state
  const [loanStatusFilter, setLoanStatusFilter] = useState('all'); // 'all', 'active', 'closed'
  const [showPaidLoans, setShowPaidLoans] = useState(false); // Show/hide fully paid loans in applications
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'applications', 'collateral'
  const { logout } = useAuth();

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [actionState, setActionState] = useState({ id: null, type: null });
  const setRowWorking = (id, type) => setActionState({ id, type });
  const clearRowWorking = () => setActionState({ id: null, type: null });
  const optimisticallySetStatus = (id, status) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };
  const optimisticallyRemove = (id) => {
    setApplications(prev => prev.filter(a => a.id !== id));
  };

  const loadData = async () => {
    try {
      const [dashData, appData, loanData, colData] = await Promise.all([
        api.getAdminDashboard(),
        api.getApplications(),
        api.getAllLoans().catch(() => []),
        api.getAllCollateral().catch(()=>[])
      ]);
      
      
      setDashboard(dashData);
      setApplications(appData);
      setLoans(Array.isArray(loanData) ? loanData : []);
      setAdminCollateral(Array.isArray(colData) ? colData : []);
    } catch (err) {
      console.error('❌ Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-indigo-200 sticky top-0 z-40">
        <div className="max-w-full md:max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 md:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center justify-center gap-1 md:gap-4 flex-1 min-w-0">
              <img 
                src="/company-logo.png" 
                alt="Company Logo" 
                className="h-8 w-8 object-contain flex-shrink-0"
                style={{maxHeight: '32px', maxWidth: '32px'}}
              />
              <div className="min-w-0 hidden md:block text-center">
                <h1 className="text-lg md:text-3xl font-bold text-gray-900">PHILIX Finance</h1>
                <p className="text-xs md:text-sm text-gray-700 font-medium">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
              <button
                onClick={() => setShowLoanCalculator(true)}
                className="bg-indigo-600 text-black px-1.5 py-1 md:px-4 md:py-2 rounded md:rounded-lg hover:bg-indigo-700 transition font-black shadow-md hover:shadow-xl border border-indigo-400 md:border-2 text-xs md:text-lg"
              >
                🧮 <span className="hidden md:inline">Calculator</span>
              </button>
              <button
                onClick={() => setShowCreateAdmin(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-black px-1.5 py-1 md:px-4 md:py-2 rounded md:rounded-lg hover:from-purple-700 hover:to-purple-800 transition font-black shadow-md hover:shadow-xl border border-purple-400 md:border-2 text-xs md:text-lg"
              >
                👤 <span className="hidden md:inline">Create Admin</span>
              </button>
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-600 to-red-700 text-black px-1.5 py-1 md:px-5 md:py-2.5 rounded md:rounded-lg hover:from-red-700 hover:to-red-800 transition font-black shadow-md hover:shadow-xl border border-red-400 md:border-2 text-xs md:text-lg"
              >
                🚪 <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-[60px] md:top-[76px] z-30 shadow-sm">
        <div className="max-w-full md:max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex gap-1 md:gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 md:px-6 py-3 md:py-4 font-bold text-xs md:text-base whitespace-nowrap transition-all ${
                activeTab === 'overview'
                  ? 'border-b-4 border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-3 md:px-6 py-3 md:py-4 font-bold text-xs md:text-base whitespace-nowrap transition-all ${
                activeTab === 'applications'
                  ? 'border-b-4 border-orange-600 text-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📄 Applications {applications?.length > 0 && `(${applications.length})`}
            </button>
            <button
              onClick={() => setActiveTab('collateral')}
              className={`px-3 md:px-6 py-3 md:py-4 font-bold text-xs md:text-base whitespace-nowrap transition-all ${
                activeTab === 'collateral'
                  ? 'border-b-4 border-purple-600 text-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📦 Collateral {adminCollateral?.filter(c => !c.assessed_value).length > 0 && `(${adminCollateral.filter(c => !c.assessed_value).length})`}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-full md:max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Admin Overview</h2>
          <p className="text-sm md:text-base text-gray-700 mb-4 md:mb-6 font-medium">Monitor and manage all loan applications, collateral, and portfolio performance</p>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200 p-3 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-green-900 font-bold text-xs md:text-sm uppercase tracking-wide">Active Loans</h3>
                <div className="bg-green-600 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="text-white" size={16} />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-green-900">{dashboard?.activeLoans || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border-2 border-indigo-200 p-4 md:p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-indigo-900 font-bold text-xs md:text-sm uppercase tracking-wide break-words">Total Outstanding</h3>
                <div className="bg-indigo-600 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <DollarSign className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl md:text-4xl font-bold text-indigo-900 break-words">
                ZMK {(dashboard?.totalOutstanding || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200 p-4 md:p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-orange-900 font-bold text-xs md:text-sm uppercase tracking-wide break-words">Pending Apps</h3>
                <div className="bg-orange-600 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="text-white" size={16} />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-orange-900">{dashboard?.pendingApplications || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 p-4 md:p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-purple-900 font-bold text-xs md:text-sm uppercase tracking-wide break-words">Total Borrowers</h3>
                <div className="bg-purple-600 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="text-white" size={16} />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-purple-900">{dashboard?.totalBorrowers || 0}</p>
            </div>
          </div>
        </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 md:p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 w-12 h-12 rounded-full flex items-center justify-center">
                <FileText className="text-white" size={24} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Loan Applications</h2>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-gray-700">🎓 Branch:</label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="">All Applications</option>
                  <option value="unza">🎓 Lusaka Branch</option>
                  <option value="cbu">🎓 CBU - Copperbelt University</option>
                  <option value="unilus">🎓 UNILUS - University of Lusaka</option>
                  <option value="other-institution">🏫 Other Educational Institution</option>
                  <option value="general-public">👥 General Public (Non-Student)</option>
                  <option value="no-branch">📍 No Branch Specified</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPaidLoans"
                  checked={showPaidLoans}
                  onChange={(e) => setShowPaidLoans(e.target.checked)}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="showPaidLoans" className="text-sm font-bold text-gray-700">
                  💰 Show Fully Paid Loans
                </label>
              </div>
            </div>
          </div>
          {(() => {
            // Filter applications and apply branch filter and payment status filter
            const filteredApplications = applications.filter(app => {
              // Apply branch filter
              if (branchFilter) {
                if (branchFilter === 'no-branch') {
                  if (app.branch) return false; // Hide if has branch when filtering for no-branch
                } else {
                  if (app.branch !== branchFilter) return false; // Hide if branch doesn't match
                }
              }
              
              // Apply fully paid loan filter
              if (!showPaidLoans) {
                const associatedLoan = loans.find(loan => loan.application_id === app.id);
                if (associatedLoan && associatedLoan.status === 'closed' && parseFloat(associatedLoan.outstanding_balance) === 0) {
                  return false; // Hide fully paid loans when checkbox is unchecked
                }
              }
              
              return true;
            });

            // Calculate summary stats
            const totalApplications = applications.length;
            const fullyPaidCount = applications.filter(app => {
              const associatedLoan = loans.find(loan => loan.application_id === app.id);
              return associatedLoan && associatedLoan.status === 'closed' && parseFloat(associatedLoan.outstanding_balance) === 0;
            }).length;
            const activeCount = totalApplications - fullyPaidCount;
            
            return (
              <>
                {/* Summary Stats */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-orange-900">{totalApplications}</div>
                      <div className="text-sm text-orange-700 font-medium">Total Applications</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-900">{activeCount}</div>
                      <div className="text-sm text-blue-700 font-medium">Active/Pending</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-900">{fullyPaidCount}</div>
                      <div className="text-sm text-green-700 font-medium">Fully Paid</div>
                    </div>
                  </div>
                  <div className="text-center mt-3 text-sm text-gray-700">
                    Showing <strong>{filteredApplications.length}</strong> of <strong>{totalApplications}</strong> applications
                    {!showPaidLoans && fullyPaidCount > 0 && (
                      <span className="text-orange-600 font-bold"> ({fullyPaidCount} fully paid loans hidden)</span>
                    )}
                  </div>
                </div>
                
                {filteredApplications.length > 0 ? (
                <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[1300px]">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[160px]">Borrower</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[140px]">📞 Contact</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[140px]">Amount / Term</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800">Purpose</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[150px]">🎓 Branch</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[120px]">Status</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[220px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app) => {
                      // Find associated loan for this application
                      const associatedLoan = loans.find(loan => loan.application_id === app.id);
                      const isPaidLoan = associatedLoan && associatedLoan.status === 'closed' && parseFloat(associatedLoan.outstanding_balance) === 0;
                      const isActiveLoan = associatedLoan && associatedLoan.status === 'active';
                      
                      return (
                    <tr key={app.id} className={`border-b border-gray-100 hover:bg-gradient-to-r transition ${
                        isPaidLoan ? 'bg-green-50 hover:from-green-50 hover:to-emerald-50' : 
                        'hover:from-indigo-50 hover:to-purple-50'
                      }`}>
                      <td className="py-4 px-4">
                        <div className="font-bold text-gray-900">{app.full_name}</div>
                        <div className="text-xs text-gray-600 font-medium">ID: {app.id}</div>
                      </td>
                      <td className="py-4 px-4">
                        {app.phone_number ? (
                          <a 
                            href={`tel:${app.phone_number}`} 
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold transition-colors group"
                            title="Click to call"
                          >
                            <span className="text-lg group-hover:scale-110 transition-transform">📞</span>
                            <span className="underline">{app.phone_number}</span>
                          </a>
                        ) : (
                          <span className="text-gray-500 text-sm italic">No phone</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-gray-900">ZMK {parseFloat(app.requested_amount).toLocaleString()}</div>
                        <div className="text-xs text-gray-700 font-medium">{app.term_months} week{app.term_months > 1 ? 's' : ''}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700 font-medium max-w-xs truncate">{app.purpose}</div>
                      </td>
                      <td className="py-4 px-4">
                        {app.branch ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {app.branch === 'unza' || app.branch === 'cbu' || app.branch === 'unilus' ? '🎓' :
                               app.branch === 'other-institution' ? '🏫' :
                               app.branch === 'general-public' ? '👥' : '📍'}
                            </span>
                            <div>
                              <div className="font-bold text-gray-900 text-sm">
                                {app.branch === 'unza' ? 'Lusaka Branch' :
                                 app.branch === 'cbu' ? 'CBU' :
                                 app.branch === 'unilus' ? 'UNILUS' :
                                 app.branch === 'other-institution' ? 'Other Institution' :
                                 app.branch === 'general-public' ? 'General Public' :
                                 app.branch.toUpperCase()}
                              </div>
                              <div className="text-xs text-gray-600">
                                {app.branch === 'unza' ? 'Lusaka Branch Office' :
                                 app.branch === 'cbu' ? 'Copperbelt University' :
                                 app.branch === 'unilus' ? 'University of Lusaka' :
                                 app.branch === 'other-institution' ? 'Other Educational Institution' :
                                 app.branch === 'general-public' ? 'Non-Student Application' :
                                 'Unknown Category'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm italic">📍 No branch specified</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          {/* Show meaningful status based on loan state */}
                          {isPaidLoan ? (
                            <span className="px-3 py-1.5 rounded-full text-sm font-bold shadow-sm bg-emerald-100 text-emerald-800 border border-emerald-200">
                              💰 COMPLETED
                              {actionState.id === app.id ? (
                                <span className="ml-2 text-xs italic text-gray-500">(updating…)</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className={`px-3 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                              app.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                              app.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                              'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {app.status}
                              {actionState.id === app.id ? (
                                <span className="ml-2 text-xs italic text-gray-500">(updating…)</span>
                              ) : null}
                            </span>
                          )}
                          
                          {/* Show additional loan status only for active loans */}
                          {associatedLoan && !isPaidLoan && (
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              isActiveLoan ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}>
                              {isActiveLoan ? `💳 ZMK ${parseFloat(associatedLoan.outstanding_balance).toLocaleString()} remaining` :
                               `💳 ${associatedLoan.status}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2 flex-wrap">
                          {app.status === 'pending' ? (
                            <>
                              <button
                                disabled={actionState.id === app.id}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  console.log('✅ APPROVE CLICKED for app:', app.id);
                                  try {
                                    setRowWorking(app.id, 'approve');
                                    console.log('🚀 Sending API request...');
                                    await api.reviewApplication(app.id, 'approved', 'Loan approved by admin');
                                    console.log('✅ API call successful');
                                    console.log('🔄 Reloading page...');
                                    setTimeout(() => {
                                      alert('✓ Loan approved successfully! Borrower: ' + (app.full_name || 'Unknown'));
                                      window.location.reload();
                                    }, 100);
                                  } catch (err) {
                                    console.error('❌ Error:', err);
                                    alert('Error: ' + (err?.message || 'Failed to approve'));
                                  } finally {
                                    console.log('🏁 Clearing working state');
                                    clearRowWorking();
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700 text-black px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                              >
                                {actionState.id === app.id && actionState.type === 'approve' ? '⏳ Working...' : '✓ Approve'}
                              </button>
                              <button
                                disabled={actionState.id === app.id}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  console.log('❌ REJECT CLICKED for app:', app.id);
                                  try {
                                    setRowWorking(app.id, 'reject');
                                    const reason = prompt('Rejection reason (or click Cancel to abort):');
                                    console.log('📝 Reason entered:', reason);
                                    if (reason && reason.trim()) {
                                      console.log('🚀 Sending reject request...');
                                      await api.reviewApplication(app.id, 'rejected', reason);
                                      console.log('✅ Rejection successful');
                                      console.log('🔄 Reloading page...');
                                      setTimeout(() => {
                                        alert('✗ Loan rejected! Borrower: ' + (app.full_name || 'Unknown'));
                                        window.location.reload();
                                      }, 100);
                                    } else {
                                      console.log('⚠️ Rejection cancelled');
                                    }
                                  } catch (err) {
                                    console.error('❌ Error:', err);
                                    alert('Error: ' + (err?.message || 'Failed to reject'));
                                  } finally {
                                    console.log('🏁 Clearing working state');
                                    clearRowWorking();
                                  }
                                }}
                                className="bg-red-600 hover:bg-red-700 text-black px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                              >
                                {actionState.id === app.id && actionState.type === 'reject' ? '⏳ Working...' : '✗ Reject'}
                              </button>
                            </>
                          ) : (
                            <span className={`inline-flex px-3 py-1 rounded text-xs font-medium ${
                              app.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {app.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                            </span>
                          )}
                          
                          <button
                            disabled={actionState.id === app.id}
                            onClick={async (e) => {
                              e.preventDefault();
                              console.log('🗑️ DELETE CLICKED for app:', app.id);
                              try {
                                setRowWorking(app.id, 'delete');
                                console.log('🚀 Sending delete request...');
                                await api.deleteApplication(app.id);
                                console.log('✅ Delete successful');
                                console.log('🔄 Reloading page...');
                                setTimeout(() => {
                                  alert('🗑️ Application deleted! Borrower: ' + (app.full_name || 'Unknown'));
                                  window.location.reload();
                                }, 100);
                              } catch (err) {
                                console.error('❌ Delete error:', err);
                                alert('Error: ' + (err?.message || 'Failed to delete. Application may have an active loan.'));
                              } finally {
                                console.log('🏁 Clearing working state');
                                clearRowWorking();
                              }
                            }}
                            className="bg-gray-600 hover:bg-gray-700 text-black px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                          >
                            {actionState.id === app.id && actionState.type === 'delete' ? '⏳ Working...' : '🗑️ Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {filteredApplications.map((app) => {
                    // Find associated loan for this application
                    const associatedLoan = loans.find(loan => loan.application_id === app.id);
                    const isPaidLoan = associatedLoan && associatedLoan.status === 'closed' && parseFloat(associatedLoan.outstanding_balance) === 0;
                    const isActiveLoan = associatedLoan && associatedLoan.status === 'active';
                    
                    return (
                      <div key={app.id} className={`rounded-xl border-2 p-4 ${
                        isPaidLoan ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}>
                        {/* Header - Borrower Name */}
                        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg">{app.full_name}</h3>
                            <p className="text-xs text-gray-600 font-medium">ID: {app.id}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-2 ${
                            isPaidLoan ? 'bg-green-200 text-green-900' :
                            app.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            app.status === 'approved' ? 'bg-green-100 text-green-800' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {isPaidLoan ? '✅ PAID' : app.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Phone Number */}
                        {app.phone_number && (
                          <div className="mb-3 pb-3 border-b border-gray-200">
                            <p className="text-xs text-gray-600 font-medium mb-1">📞 Contact</p>
                            <a 
                              href={`tel:${app.phone_number}`} 
                              className="text-blue-600 hover:text-blue-800 font-bold underline text-base"
                            >
                              {app.phone_number}
                            </a>
                          </div>
                        )}

                        {/* Amount & Term */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-600 font-medium mb-1">Amount</p>
                            <p className="font-bold text-gray-900">ZMK {parseFloat(app.requested_amount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-medium mb-1">Term</p>
                            <p className="font-bold text-gray-900">{app.term_months} week{app.term_months > 1 ? 's' : ''}</p>
                          </div>
                        </div>

                        {/* Branch */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 font-medium mb-1">Branch</p>
                          {app.branch ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {app.branch === 'unza' || app.branch === 'cbu' || app.branch === 'unilus' ? '🎓' :
                                 app.branch === 'other-institution' ? '🏫' :
                                 app.branch === 'general-public' ? '👥' : '📍'}
                              </span>
                              <span className="font-bold text-gray-900 text-sm">
                                {app.branch === 'unza' ? 'Lusaka Branch' :
                                 app.branch === 'cbu' ? 'CBU' :
                                 app.branch === 'unilus' ? 'UNILUS' :
                                 app.branch === 'other-institution' ? 'Other Institution' :
                                 app.branch === 'general-public' ? 'General Public' :
                                 app.branch.toUpperCase()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm italic">📍 No branch specified</span>
                          )}
                        </div>

                        {/* Purpose */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 font-medium mb-1">Purpose</p>
                          <p className="text-sm text-gray-700">{app.purpose}</p>
                        </div>

                        {/* Loan Status Info */}
                        {isActiveLoan && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                            <p className="text-xs font-bold text-blue-900">💰 Active Loan</p>
                            <p className="text-xs text-blue-700">Outstanding: ZMK {parseFloat(associatedLoan.outstanding_balance).toLocaleString()}</p>
                          </div>
                        )}

                        {isPaidLoan && (
                          <div className="bg-green-100 border border-green-300 rounded-lg p-2 mb-3">
                            <p className="text-xs font-bold text-green-900">✅ Loan Fully Paid</p>
                            <p className="text-xs text-green-700">Total Paid: ZMK {parseFloat(associatedLoan.total_paid).toLocaleString()}</p>
                          </div>
                        )}

                        {/* Actions */}
                        {!isPaidLoan && (
                          <div className="flex gap-2 pt-3 border-t border-gray-200">
                            {app.status === 'pending' && (
                              <>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Approve loan application for ${app.full_name}?`)) return;
                                    setRowWorking(app.id, 'approve');
                                    optimisticallySetStatus(app.id, 'approved');
                                    try {
                                      await api.reviewApplication(app.id, 'approved', 'Approved by admin');
                                      await loadData();
                                    } catch (err) {
                                      alert(err.message);
                                      await loadData();
                                    } finally {
                                      clearRowWorking();
                                    }
                                  }}
                                  disabled={actionState.id === app.id && actionState.type === 'approve'}
                                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition font-bold shadow-md text-sm disabled:opacity-50"
                                >
                                  {actionState.id === app.id && actionState.type === 'approve' ? '⏳' : '✅'} Approve
                                </button>
                                <button
                                  onClick={async () => {
                                    const notes = prompt(`Rejection reason for ${app.full_name}:`, 'Insufficient collateral');
                                    if (!notes) return;
                                    setRowWorking(app.id, 'reject');
                                    optimisticallySetStatus(app.id, 'rejected');
                                    try {
                                      await api.reviewApplication(app.id, 'rejected', notes);
                                      await loadData();
                                    } catch (err) {
                                      alert(err.message);
                                      await loadData();
                                    } finally {
                                      clearRowWorking();
                                    }
                                  }}
                                  disabled={actionState.id === app.id && actionState.type === 'reject'}
                                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition font-bold shadow-md text-sm disabled:opacity-50"
                                >
                                  {actionState.id === app.id && actionState.type === 'reject' ? '⏳' : '❌'} Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete application for ${app.full_name}? This cannot be undone.`)) return;
                                setRowWorking(app.id, 'delete');
                                optimisticallyRemove(app.id);
                                try {
                                  await api.deleteApplication(app.id);
                                  await loadData();
                                } catch (err) {
                                  alert(err.message);
                                  await loadData();
                                } finally {
                                  clearRowWorking();
                                }
                              }}
                              disabled={actionState.id === app.id && actionState.type === 'delete'}
                              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-bold shadow-md text-sm disabled:opacity-50"
                            >
                              {actionState.id === app.id && actionState.type === 'delete' ? '⏳' : '🗑️'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>
              ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-gray-700 text-lg font-semibold">No applications match your filters</p>
                <p className="text-gray-600 text-sm mt-2 font-medium">
                  {!showPaidLoans && fullyPaidCount > 0 
                    ? `${fullyPaidCount} fully paid loans are hidden. Check "Show Fully Paid Loans" to see them.`
                    : "Try adjusting your filters or check back when new applications are submitted."
                  }
                </p>
              </div>
            )}
              </>
            );
          })()}
        </div>
        )}

        {/* Collateral Tab */}
        {activeTab === 'collateral' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 md:p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
                <CreditCard className="text-white" size={24} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Collateral Assessment</h2>
            </div>
          </div>

          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {adminCollateral && adminCollateral.length > 0 ? (
              <div className="space-y-6">
                {adminCollateral.map((item) => (
                  <div key={item.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Collateral Info */}
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-purple-900 mb-4">📋 Collateral Details</h3>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <span className="text-sm font-semibold text-gray-600">Type:</span>
                              <span className="ml-2 font-bold text-gray-900">{item.collateral_type}</span>
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-gray-600">Description:</span>
                              <span className="ml-2 text-gray-900">{item.description}</span>
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-gray-600">Market Value:</span>
                              <span className="ml-2 font-bold text-green-600">ZMK {parseFloat(item.market_value || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-semibold text-gray-600">Status:</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                                  item.assessed_value ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {item.assessed_value ? 'ASSESSED' : 'PENDING'}
                                </span>
                              </div>
                              
                              {/* Delete button for assessed collateral */}
                              {item.assessed_value && (
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`🗑️ Remove this collateral from admin view?\n\nType: ${item.collateral_type}\nMarket Value: ZMK ${parseFloat(item.market_value || 0).toLocaleString()}\nAssessed Value: ZMK ${parseFloat(item.assessed_value || 0).toLocaleString()}\n\nNote: This will hide the collateral from admin dashboard but borrower can still view it.`)) {
                                      try {
                                        console.log('🔄 Attempting to delete collateral ID:', item.id);
                                        console.log('🌐 API URL:', API_URL);
                                        await api.deleteCollateral(item.id);
                                        alert('✅ Collateral deleted successfully!\n\nThis collateral has been permanently removed from the entire system. Neither admin nor borrower will be able to view it.');
                                        
                                        // Reload collateral data
                                        try {
                                          const colData = await api.getAllCollateral();
                                          setAdminCollateral(Array.isArray(colData) ? colData : []);
                                        } catch (reloadErr) {
                                          console.log('Reload error (non-critical):', reloadErr);
                                        }
                                      } catch (err) {
                                        console.error('🚨 Delete error details:', err);
                                        console.error('🚨 Error name:', err.name);
                                        console.error('🚨 Error message:', err.message);
                                        alert('❌ Error deleting collateral: ' + err.message + '\n\nCheck console for details.');
                                      }
                                    }
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-semibold transition-colors duration-200 flex items-center gap-1"
                                  title="Delete assessed collateral"
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Images */}
                        {item.images && item.images.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-700 mb-2">📸 Images</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {item.images.slice(0, 4).map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`Collateral ${idx + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:shadow-lg transition"
                                  onClick={() => {
                                    setLightboxImages(item.images);
                                    setLightboxIndex(idx);
                                    setLightboxOpen(true);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Assessment Panel */}
                      <div className="space-y-4">
                        {selectedCollateral?.id === item.id ? (
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-bold text-green-900">💰 Assessment Panel</h3>
                              <button
                                onClick={() => setSelectedCollateral(null)}
                                className="text-gray-500 hover:text-gray-700 text-lg"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto">
                              <CollateralAssessment
                                item={item}
                                onAssess={async (assessedValue) => {
                                  try {
                                    // Show immediate feedback with more reliable selector
                                    const saveButton = [...document.querySelectorAll('button')].find(btn => 
                                      btn.textContent.includes('Save Assessment')
                                    ) || event?.target;
                                    
                                    if (saveButton) {
                                      const originalText = saveButton.textContent;
                                      saveButton.textContent = '⏳ Saving Assessment...';
                                      saveButton.disabled = true;
                                      saveButton.style.opacity = '0.7';
                                    }
                                    
                                    await api.assessCollateral(item.id, {
                                      assessed_value: assessedValue,
                                      status: 'approved'
                                    });
                                    
                                    // Close assessment panel immediately
                                    setSelectedCollateral(null);
                                    
                                    // Show success message
                                    alert(`✅ Collateral assessed at ZMK ${assessedValue.toLocaleString()}`);
                                    
                                    // Only reload collateral data (much faster than loadData())
                                    try {
                                      const colData = await api.getAllCollateral();
                                      setAdminCollateral(Array.isArray(colData) ? colData : []);
                                    } catch (reloadErr) {
                                      console.log('Reload error (non-critical):', reloadErr);
                                    }
                                  } catch (err) {
                                    alert('❌ Error: ' + err.message);
                                    
                                    // Re-enable button on error
                                    const saveButton = [...document.querySelectorAll('button')].find(btn => 
                                      btn.textContent.includes('Saving Assessment')
                                    ) || event?.target;
                                    if (saveButton) {
                                      saveButton.textContent = '✅ Save Assessment';
                                      saveButton.disabled = false;
                                      saveButton.style.opacity = '1';
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <button
                              onClick={() => setSelectedCollateral(item)}
                              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg px-8 py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl"
                            >
                              🔍 Assess Collateral
                            </button>
                            <p className="text-gray-600 text-sm mt-2">Click to open assessment panel</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📦</div>
                <h3 className="text-xl font-bold text-gray-600 mb-2">No Collateral Items</h3>
                <p className="text-gray-500">No collateral submissions found for assessment.</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Modals and Overlays */}
      {showLoanCalculator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">🧮 Loan Calculator</h2>
                <button
                  onClick={() => setShowLoanCalculator(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              <LoanCalculator mode={calculatorMode} setMode={setCalculatorMode} />
            </div>
          </div>
        </div>
      )}

      {showCreateAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">👤 Create Admin</h2>
              <button
                onClick={() => setShowCreateAdmin(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.createAdmin(adminForm);
                alert('Admin created successfully!');
                setShowCreateAdmin(false);
                setAdminForm({ email: '', password: '', full_name: '', phone_number: '', secret_key: '' });
              } catch (err) {
                alert('Error: ' + err.message);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={adminForm.email}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={adminForm.full_name}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={adminForm.phone_number}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={adminForm.password}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🔑 Secret Key</label>
                  <input
                    type="password"
                    required
                    value={adminForm.secret_key}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, secret_key: e.target.value }))}
                    placeholder="Enter admin secret key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold py-2 px-4 rounded-lg hover:from-purple-700 hover:to-purple-800 transition"
                >
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
            >
              ✕
            </button>
            <img
              src={lightboxImages[lightboxIndex]}
              alt="Collateral"
              className="max-w-full max-h-full object-contain"
            />
            {lightboxImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {lightboxImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`w-3 h-3 rounded-full ${
                      idx === lightboxIndex ? 'bg-white' : 'bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
