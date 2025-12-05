import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, DollarSign, Calendar, TrendingUp, Users, FileText, CreditCard, Bell } from 'lucide-react';

// Import shared utilities and context (we'll need to export these from App.jsx)
// For now, we'll duplicate the necessary functions here

// API Service URL
// Force production API URL for Vercel deployment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
console.log('🔍 BorrowerDashboard API_URL:', API_URL);

// Weekly loan calculation with fixed rates
const calculateWeeklyLoan = (principal, weeks) => {
  const P = Number(principal || 0);
  const w = Number(weeks || 0);
  
  if (P <= 0 || w <= 0) return { weekly: 0, total: 0, interest: 0, rate: 0 };
  
  // Interest rates based on weeks
  let interestRate = 0;
  if (w === 1) interestRate = 13;      // 1 week: 13%
  else if (w === 2) interestRate = 20; // 2 weeks: 20%
  else if (w === 3) interestRate = 30; // 3 weeks: 30%
  else if (w === 4) interestRate = 35; // 4 weeks: 35%
  else {
    // For any other weeks, calculate proportionally (35% for 4 weeks base)
    interestRate = (w / 4) * 35;
  }
  
  const interest = P * (interestRate / 100);
  const total = P + interest;
  const weekly = total / w;
  
  return { weekly, total, interest, rate: interestRate };
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

  getDashboard: () => api.request('/borrower/dashboard'),
  getBorrowerCollateral: () => api.request('/borrower/collateral'),
  addBorrowerCollateral: (item) => api.request('/borrower/collateral', {
    method: 'POST',
    body: JSON.stringify(item),
  }),
  applyForLoan: (data) => api.request('/borrower/applications', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  makePayment: (data) => api.request('/borrower/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Main BorrowerDashboard Component
const BorrowerDashboard = ({ useAuth }) => {
  const [dashboard, setDashboard] = useState(null);
  const [collateral, setCollateral] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCollateralModal, setShowCollateralModal] = useState(false);
  const [collateralForm, setCollateralForm] = useState({
    type: '',
    description: '',
    market_value: '',
    serial_number: '',
    images: [],
  });
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [calcInput, setCalcInput] = useState({ principal: '', weeks: '' });
  const [loanForm, setLoanForm] = useState({
    loan_product_id: 1,
    requested_amount: '',
    term_months: '',
    purpose: '',
    branch: '', // Optional branch selection
  });
  const [paymentForm, setPaymentForm] = useState({
    loan_id: '',
    amount: '',
    payment_method: 'mobile_money',
    payment_reference: '',
  });
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    // Load dismissed notifications from localStorage on component mount
    const saved = localStorage.getItem('dismissedNotifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  // Calculate unread notifications count
  const getUnreadNotificationsCount = () => {
    if (!dashboard?.applications) return 0;
    return dashboard.applications.filter(app => {
      // Hide applications if:
      // 1. They're pending (not processed yet)
      // 2. User has dismissed the notification
      // 3. The loan has been fully paid (outstanding_balance = 0)
      if (app.status === 'pending' || dismissedNotifications.includes(app.id)) {
        return false;
      }
      
      // If approved, check if loan is fully paid
      if (app.status === 'approved') {
        const associatedLoan = dashboard?.loans?.find(loan => loan.application_id === app.id);
        if (associatedLoan && parseFloat(associatedLoan.outstanding_balance) === 0) {
          return false; // Hide if loan is fully paid
        }
      }
      
      return true;
    }).length;
  };

  // Get all notifications (read and unread)
  const getAllNotifications = () => {
    if (!dashboard?.applications) return [];
    return dashboard.applications.filter(app => {
      // Hide applications if:
      // 1. They're pending (not processed yet)
      // 2. The loan has been fully paid (outstanding_balance = 0)
      if (app.status === 'pending') {
        return false;
      }
      
      // If approved, check if loan is fully paid
      if (app.status === 'approved') {
        const associatedLoan = dashboard?.loans?.find(loan => loan.application_id === app.id);
        if (associatedLoan && parseFloat(associatedLoan.outstanding_balance) === 0) {
          return false; // Hide if loan is fully paid
        }
      }
      
      return true;
    });
  };

  // Save dismissed notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dismissedNotifications', JSON.stringify(dismissedNotifications));
  }, [dismissedNotifications]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    loadDashboard();
    loadCollateral();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCollateral = async () => {
    try {
      const items = await api.getBorrowerCollateral();
      setCollateral(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to load collateral', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-indigo-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <img 
                src="/company-logo.png" 
                alt="Company Logo" 
                className="h-4 w-4 md:h-10 md:w-auto object-contain flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-lg md:text-3xl font-bold text-gray-900 truncate">PHILIX Finance</h1>
                <p className="text-xs md:text-sm text-gray-700 font-medium hidden sm:block">Your Trusted Financial Partner</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* Notification Icon with Badge */}
              <div className="relative notification-dropdown">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative bg-gray-100 hover:bg-gray-200 p-3 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                >
                  <Bell className="text-gray-700" size={24} />
                  {getUnreadNotificationsCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                      {getUnreadNotificationsCount() > 9 ? '9+' : getUnreadNotificationsCount()}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {getUnreadNotificationsCount() > 0 && (
                        <p className="text-sm text-gray-700 mt-1 font-medium">
                          You have {getUnreadNotificationsCount()} unread notification{getUnreadNotificationsCount() !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {getAllNotifications().length > 0 ? (
                        getAllNotifications().map((app) => {
                          const isUnread = !dismissedNotifications.includes(app.id);
                          return (
                            <div 
                              key={app.id} 
                              className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                isUnread ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {app.status === 'approved' ? (
                                  <div className="bg-green-100 rounded-full p-1 mt-1">
                                    <CheckCircle className="text-green-600" size={16} />
                                  </div>
                                ) : (
                                  <div className="bg-red-100 rounded-full p-1 mt-1">
                                    <AlertCircle className="text-red-600" size={16} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`text-sm font-semibold ${
                                      app.status === 'approved' ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                      {app.status === 'approved' ? 'Loan Approved!' : 'Loan Application Rejected'}
                                    </h4>
                                    {isUnread && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-700 mt-1 font-medium">
                                    Your loan application for ZMK {parseFloat(app.requested_amount).toLocaleString()} has been {app.status}.
                                  </p>
                                  {app.review_notes && (
                                    <p className="text-xs text-gray-600 mt-1 italic font-medium">
                                      Note: {app.review_notes}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-gray-400">
                                      {new Date(app.updated_at || app.created_at).toLocaleDateString()}
                                    </span>
                                    {isUnread && (
                                      <button
                                        onClick={() => {
                                          setDismissedNotifications(prev => [...prev, app.id]);
                                        }}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                      >
                                        Mark as read
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-6 text-center">
                          <Bell className="mx-auto text-gray-400 mb-2" size={32} />
                          <p className="text-gray-500 text-sm">No notifications yet</p>
                          <p className="text-gray-400 text-xs mt-1">
                            You'll receive updates about your loan applications here
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {getAllNotifications().length > 0 && getUnreadNotificationsCount() > 0 && (
                      <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                        <button
                          onClick={() => {
                            const allNotificationIds = getAllNotifications().map(app => app.id);
                            setDismissedNotifications(prev => {
                              const newDismissed = [...prev];
                              allNotificationIds.forEach(id => {
                                if (!newDismissed.includes(id)) {
                                  newDismissed.push(id);
                                }
                              });
                              return newDismissed;
                            });
                          }}
                          className="w-full text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium py-1"
                        >
                          Mark all as read
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={logout}
                className="borrower-logout-btn px-5 py-2.5 rounded-lg transition shadow-md hover:shadow-lg"
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
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Welcome to Your Dashboard</h2>
          <p className="text-sm md:text-base text-gray-700 mb-4 md:mb-6 font-medium">Manage your loans, payments, and collateral all in one place</p>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border-2 border-indigo-200 p-4 md:p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-indigo-900 font-bold text-xs md:text-sm uppercase tracking-wide">Total Outstanding</h3>
                <div className="bg-indigo-600 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <DollarSign className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl md:text-4xl font-bold text-indigo-900 break-words">
                ZMK {dashboard?.totalOutstanding?.toLocaleString() || '0'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 p-4 md:p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-green-900 font-bold text-xs md:text-sm uppercase tracking-wide">Active Loans</h3>
                <div className="bg-green-600 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="text-white" size={16} />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-green-900">{dashboard?.loans?.length || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200 p-4 md:p-6 hover:shadow-lg transition sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-orange-900 font-bold text-xs md:text-sm uppercase tracking-wide">Next Due Date</h3>
                <div className="bg-orange-600 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="text-white" size={16} />
                </div>
              </div>
              <p className="text-lg md:text-2xl font-bold text-orange-900 break-words">
                {dashboard?.nextDueDate 
                  ? new Date(dashboard.nextDueDate).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Application Status Notifications */}
        {dashboard?.applications && dashboard.applications.length > 0 && (
          <div className="mb-8">
            {dashboard.applications
              .filter(app => {
                // Hide applications if:
                // 1. They're pending (not processed yet)
                // 2. User has dismissed the notification
                // 3. The loan has been fully paid (outstanding_balance = 0)
                if (app.status === 'pending' || dismissedNotifications.includes(app.id)) {
                  return false;
                }
                
                // If approved, check if loan is fully paid
                if (app.status === 'approved') {
                  const associatedLoan = dashboard.loans?.find(loan => loan.application_id === app.id);
                  if (associatedLoan && parseFloat(associatedLoan.outstanding_balance) === 0) {
                    return false; // Hide if loan is fully paid
                  }
                }
                
                return true;
              })
              .map((app) => (
              <div key={app.id} className={`p-4 rounded-lg border-l-4 mb-3 relative ${
                app.status === 'approved' 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {app.status === 'approved' ? (
                      <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                    ) : (
                      <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        app.status === 'approved' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {app.status === 'approved' ? '✓ Loan Approved!' : '✗ Loan Application Rejected'}
                      </h3>
                      <p className="text-sm text-gray-700 mt-1">
                        Your loan application for <strong>ZMK {parseFloat(app.requested_amount).toLocaleString()}</strong> has been {app.status}.
                      </p>
                      {app.review_notes && (
                        <p className="text-sm text-gray-600 mt-1 italic">
                          Note: {app.review_notes}
                        </p>
                      )}
                      {app.status === 'approved' && (
                        <p className="text-sm text-green-700 mt-2 font-medium">
                          Your loan has been activated. You can view it in the "My Loans" section below.
                        </p>
                      )}
                      <span className="text-xs text-gray-500 mt-2 inline-block">
                        {new Date(app.updated_at || app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissedNotifications(prev => [...prev, app.id])}
                    className={`flex-shrink-0 p-1 rounded-full hover:bg-gray-200 transition ${
                      app.status === 'approved' ? 'text-green-700 hover:bg-green-100' : 'text-red-700 hover:bg-red-100'
                    }`}
                    title="Dismiss notification"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 borrower-section-header mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setShowApplyModal(true)}
              className="borrower-action-btn bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-xl text-lg hover:from-indigo-700 hover:to-indigo-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex flex-col items-center gap-3"
            >
              <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center">
                <FileText size={32} />
              </div>
              <span className="action-title">📄 Apply for Loan</span>
              <span className="action-subtitle text-sm">Submit a new loan application</span>
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="borrower-action-btn bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-xl text-lg hover:from-green-700 hover:to-green-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex flex-col items-center gap-3"
            >
              <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center">
                <CreditCard size={32} />
              </div>
              <span className="action-title">💳 Make Payment</span>
              <span className="action-subtitle text-sm">Pay towards your loan balance</span>
            </button>
            <button
              onClick={() => setShowCollateralModal(true)}
              className="borrower-action-btn bg-gradient-to-br from-purple-600 to-purple-700 p-6 rounded-xl text-lg hover:from-purple-700 hover:to-purple-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex flex-col items-center gap-3"
            >
              <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center">
                <span className="text-4xl">📦</span>
              </div>
              <span className="action-title">📦 Manage Collateral</span>
              <span className="action-subtitle text-sm">Add or view your collateral</span>
            </button>
          </div>
        </div>

        {/* Loan Calculator */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center">
              <TrendingUp className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Loan Calculator</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Principal Amount (ZMK)</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900" 
                type="number" 
                value={calcInput.principal} 
                onChange={(e)=>setCalcInput(v=>({...v, principal:e.target.value}))} 
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Loan Term (weeks)</label>
              <select 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900" 
                value={calcInput.weeks} 
                onChange={(e)=>setCalcInput(v=>({...v, weeks:e.target.value}))}
              >
                <option value="">Select weeks</option>
                <option value="1">1 week (13% interest)</option>
                <option value="2">2 weeks (20% interest)</option>
                <option value="3">3 weeks (30% interest)</option>
                <option value="4">4 weeks (35% interest)</option>
              </select>
            </div>
            <div className="md:col-span-1">
              {(() => {
                const { weekly, total, interest, rate } = calculateWeeklyLoan(calcInput.principal, calcInput.weeks);
                return (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 p-4 rounded-xl">
                    <h3 className="font-bold text-gray-900 mb-3">Results</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Interest Rate:</span>
                        <span className="text-gray-900 font-bold">{rate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Weekly Payment:</span>
                        <span className="text-gray-900 font-bold">ZMK {weekly.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Total Repay:</span>
                        <span className="text-gray-900 font-bold">ZMK {total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-indigo-300 pt-2">
                        <span className="text-indigo-700 font-bold">Total Interest:</span>
                        <span className="text-indigo-900 font-bold">ZMK {interest.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Active Loans */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center">
              <FileText className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-green-900 borrower-section-header">My Active Loans</h2>
          </div>
          {dashboard?.loans?.length > 0 ? (
            <div className="space-y-4">
              {dashboard.loans.map((loan) => (
                <div key={loan.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="borrower-loan-text text-xl">{loan.product_name}</h3>
                      <p className="borrower-loan-label text-sm mt-1">Loan ID: #{loan.id}</p>
                    </div>
                    <span className="px-4 py-2 bg-green-700 text-white rounded-full text-sm font-bold uppercase shadow-md border-2 border-green-800">
                      {loan.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="borrower-loan-label text-xs mb-1">Principal</p>
                      <p className="borrower-loan-text text-lg">ZMK {parseFloat(loan.principal_amount).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="borrower-loan-label text-xs mb-1">Outstanding</p>
                      <p className="borrower-loan-text text-lg" style={{ color: '#c2410c !important' }}>ZMK {parseFloat(loan.outstanding_balance).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="borrower-loan-label text-xs mb-1">Interest Rate</p>
                      <p className="borrower-loan-text text-lg" style={{ color: '#1e40af !important' }}>{parseFloat(loan.interest_rate).toFixed(1)}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="borrower-loan-label text-xs mb-1">Term</p>
                      <p className="borrower-loan-text text-lg" style={{ color: '#7c3aed !important' }}>{loan.term_months} months</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <div className="text-6xl mb-4">💳</div>
              <p className="text-gray-700 text-lg font-semibold">No active loans</p>
              <p className="text-gray-600 text-sm mt-2 font-medium">Apply for a loan to get started</p>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        {dashboard?.recentPayments?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center">
                <CreditCard className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Recent Payments</h2>
            </div>
            <div className="space-y-3">
              {dashboard.recentPayments.map((payment, idx) => (
                <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 flex justify-between items-center hover:shadow-md transition">
                  <div>
                    <p className="font-bold text-xl text-gray-900">ZMK {parseFloat(payment.amount).toLocaleString()}</p>
                    <p className="text-sm text-gray-700 font-semibold mt-1">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs">
                        {payment.payment_method.replace('_', ' ').toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 font-medium">
                      {new Date(payment.completed_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-green-600 font-semibold mt-1">✓ Completed</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Take Photo</h2>
              <button 
                onClick={() => {
                  if (videoRef.current && videoRef.current.srcObject) {
                    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                  }
                  setShowCamera(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video 
                  ref={videoRef}
                  className="w-full h-auto"
                  autoPlay
                  playsInline
                />
              </div>

              {/* Hidden Canvas for Capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Capture Button */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current && canvasRef.current) {
                      const video = videoRef.current;
                      const canvas = canvasRef.current;
                      canvas.width = video.videoWidth;
                      canvas.height = video.videoHeight;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(video, 0, 0);
                      const imageData = canvas.toDataURL('image/jpeg');
                      setCollateralForm(v => ({
                        ...v,
                        images: [...v.images, imageData]
                      }));
                      alert('Photo captured! You can take more or close to continue.');
                    }
                  }}
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  📸 Capture Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current && videoRef.current.srcObject) {
                      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                    }
                    setShowCamera(false);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Done
                </button>
              </div>

              <p className="text-sm text-gray-600 text-center">
                Position your collateral in the frame and click "Capture Photo". You can take multiple photos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collateral Modal */}
      {showCollateralModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">📦</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Your Collateral</h2>
              </div>
              <button className="text-gray-400 hover:text-gray-600 text-3xl font-bold" onClick={()=>setShowCollateralModal(false)}>✕</button>
            </div>

            <div className="mb-8">
              {collateral?.length ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">📋 Your Collateral Items</h3>
                  {collateral.map(item => (
                    <div key={item.id || item.serial_number} className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 flex justify-between items-start hover:shadow-md transition">
                      <div>
                        <div className="font-bold text-lg text-gray-900">{item.type}</div>
                        <div className="text-sm text-gray-700 mt-1">{item.description}</div>
                        <div className="text-sm text-gray-800 font-semibold mt-2">Market Value: ZMK {Number(item.market_value).toLocaleString()}</div>
                        {item.assessed_value && (
                          <div className="text-sm text-green-700 font-semibold">✅ Assessed: ZMK {Number(item.assessed_value).toLocaleString()}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 bg-white px-3 py-1 rounded-full font-medium">{item.serial_number}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="text-gray-600 text-lg">No collateral added yet.</p>
                  <p className="text-gray-500 text-sm mt-1">Add your first collateral item below</p>
                </div>
              )}
            </div>

            <div className="border-t-2 border-gray-200 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">➕</span>
                <h3 className="font-bold text-xl text-gray-900">Add New Collateral</h3>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900" 
                      placeholder="e.g., Vehicle, Land, Equipment" 
                      value={collateralForm.type} 
                      onChange={e=>setCollateralForm(v=>({...v, type:e.target.value}))} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Serial/ID Number</label>
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900" 
                      placeholder="Serial or ID number" 
                      value={collateralForm.serial_number} 
                      onChange={e=>setCollateralForm(v=>({...v, serial_number:e.target.value}))} 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900" 
                      placeholder="Brief description of the collateral" 
                      value={collateralForm.description} 
                      onChange={e=>setCollateralForm(v=>({...v, description:e.target.value}))} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Market Value (ZMK)</label>
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900" 
                      placeholder="Market value in Kwacha" 
                      type="number" 
                      value={collateralForm.market_value} 
                      onChange={e=>setCollateralForm(v=>({...v, market_value:e.target.value}))} 
                    />
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="border-2 border-dashed border-purple-300 rounded-xl p-5 bg-purple-50">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">📸</span>
                    <span>Upload Collateral Photos</span>
                  </h4>
                  
                  {/* Image Preview Grid */}
                  {collateralForm.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {collateralForm.images.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-28 object-cover rounded-lg border-2 border-purple-300" />
                          <button
                            type="button"
                            onClick={() => setCollateralForm(v => ({
                              ...v,
                              images: v.images.filter((_, i) => i !== idx)
                            }))}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 font-bold shadow-lg"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Buttons */}
                  <div className="flex gap-3">
                    <label className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 cursor-pointer text-center font-semibold transition shadow-md">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setCollateralForm(v => ({
                                ...v,
                                images: [...v.images, event.target.result]
                              }));
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                      />
                      📁 Upload from Device
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                          setShowCamera(true);
                          setTimeout(() => {
                            if (videoRef.current) {
                              videoRef.current.srcObject = stream;
                              videoRef.current.play();
                            }
                          }, 100);
                        } catch (err) {
                          alert('Camera access denied or not available');
                        }
                      }}
                      className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold transition shadow-md"
                    >
                      📷 Take Photo
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 font-medium mt-3 text-center">
                    Upload multiple photos of your collateral for assessment
                  </p>
                </div>

                <button
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg px-6 py-4 rounded-lg transition shadow-xl"
                  onClick={async()=>{
                    try{
                      const payload={...collateralForm, market_value:Number(collateralForm.market_value||0)};
                      await api.addBorrowerCollateral(payload);
                      setCollateralForm({ type:'', description:'', market_value:'', serial_number:'', images:[] });
                      await loadCollateral();
                      alert('Collateral added successfully!');
                    }catch(err){
                      alert(err.message);
                    }
                  }}
                >
                  ✅ Add Collateral
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Apply for Loan</h2>
              <button 
                onClick={() => setShowApplyModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                // Convert weeks to months for backend (temporary mapping)
                const weeksToMonths = {
                  '1': 0.25,
                  '2': 0.5,
                  '3': 0.75,
                  '4': 1
                };
                
                const payload = {
                  loan_product_id: 1, // Default product ID
                  requested_amount: parseFloat(loanForm.requested_amount),
                  term_months: loanForm.term_months, // Keep as weeks value
                  purpose: loanForm.purpose,
                  branch: loanForm.branch || null, // Include branch selection
                };
                
                // Add debugging logs
                console.log('🔍 DEBUG - Current loanForm state:', loanForm);
                console.log('📤 DEBUG - Sending loan application payload:', payload);
                console.log('🎓 DEBUG - Branch value being sent:', payload.branch);
                
                await api.applyForLoan(payload);
                alert('Loan application submitted successfully!');
                setShowApplyModal(false);
                setLoanForm({ loan_product_id: 1, requested_amount: '', term_months: '', purpose: '', branch: '' });
                loadDashboard();
              } catch (err) {
                alert('Error: ' + err.message);
              }
            }} className="space-y-4">
              
              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Amount (ZMK) *
                </label>
                <input
                  type="number"
                  required
                  min="300"
                  max="50000"
                  step="1"
                  value={loanForm.requested_amount}
                  onChange={(e) => setLoanForm(v => ({...v, requested_amount: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter amount (e.g., 5000, 3250, 4750)"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum: ZMK 300 | Maximum: ZMK 50,000</p>
              </div>

              {/* Loan Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Term *
                </label>
                <select
                  required
                  value={loanForm.term_months}
                  onChange={(e) => setLoanForm(v => ({...v, term_months: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select loan term</option>
                  <option value="1">1 Week (13% interest)</option>
                  <option value="2">2 Weeks (20% interest)</option>
                  <option value="3">3 Weeks (30% interest)</option>
                  <option value="4">4 Weeks (35% interest)</option>
                </select>
              </div>

              {/* Loan Calculator Preview */}
              {loanForm.requested_amount && loanForm.term_months && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Loan Summary</h3>
                  {(() => {
                    const { weekly, total, interest, rate } = calculateWeeklyLoan(
                      loanForm.requested_amount, 
                      loanForm.term_months
                    );
                    return (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Principal Amount:</span>
                          <span className="font-semibold">ZMK {parseFloat(loanForm.requested_amount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Interest Rate:</span>
                          <span className="font-semibold">{rate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Total Interest:</span>
                          <span className="font-semibold">ZMK {interest.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-indigo-200 pt-2 mt-2">
                          <span className="text-gray-700">Weekly Payment:</span>
                          <span className="font-semibold text-indigo-700">ZMK {weekly.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Total Repayment:</span>
                          <span className="font-semibold text-indigo-700">ZMK {total.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose of Loan *
                </label>
                <textarea
                  required
                  rows="3"
                  value={loanForm.purpose}
                  onChange={(e) => setLoanForm(v => ({...v, purpose: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Please describe how you will use this loan (e.g., business expansion, emergency, education)"
                />
              </div>

              {/* Branch Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏢 Preferred Branch (Optional)
                </label>
                <select
                  value={loanForm.branch}
                  onChange={(e) => setLoanForm(v => ({...v, branch: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">No specific branch preference</option>
                  <option value="unza">🎓 Lusaka Branch</option>
                  <option value="cbu">🎓 CBU - Copperbelt University</option>
                  <option value="unilus">🎓 UNILUS - University of Lusaka</option>
                  <option value="other-institution">🏫 Other Educational Institution</option>
                  <option value="general-public">👥 General Public (Non-Student)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Selecting a branch helps us assign the right loan officer to handle your application faster!
                </p>
              </div>

              {/* Collateral Selection (Optional) */}
              {collateral?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Collateral (Optional)
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">No collateral</option>
                    {collateral.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.type} - ZMK {Number(item.market_value).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Providing collateral may improve your approval chances
                  </p>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="flex items-start gap-2">
                  <input 
                    type="checkbox" 
                    required
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    I agree to the terms and conditions and understand that I must repay the loan according to the agreed schedule. Late payments may incur additional fees.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Make Payment</h2>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  loan_id: parseInt(paymentForm.loan_id),
                  amount: parseFloat(paymentForm.amount),
                  payment_method: paymentForm.payment_method,
                  payment_reference: paymentForm.payment_reference,
                };
                
                await api.makePayment(payload);
                alert('Payment submitted successfully!');
                setShowPaymentModal(false);
                setPaymentForm({ loan_id: '', amount: '', payment_method: 'mobile_money', payment_reference: '' });
                loadDashboard();
              } catch (err) {
                alert('Error: ' + err.message);
              }
            }} className="space-y-4">
              
              {/* Select Loan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Loan *
                </label>
                <select
                  required
                  value={paymentForm.loan_id}
                  onChange={(e) => setPaymentForm(v => ({...v, loan_id: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Choose a loan</option>
                  {dashboard?.loans?.map(loan => (
                    <option key={loan.id} value={loan.id}>
                      Loan #{loan.id} - Outstanding: ZMK {parseFloat(loan.outstanding_balance).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (ZMK) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(v => ({...v, amount: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter payment amount"
                />
                {paymentForm.loan_id && dashboard?.loans && (() => {
                  const selectedLoan = dashboard.loans.find(l => l.id === parseInt(paymentForm.loan_id));
                  if (selectedLoan) {
                    return (
                      <p className="text-xs text-gray-500 mt-1">
                        Outstanding balance: ZMK {parseFloat(selectedLoan.outstanding_balance).toLocaleString()}
                      </p>
                    );
                  }
                })()}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  required
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm(v => ({...v, payment_method: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="mobile_money">Mobile Money (MTN/Airtel)</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Debit/Credit Card</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              {/* Payment Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference *
                </label>
                <input
                  type="text"
                  required
                  value={paymentForm.payment_reference}
                  onChange={(e) => setPaymentForm(v => ({...v, payment_reference: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter transaction ID or reference number"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For mobile money: Enter the transaction ID from your payment confirmation
                </p>
              </div>

              {/* Payment Instructions */}
              {paymentForm.payment_method === 'mobile_money' && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Mobile Money Instructions:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Dial *303# (MTN) or *115# (Airtel)</li>
                    <li>Select "Send Money" or "Make Payment"</li>
                    <li>Enter merchant code: <strong>123456</strong></li>
                    <li>Enter amount and confirm</li>
                    <li>Copy the transaction ID and paste above</li>
                  </ol>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


export default BorrowerDashboard;
