/**
 * Stock CRUD Operations Service
 * Handles Create, Read, Update, Delete operations for stock data
 */

import { API_BASE_URL, ENDPOINTS } from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

class StockCRUDService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * CREATE - Add a new stock to portfolio (auto-deletes after 1 week)
   */
  async createStockEntry(stockData) {
    try {
      // Get username from AsyncStorage
      const userName = await AsyncStorage.getItem("username");
      if (!userName) {
        throw new Error("User not logged in");
      }

      const response = await fetch(`${this.baseURL}/api/stock-investments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: userName,
          symbol: stockData.symbol,
          name: stockData.name,
          exchange: stockData.exchange,
          quantity: stockData.quantity || 0,
          purchasePrice: stockData.purchasePrice || 0,
          currentPrice: stockData.currentPrice || 0,
          investmentType: stockData.investmentType || "stock",
          notes: stockData.notes || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create stock entry: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ Stock entry created successfully:", result);

      // Also save to local storage for offline access
      await this.saveToLocalStorage(userName, result.stock);

      return result.stock;
    } catch (error) {
      console.error("❌ Error creating stock entry:", error);
      throw error;
    }
  }

  /**
   * READ - Get all stock entries for a user
   */
  async getAllStockEntries(username) {
    try {
      const userName = username || (await AsyncStorage.getItem("username"));
      if (!userName) {
        throw new Error("User not logged in");
      }

      const response = await fetch(
        `${this.baseURL}/api/stock-investments/${userName}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch stock entries: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log(
        "✅ Stock entries fetched successfully:",
        result.stocks?.length || 0,
        "entries"
      );

      // Also update local storage
      if (result.stocks) {
        await this.updateLocalStorage(userName, result.stocks);
      }

      return result.stocks || [];
    } catch (error) {
      console.error("❌ Error fetching stock entries:", error);

      // Fallback to local storage if backend fails
      try {
        const userName = username || (await AsyncStorage.getItem("username"));
        const localData = await this.getFromLocalStorage(userName);
        console.log(
          "📱 Using local storage fallback:",
          localData?.length || 0,
          "entries"
        );
        return localData || [];
      } catch (localError) {
        console.error("❌ Local storage fallback failed:", localError);
        return [];
      }
    }
  }

  /**
   * READ - Get single stock entry by ID
   */
  async getStockEntryById(entryId) {
    try {
      const response = await fetch(
        `${this.baseURL}/api/stock-investments/entry/${entryId}`,
        {
          method: "GET",
          headers: {
            Authorization: await this.getAuthToken(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch stock entry: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ Stock entry fetched successfully:", result);
      return result;
    } catch (error) {
      console.error("❌ Error fetching stock entry:", error);
      throw error;
    }
  }

  /**
   * UPDATE - Update existing stock entry
   */
  async updateStockEntry(entryId, updateData) {
    try {
      const userName = await AsyncStorage.getItem("username");
      if (!userName) {
        throw new Error("User not logged in");
      }

      const response = await fetch(
        `${this.baseURL}/api/stock-investments/${userName}/${entryId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update stock entry: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ Stock entry updated successfully:", result);

      // Update local storage
      await this.updateLocalStorageEntry(userName, entryId, result.stock);

      return result.stock;
    } catch (error) {
      console.error("❌ Error updating stock entry:", error);
      throw error;
    }
  }

  /**
   * DELETE - Remove stock entry
   */
  async deleteStockEntry(entryId) {
    try {
      const userName = await AsyncStorage.getItem("username");
      if (!userName) {
        throw new Error("User not logged in");
      }

      const response = await fetch(
        `${this.baseURL}/api/stock-investments/${userName}/${entryId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete stock entry: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ Stock entry deleted successfully:", result);

      // Remove from local storage
      await this.removeFromLocalStorage(userName, entryId);

      return result.deletedStock;
    } catch (error) {
      console.error("❌ Error deleting stock entry:", error);
      throw error;
    }
  }

  /**
   * BULK OPERATIONS
   */

  /**
   * Bulk update stock prices for portfolio
   */
  async bulkUpdateStockPrices(symbols) {
    try {
      const response = await fetch(`${this.baseURL}/api/stock-quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: await this.getAuthToken(),
        },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) {
        throw new Error(`Failed to bulk update prices: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(
        "✅ Bulk price update successful:",
        result.length,
        "stocks updated"
      );
      return result;
    } catch (error) {
      console.error("❌ Error in bulk price update:", error);
      throw error;
    }
  }

  /**
   * Get portfolio summary/statistics
   */
  async getPortfolioSummary(username) {
    try {
      const stocks = await this.getAllStockEntries(username);

      const summary = {
        totalStocks: stocks.length,
        totalInvestment: 0,
        currentValue: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        bestPerformer: null,
        worstPerformer: null,
        lastUpdated: new Date().toISOString(),
      };

      stocks.forEach((stock) => {
        const investment = (stock.quantity || 0) * (stock.purchasePrice || 0);
        const currentValue = (stock.quantity || 0) * (stock.currentPrice || 0);
        const gainLoss = currentValue - investment;
        const gainLossPercent =
          investment > 0 ? (gainLoss / investment) * 100 : 0;

        summary.totalInvestment += investment;
        summary.currentValue += currentValue;
        summary.totalGainLoss += gainLoss;

        // Track best and worst performers
        if (
          !summary.bestPerformer ||
          gainLossPercent > summary.bestPerformer.gainLossPercent
        ) {
          summary.bestPerformer = { ...stock, gainLossPercent };
        }
        if (
          !summary.worstPerformer ||
          gainLossPercent < summary.worstPerformer.gainLossPercent
        ) {
          summary.worstPerformer = { ...stock, gainLossPercent };
        }
      });

      summary.totalGainLossPercent =
        summary.totalInvestment > 0
          ? (summary.totalGainLoss / summary.totalInvestment) * 100
          : 0;

      console.log("✅ Portfolio summary calculated:", summary);
      return summary;
    } catch (error) {
      console.error("❌ Error calculating portfolio summary:", error);
      throw error;
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Get authentication token from AsyncStorage
   */
  async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem("authToken");
      return token ? `Bearer ${token}` : "";
    } catch (error) {
      console.error("❌ Error getting auth token:", error);
      return "";
    }
  }

  /**
   * Save stock entry to local storage (offline support)
   */
  async saveToLocalStorage(key, data) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log("✅ Data saved to local storage:", key);
    } catch (error) {
      console.error("❌ Error saving to local storage:", error);
    }
  }

  /**
   * Get stock entry from local storage
   */
  async getFromLocalStorage(key) {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("❌ Error getting from local storage:", error);
      return null;
    }
  }

  /**
   * Helper method to save stock to local storage
   */
  async saveToLocalStorage(username, stock) {
    try {
      const key = `stock_portfolio_${username}`;
      const existing = await AsyncStorage.getItem(key);
      const portfolio = existing ? JSON.parse(existing) : [];

      // Add new stock with unique ID
      const stockWithId = {
        ...stock,
        id: stock._id || stock.id || Date.now().toString(),
        localTimestamp: new Date().toISOString(),
      };

      portfolio.push(stockWithId);
      await AsyncStorage.setItem(key, JSON.stringify(portfolio));
      console.log("✅ Stock saved to local storage");
    } catch (error) {
      console.error("❌ Error saving to local storage:", error);
    }
  }

  /**
   * Helper method to update local storage with new portfolio data
   */
  async updateLocalStorage(username, stocks) {
    try {
      const key = `stock_portfolio_${username}`;
      const portfolioWithIds = stocks.map((stock) => ({
        ...stock,
        id: stock._id || stock.id || Date.now().toString(),
        localTimestamp: new Date().toISOString(),
      }));

      await AsyncStorage.setItem(key, JSON.stringify(portfolioWithIds));
      console.log(
        "✅ Local storage updated with",
        portfolioWithIds.length,
        "stocks"
      );
    } catch (error) {
      console.error("❌ Error updating local storage:", error);
    }
  }

  /**
   * Helper method to get portfolio from local storage
   */
  async getFromLocalStorage(username) {
    try {
      const key = `stock_portfolio_${username}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("❌ Error reading from local storage:", error);
      return [];
    }
  }

  /**
   * Helper method to update a specific entry in local storage
   */
  async updateLocalStorageEntry(username, entryId, updatedStock) {
    try {
      const key = `stock_portfolio_${username}`;
      const existing = await AsyncStorage.getItem(key);
      const portfolio = existing ? JSON.parse(existing) : [];

      const index = portfolio.findIndex(
        (stock) => stock.id === entryId || stock._id === entryId
      );

      if (index !== -1) {
        portfolio[index] = {
          ...updatedStock,
          id: updatedStock._id || updatedStock.id || entryId,
          localTimestamp: new Date().toISOString(),
        };
        await AsyncStorage.setItem(key, JSON.stringify(portfolio));
        console.log("✅ Local storage entry updated");
      }
    } catch (error) {
      console.error("❌ Error updating local storage entry:", error);
    }
  }

  /**
   * Helper method to remove entry from local storage
   */
  async removeFromLocalStorage(username, entryId) {
    try {
      const key = `stock_portfolio_${username}`;
      const existing = await AsyncStorage.getItem(key);
      const portfolio = existing ? JSON.parse(existing) : [];

      const filtered = portfolio.filter(
        (stock) => stock.id !== entryId && stock._id !== entryId
      );

      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      console.log("✅ Entry removed from local storage");
    } catch (error) {
      console.error("❌ Error removing from local storage:", error);
    }
  }

  /**
   * Sync local data with server
   */
  async syncLocalDataWithServer(username) {
    try {
      const localData = await this.getFromLocalStorage(
        `stock_portfolio_${username}`
      );
      if (!localData) return;

      const serverData = await this.getAllStockEntries(username);

      // Compare and sync differences
      // This is a simplified sync - you can make it more sophisticated
      console.log("🔄 Syncing local data with server...");

      for (const localEntry of localData) {
        const serverEntry = serverData.find(
          (s) => s.symbol === localEntry.symbol
        );
        if (!serverEntry) {
          // Local entry not on server, create it
          await this.createStockEntry(localEntry);
        } else if (
          new Date(localEntry.lastUpdated) > new Date(serverEntry.lastUpdated)
        ) {
          // Local entry is newer, update server
          await this.updateStockEntry(serverEntry.id, localEntry);
        }
      }

      console.log("✅ Sync completed successfully");
    } catch (error) {
      console.error("❌ Error syncing data:", error);
      throw error;
    }
  }
}

// Export singleton instance
const stockCRUDService = new StockCRUDService();
export default stockCRUDService;
