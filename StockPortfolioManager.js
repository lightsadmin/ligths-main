import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import stockCRUDService from "./services/stockCRUDService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const StockPortfolioManager = ({ navigation }) => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [username, setUsername] = useState("");

  // Form state for adding/editing stocks
  const [formData, setFormData] = useState({
    symbol: "",
    name: "",
    exchange: "NSE",
    quantity: "",
    purchasePrice: "",
    currentPrice: "",
    notes: "",
  });

  useEffect(() => {
    let mounted = true;
    const initializePortfolio = async () => {
      if (mounted) {
        await loadUserAndPortfolio();
      }
    };
    initializePortfolio();

    return () => {
      mounted = false;
    };
  }, []);

  const loadUserAndPortfolio = async () => {
    try {
      const user = await AsyncStorage.getItem("username");
      if (user) {
        setUsername(user);
        await loadPortfolio(user);
        await loadPortfolioSummary(user);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadPortfolio = useCallback(
    async (user = username) => {
      try {
        setLoading(true);
        const stocks = await stockCRUDService.getAllStockEntries(user);
        setPortfolio(stocks);
      } catch (error) {
        console.error("Error loading portfolio:", error);
        Alert.alert("Error", "Failed to load portfolio");
      } finally {
        setLoading(false);
      }
    },
    [username]
  );

  const loadPortfolioSummary = useCallback(
    async (user = username) => {
      try {
        const summary = await stockCRUDService.getPortfolioSummary(user);
        setPortfolioSummary(summary);
      } catch (error) {
        console.error("Error loading portfolio summary:", error);
      }
    },
    [username]
  );

  const handleAddStock = async () => {
    try {
      if (!formData.symbol || !formData.name) {
        Alert.alert("Error", "Symbol and Name are required");
        return;
      }

      setLoading(true);
      await stockCRUDService.createStockEntry({
        ...formData,
        quantity: parseFloat(formData.quantity) || 0,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        currentPrice: parseFloat(formData.currentPrice) || 0,
      });

      setShowAddModal(false);
      resetForm();
      await loadPortfolio();
      await loadPortfolioSummary();

      Alert.alert("Success", "Stock added to portfolio successfully");
    } catch (error) {
      console.error("Error adding stock:", error);
      Alert.alert("Error", "Failed to add stock to portfolio");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStock = async () => {
    try {
      if (!selectedStock) return;

      setLoading(true);
      await stockCRUDService.updateStockEntry(selectedStock.id, {
        ...formData,
        quantity: parseFloat(formData.quantity) || 0,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        currentPrice: parseFloat(formData.currentPrice) || 0,
      });

      setShowEditModal(false);
      setSelectedStock(null);
      resetForm();
      await loadPortfolio();
      await loadPortfolioSummary();

      Alert.alert("Success", "Stock updated successfully");
    } catch (error) {
      console.error("Error updating stock:", error);
      Alert.alert("Error", "Failed to update stock");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStock = async (stock) => {
    Alert.alert(
      "Delete Stock",
      `Are you sure you want to remove ${stock.symbol} from your portfolio?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await stockCRUDService.deleteStockEntry(stock.id);
              await loadPortfolio();
              await loadPortfolioSummary();
              Alert.alert("Success", "Stock removed from portfolio");
            } catch (error) {
              console.error("Error deleting stock:", error);
              Alert.alert("Error", "Failed to remove stock");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openEditModal = (stock) => {
    setSelectedStock(stock);
    setFormData({
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange,
      quantity: stock.quantity?.toString() || "",
      purchasePrice: stock.purchasePrice?.toString() || "",
      currentPrice: stock.currentPrice?.toString() || "",
      notes: stock.notes || "",
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      symbol: "",
      name: "",
      exchange: "NSE",
      quantity: "",
      purchasePrice: "",
      currentPrice: "",
      notes: "",
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPortfolio();
    await loadPortfolioSummary();
    setRefreshing(false);
  }, [username]);

  const calculateGainLoss = (stock) => {
    const investment = (stock.quantity || 0) * (stock.purchasePrice || 0);
    const currentValue = (stock.quantity || 0) * (stock.currentPrice || 0);
    const gainLoss = currentValue - investment;
    const gainLossPercent = investment > 0 ? (gainLoss / investment) * 100 : 0;
    return { gainLoss, gainLossPercent, currentValue, investment };
  };

  const renderStockItem = ({ item }) => {
    const { gainLoss, gainLossPercent, currentValue, investment } =
      calculateGainLoss(item);
    const isPositive = gainLoss >= 0;

    return (
      <View style={styles.stockCard}>
        <View style={styles.stockHeader}>
          <View style={styles.stockInfo}>
            <Text style={styles.stockSymbol}>{item.symbol}</Text>
            <Text style={styles.stockName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.stockExchange}>{item.exchange}</Text>
          </View>
          <View style={styles.stockActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="pencil" size={16} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteStock(item)}
            >
              <Ionicons name="trash" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.stockDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={styles.detailValue}>{item.quantity || 0}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Purchase Price:</Text>
            <Text style={styles.detailValue}>
              ₹{item.purchasePrice?.toFixed(2) || "0.00"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Price:</Text>
            <Text style={styles.detailValue}>
              ₹{item.currentPrice?.toFixed(2) || "0.00"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Investment:</Text>
            <Text style={styles.detailValue}>₹{investment.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Value:</Text>
            <Text style={styles.detailValue}>₹{currentValue.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gain/Loss:</Text>
            <Text
              style={[
                styles.gainLoss,
                isPositive ? styles.positive : styles.negative,
              ]}
            >
              ₹{gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderPortfolioSummary = () => {
    if (!portfolioSummary) return null;

    const {
      totalInvestment,
      currentValue,
      totalGainLoss,
      totalGainLossPercent,
    } = portfolioSummary;
    const isPositive = totalGainLoss >= 0;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Portfolio Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Stocks</Text>
            <Text style={styles.summaryValue}>
              {portfolioSummary.totalStocks}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Investment</Text>
            <Text style={styles.summaryValue}>
              ₹{totalInvestment.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Current Value</Text>
            <Text style={styles.summaryValue}>₹{currentValue.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Gain/Loss</Text>
            <Text
              style={[
                styles.summaryValue,
                isPositive ? styles.positive : styles.negative,
              ]}
            >
              ₹{totalGainLoss.toFixed(2)} ({totalGainLossPercent.toFixed(2)}%)
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFormModal = (isEdit = false) => (
    <Modal
      visible={isEdit ? showEditModal : showAddModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.modalTitle}>
              {isEdit ? "Edit Stock" : "Add Stock to Portfolio"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Stock Symbol (e.g., RELIANCE)"
              value={formData.symbol}
              onChangeText={(text) =>
                setFormData({ ...formData, symbol: text.toUpperCase() })
              }
            />

            <TextInput
              style={styles.input}
              placeholder="Company Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Exchange (NSE/BSE)"
              value={formData.exchange}
              onChangeText={(text) =>
                setFormData({ ...formData, exchange: text })
              }
            />

            <TextInput
              style={styles.input}
              placeholder="Quantity"
              value={formData.quantity}
              onChangeText={(text) =>
                setFormData({ ...formData, quantity: text })
              }
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Purchase Price (₹)"
              value={formData.purchasePrice}
              onChangeText={(text) =>
                setFormData({ ...formData, purchasePrice: text })
              }
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Current Price (₹)"
              value={formData.currentPrice}
              onChangeText={(text) =>
                setFormData({ ...formData, currentPrice: text })
              }
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Notes (optional)"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  isEdit ? setShowEditModal(false) : setShowAddModal(false);
                  resetForm();
                  setSelectedStock(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={isEdit ? handleEditStock : handleAddStock}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isEdit ? "Update" : "Add Stock"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderPortfolioSummary()}

      <FlatList
        data={portfolio}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.id || item.symbol}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No stocks in portfolio</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first stock to start tracking your investments
            </Text>
          </View>
        }
        contentContainerStyle={
          portfolio.length === 0 ? styles.emptyContainer : null
        }
      />

      {/* Add Stock Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Add Modal */}
      {renderFormModal(false)}

      {/* Edit Modal */}
      {renderFormModal(true)}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryItem: {
    width: "48%",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  stockCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stockInfo: {
    flex: 1,
  },
  stockSymbol: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  stockName: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  stockExchange: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  stockActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  stockDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  gainLoss: {
    fontSize: 14,
    fontWeight: "600",
  },
  positive: {
    color: "#10b981",
  },
  negative: {
    color: "#ef4444",
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: "#1f2937",
    fontStyle: "italic",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
  },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    margin: 20,
    borderRadius: 16,
    padding: 24,
    maxHeight: "80%",
    width: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default StockPortfolioManager;
