import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Picker } from "@react-native-picker/picker";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { EventRegister } from "react-native-event-listeners";

const API_URL = "https://ligths-backend.onrender.com";

export default function ExpenseTracker({ navigation, route }) {
  // Extract date parameter if provided from dateExpenses screen
  const receivedDate = route.params?.date || null;

  const [transactions, setTransactions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Month/Year filter states (similar to FireNumber)
  const [showFilters, setShowFilters] = useState(false);
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterYear, setFilterYear] = useState("All");

  const [newTransaction, setNewTransaction] = useState({
    name: "",
    amount: "",
    description: "",
    type: "Income",
    subType: "Active",
    method: "Cash",
    date: receivedDate || "",
  });
  const [isCustomExpense, setIsCustomExpense] = useState(false);
  const [customExpenseName, setCustomExpenseName] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    receivedDate ? new Date(receivedDate) : new Date()
  );

  // Animation for loading icon
  const spinValue = useState(new Animated.Value(0))[0];

  // Month/Year filter options similar to FireNumber
  const availableFilters = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { years: [], months: [] };
    }

    const years = [
      ...new Set(
        transactions.map((transaction) => {
          const date = new Date(transaction.date);
          return date.getFullYear();
        })
      ),
    ].sort((a, b) => b - a);

    const months = [
      { name: "January", value: 0 },
      { name: "February", value: 1 },
      { name: "March", value: 2 },
      { name: "April", value: 3 },
      { name: "May", value: 4 },
      { name: "June", value: 5 },
      { name: "July", value: 6 },
      { name: "August", value: 7 },
      { name: "September", value: 8 },
      { name: "October", value: 9 },
      { name: "November", value: 10 },
      { name: "December", value: 11 },
    ];

    return { years, months };
  }, [transactions]);

  useEffect(() => {
    if (loading) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }
  }, [loading, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Auto-open modal when coming from dateExpenses screen
  useEffect(() => {
    if (receivedDate) {
      console.log("Received date from navigation:", receivedDate);
      const timer = setTimeout(() => {
        setModalVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [receivedDate]);

  const expenseTypeOptions = {
    Active: [
      "Bonuses",
      "Freelancing",
      "Loans",
      "Refunds/Reimbursements",
      "Salary",
    ],
    Passive: [
      "Capital gains",
      "Dividends",
      "Financial Aid",
      "Income - Business",
      "Income - Chit",
      "Income - Interest",
    ],
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    // Store as YYYY-MM-DD for API consistency
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Select a date";

    try {
      const options = { year: "numeric", month: "short", day: "numeric" };
      return new Date(dateString).toLocaleDateString("en-IN", options);
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString;
    }
  };

  const onDateChange = (event, selected) => {
    // Always close the picker on Android after selection
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    } else {
      // For iOS, only close if dismissed
      if (event.type === "dismissed") {
        setShowDatePicker(false);
        return;
      }
    }

    if (selected) {
      setSelectedDate(selected);
      setNewTransaction({
        ...newTransaction,
        date: formatDate(selected),
      });
    }
  };

  // 📚 Fetch Transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const userInfo = await AsyncStorage.getItem("userInfo");

      if (!userInfo) {
        Alert.alert("Error", "User not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      const parsedInfo = JSON.parse(userInfo);
      const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;

      const response = await fetch(`${API_URL}/transactions/${username}`);
      if (!response.ok) throw new Error("Failed to fetch transactions");

      const data = await response.json();
      const incomeTransactions = data.transactions.filter(
        (transaction) => transaction && transaction.type === "Income"
      );
      setTransactions(incomeTransactions);
      setLoading(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch transactions");
      setLoading(false);
    }
  };

  // ➕ Add Transaction
  const addTransaction = async () => {
    try {
      setLoading(true);
      const userInfo = await AsyncStorage.getItem("userInfo");

      if (!userInfo) {
        Alert.alert("Error", "User not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      const parsedInfo = JSON.parse(userInfo);
      const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;

      const expenseName = isCustomExpense
        ? customExpenseName
        : newTransaction.name;

      if (!expenseName || !newTransaction.amount || !newTransaction.date) {
        Alert.alert("Missing Information", "Please fill all required fields");
        setLoading(false);
        return;
      }

      const transactionData = {
        name: expenseName,
        amount: parseFloat(newTransaction.amount),
        description: newTransaction.description || "",
        type: "Income",
        subType: newTransaction.subType,
        method: newTransaction.method || "Cash",
        date: newTransaction.date,
      };

      const response = await fetch(`${API_URL}/transactions/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add transaction");
      }

      const savedTransaction = await response.json();
      setTransactions([...transactions, savedTransaction.transaction]);

      Alert.alert("Success", "Transaction added successfully");
      // Emit event so calendar can refresh
      EventRegister.emit("transactionAdded");

      // Reset State
      handleCancel();

      // If coming from date expenses, navigate back
      if (route.params?.date) {
        navigation.goBack();
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Error adding transaction");
      setLoading(false);
    }
  };

  // ❌ Delete Transaction
  const deleteTransaction = async (id) => {
    try {
      setLoading(true);
      const userInfo = await AsyncStorage.getItem("userInfo");

      if (!userInfo) {
        Alert.alert("Error", "User not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      const parsedInfo = JSON.parse(userInfo);
      const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;

      const response = await fetch(
        `${API_URL}/transactions/${username}/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete transaction");
      }

      setTransactions(
        transactions.filter((transaction) => transaction._id !== id)
      );
      Alert.alert("Success", "Transaction deleted successfully");
      setLoading(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Error deleting transaction");
      setLoading(false);
    }
  };

  // Filter transactions function
  const getFilteredTransactions = useCallback(() => {
    let filtered = transactions;

    // Filter by type
    if (filter !== "all") {
      filtered = filtered.filter(
        (transaction) => transaction.subType === filter
      );
    }

    // Filter by month/year (similar to FireNumber)
    if (filterYear !== "All") {
      const yearNum = parseInt(filterYear);
      filtered = filtered.filter(
        (transaction) => new Date(transaction.date).getFullYear() === yearNum
      );
    }
    if (filterMonth !== "All") {
      const monthNum = parseInt(filterMonth);
      filtered = filtered.filter(
        (transaction) => new Date(transaction.date).getMonth() === monthNum
      );
    }

    return filtered;
  }, [transactions, filter, filterMonth, filterYear]);

  const filteredTransactions = getFilteredTransactions();

  // Filter control functions
  const resetFilters = () => {
    setFilterMonth("All");
    setFilterYear("All");
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Cancel and reset form
  const handleCancel = () => {
    setNewTransaction({
      name: "",
      amount: "",
      description: "",
      type: "Income",
      subType: "Active",
      method: "Cash",
      date: "",
    });
    setCustomExpenseName("");
    setIsCustomExpense(false);
    setModalVisible(false);
    setLoading(false);
  };

  // Custom dropdown component to replace problematic Picker
  const CustomDropdown = ({ label, options, value, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);

    const selectedLabel =
      options.find((opt) => opt.value === value)?.label || "Select an option";

    return (
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity
          style={[styles.pickerButton, isOpen && styles.pickerButtonActive]}
          onPress={() => setIsOpen(!isOpen)}
        >
          <Text
            style={[
              styles.pickerButtonText,
              value
                ? styles.pickerButtonTextSelected
                : styles.pickerButtonTextPlaceholder,
            ]}
          >
            {selectedLabel}
          </Text>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color="#64748b"
          />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.dropdownMenu}>
            <View style={{ maxHeight: 150 }}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    value === option.value && styles.selectedDropdownItem,
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === option.value && styles.selectedDropdownItemText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Ionicons name="checkmark" size={16} color="#2563eb" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Income Tracker</Text>
        <TouchableOpacity
          onPress={toggleFilters}
          style={styles.filterToggleButton}
        >
          <Ionicons name="filter" size={20} color="#2563eb" />
          <Text style={styles.filterToggleText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { id: "all", label: "All", icon: "apps-outline" },
          { id: "Active", label: "Active", icon: "trending-up-outline" },
          { id: "Passive", label: "Passive", icon: "cash-outline" },
        ].map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[styles.tab, filter === type.id && styles.activeTab]}
            onPress={() => setFilter(type.id)}
          >
            <Ionicons
              name={type.icon}
              size={16}
              color={filter === type.id ? "#fff" : "#475569"}
            />
            <Text
              style={[
                styles.tabText,
                filter === type.id && styles.activeTabText,
                { marginTop: 2, fontSize: 10 },
              ]}
              numberOfLines={1}
            >
              {type.id === "all" ? "All" : type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Month/Year Filter Section (similar to FireNumber) */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Month</Text>
              <TouchableOpacity style={styles.filterPicker}>
                <Picker
                  selectedValue={filterMonth}
                  onValueChange={setFilterMonth}
                  style={styles.picker}
                >
                  <Picker.Item label="All Months" value="All" />
                  {availableFilters.months.map((month) => (
                    <Picker.Item
                      key={month.value}
                      label={month.name}
                      value={month.value.toString()}
                    />
                  ))}
                </Picker>
              </TouchableOpacity>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Year</Text>
              <TouchableOpacity style={styles.filterPicker}>
                <Picker
                  selectedValue={filterYear}
                  onValueChange={setFilterYear}
                  style={styles.picker}
                >
                  <Picker.Item label="All Years" value="All" />
                  {availableFilters.years.map((year) => (
                    <Picker.Item
                      key={year}
                      label={year.toString()}
                      value={year.toString()}
                    />
                  ))}
                </Picker>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>Reset Filters</Text>
          </TouchableOpacity>

          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryText}>
              Showing {filteredTransactions.length} of {transactions.length}{" "}
              income
              {filterMonth !== "All" || filterYear !== "All"
                ? " (filtered)"
                : ""}
            </Text>
          </View>
        </View>
      )}

      {loading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="cash-outline" size={50} color="#2563eb" />
          </Animated.View>
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) =>
            item?._id ? item._id.toString() : Math.random().toString()
          }
          style={styles.flatListStyle}
          contentContainerStyle={
            filteredTransactions.length > 0 ? styles.listContainer : null
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === "android"}
          nestedScrollEnabled={true}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.listItem,
                index === 0 && styles.listItemFirst,
                index === filteredTransactions.length - 1 &&
                  styles.listItemLast,
              ]}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                  <FontAwesome name="arrow-down" size={18} color="#16a34a" />
                </View>
                <View>
                  <Text style={styles.cardName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.cardDescription} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={styles.cardDate}>
                    {formatDisplayDate(item.date)} • {item.subType}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardAmount}>₹{item.amount}</Text>
                <TouchableOpacity
                  onPress={() => deleteTransaction(item._id)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={60} color="#cbd5e1" />
              <Text style={styles.emptyText}>No income transactions found</Text>
              <Text style={styles.emptySubText}>
                Add your first income by tapping the + button
              </Text>
            </View>
          }
        />
      )}

      {/* Add Transaction Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
        disabled={loading}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Income</Text>
                  <TouchableOpacity onPress={handleCancel}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Make the form scrollable */}
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* SubType Selection */}
                  <Text style={styles.label}>Income Type:</Text>
                  <View style={styles.typeButtonContainer}>
                    {["Active", "Passive"].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeButton,
                          newTransaction.subType === type &&
                            styles.activeTypeButton,
                        ]}
                        onPress={() =>
                          setNewTransaction({
                            ...newTransaction,
                            subType: type,
                            name: "",
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            newTransaction.subType === type &&
                              styles.activeTypeButtonText,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Income Source using Custom Dropdown */}
                  <Text style={styles.label}>Income Source:</Text>
                  <CustomDropdown
                    options={[
                      { label: "Select a source", value: "" },
                      ...expenseTypeOptions[newTransaction.subType]?.map(
                        (item) => ({ label: item, value: item })
                      ),
                      { label: "Others", value: "Others" },
                    ]}
                    value={newTransaction.name}
                    onSelect={(value) => {
                      setIsCustomExpense(value === "Others");
                      setNewTransaction({ ...newTransaction, name: value });
                    }}
                  />

                  {/* Custom Expense Input */}
                  {isCustomExpense && (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter custom income source"
                      placeholderTextColor="#94a3b8"
                      value={customExpenseName}
                      onChangeText={setCustomExpenseName}
                    />
                  )}

                  {/* Amount */}
                  <Text style={styles.label}>Amount:</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                      value={newTransaction.amount}
                      onChangeText={(text) => {
                        // Only allow numeric input with decimal
                        if (/^\d*\.?\d*$/.test(text)) {
                          setNewTransaction({
                            ...newTransaction,
                            amount: text,
                          });
                        }
                      }}
                    />
                  </View>

                  {/* Description */}
                  <Text style={styles.label}>Description (Optional):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Add a description for this income..."
                    placeholderTextColor="#94a3b8"
                    value={newTransaction.description}
                    onChangeText={(text) =>
                      setNewTransaction({
                        ...newTransaction,
                        description: text,
                      })
                    }
                    multiline={true}
                    numberOfLines={2}
                  />

                  <Text style={styles.label}>Date:</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#64748b"
                    />
                    <Text style={styles.dateButtonText}>
                      {newTransaction.date
                        ? formatDisplayDate(newTransaction.date)
                        : "Select a date"}
                    </Text>
                  </TouchableOpacity>

                  {/* Show DateTimePicker conditionally */}
                  {showDatePicker &&
                    (Platform.OS === "android" ? (
                      // Android implementation
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                      />
                    ) : (
                      // iOS implementation
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                        style={styles.datePicker}
                      />
                    ))}

                  {/* Payment Method using Custom Dropdown */}
                  <Text style={styles.label}>Payment Method:</Text>
                  <CustomDropdown
                    options={[
                      { label: "Cash", value: "Cash" },
                      { label: "Bank Transfer", value: "Bank Transfer" },
                      { label: "Credit Card", value: "Credit Card" },
                      { label: "UPI", value: "UPI" },
                      { label: "Other", value: "Other" },
                    ]}
                    value={newTransaction.method}
                    onSelect={(value) =>
                      setNewTransaction({ ...newTransaction, method: value })
                    }
                  />

                  {/* Buttons */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancel}
                      disabled={loading}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalAdd,
                        loading && styles.disabledButton,
                      ]}
                      onPress={addTransaction}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.modalAddText}>Add Income</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },
  filterToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
  },
  filterToggleText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#64748b",
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    backgroundColor: "#e2e8f0",
    borderRadius: 28,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#2563eb",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  activeTabText: {
    color: "#fff",
  },
  // The missing style that was causing scrolling issues
  flatListStyle: {
    flex: 1,
    width: "100%",
    marginBottom: 80, // Space for the floating action button
  },
  listContainer: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 2,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    paddingBottom: 4,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  listItemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  listItemLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  separator: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 16,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardDate: {
    fontSize: 13,
    color: "#64748b",
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "#64748b",
    fontStyle: "italic",
    marginBottom: 2,
  },
  cardRight: {
    alignItems: "flex-end",
    flexDirection: "row",
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginRight: 12,
  },
  deleteButton: {
    backgroundColor: "#f5f6f7",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
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
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#334155",
  },
  typeButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 5,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  activeTypeButton: {
    backgroundColor: "#2563eb",
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#475569",
  },
  activeTypeButtonText: {
    color: "#fff",
  },
  // Custom dropdown styles
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 4,
  },
  pickerButtonActive: {
    borderColor: "#2563eb",
  },
  pickerButtonText: {
    fontSize: 16,
    color: "#1e293b",
    flex: 1,
  },
  pickerButtonTextPlaceholder: {
    color: "#94a3b8",
  },
  pickerButtonTextSelected: {
    color: "#1e293b",
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  selectedDropdownItem: {
    backgroundColor: "#eff6ff",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#1e293b",
    flex: 1,
  },
  selectedDropdownItemText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  currencySymbol: {
    fontSize: 18,
    color: "#64748b",
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateButtonText: {
    fontSize: 16,
    marginLeft: 8,
    color: "#1e293b",
  },
  datePicker: {
    marginBottom: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  modalAdd: {
    flex: 2,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  modalAddText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  disabledButton: {
    backgroundColor: "#60a5fa",
    opacity: 0.7,
  },
  // Date filter styles
  selectedDateContainer: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedDateText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  changeDateButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeDateText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  // Month/Year filter styles (similar to FireNumber)
  filtersContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  filterItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  filterPicker: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    height: Platform.OS === "ios" ? 150 : 50,
  },
  picker: {
    backgroundColor: "#fff",
    borderRadius: 6,
    height: Platform.OS === "ios" ? 150 : 50,
  },
  resetButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  resetButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  filterSummary: {
    marginBottom: 4,
  },
  filterSummaryText: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
  },
});
