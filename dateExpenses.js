import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AntDesign,
  Feather,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

const API_URL = "https://ligths-backend.onrender.com";

const formatDate = (dateString) => {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

const TransactionsPage = ({ route, navigation }) => {
  const { selectedDate } = route.params;
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTransaction, setNewTransaction] = useState({
    name: "",
    amount: "",
    type: "",
    subType: "",
    method: "",
    date: selectedDate,
  });

  useEffect(() => {
    fetchTransactions();
  }, [selectedDate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const userInfo = await AsyncStorage.getItem("userInfo");

      if (!userInfo) {
        Alert.alert("Session Expired", "Please log in again to continue.");
        return;
      }

      const parsedInfo = JSON.parse(userInfo);
      const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;

      if (!username) {
        Alert.alert("Error", "Username not found. Please log in again.");
        return;
      }

      const response = await fetch(`${API_URL}/transactions/${username}`);
      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.error || "Error fetching transactions.");
        return;
      }

      if (data.transactions && Array.isArray(data.transactions)) {
        const filteredData = data.transactions.filter(
          (transaction) => transaction.date === selectedDate
        );
        setTransactions(filteredData);
      } else {
        console.error("Invalid data format received:", data);
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      Alert.alert("Network Error", "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // Add Transaction
  const addTransaction = async () => {
    if (
      !newTransaction.name ||
      !newTransaction.amount ||
      !newTransaction.type ||
      !newTransaction.method
    ) {
      Alert.alert(
        "Missing Information",
        "Please fill out all required fields."
      );
      return;
    }

    try {
      setLoading(true);
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!userInfo) {
        Alert.alert("Session Expired", "Please log in again to continue.");
        return;
      }
      const parsedInfo = JSON.parse(userInfo);
      const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;

      const response = await fetch(`${API_URL}/transactions/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTransaction),
      });

      const result = await response.json();

      if (response.ok) {
        await fetchTransactions();
        setNewTransaction({
          name: "",
          amount: "",
          type: "",
          subType: "",
          method: "",
          date: selectedDate,
        });
        setModalVisible(false);
      } else {
        Alert.alert("Error", result.error || "Error adding transaction.");
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      Alert.alert("Network Error", "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // Delete Transaction with confirmation
  const deleteTransaction = async (id, name) => {
    Alert.alert(
      "Delete Transaction",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const userInfo = await AsyncStorage.getItem("userInfo");
              if (!userInfo) {
                Alert.alert(
                  "Session Expired",
                  "Please log in again to continue."
                );
                return;
              }

              const parsedInfo = JSON.parse(userInfo);
              const username =
                parsedInfo?.user?.username || parsedInfo?.user?.userName;

              const url = `${API_URL}/transactions/${username}/${id}`;

              const response = await fetch(url, {
                method: "DELETE",
              });

              const result = await response.json();

              if (response.ok && result.success) {
                setTransactions(
                  transactions.filter((transaction) => transaction._id !== id)
                );
                Alert.alert("Success", "Transaction deleted successfully.");
              } else {
                Alert.alert(
                  "Error",
                  result.error || "Error deleting transaction."
                );
              }
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert("Network Error", "Could not connect to the server.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Filter Transactions
  const filteredTransactions = transactions.filter(
    (transaction) => filter === "All" || transaction.type === filter
  );

  // Get icon based on transaction type
  const getTransactionIcon = (type) => {
    switch (type) {
      case "Income":
        return (
          <MaterialIcons name="arrow-circle-down" size={24} color="#10B981" />
        );
      case "Expense":
        return (
          <MaterialIcons name="arrow-circle-up" size={24} color="#EF4444" />
        );
      case "Investment":
        return (
          <MaterialCommunityIcons name="chart-line" size={24} color="#3B82F6" />
        );
      default:
        return <MaterialIcons name="attach-money" size={24} color="#64748B" />;
    }
  };

  // Get method icon
  const getMethodIcon = (method) => {
    switch (method) {
      case "Cash":
        return <MaterialIcons name="money" size={18} color="#64748B" />;
      case "Credit Card":
        return <AntDesign name="creditcard" size={18} color="#64748B" />;
      case "Debit Card":
        return <AntDesign name="creditcard" size={18} color="#64748B" />;
      case "UPI":
        return (
          <MaterialCommunityIcons name="cellphone" size={18} color="#64748B" />
        );
      default:
        return <MaterialIcons name="payment" size={18} color="#64748B" />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />

      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Transactions</Text>
          <Text style={styles.headerDate}>{formatDate(selectedDate)}</Text>
        </View>
      </View> */}

      <View style={styles.filterContainer}>
        {[
          { id: "All", label: "All" },
          { id: "Income", label: "Income" },
          { id: "Investment", label: "Invest" },
          { id: "Expense", label: "Expense" },
        ].map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.filterButton,
              filter === type.id && styles.activeFilter,
              type.id === "Income" &&
                filter === type.id &&
                styles.activeIncomeFilter,
              type.id === "Investment" &&
                filter === type.id &&
                styles.activeInvestmentFilter,
              type.id === "Expense" &&
                filter === type.id &&
                styles.activeExpenseFilter,
            ]}
            onPress={() => setFilter(type.id)}
          >
            <Text
              style={[
                styles.filterText,
                filter === type.id && styles.activeFilterText,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="cash-remove"
            size={64}
            color="#CBD5E1"
          />
          <Text style={styles.emptyText}>No transactions found</Text>
          <Text style={styles.emptySubtext}>
            {filter === "All"
              ? "Add your first transaction for this day"
              : `No ${filter.toLowerCase()} transactions found`}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setActionMenuVisible(true)}
          >
            <Text style={styles.emptyButtonText}>Add Transaction</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item, index) =>
            item && item._id ? item._id : index.toString()
          }
          contentContainerStyle={styles.listContainer}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === "android"}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />
          )}
          renderItem={({ item }) =>
            item ? (
              <TouchableOpacity
                style={styles.transactionItem}
                onPress={() => {}}
                activeOpacity={0.9}
              >
                <View style={styles.transactionLeftContent}>
                  {getTransactionIcon(item.type)}
                </View>
                <View style={styles.transactionMiddleContent}>
                  <Text style={styles.transactionName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.transactionMetaContainer}>
                    {getMethodIcon(item.method)}
                    <Text style={styles.transactionMeta} numberOfLines={1}>
                      {item.method}
                    </Text>
                    {item.subType && (
                      <>
                        <View style={styles.metaDot} />
                        <Text style={styles.transactionMeta} numberOfLines={1}>
                          {item.subType}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.transactionRightContent}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      item.type === "Income" && styles.incomeAmount,
                      item.type === "Expense" && styles.expenseAmount,
                      item.type === "Investment" && styles.investmentAmount,
                    ]}
                  >
                    {item.type === "Expense"
                      ? `-₹${item.amount}`
                      : `₹${item.amount}`}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteIconContainer}
                    onPress={() => deleteTransaction(item._id, item.name)}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  >
                    <Feather name="trash-2" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setActionMenuVisible(true)}
      >
        <AntDesign name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Transaction</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                >
                  <AntDesign name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formScrollView}
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Transaction Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="E.g., Groceries, Salary, etc."
                    placeholderTextColor="#94A3B8"
                    value={newTransaction.name}
                    onChangeText={(text) =>
                      setNewTransaction({ ...newTransaction, name: text })
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={newTransaction.amount}
                    onChangeText={(text) =>
                      setNewTransaction({ ...newTransaction, amount: text })
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Transaction Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newTransaction.type}
                      onValueChange={(itemValue) =>
                        setNewTransaction({
                          ...newTransaction,
                          type: itemValue,
                          subType: "",
                        })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Type" value="" />
                      <Picker.Item label="Income" value="Income" />
                      <Picker.Item label="Investment" value="Investment" />
                      <Picker.Item label="Expense" value="Expense" />
                    </Picker>
                  </View>
                </View>

                {newTransaction.type && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {newTransaction.type === "Income"
                        ? "Income Type"
                        : newTransaction.type === "Expense"
                        ? "Expense Category"
                        : "Investment Type"}
                    </Text>
                    <View style={styles.pickerContainer}>
                      {newTransaction.type === "Income" && (
                        <Picker
                          selectedValue={newTransaction.subType}
                          onValueChange={(itemValue) =>
                            setNewTransaction({
                              ...newTransaction,
                              subType: itemValue,
                            })
                          }
                          style={styles.picker}
                        >
                          <Picker.Item label="Select Income Type" value="" />
                          <Picker.Item label="Active" value="Active" />
                          <Picker.Item label="Passive" value="Passive" />
                        </Picker>
                      )}

                      {newTransaction.type === "Expense" && (
                        <Picker
                          selectedValue={newTransaction.subType}
                          onValueChange={(itemValue) =>
                            setNewTransaction({
                              ...newTransaction,
                              subType: itemValue,
                            })
                          }
                          style={styles.picker}
                        >
                          <Picker.Item
                            label="Select Expense Category"
                            value=""
                          />
                          <Picker.Item
                            label="Discretionary"
                            value="Discretionary"
                          />
                          <Picker.Item label="Essential" value="Essential" />
                          <Picker.Item label="Mandatory" value="Mandatory" />
                        </Picker>
                      )}

                      {newTransaction.type === "Investment" && (
                        <Picker
                          selectedValue={newTransaction.subType}
                          onValueChange={(itemValue) =>
                            setNewTransaction({
                              ...newTransaction,
                              subType: itemValue,
                            })
                          }
                          style={styles.picker}
                        >
                          <Picker.Item
                            label="Select Investment Type"
                            value=""
                          />
                          <Picker.Item label="Equity" value="Equity" />
                          <Picker.Item label="Debt" value="Debt" />
                          <Picker.Item label="Gold" value="Gold" />
                          <Picker.Item
                            label="Real Estate"
                            value="Real Estate"
                          />
                        </Picker>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payment Method</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newTransaction.method}
                      onValueChange={(itemValue) =>
                        setNewTransaction({
                          ...newTransaction,
                          method: itemValue,
                        })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Payment Method" value="" />
                      <Picker.Item label="Cash" value="Cash" />
                      <Picker.Item label="Credit Card" value="Credit Card" />
                      <Picker.Item label="Debit Card" value="Debit Card" />
                      <Picker.Item label="UPI" value="UPI" />
                    </Picker>
                  </View>
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={addTransaction}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action Menu Modal */}
      <Modal
        visible={actionMenuVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setActionMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.actionMenuOverlay}
          activeOpacity={1}
          onPress={() => setActionMenuVisible(false)}
        >
          <View style={styles.actionMenuContainer}>
            <Text style={styles.actionMenuTitle}>Add Transaction</Text>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setActionMenuVisible(false);
                navigation.navigate("Expenses", { date: selectedDate });
              }}
            >
              <MaterialIcons name="arrow-circle-up" size={24} color="#EF4444" />
              <Text style={styles.actionMenuItemText}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setActionMenuVisible(false);
                navigation.navigate("Income", { date: selectedDate });
              }}
            >
              <MaterialIcons
                name="arrow-circle-down"
                size={24}
                color="#10B981"
              />
              <Text style={styles.actionMenuItemText}>Add Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setActionMenuVisible(false);
                navigation.navigate("Investment", { date: selectedDate });
              }}
            >
              <MaterialCommunityIcons
                name="chart-line"
                size={24}
                color="#3B82F6"
              />
              <Text style={styles.actionMenuItemText}>Add Investment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuCancelButton}
              onPress={() => setActionMenuVisible(false)}
            >
              <Text style={styles.actionMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  headerDate: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: "row",
    padding: 12,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 2,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    textAlign: "center",
  },
  activeFilter: {
    backgroundColor: "#E0F2FE",
  },
  activeIncomeFilter: {
    backgroundColor: "#DCFCE7",
  },
  activeInvestmentFilter: {
    backgroundColor: "#DBEAFE",
  },
  activeExpenseFilter: {
    backgroundColor: "#FEE2E2",
  },
  activeFilterText: {
    color: "#0F172A",
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 100, // Give more space at bottom
  },
  transactionItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 16,
    // Removed card styling
  },
  transactionLeftContent: {
    marginRight: 12,
    justifyContent: "center",
  },
  transactionMiddleContent: {
    flex: 1,
    justifyContent: "center",
  },
  transactionRightContent: {
    alignItems: "flex-end",
    height: "100%",
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  transactionMetaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  transactionMeta: {
    fontSize: 13,
    color: "#64748B",
    marginLeft: 4,
    marginRight: 0, // Make sure there's no extra margin
    flex: 0, // Allow meta text to shrink if needed
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  incomeAmount: {
    color: "#10B981",
  },
  expenseAmount: {
    color: "#EF4444",
  },
  investmentAmount: {
    color: "#3B82F6",
  },
  deleteIconContainer: {
    padding: 8, // Increased touch area
  },
  addButton: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 90 : 80,
    right: 20,
    backgroundColor: "#2563eb",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1e40af",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
    zIndex: 1000,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  formScrollView: {
    maxHeight: Platform.OS === "ios" ? 500 : 450,
  },
  formScrollContent: {
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
  },
  modalCloseButton: {
    padding: 4,
    hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1E293B",
  },
  pickerContainer: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: "#1E293B",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },

  // Action Menu Styles
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  actionMenuContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  actionMenuTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
    textAlign: "center",
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  actionMenuItemText: {
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 16,
  },
  actionMenuCancelButton: {
    marginTop: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionMenuCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
});

export default TransactionsPage;
