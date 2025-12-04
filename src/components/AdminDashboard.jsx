import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, DollarSign, Calendar, TrendingUp, Users, FileText, CreditCard } from 'lucide-react';
import LoanCalculator from './LoanCalculator';

// Import shared utilities and context (we'll need to export these from App.jsx)
// For now, we'll duplicate the necessary functions here

// API Service URL
// Force production API URL for Vercel deployment
const API_URL = 'https://philix-finance-system.vercel.app/api';
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
    phone_number: ''
  });
  const [branchFilter, setBranchFilter] = useState(''); // Branch filtering state
  const [loanStatusFilter, setLoanStatusFilter] = useState('all'); // 'all', 'active', 'closed'
  const [showPaidLoans, setShowPaidLoans] = useState(false); // Show/hide fully paid loans in applications
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="/company-logo.png" 
                alt="Company Logo" 
                className="h-10 w-auto object-contain"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">PHILIX Finance</h1>
                <p className="text-sm text-gray-700 font-medium">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLoanCalculator(true)}
                className="bg-indigo-600 text-black px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-black shadow-lg hover:shadow-xl border-2 border-indigo-400 text-lg"
              >
                🧮 Calculator
              </button>
              <button
                onClick={() => setShowCreateAdmin(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-black px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition font-black shadow-lg hover:shadow-xl border-2 border-purple-400 text-lg"
              >
                👤 Create Admin
              </button>
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-600 to-red-700 text-black px-5 py-2.5 rounded-lg hover:from-red-700 hover:to-red-800 transition font-black shadow-lg hover:shadow-xl border-2 border-red-400 text-lg"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Overview</h2>
          <p className="text-gray-700 mb-6 font-medium">Monitor and manage all loan applications, collateral, and portfolio performance</p>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-green-900 font-bold text-sm uppercase tracking-wide">Active Loans</h3>
                <div className="bg-green-600 w-10 h-10 rounded-full flex items-center justify-center">
                  <FileText className="text-white" size={20} />
                </div>
              </div>
              <p className="text-4xl font-bold text-green-900">{dashboard?.activeLoans || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border-2 border-indigo-200 p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-indigo-900 font-bold text-sm uppercase tracking-wide">Total Outstanding</h3>
                <div className="bg-indigo-600 w-10 h-10 rounded-full flex items-center justify-center">
                  <DollarSign className="text-white" size={20} />
                </div>
              </div>
              <p className="text-4xl font-bold text-indigo-900">
                ZMK {(dashboard?.totalOutstanding || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200 p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-orange-900 font-bold text-sm uppercase tracking-wide">Pending Applications</h3>
                <div className="bg-orange-600 w-10 h-10 rounded-full flex items-center justify-center">
                  <Calendar className="text-white" size={20} />
                </div>
              </div>
              <p className="text-4xl font-bold text-orange-900">{dashboard?.pendingApplications || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-purple-900 font-bold text-sm uppercase tracking-wide">Total Borrowers</h3>
                <div className="bg-purple-600 w-10 h-10 rounded-full flex items-center justify-center">
                  <Users className="text-white" size={20} />
                </div>
              </div>
              <p className="text-4xl font-bold text-purple-900">{dashboard?.totalBorrowers || 0}</p>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 w-12 h-12 rounded-full flex items-center justify-center">
                <FileText className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Loan Applications</h2>
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
                <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[160px]">Borrower</th>
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

        {/* Loans Management - Active and Paid */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center">
                <CreditCard className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">All Loans</h2>
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-gray-700">💰 Filter by Status:</label>
              <select
                value={loanStatusFilter}
                onChange={(e) => setLoanStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Loans</option>
                <option value="active">🟢 Active Loans</option>
                <option value="closed">✅ Paid/Closed Loans</option>
                <option value="defaulted">🔴 Defaulted Loans</option>
              </select>
              <button
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-black px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-black shadow-lg hover:shadow-xl border-2 border-blue-400 text-lg"
                onClick={async()=>{
                  try{
                    const data = await api.getAllLoans();
                    setLoans(Array.isArray(data)?data:[]);
                  }catch(err){
                    alert(err.message);
                  }
                }}
              >🔄 Refresh</button>
            </div>
          </div>

          {(() => {
            // Filter loans by status
            const filteredLoans = loans.filter(loan => {
              if (loanStatusFilter === 'all') return true;
              return loan.status === loanStatusFilter;
            });

            return filteredLoans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[160px]">Borrower</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[120px]">Loan ID</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[140px]">Principal</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[140px]">Outstanding</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[100px]">Payments</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[140px]">Total Paid</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[120px]">Status</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-800 w-[140px]">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.map((loan) => {
                      const isPaid = loan.status === 'closed' && parseFloat(loan.outstanding_balance) === 0;
                      const isActive = loan.status === 'active';
                      const isDefaulted = loan.status === 'defaulted';
                      
                      return (
                        <tr key={loan.id} className={`border-b border-gray-100 hover:bg-gradient-to-r transition ${
                          isPaid ? 'hover:from-green-50 hover:to-emerald-50 bg-green-50' :
                          isActive ? 'hover:from-blue-50 hover:to-indigo-50' :
                          'hover:from-red-50 hover:to-orange-50'
                        }`}>
                          <td className="py-4 px-4">
                            <div className="font-bold text-gray-900">{loan.borrower_name}</div>
                            <div className="text-xs text-gray-600 font-medium">{loan.borrower_email}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-gray-900">#{loan.id}</div>
                            {loan.branch && (
                              <div className="text-xs text-gray-600 font-medium">
                                {loan.branch === 'unza' ? '🎓 Lusaka' :
                                 loan.branch === 'cbu' ? '🎓 CBU' :
                                 loan.branch === 'unilus' ? '🎓 UNILUS' :
                                 loan.branch === 'general-public' ? '👥 Public' : '📍'}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-gray-900">ZMK {parseFloat(loan.principal_amount).toLocaleString()}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className={`font-bold text-lg ${
                              parseFloat(loan.outstanding_balance) === 0 ? 'text-green-600' :
                              parseFloat(loan.outstanding_balance) > parseFloat(loan.principal_amount) * 0.5 ? 'text-red-600' :
                              'text-orange-600'
                            }`}>
                              ZMK {parseFloat(loan.outstanding_balance).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-gray-900">{loan.payment_count}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-green-700">ZMK {parseFloat(loan.total_paid).toLocaleString()}</div>
                            {parseFloat(loan.total_paid) >= parseFloat(loan.principal_amount) && (
                              <div className="text-xs text-green-600 font-bold">✓ Fully Paid</div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                              isPaid ? 'bg-green-100 text-green-800 border border-green-200' :
                              isActive ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              isDefaulted ? 'bg-red-100 text-red-800 border border-red-200' :
                              'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}>
                              {isPaid ? '✅ PAID' :
                               isActive ? '🟢 Active' :
                               isDefaulted ? '🔴 Defaulted' :
                               loan.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-700 font-medium">
                              {new Date(loan.updated_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(loan.updated_at).toLocaleTimeString()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Summary Stats */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 p-4">
                    <div className="text-blue-900 font-bold text-sm uppercase">Active Loans</div>
                    <div className="text-3xl font-bold text-blue-900">
                      {loans.filter(l => l.status === 'active').length}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 p-4">
                    <div className="text-green-900 font-bold text-sm uppercase">Paid Loans</div>
                    <div className="text-3xl font-bold text-green-900">
                      {loans.filter(l => l.status === 'closed' && parseFloat(l.outstanding_balance) === 0).length}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 p-4">
                    <div className="text-purple-900 font-bold text-sm uppercase">Total Disbursed</div>
                    <div className="text-3xl font-bold text-purple-900">
                      ZMK {loans.reduce((sum, l) => sum + parseFloat(l.principal_amount || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-200 p-4">
                    <div className="text-emerald-900 font-bold text-sm uppercase">Total Collected</div>
                    <div className="text-3xl font-bold text-emerald-900">
                      ZMK {loans.reduce((sum, l) => sum + parseFloat(l.total_paid || 0), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <div className="text-6xl mb-4">💰</div>
                <p className="text-gray-700 text-lg font-semibold">
                  {loanStatusFilter === 'closed' ? 'No paid loans yet' :
                   loanStatusFilter === 'active' ? 'No active loans' :
                   loanStatusFilter === 'defaulted' ? 'No defaulted loans' :
                   'No loans found'}
                </p>
                <p className="text-gray-600 text-sm mt-2 font-medium">
                  {loanStatusFilter === 'closed' ? 'Fully paid loans will appear here' :
                   'Loans will appear here when approved'}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Collateral Management */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">📦</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Collateral Management</h2>
            </div>
            <button
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-black px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-black shadow-lg hover:shadow-xl border-2 border-blue-400 text-lg"
              onClick={async()=>{
                try{
                  const data = await api.getAllCollateral();
                  setAdminCollateral(Array.isArray(data)?data:[]);
                }catch(err){
                  alert(err.message);
                }
              }}
            >🔄 Refresh</button>
          </div>

          {(() => {
            // Filter out collateral that has already been assessed
            const unassessedCollateral = adminCollateral?.filter(item => !item.assessed_value) || [];
            
            return unassessedCollateral.length ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                      <th className="text-left py-4 px-4 font-bold text-gray-900">Borrower</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-900">Photos</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-900">Market Value</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-900">Status</th>
                      <th className="text-left py-4 px-4 font-bold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassessedCollateral.map(item => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition">
                        <td className="py-4 px-4 text-gray-900 font-bold">{item.full_name || item.email || `Borrower ${item.borrower_id}`}</td>
                        <td className="py-4 px-4 text-gray-900 font-bold">{item.type}</td>
                        <td className="py-4 px-4">
                          {Array.isArray(item.images) && item.images.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="relative group cursor-pointer" onClick={() => {
                                setLightboxImages(item.images);
                                setLightboxIndex(0);
                                setLightboxOpen(true);
                              }}>
                                <img src={item.images[0]} alt="thumb" className="w-12 h-12 object-cover rounded-lg border-2 border-indigo-200 hover:border-indigo-500 transition-all shadow-sm hover:shadow-md" />
                                {/* Hover preview - larger thumbnail */}
                                <div className="absolute left-0 top-0 z-50 hidden group-hover:block">
                                  <img src={item.images[0]} alt="preview" className="w-32 h-32 object-cover rounded-lg shadow-2xl border-4 border-white" style={{transform: 'translate(-10px, -10px)'}} />
                                </div>
                              </div>
                              <span className="text-sm text-gray-900 font-bold">{item.images.length} photo{item.images.length>1?'s':''}</span>
                            </div>
                          ) : (
                            <span className="text-gray-600 text-sm font-bold italic">No photos</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-gray-900 font-bold">ZMK {Number(item.market_value).toLocaleString()}</td>
                        <td className="py-4 px-4">
                          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-bold border border-amber-300">⏳ Pending Assessment</span>
                        </td>
                        <td className="py-4 px-4">
                          <button 
                            className="bg-gradient-to-r from-green-600 to-green-700 text-black px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition font-black shadow-lg hover:shadow-xl border-2 border-green-400 text-lg" 
                            onClick={()=>setSelectedCollateral(item)}
                          >
                            📝 Assess
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : adminCollateral?.length ? (
              <div className="text-center py-12 bg-green-50 rounded-xl border-2 border-green-200">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-green-800 text-lg font-bold">All collateral has been assessed!</p>
                <p className="text-green-700 text-sm mt-2 font-medium">New collateral items will appear here when borrowers submit them</p>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-gray-700 text-lg font-bold">No collateral submitted yet.</p>
                <p className="text-gray-600 text-sm mt-2 font-medium">Collateral items will appear here when borrowers add them</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Assess Collateral Modal */}
      {selectedCollateral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">📦</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Assess Collateral</h2>
              </div>
              <button className="text-gray-500 hover:text-gray-700 text-3xl font-bold transition-colors" onClick={()=>setSelectedCollateral(null)}>×</button>
            </div>

            {/* Collateral Details */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-700 font-semibold">Borrower</p>
                  <p className="text-lg text-gray-900 font-semibold">{selectedCollateral.full_name || selectedCollateral.email || `Borrower ${selectedCollateral.borrower_id}`}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-semibold">Type</p>
                  <p className="text-lg text-gray-900 font-semibold">{selectedCollateral.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-semibold">Serial/ID</p>
                  <p className="text-lg text-gray-900 font-semibold">{selectedCollateral.serial_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-semibold">Market Value</p>
                  <p className="text-lg text-gray-900 font-semibold">ZMK {Number(selectedCollateral.market_value).toLocaleString()}</p>
                </div>
              </div>
              {selectedCollateral.description && (
                <div className="mt-4">
                  <p className="text-sm text-gray-700 font-semibold">Description</p>
                  <p className="text-gray-900">{selectedCollateral.description}</p>
                </div>
              )}
            </div>

            {/* Images preview for admin */}
            {Array.isArray(selectedCollateral.images) && selectedCollateral.images.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">📸 Collateral Photos</h3>
                <div className="grid grid-cols-3 gap-3">
                  {selectedCollateral.images.map((img, idx) => (
                    <div key={idx} className="relative group cursor-pointer" onClick={() => {
                      setLightboxImages(selectedCollateral.images);
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}>
                      <img src={img} alt={`Collateral ${idx+1}`} className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all" />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 font-semibold">🔍 View</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <CollateralAssessment item={selectedCollateral} onAssess={async(value)=>{
              try{
                await api.assessCollateral(selectedCollateral.id, { assessed_value: value });
                setSelectedCollateral(null);
                const data = await api.getAllCollateral();
                setAdminCollateral(Array.isArray(data)?data:[]);
              }catch(err){
                alert(err.message);
              }
            }} />
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">👤</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Create Admin User</h2>
              </div>
              <button 
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold transition-colors" 
                onClick={() => {
                  setShowCreateAdmin(false);
                  setAdminForm({email: '', password: '', full_name: '', phone_number: ''});
                }}
              >×</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              
              if (!adminForm.email || !adminForm.password || !adminForm.full_name) {
                alert('Please fill in all required fields');
                return;
              }

              const adminSecret = prompt('🔐 Enter admin creation secret:');
              if (!adminSecret) {
                alert('Admin creation secret is required');
                return;
              }

              try {
                const response = await api.createAdmin({
                  ...adminForm,
                  admin_secret: adminSecret
                });
                
                alert(`✅ Admin user created successfully!\n\nEmail: ${adminForm.email}\nPassword: ${adminForm.password}\n\nThey can now login to the admin dashboard.`);
                setShowCreateAdmin(false);
                setAdminForm({email: '', password: '', full_name: '', phone_number: ''});
              } catch (err) {
                alert('❌ Error creating admin: ' + err.message);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="admin@email.com"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm(prev => ({...prev, email: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Secure password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm(prev => ({...prev, password: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="John Doe"
                  value={adminForm.full_name}
                  onChange={(e) => setAdminForm(prev => ({...prev, full_name: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="+260971234567"
                  value={adminForm.phone_number}
                  onChange={(e) => setAdminForm(prev => ({...prev, phone_number: e.target.value}))}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 text-lg">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Security Notice</p>
                    <p className="text-xs text-amber-700 mt-1">
                      You will be prompted for the admin creation secret. Only authorized personnel should have access to this secret.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAdmin(false);
                    setAdminForm({email: '', password: '', full_name: '', phone_number: ''});
                  }}
                  className="flex-1 bg-gray-600 text-black px-4 py-3 rounded-lg hover:bg-gray-700 transition font-black text-lg shadow-lg hover:shadow-xl border-2 border-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-black px-4 py-3 rounded-lg hover:bg-purple-700 transition font-black text-lg shadow-lg hover:shadow-xl border-2 border-purple-400"
                >
                  🔐 Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Calculator Modal */}
      <LoanCalculator 
        isOpen={showLoanCalculator} 
        onClose={() => setShowLoanCalculator(false)} 
      />
    </div>
  );
};

export default AdminDashboard;