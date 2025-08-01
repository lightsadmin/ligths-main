// API Configuration
const API_CONFIG = {
  // Development URLs
  DEVELOPMENT: {
    BASE_URL: "http://10.69.228.236:5000",
    WEBSOCKET_URL: "ws://10.69.228.236:5000",
  },

  // Production URLs (Update with your actual Render deployment URL)
  PRODUCTION: {
    BASE_URL: "https://ligths-backend.onrender.com", // Your actual Render URL
    WEBSOCKET_URL: "wss://ligths-backend.onrender.com", // Your actual Render URL
  },
};

// Force production mode to use deployed server
// Change this to false when testing locally
const FORCE_PRODUCTION = true; // Using deployed server

// Determine environment
const isDevelopment =
  !FORCE_PRODUCTION && (__DEV__ || process.env.NODE_ENV !== "production");

// Export current API configuration
export const API_BASE_URL = isDevelopment
  ? API_CONFIG.DEVELOPMENT.BASE_URL
  : API_CONFIG.PRODUCTION.BASE_URL;

export const WEBSOCKET_URL = isDevelopment
  ? API_CONFIG.DEVELOPMENT.WEBSOCKET_URL
  : API_CONFIG.PRODUCTION.WEBSOCKET_URL;

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  REGISTER: "/api/register",
  LOGIN: "/api/login",

  // Mutual Funds
  MUTUAL_FUNDS: "/mutualfunds",
  MUTUAL_FUND_BY_CODE: "/mutualfunds",

  // Investments
  INVESTMENTS: "/api/investments",

  // Transactions
  TRANSACTIONS: "/api/transactions",

  // Goals
  GOALS: "/api/goals",

  // Health Check
  HEALTH: "/",
  STATUS: "/api/status",
};

// Helper function to build full URL
export const buildURL = (endpoint, params = {}) => {
  let url = `${API_BASE_URL}${endpoint}`;

  // Add query parameters if provided
  const queryParams = new URLSearchParams(params).toString();
  if (queryParams) {
    url += `?${queryParams}`;
  }

  return url;
};

export default API_BASE_URL;
