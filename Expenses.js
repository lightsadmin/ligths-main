import React, { useState, useEffect, useCallback } from "react";
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
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = "https://ligths-backend.onrender.com";

const { width } = Dimensions.get('window');

export default function ExpenseTracker({ navigation, route }) {
  // Extract date from route params if provided (for auto-opening modal)
  const receivedDate = route.params?.date || null;
  
  const [transactions, setTransactions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    name: "",
    amount: "",
    type: "Expense",
    subType: "Essential",
    method: "Cash",
    date: receivedDate || "",
  });
  const [isCustomExpense, setIsCustomExpense] = useState(false);
  const [customExpenseName, setCustomExpenseName] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    receivedDate ? new Date(receivedDate) : new Date()
  );
  
  // For the dropdown states
  const [isExpenseDropdownOpen, setIsExpenseDropdownOpen] = useState(false);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);

  // Auto-open modal when navigating with a date parameter
  useEffect(() => {
    if (receivedDate) {
      console.log("Opening modal with pre-selected date:", receivedDate);
      const timer = setTimeout(() => {
        setModalVisible(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [receivedDate]);

  const expenseTypeOptions = {
    Mandatory: ["EMI - Education", "EMI - Personal", "EMI - Property", "EMI - Vehicle", "Fees & Charges - Consultation", "Insurance - Fire", "Insurance - Health", "Insurance - Life (Term / Pension / Moneyback)", "Insurance - Property", "Insurance - Travel", "Insurance - Vehicle", "Loan Repayment", "PPF/VPF - Retirement fund", "Tax - Income", "Tax - utilities"],
    Discretionary: ["Charitable donations", "Fun / Entertainment", "Food Dining", "Gifts", "Home Décor", "Luxury clothing / Jewelery", "Sports items", "Subscriptions / dues", "Tours & travel", "Vehicle Purchase"],
    Essential: ["Child care", "Clothing", "Education", "Emergency Fund", "Fuel - Cooking", "Fuel - Vehicles", "Groceries", "Home care", "Medical Care", "Miscellaneous", "Personal grooming", "Pet care", "Rents / Mortgage", "Transportation", "Utilities - Electricity", "Utilities - Gas", "Utilities - Phone(s)", "Utilities - TV / Internet", "Utilities - Water", "Utilities Maintenance cost", "Vehicle Maintenance cost"]
  };

  const formatDate = useCallback((date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    // Store as YYYY-MM-DD for API consistency
    return `${year}-${month}-${day}`;
  }, []);
  
  const formatDisplayDate = useCallback((dateString) => {
    if (!dateString) return "Select a date";
    
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('en-IN', options);
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString;
    }
  }, []);

  // Date change handler
  const onDateChange = useCallback((event, selected) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) {
      setSelectedDate(selected);
      setNewTransaction(prev => ({ 
        ...prev, 
        date: formatDate(selected) 
      }));
    }
  }, [formatDate]);

  // Fetch Transactions from MongoDB
  const fetchTransactions = useCallback(async () => {
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
      const expenseTransactions = data.transactions.filter(
        (transaction) => transaction && transaction.type === "Expense"
      );
      
      setTransactions(expenseTransactions);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      Alert.alert("Error", "Failed to fetch transactions. Please try again.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Add Transaction to MongoDB
  const addTransaction = useCallback(async () => {
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
  
      // Determine final expense name based on whether it's custom or not
      const expenseName = isCustomExpense ? customExpenseName : newTransaction.name;
  
      // Validate inputs
      if (!expenseName) {
        Alert.alert("Missing Information", "Please select or enter an expense name");
        setLoading(false);
        return;
      }
      
      if (!newTransaction.amount) {
        Alert.alert("Missing Information", "Please enter an amount");
        setLoading(false);
        return;
      }
      
      if (!newTransaction.date) {
        Alert.alert("Missing Information", "Please select a date");
        setLoading(false);
        return;
      }
      
      // Additional validation for custom expense name
      if (isCustomExpense && customExpenseName.trim() === "") {
        Alert.alert("Missing Information", "Please enter a name for your custom expense");
        setLoading(false);
        return;
      }

      const transactionData = {
        name: expenseName,
        amount: parseFloat(newTransaction.amount),
        type: "Expense",
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
        const errorText = await response.text();
        console.error("API error response:", errorText);
        
        let errorMessage = "Failed to add transaction";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
  
      const savedTransaction = await response.json();
      setTransactions(prevTransactions => [
        ...prevTransactions, 
        savedTransaction.transaction
      ]);
      
      Alert.alert("Success", "Transaction added successfully");
  
      // Reset state after adding
      handleCancel();
      
      // If coming from date expenses, navigate back
      if (route.params?.date) {
        navigation.goBack();
      }
    } catch (error) {
      console.error("Transaction error:", error);
      Alert.alert("Error", error.message || "Error adding transaction");
      setLoading(false);
    }
  }, [customExpenseName, isCustomExpense, newTransaction, route.params]);
  
  // Delete Transaction from MongoDB with confirmation
  const confirmDelete = useCallback((id, name) => {
    Alert.alert(
      "Delete Expense",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTransaction(id) }
      ]
    );
  }, []);
  
  const deleteTransaction = useCallback(async (id) => {
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
  
      const response = await fetch(`${API_URL}/transactions/${username}/${id}`, {
        method: "DELETE",
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Delete error response:", errorText);
        
        let errorMessage = "Failed to delete transaction";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
  
      setTransactions(transactions.filter((transaction) => transaction._id !== id));
      Alert.alert("Success", "Transaction deleted successfully");
      setLoading(false);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      Alert.alert("Error", error.message || "Error deleting transaction");
      setLoading(false);
    }
  }, [transactions]);

  // Cancel and reset form
  const handleCancel = useCallback(() => {
    setNewTransaction({ name: "", amount: "", type: "Expense", subType: "Essential", method: "Cash", date: "" });
    setCustomExpenseName("");
    setIsCustomExpense(false);
    setIsExpenseDropdownOpen(false);
    setIsMethodDropdownOpen(false);
    setModalVisible(false);
    setLoading(false);
  }, []);
  
  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter((transaction) => transaction.subType === filter);

  // Memoized render functions
  const renderItem = useCallback(({ item, index }) => (
    <View style={[
      styles.listItem,
      index === 0 && styles.listItemFirst,
      index === filteredTransactions.length - 1 && styles.listItemLast
    ]}>
      <View style={styles.cardLeft}>
        <View style={styles.iconContainer}>
          <FontAwesome name="arrow-up" size={18} color="#ef4444" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.cardName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
          <Text style={styles.cardDate}>
            {formatDisplayDate(item.date)} • {item.subType}
          </Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardAmount}>₹{item.amount}</Text>
        <TouchableOpacity 
          onPress={() => confirmDelete(item._id, item.name)}
          style={styles.deleteButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [filteredTransactions, formatDisplayDate, confirmDelete]);

  // Empty list component
  const EmptyListComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={60} color="#cbd5e1" />
      <Text style={styles.emptyText}>No expense transactions found</Text>
      <Text style={styles.emptySubText}>Add your first expense by tapping the + button</Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Expense Tracker</Text>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {[
          {id: "all", label: "All", icon: "apps-outline"},
          {id: "Mandatory", label: "Mandatory", icon: "alert-circle-outline"},
          {id: "Discretionary", label: "Discretionary", icon: "cart-outline"},
          {id: "Essential", label: "Essential", icon: "home-outline"}
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.tab, filter === item.id && styles.activeTab]}
            onPress={() => setFilter(item.id)}
          >
            <Ionicons 
              name={item.icon} 
              size={16} 
              color={filter === item.id ? "#fff" : "#475569"} 
            />
            <Text 
              style={[
                styles.tabText, 
                filter === item.id && styles.activeTabText,
                {marginTop: 2, fontSize: 10}
              ]}
              numberOfLines={1}
            >
              {item.id === "all" ? "All" : item.id.substring(0, 4)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      {loading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => (item?._id ? item._id.toString() : Math.random().toString())}
          style={styles.flatListStyle}
          contentContainerStyle={filteredTransactions.length > 0 ? styles.listContainer : null}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={renderItem}
          ListEmptyComponent={EmptyListComponent}
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

      {/* Expense Modal */}
      <ExpenseFormModal
        visible={modalVisible}
        onCancel={handleCancel}
        onAdd={addTransaction}
        loading={loading}
        newTransaction={newTransaction}
        setNewTransaction={setNewTransaction}
        isCustomExpense={isCustomExpense}
        setIsCustomExpense={setIsCustomExpense}
        customExpenseName={customExpenseName}
        setCustomExpenseName={setCustomExpenseName}
        expenseTypeOptions={expenseTypeOptions}
        isExpenseDropdownOpen={isExpenseDropdownOpen}
        setIsExpenseDropdownOpen={setIsExpenseDropdownOpen}
        isMethodDropdownOpen={isMethodDropdownOpen}
        setIsMethodDropdownOpen={setIsMethodDropdownOpen}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onDateChange={onDateChange}
        formatDisplayDate={formatDisplayDate}
      />
    </SafeAreaView>
  );
}

// Separated the modal component for better performance
const ExpenseFormModal = ({
  visible,
  onCancel,
  onAdd,
  loading,
  newTransaction,
  setNewTransaction,
  isCustomExpense,
  setIsCustomExpense,
  customExpenseName,
  setCustomExpenseName,
  expenseTypeOptions,
  isExpenseDropdownOpen,
  setIsExpenseDropdownOpen,
  isMethodDropdownOpen,
  setIsMethodDropdownOpen,
  showDatePicker,
  setShowDatePicker,
  selectedDate,
  onDateChange,
  formatDisplayDate
}) => {
  // Item selection handlers
  const handleExpenseTypeSelect = (type) => {
    setNewTransaction({ ...newTransaction, subType: type, name: "" });
    setIsCustomExpense(false);
  };

  const handleExpenseItemSelect = (value) => {
    setNewTransaction({...newTransaction, name: value});
    setIsCustomExpense(value === "Others");
    setIsExpenseDropdownOpen(false);
  };

  const handleMethodSelect = (value) => {
    setNewTransaction({...newTransaction, method: value});
    setIsMethodDropdownOpen(false);
  };

  // Expense option items
  const expenseItems = [
    {label: "Select an item", value: ""},
    ...(expenseTypeOptions[newTransaction.subType] || [])
      .map(item => ({label: item, value: item})),
    {label: "Others", value: "Others"}
  ];

  // Payment method options
  const paymentMethods = [
    {label: "Cash", value: "Cash"},
    {label: "Bank Transfer", value: "Bank Transfer"},
    {label: "Credit Card", value: "Credit Card"},
    {label: "UPI", value: "UPI"},
    {label: "Other", value: "Other"}
  ];

  return (
    <Modal 
      visible={visible} 
      transparent={true}
      animationType={Platform.OS === 'ios' ? "slide" : "fade"}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={() => {
          setIsExpenseDropdownOpen(false);
          setIsMethodDropdownOpen(false);
          Keyboard.dismiss();
        }}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Expense</Text>
                <TouchableOpacity onPress={onCancel}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Expense Type Selection */}
              <Text style={styles.label}>Expense Type:</Text>
              <View style={styles.typeButtonContainer}>
                {["Mandatory", "Discretionary", "Essential"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, newTransaction.subType === type && styles.activeTypeButton]}
                    onPress={() => handleExpenseTypeSelect(type)}
                  >
                    <Text style={[styles.typeButtonText, newTransaction.subType === type && styles.activeTypeButtonText]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Scrollable Form Content */}
              <ScrollView 
                style={styles.formScrollView}
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
              >
                {/* Expense Item Dropdown */}
                <Text style={styles.label}>Expense Item:</Text>
                <TouchableOpacity 
                  style={[styles.pickerButton, isExpenseDropdownOpen && styles.pickerButtonActive]}
                  onPress={() => {
                    setIsExpenseDropdownOpen(!isExpenseDropdownOpen);
                    setIsMethodDropdownOpen(false);
                  }}
                >
                  <Text style={[
                    styles.pickerButtonText, 
                    newTransaction.name ? styles.pickerButtonTextSelected : styles.pickerButtonTextPlaceholder
                  ]}>
                    {newTransaction.name || "Select an expense item"}
                  </Text>
                  <Ionicons 
                    name={isExpenseDropdownOpen ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
                
                {isExpenseDropdownOpen && (
                  <View style={styles.dropdownContainer}>
                    <FlatList
                      data={expenseItems}
                      keyExtractor={(item) => item.value}
                      renderItem={({item}) => (
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            newTransaction.name === item.value && styles.selectedDropdownItem
                          ]}
                          onPress={() => handleExpenseItemSelect(item.value)}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            newTransaction.name === item.value && styles.selectedDropdownItemText
                          ]} numberOfLines={1}>
                            {item.label}
                          </Text>
                          {newTransaction.name === item.value && (
                            <Ionicons name="checkmark" size={16} color="#ef4444" />
                          )}
                        </TouchableOpacity>
                      )}
                      style={styles.dropdownMenu}
                      nestedScrollEnabled={true}
                      initialNumToRender={10}
                      maxToRenderPerBatch={10}
                    />
                  </View>
                )}

                {/* Custom Expense Input */}
                {isCustomExpense && (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter custom expense name"
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
                        setNewTransaction({ ...newTransaction, amount: text });
                      }
                    }}
                  />
                </View>

                {/* Date Picker */}
                <Text style={styles.label}>Date:</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#64748b" />
                  <Text style={styles.dateButtonText}>
                    {newTransaction.date ? formatDisplayDate(newTransaction.date) : "Select a date"}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    style={styles.datePicker}
                  />
                )}

                {/* Payment Method */}
                <Text style={styles.label}>Payment Method:</Text>
                <TouchableOpacity 
                  style={[styles.pickerButton, isMethodDropdownOpen && styles.pickerButtonActive]}
                  onPress={() => {
                    setIsMethodDropdownOpen(!isMethodDropdownOpen);
                    setIsExpenseDropdownOpen(false);
                  }}
                >
                  <Text style={styles.pickerButtonText}>
                    {newTransaction.method || "Select payment method"}
                  </Text>
                  <Ionicons 
                    name={isMethodDropdownOpen ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
                
                {isMethodDropdownOpen && (
                  <View style={styles.dropdownContainer}>
                    <FlatList
                      data={paymentMethods}
                      keyExtractor={(item) => item.value}
                      renderItem={({item}) => (
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            newTransaction.method === item.value && styles.selectedDropdownItem
                          ]}
                          onPress={() => handleMethodSelect(item.value)}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            newTransaction.method === item.value && styles.selectedDropdownItemText
                          ]}>
                            {item.label}
                          </Text>
                          {newTransaction.method === item.value && (
                            <Ionicons name="checkmark" size={16} color="#ef4444" />
                          )}
                        </TouchableOpacity>
                      )}
                      style={styles.dropdownMenu}
                      nestedScrollEnabled={true}
                      initialNumToRender={5}
                      maxToRenderPerBatch={5}
                    />
                  </View>
                )}

                {/* Spacer */}
                <View style={{ height: 20 }} />
              </ScrollView>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onCancel}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.modalAdd,
                    loading && styles.disabledButton
                  ]}
                  onPress={onAdd}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalAddText}>Add Expense</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1e293b",
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
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
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
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
  flatListStyle: {
    flex: 1,
    width: '100%',
    marginBottom: 80, // Space for the floating action button
  },
  listContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
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
    minHeight: 76, // Ensure consistent height
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
    flex: 1,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
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
    flexShrink: 1,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 100,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginRight: 12,
    textAlign: "right",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
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
    backgroundColor: '#fff',
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
    paddingHorizontal: 20,
  },
  addButton: {
    position: "absolute",
    bottom: Platform.OS === 'ios' ? 90 : 80,
    right: 20,
    backgroundColor: "#ef4444",
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
    zIndex: 10,
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
    maxHeight: Platform.OS === 'ios' ? "80%" : "90%", // Smaller on iOS
  },
  formScrollView: {
    flex: 0, // Don't use flex here
    maxHeight: Platform.OS === 'ios' ? 350 : 400, // Fixed height for better performance
  },
  formScrollContent: {
    paddingBottom: 10,
  },
  // Fixed dropdown container
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownMenu: {
    maxHeight: 150,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8, // Added extra padding
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
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
    marginBottom: 16,
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
    backgroundColor: "#ef4444",
  },
  typeButtonText: {
    fontSize: width < 360 ? 12 : 15, // Smaller font on small devices
    fontWeight: "bold",
    color: "#475569",
  },
  activeTypeButtonText: {
    color: "#fff",
  },
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
    borderColor: "#ef4444",
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
    backgroundColor: "#fef2f2",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#1e293b",
    flex: 1,
  },
  selectedDropdownItemText: {
    color: "#ef4444",
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
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 8,
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
    backgroundColor: "#ef4444",
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
    backgroundColor: '#f87171',
    opacity: 0.7,
  },
});