import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getStockQuote,
  getCompanyProfile,
  formatCurrency,
  formatPercentage,
} from "./services/finnhubService";
import { API_BASE_URL, ENDPOINTS } from "./config/api";

const StockDetailScreen = ({ route, navigation }) => {
  const { symbol, stockData: initialStockData } = route.params;
  const [stockData, setStockData] = useState(initialStockData || null);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState("buy");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [stockTransactions, setStockTransactions] = useState([]);
  const [userStockHoldings, setUserStockHoldings] = useState([]);
  const [currentHoldings, setCurrentHoldings] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [profitLoss, setProfitLoss] = useState(0);
  const [userInfo, setUserInfo] = useState(null);

  // Goal selection state
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  useEffect(() => {
    initializeData();
  }, [symbol]);

  useEffect(() => {
    if (stockData && stockData.quote && currentHoldings > 0) {
      const currentPrice = stockData.quote.c || 0;
      const newCurrentValue = currentHoldings * currentPrice;
      setCurrentValue(newCurrentValue);
      setProfitLoss(newCurrentValue - totalInvested);
    }
  }, [stockData, currentHoldings, totalInvested]);

  const initializeData = async () => {
    try {
      // Get user info
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "User not logged in. Please log in again.");
        navigation.goBack();
        return;
      }

      const parsedInfo = JSON.parse(userInfoString);
      setUserInfo(parsedInfo);

      // Fetch stock data if not provided
      if (!stockData) {
        await fetchStockData();
      } else {
        setPrice(stockData.quote?.c?.toString() || "0");
      }

      // Fetch user's stock transactions and holdings
      await fetchUserStockData(parsedInfo);

      // Fetch goals
      await fetchGoals(parsedInfo);
    } catch (error) {
      console.error("Error initializing data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Goals Function
  const fetchGoals = async (userInfo) => {
    try {
      const userName = userInfo.user?.username || userInfo.user?.userName;
      if (!userName) return;

      const response = await fetch(
        `${API_BASE_URL}${ENDPOINTS.GOALS}/${userName}`
      );

      if (response.ok) {
        const goalsData = await response.json();

        // For demo purposes, if no goals from API, show empty state
        // Comment out the default goal to test empty state
        const defaultGoal = {
          _id: "firenumber",
          name: "FireNumber",
          customName: "FIRE Number",
          description: "Financial Independence & Retirement Goal",
          isDefault: true,
        };

        // Always include FireNumber + any custom goals
        setGoals([defaultGoal, ...goalsData]);

        // Set default selection to FireNumber
        setSelectedGoal(defaultGoal);

        console.log(`Fetched ${goalsData.length} goals + FireNumber default`);
      } else {
        console.log("Failed to fetch goals:", response.status);

        // If goals fetch fails, still set FireNumber as default
        const defaultGoal = {
          _id: "firenumber",
          name: "FireNumber",
          customName: "FIRE Number",
          description: "Financial Independence & Retirement Goal",
          isDefault: true,
        };
        setGoals([defaultGoal]);
        setSelectedGoal(defaultGoal);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);

      // On error, still provide FireNumber as fallback
      const defaultGoal = {
        _id: "firenumber",
        name: "FireNumber",
        customName: "FIRE Number",
        description: "Financial Independence & Retirement Goal",
        isDefault: true,
      };
      setGoals([defaultGoal]);
      setSelectedGoal(defaultGoal);
    }
  };

  const fetchStockData = async () => {
    try {
      const [quote, profile] = await Promise.all([
        getStockQuote(symbol),
        getCompanyProfile(symbol),
      ]);

      const stockInfo = {
        quote,
        profile,
        symbol,
        percentChange: quote.pc
          ? (((quote.c - quote.pc) / quote.pc) * 100).toFixed(2)
          : 0,
      };

      setStockData(stockInfo);
      setCompanyData(profile);
      setPrice(quote.c?.toString() || "0");
    } catch (error) {
      Alert.alert("Error", "Failed to fetch stock data");
    }
  };

  const fetchUserStockData = async (userInfo) => {
    try {
      const userName = userInfo.user?.username || userInfo.user?.userName;
      if (!userName) return;

      // Fetch user's stock transactions for this symbol
      const response = await fetch(
        `${API_BASE_URL}${ENDPOINTS.STOCK_TRANSACTIONS}/${userName}?symbol=${symbol}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStockTransactions(data.transactions || []);

        // Calculate current holdings and metrics
        calculateHoldings(data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching user stock data:", error);
    }
  };

  const calculateHoldings = (transactions) => {
    let totalShares = 0;
    let totalCost = 0;
    let buyTransactions = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === "buy") {
        totalShares += transaction.quantity;
        totalCost += transaction.total;
        buyTransactions++;
      } else if (transaction.type === "sell") {
        totalShares -= transaction.quantity;
        totalCost -= transaction.total;
      }
    });

    setCurrentHoldings(Math.max(0, totalShares));
    setTotalInvested(Math.max(0, totalCost));
    setAveragePrice(buyTransactions > 0 ? totalCost / totalShares : 0);
  };

  const openTransactionModal = (type) => {
    // Check if user is trying to sell without owning stocks
    if (type === "sell" && currentHoldings <= 0) {
      Alert.alert(
        "Cannot Sell",
        "You don't own any shares of this stock. Please buy shares first to be able to sell them.",
        [{ text: "OK" }]
      );
      return;
    }

    setTransactionType(type);
    setPrice(stockData?.quote?.c?.toString() || "0");

    // Set maximum quantity for sell transactions
    if (type === "sell") {
      setQuantity(Math.min(1, currentHoldings).toString());
    } else {
      setQuantity("1");
    }

    setModalVisible(true);
  };

  const executeTransaction = async () => {
    if (!quantity || !price || !userInfo) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const quantityNum = parseInt(quantity);
    const priceNum = parseFloat(price);

    // Validate sell quantity
    if (transactionType === "sell" && quantityNum > currentHoldings) {
      Alert.alert("Error", `You can only sell up to ${currentHoldings} shares`);
      return;
    }

    try {
      setLoading(true);

      const userName = userInfo.user?.username || userInfo.user?.userName;
      const transaction = {
        userName,
        symbol,
        companyName: companyData?.name || symbol,
        type: transactionType,
        quantity: quantityNum,
        price: priceNum,
        total: quantityNum * priceNum,
        date: new Date().toISOString().split("T")[0],
      };

      // Save transaction to backend
      const response = await fetch(
        `${API_BASE_URL}${ENDPOINTS.STOCK_TRANSACTIONS}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transaction),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save transaction");
      }

      const savedTransaction = await response.json();

      // Also save as investment in the investment collection
      const investmentData = {
        name: `${symbol} - ${transactionType.toUpperCase()}`,
        amount: transaction.total,
        currentAmount: transaction.total,
        interestRate: 0, // Stocks don't have fixed interest rate
        investmentType: "Stock",
        startDate: new Date().toISOString(),
        description: `${transactionType.toUpperCase()} ${quantityNum} shares of ${symbol} at ${formatCurrency(
          priceNum
        )} per share${
          selectedGoal
            ? ` - Linked to ${selectedGoal.customName || selectedGoal.name}`
            : ""
        }`,
        stockSymbol: symbol,
        stockQuantity: transactionType === "buy" ? quantityNum : -quantityNum,
        stockPrice: priceNum,
        goalId:
          selectedGoal && !selectedGoal.isDefault ? selectedGoal._id : null, // Don't store goalId for FireNumber default
      };

      // Save to stock investments with auth token
      const token = userInfo.token;
      const investmentResponse = await fetch(
        `${API_BASE_URL}/api/stock-investments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(investmentData),
        }
      );

      if (investmentResponse.ok) {
        const investmentResult = await investmentResponse.json();
        console.log("Stock investment updated/created:", investmentResult);

        if (investmentResult.deletedId) {
          console.log("Stock investment deleted (all shares sold)");
        }
      } else {
        const errorData = await investmentResponse.json();
        console.warn(
          "Failed to save to investments collection:",
          errorData.error
        );
        // Show error to user if it's a validation error
        if (investmentResponse.status === 400) {
          Alert.alert("Transaction Failed", errorData.error);
          return; // Don't continue with local updates
        }
      }

      // Update local state
      setStockTransactions([
        ...stockTransactions,
        savedTransaction.transaction,
      ]);

      // Recalculate holdings
      calculateHoldings([...stockTransactions, savedTransaction.transaction]);

      setModalVisible(false);
      setQuantity("1");

      Alert.alert(
        "Transaction Successful",
        `${transactionType.toUpperCase()} ${quantityNum} shares of ${symbol} at ${formatCurrency(
          priceNum
        )}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error executing transaction:", error);
      Alert.alert("Error", "Failed to execute transaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const percentChange =
    stockData?.percentChange ||
    (stockData?.quote && stockData.quote.pc
      ? (
          ((stockData.quote.c - stockData.quote.pc) / stockData.quote.pc) *
          100
        ).toFixed(2)
      : 0);
  const isPositive = parseFloat(percentChange) >= 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F9D58" />
          <Text style={styles.loadingText}>Loading stock data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{symbol}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Company Info */}
        <View style={styles.companySection}>
          <Text style={styles.companyName}>
            {companyData?.name || stockData?.profile?.name || symbol}
          </Text>
          <Text style={styles.symbol}>{symbol}</Text>
          {companyData?.weburl && (
            <Text style={styles.website}>{companyData.weburl}</Text>
          )}
        </View>

        {/* Price Info */}
        <View style={styles.priceSection}>
          <Text style={styles.currentPrice}>
            {formatCurrency(stockData?.quote?.c || stockData?.c || 0)}
          </Text>
          <View style={styles.changeContainer}>
            <Ionicons
              name={isPositive ? "trending-up" : "trending-down"}
              size={16}
              color={isPositive ? "#0F9D58" : "#DC2626"}
            />
            <Text
              style={[
                styles.changeText,
                { color: isPositive ? "#0F9D58" : "#DC2626" },
              ]}
            >
              {formatPercentage(percentChange)}
            </Text>
          </View>
        </View>

        {/* Market Data */}
        <View style={styles.marketDataSection}>
          <Text style={styles.sectionTitle}>Market Data</Text>
          <View style={styles.marketDataGrid}>
            <View style={styles.marketDataItem}>
              <Text style={styles.marketDataLabel}>Open</Text>
              <Text style={styles.marketDataValue}>
                {formatCurrency(stockData?.quote?.o || stockData?.o || 0)}
              </Text>
            </View>
            <View style={styles.marketDataItem}>
              <Text style={styles.marketDataLabel}>High</Text>
              <Text style={styles.marketDataValue}>
                {formatCurrency(stockData?.quote?.h || stockData?.h || 0)}
              </Text>
            </View>
            <View style={styles.marketDataItem}>
              <Text style={styles.marketDataLabel}>Low</Text>
              <Text style={styles.marketDataValue}>
                {formatCurrency(stockData?.quote?.l || stockData?.l || 0)}
              </Text>
            </View>
            <View style={styles.marketDataItem}>
              <Text style={styles.marketDataLabel}>Previous Close</Text>
              <Text style={styles.marketDataValue}>
                {formatCurrency(stockData?.quote?.pc || stockData?.pc || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.buyButton]}
            onPress={() => openTransactionModal("buy")}
          >
            <Ionicons name="trending-up" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Buy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              currentHoldings > 0 ? styles.sellButton : styles.disabledButton,
            ]}
            onPress={() => openTransactionModal("sell")}
          >
            <Ionicons name="trending-down" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {currentHoldings > 0 ? "Sell" : "Buy to Sell"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        {stockTransactions.length > 0 && (
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <FlatList
              data={stockTransactions.slice(0, 5)} // Show last 5 transactions
              keyExtractor={(item, index) => `${item._id}-${index}`}
              renderItem={({ item }) => (
                <View style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionTypeIndicator,
                        {
                          backgroundColor:
                            item.type === "buy" ? "#0F9D58" : "#DC2626",
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          item.type === "buy" ? "trending-up" : "trending-down"
                        }
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                    <View>
                      <Text style={styles.transactionType}>
                        {item.type.toUpperCase()} {item.quantity} shares
                      </Text>
                      <Text style={styles.transactionDate}>
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionPrice}>
                      {formatCurrency(item.price)}/share
                    </Text>
                    <Text style={styles.transactionTotal}>
                      Total: {formatCurrency(item.total)}
                    </Text>
                  </View>
                </View>
              )}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {transactionType.toUpperCase()} {symbol}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={(text) => {
                    // For sell, limit to available holdings
                    if (transactionType === "sell") {
                      const num = parseInt(text) || 0;
                      setQuantity(Math.min(num, currentHoldings).toString());
                    } else {
                      setQuantity(text);
                    }
                  }}
                  keyboardType="numeric"
                  placeholder={
                    transactionType === "sell"
                      ? `Max: ${currentHoldings}`
                      : "Enter quantity"
                  }
                />
                {transactionType === "sell" && (
                  <Text style={styles.helperText}>
                    Available to sell: {currentHoldings} shares
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price per share</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="Enter price"
                />
                <Text style={styles.helperText}>
                  Current market price:{" "}
                  {formatCurrency(stockData?.quote?.c || stockData?.c || 0)}
                </Text>
              </View>

              {/* Link to Goal Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Link to Goal</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setGoalModalVisible(true)}
                >
                  <View style={styles.dropdownContent}>
                    <Text style={styles.dropdownButtonText}>
                      {selectedGoal?.description ||
                        (selectedGoal
                          ? `${selectedGoal.customName || selectedGoal.name}${
                              selectedGoal.isDefault ? " (Default)" : ""
                            }`
                          : "Select a goal")}
                    </Text>
                    {selectedGoal?.description &&
                      (selectedGoal?.customName || selectedGoal?.name) && (
                        <Text style={styles.dropdownSubtitleText}>
                          {selectedGoal.customName || selectedGoal.name}
                          {selectedGoal.isDefault && " (Default)"}
                        </Text>
                      )}
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.helperText}>
                  {selectedGoal
                    ? `Investment will be linked to: ${
                        selectedGoal.isDefault
                          ? "FireNumber (Default)"
                          : "Custom Goal"
                      }`
                    : "Select a goal to link this stock investment"}
                </Text>
              </View>

              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(
                    (parseInt(quantity) || 0) * (parseFloat(price) || 0)
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  transactionType === "buy"
                    ? styles.buyButton
                    : styles.sellButton,
                ]}
                onPress={executeTransaction}
              >
                <Text style={styles.confirmButtonText}>
                  {transactionType.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Goal Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={goalModalVisible}
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.goalModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Goal</Text>
              <TouchableOpacity onPress={() => setGoalModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.goalModalBody}>
              <FlatList
                data={goals}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.goalItem,
                      selectedGoal?._id === item._id && styles.selectedGoalItem,
                    ]}
                    onPress={() => {
                      setSelectedGoal(item);
                      setGoalModalVisible(false);
                    }}
                  >
                    <View style={styles.goalItemContent}>
                      <Text style={styles.goalItemName}>
                        {item.description || item.customName || item.name}
                      </Text>
                      {item.description && (item.customName || item.name) && (
                        <Text style={styles.goalItemDescription}>
                          {item.customName || item.name}
                        </Text>
                      )}
                    </View>
                    {selectedGoal?._id === item._id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#059669"
                      />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyGoals}>
                    <Ionicons name="flag-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyGoalsText}>No goals found</Text>
                    <Text style={styles.emptyGoalsSubtext}>
                      Create some financial goals first
                    </Text>
                  </View>
                }
                showsVerticalScrollIndicator={false}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setGoalModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  companySection: {
    paddingVertical: 24,
    alignItems: "center",
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  symbol: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 4,
  },
  website: {
    fontSize: 14,
    color: "#0F9D58",
  },
  priceSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
  },
  marketDataSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  marketDataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  marketDataItem: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    width: "48%",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  marketDataLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  marketDataValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  actionSection: {
    flexDirection: "row",
    marginBottom: 32,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  buyButton: {
    backgroundColor: "#0F9D58",
  },
  sellButton: {
    backgroundColor: "#DC2626",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Transactions Section Styles
  transactionsSection: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  transactionItem: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  transactionTypeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  transactionDate: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionPrice: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
  },
  transactionTotal: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  // Modal Helper Text
  helperText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    padding: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "500",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  buyButton: {
    backgroundColor: "#0F9D58",
  },
  sellButton: {
    backgroundColor: "#DC2626",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Goal Selection Styles
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  dropdownContent: {
    flex: 1,
  },
  dropdownSubtitleText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  // Goal Modal Styles
  goalModalContent: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  goalModalBody: {
    padding: 0,
    maxHeight: 400,
  },
  goalItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    borderRadius: 8,
    marginVertical: 4,
  },
  selectedGoalItem: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
    borderWidth: 1,
  },
  goalItemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  goalItemDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  goalItemCost: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "500",
    marginTop: 2,
  },
  emptyGoals: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyGoalsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptyGoalsSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignSelf: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
});

export default StockDetailScreen;
