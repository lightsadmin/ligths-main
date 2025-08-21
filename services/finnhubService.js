import axios from "axios";
import { API_BASE_URL, ENDPOINTS } from "../config/api";

// Get all stock companies with search and pagination (now using Yahoo Finance backend)
export const getStockCompanies = async (
  search = "",
  page = 1,
  limit = 50,
  exchange = "INDIA"
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

// Get stock quote from backend (Yahoo Finance)
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

// Get multiple stock quotes from backend (Yahoo Finance)
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

// Legacy functions for backward compatibility (now using Yahoo Finance backend)
// These are kept for any existing code that might still use them

// Get real-time quote for a stock (now redirects to backend)
export const getStockQuote = async (symbol) => {
  try {
    return await getStockQuoteFromBackend(symbol);
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    throw error;
  }
};

// Get company profile (now using Yahoo Finance data from backend)
export const getCompanyProfile = async (symbol) => {
  try {
    const quote = await getStockQuoteFromBackend(symbol);
    // Convert Yahoo Finance data to Finnhub-like format for compatibility
    return {
      name: quote.longName || quote.shortName,
      ticker: symbol,
      exchange: quote.exchange,
      finnhubIndustry: quote.sector || "Unknown",
      country:
        quote.country ||
        (symbol.includes(".NS") || symbol.includes(".BO") ? "India" : "US"),
      currency:
        quote.currency ||
        (symbol.includes(".NS") || symbol.includes(".BO") ? "INR" : "USD"),
      marketCapitalization: quote.marketCap || 0,
      shareOutstanding: quote.sharesOutstanding || 0,
    };
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error);
    throw error;
  }
};

// Get multiple stock quotes (now using Yahoo Finance backend)
export const getMultipleQuotes = async (symbols) => {
  try {
    const promises = symbols.map((symbol) =>
      Promise.all([getStockQuote(symbol), getCompanyProfile(symbol)]).then(
        ([quote, profile]) => ({
          symbol,
          quote: {
            c: quote.regularMarketPrice,
            pc: quote.regularMarketPreviousClose,
            o: quote.regularMarketOpen,
            h: quote.regularMarketDayHigh,
            l: quote.regularMarketDayLow,
            t: Math.floor(new Date(quote.regularMarketTime).getTime() / 1000),
          },
          profile,
          percentChange: quote.regularMarketPreviousClose
            ? (
                ((quote.regularMarketPrice - quote.regularMarketPreviousClose) /
                  quote.regularMarketPreviousClose) *
                100
              ).toFixed(2)
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
