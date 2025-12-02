import React, { useState, useEffect, createContext, useContext } from 'react';
import { AlertCircle, CheckCircle, DollarSign, Calendar, TrendingUp, Users, FileText, CreditCard } from 'lucide-react';
import LoanCalculator from './components/LoanCalculator';
import AdminDashboard from './components/AdminDashboard';
import BorrowerDashboard from './components/BorrowerDashboard';
import './App.css';

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// API Service
const API_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

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

const assessCollateralValue = ({
  marketValue = 0,
  ageYears = 0,
  depreciationPctPerYear = 10,
  liquidityDiscountPct = 15,
  riskHaircutPct = 10,
  maxLtvPct = 60,
}) => {
  const mv = Number(marketValue || 0);
  const dep = Math.max(0, 1 - (Number(depreciationPctPerYear) / 100) * Number(ageYears));
  const depreciated = mv * dep;
  const afterLiquidity = depreciated * (1 - Number(liquidityDiscountPct) / 100);
  const afterRisk = afterLiquidity * (1 - Number(riskHaircutPct) / 100);
  const maxLoanable = mv * (Number(maxLtvPct) / 100);
  const assessed = Math.min(afterRisk, maxLoanable);
  return {
    depreciated,
    afterLiquidity,
    afterRisk,
    maxLoanable,
    assessed,
  };
};

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
        // If response is not JSON, use status text or default message
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch (parseError) {
      // If response is not valid JSON, return empty object or throw error
      console.warn('Response is not valid JSON:', parseError);
      return {};
    }
  },

  login: (email, password) => api.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),

  register: (data) => api.request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getDashboard: () => api.request('/borrower/dashboard'),
  // Collateral (borrower)
  getBorrowerCollateral: () => api.request('/borrower/collateral'),
  addBorrowerCollateral: (item) => api.request('/borrower/collateral', {
    method: 'POST',
    body: JSON.stringify(item),
  }),
  
  getAdminDashboard: () => api.request('/reports/dashboard'),
  
  applyForLoan: (data) => api.request('/borrower/applications', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  makePayment: (data) => api.request('/borrower/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getApplications: () => api.request('/admin/applications'),
  // Collateral (admin)
  getAllCollateral: () => api.request('/admin/collateral'),
  assessCollateral: (id, payload) => api.request(`/admin/collateral/${id}/assess`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  reviewApplication: (id, status, notes) => api.request(`/admin/applications/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify({ status, review_notes: notes }),
  }),

  disburseLoan: (appId, disbursementDate) => api.request(`/admin/loans/${appId}/disburse`, {
    method: 'POST',
    body: JSON.stringify({ disbursement_date: disbursementDate }),
  }),

  deleteApplication: (id) => api.request(`/admin/applications/${id}`, {
    method: 'DELETE',
  }),
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      setUser({ role });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    setUser({ role: data.role });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUser(null);
  };

  const register = async (formData) => {
    await api.register(formData);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/company-logo.png" 
              alt="Company Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">PHILIX Finance</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToRegister}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Don't have an account? Register
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>Demo credentials:</p>
          <p className="font-mono text-xs mt-1">admin@loanapp.com / admin123</p>
        </div>
      </div>
    </div>
  );
};

// Register Component
const Register = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    id_number: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      setSuccess(true);
      setTimeout(() => onSwitchToLogin(), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Created!</h2>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/company-logo.png" 
              alt="Company Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-600 mt-2">Join PHILIX Finance today</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="+260..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ID Number</label>
            <input
              type="text"
              name="id_number"
              value={formData.id_number}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
};


// Admin Dashboard


// Main App
const App = () => {
  const [showRegister, setShowRegister] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-container">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  return user.role === 'admin' ? <AdminDashboard useAuth={useAuth} /> : <BorrowerDashboard useAuth={useAuth} />;
};

export default () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);