// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiConfig = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};

// API endpoints
export const endpoints = {
  // Authentication
  login: '/auth/login',
  register: '/auth/register',
  createAdmin: '/auth/create-admin',
  
  // Borrowers
  borrowerDashboard: '/borrower/dashboard',
  submitApplication: '/borrower/application',
  getApplications: '/borrower/applications',
  uploadDocument: '/borrower/documents',
  getPaymentHistory: '/borrower/payments',
  
  // Admin
  adminDashboard: '/admin/dashboard',
  reviewApplications: '/admin/applications',
  processLoan: '/admin/loans',
  assessCollateral: '/admin/collateral',
  
  // General
  health: '/health',
  dbHealth: '/db/health',
};

// Helper function for making API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      ...apiConfig.headers,
      ...options.headers,
    },
  };

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

export default apiConfig;