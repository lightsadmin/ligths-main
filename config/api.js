// API Configuration
const API_CONFIG = {
  // Development URLs (for local testing with a simulator or local network)
  DEVELOPMENT: {
    // Replace with your computer's local IP address if testing on a physical device
    BASE_URL: "http://172.20.10.4:5000", // Updated to match current IP
    WEBSOCKET_URL: "ws://172.20.10.4:5000",
  },

  // Production URLs (your deployed Render server)
  PRODUCTION: {
    BASE_URL: "https://ligths-backend.onrender.com",
    WEBSOCKET_URL: "wss://ligths-backend.onrender.com",
  },
};

// --- Controls ---
// Set this to `true` to always use the PRODUCTION URLs.
// Set this to `false` when you are testing with a local server.
const FORCE_PRODUCTION = false;

// --- Environment Detection ---
// Determines which set of URLs to use based on the control above and the environment.
const isDevelopment =
  !FORCE_PRODUCTION && (__DEV__ || process.env.NODE_ENV !== "production");

// --- Exported URLs ---
// The base URL that will be used for all API calls.
export const API_BASE_URL = isDevelopment
  ? API_CONFIG.DEVELOPMENT.BASE_URL
  : API_CONFIG.PRODUCTION.BASE_URL;

console.log("🌐 API Configuration:");
console.log("- FORCE_PRODUCTION:", FORCE_PRODUCTION);
console.log("- isDevelopment:", isDevelopment);
console.log("- API_BASE_URL:", API_BASE_URL);

// The URL for WebSocket connections (if you use them in the future).
export const WEBSOCKET_URL = isDevelopment
  ? API_CONFIG.DEVELOPMENT.WEBSOCKET_URL
  : API_CONFIG.PRODUCTION.WEBSOCKET_URL;

// --- API Endpoints ---
// A map of all the API routes used in the application.
// These have been corrected to match your `server.js` file.
export const ENDPOINTS = {
  // Authentication
  REGISTER: "/api/register",
  LOGIN: "/api/login",
  FORGOT_PASSWORD: "/api/forgot-password",
  CHECK_USERNAME: "/api/check-username",
  CHECK_EMAIL: "/api/check-email",

  // Profile
  PROFILE: "/profile", // e.g., /profile/john_doe

  // Mutual Funds (Used in MFScreen.js)
  MUTUAL_FUNDS: "/mutualfunds",
  MUTUAL_FUNDS_COMPANIES: "/mutualfunds/companies", // Grouped by company endpoint

  // Investments (Used in MFCalculator.js)
  // CORRECTED: The server route is `/investment` for POST (create) and `/investments` for GET (fetch all).
  // We define the base path here. The `createInvestment` function in the calculator will use POST /investment.
  INVESTMENTS: "/investment",

  // Transactions
  // Note: This endpoint requires a username, e.g., /transactions/john_doe
  TRANSACTIONS: "/transactions",

  // Goals
  // Note: This endpoint requires a username, e.g., /goals/john_doe
  GOALS: "/goals",

  // Server Health Check
  TEST_SERVER: "/test",
};

/**
 * A helper function to build the full URL for an API endpoint.
 * It combines the base URL with the endpoint path and adds any query parameters.
 * @param {string} endpoint - The endpoint path from the ENDPOINTS object.
 * @param {Object} [params] - A key-value object for URL query parameters.
 * @returns {string} The complete, ready-to-use URL.
 */
export const buildURL = (endpoint, params = {}) => {
  let url = `${API_BASE_URL}${endpoint}`;

  // Convert the params object into a URL query string
  const queryParams = new URLSearchParams(params).toString();
  if (queryParams) {
    url += `?${queryParams}`;
  }

  return url;
};

// Default export for convenience, though named exports are generally preferred.
export default API_BASE_URL;
