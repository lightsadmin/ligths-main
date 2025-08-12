import axios from "axios";
import { API_BASE_URL, ENDPOINTS } from "../config/api";

const API_KEY = "d28seapr01qle9gsj64gd28seapr01qle9gsj650";
const BASE_URL = "https://finnhub.io/api/v1";

// Demo stock symbols
export const STOCK_SYMBOLS = [
  "AAPL",
  "MSFT",
  "TSLA",
  "AMZN",
  "GOOGL",
  "META",
  "NVDA",
  "NFLX",
  "CRM",
  "AMD",
];

// Get all stock companies with search and pagination
export const getStockCompanies = async (
  search = "",
  page = 1,
  limit = 50,
  exchange = "US"
) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}${ENDPOINTS.STOCK_COMPANIES}`,
      {
        params: {
          search,
          page,
          limit,
          exchange,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching stock companies:", error);
    throw error;
  }
};

// Get stock quote from backend
export const getStockQuoteFromBackend = async (symbol) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}${ENDPOINTS.STOCK_QUOTE}/${symbol}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    throw error;
  }
};

// Get multiple stock quotes from backend
export const getMultipleQuotesFromBackend = async (symbols) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}${ENDPOINTS.STOCK_QUOTES}`,
      {
        symbols,
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error fetching multiple quotes from backend:", error);
    throw error;
  }
};

// Get real-time quote for a stock (direct from Finnhub - keeping for backward compatibility)
export const getStockQuote = async (symbol) => {
  try {
    const response = await axios.get(`${BASE_URL}/quote`, {
      params: {
        symbol: symbol,
        token: API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    throw error;
  }
};

// Get company profile (direct from Finnhub - keeping for backward compatibility)
export const getCompanyProfile = async (symbol) => {
  try {
    const response = await axios.get(`${BASE_URL}/stock/profile2`, {
      params: {
        symbol: symbol,
        token: API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error);
    throw error;
  }
};

// Get multiple stock quotes (keeping for backward compatibility)
export const getMultipleQuotes = async (symbols) => {
  try {
    const promises = symbols.map((symbol) =>
      Promise.all([getStockQuote(symbol), getCompanyProfile(symbol)]).then(
        ([quote, profile]) => ({
          symbol,
          quote,
          profile,
          percentChange: quote.pc
            ? (((quote.c - quote.pc) / quote.pc) * 100).toFixed(2)
            : 0,
        })
      )
    );

    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Error fetching multiple quotes:", error);
    throw error;
  }
};

// Format currency
export const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format percentage
export const formatPercentage = (value) => {
  const num = parseFloat(value);
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
};
