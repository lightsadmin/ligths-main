import React, { useState, useEffect, useMemo } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native"; // Import useNavigation

const API_URL = "https://ligths-backend.onrender.com";

const FireNumber = () => {
  const navigation = useNavigation(); // Initialize navigation

  // ... (all existing states remain the same) ...
  const [currentAge, setCurrentAge] = useState("");
  const [retirementAge, setRetirementAge] = useState("");
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("India");
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState("4");
  const [yearsToRetirement, setYearsToRetirement] = useState("");
  const [yearlyExpense, setYearlyExpense] = useState("");
  const [futureAnnualExpense, setFutureAnnualExpense] = useState("");
  const [fireNumber, setFireNumber] = useState("");
  const [sip8Percent, setSip8Percent] = useState("0.00");
  const [sip10Percent, setSip10Percent] = useState("0.00");
  const [sip12Percent, setSip12Percent] = useState("0.00");
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [uniqueDays, setUniqueDays] = useState(0);
  const [dailyAverage, setDailyAverage] = useState("0.00");
  const [inflationData, setInflationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [includeToday, setIncludeToday] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterYear, setFilterYear] = useState("All");

  // ... (all existing functions remain the same) ...
  const getInflationRate = () => {
    const countryData = inflationData.find(
      (country) => country.country_name === selectedCountry
    );
    return countryData ? countryData.AVG : 0;
  };

  const availableFilters = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return { years: [], months: [] };
    }

    const years = [
      ...new Set(
        expenses.map((expense) => {
          const date = new Date(expense.date);
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
  }, [expenses]);

  useEffect(() => {
    if (!expenses || expenses.length === 0) {
      setFilteredExpenses([]);
      return;
    }

    let result = [...expenses];
    if (filterYear !== "All") {
      const yearNum = parseInt(filterYear);
      result = result.filter(
        (expense) => new Date(expense.date).getFullYear() === yearNum
      );
    }
    if (filterMonth !== "All") {
      const monthNum = parseInt(filterMonth);
      result = result.filter(
        (expense) => new Date(expense.date).getMonth() === monthNum
      );
    }
    setFilteredExpenses(result);
  }, [expenses, filterYear, filterMonth]);

  const fetchInflationData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/inflation-data`);
      if (!response.ok) throw new Error("Failed to fetch inflation data");
      const data = await response.json();
      setInflationData(data);
      return true;
    } catch (err) {
      console.error("Error fetching inflation data:", err);
      setError("Could not load inflation data. Please check your connection.");
      return false;
    }
  };

  const fetchUserData = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        setError("User not logged in");
        setLoading(false);
        return false;
      }
      const parsedInfo = JSON.parse(userInfoString);
      setUserInfo(parsedInfo);

      const username =
        parsedInfo?.user?.username ||
        parsedInfo?.user?.userName ||
        parsedInfo?.username ||
        parsedInfo?.userName;
      if (!username) {
        setError("Username not found");
        setLoading(false);
        return false;
      }

      if (parsedInfo?.user?.age || parsedInfo?.age) {
        setCurrentAge(String(parsedInfo?.user?.age || parsedInfo?.age));
      }
      if (parsedInfo?.user?.retirementAge || parsedInfo?.retirementAge) {
        setRetirementAge(
          String(parsedInfo?.user?.retirementAge || parsedInfo?.retirementAge)
        );
      }

      const monthlyResponse = await fetch(
        `${API_URL}/transactions/${username}/monthly-essential?includeToday=${includeToday}`
      );
      if (monthlyResponse.ok) {
        const monthlyData = await monthlyResponse.json();
        setExpenses(monthlyData.expenses);
        setFilteredExpenses(monthlyData.expenses);
        if (monthlyData.expenses && monthlyData.expenses.length > 0) {
          const uniqueDaysCount =
            monthlyData.uniqueDays ||
            new Set(
              monthlyData.expenses.map((expense) =>
                expense.date.substring(0, 10)
              )
            ).size;
          setUniqueDays(uniqueDaysCount);
          const totalAmount = parseFloat(
            monthlyData.totalAmount ||
              monthlyData.expenses.reduce(
                (sum, expense) => sum + expense.amount,
                0
              )
          );
          const dailyAvg = totalAmount / uniqueDaysCount;
          setDailyAverage(dailyAvg.toFixed(2));
          setMonthlyExpense(dailyAvg.toFixed(2));
        } else {
          setMonthlyExpense("0.00");
          setDailyAverage("0.00");
          setUniqueDays(0);
        }
      } else {
        throw new Error("Failed to fetch monthly expenses");
      }
      return true;
    } catch (err) {
      console.error("Error fetching user data:", err);
      return false;
    }
  };

  const getExpensesSummary = () => {
    if (expenses.length === 0) return "No essential expenses recorded";
    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const earliestDate = new Date(sortedExpenses[0].date);
    const latestDate = new Date(sortedExpenses[sortedExpenses.length - 1].date);
    const formattedEarliest = earliestDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const formattedLatest = latestDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `${expenses.length} expenses across ${uniqueDays} days (avg ₹${dailyAverage}/day) from ${formattedEarliest} to ${formattedLatest}`;
  };

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      const inflationLoaded = await fetchInflationData();
      const userDataLoaded = await fetchUserData();
      if (inflationLoaded && userDataLoaded) {
        setError(null);
      }
      setLoading(false);
    };
    loadAllData();
  }, [includeToday]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (currentAge && retirementAge) {
      const years = parseInt(retirementAge) - parseInt(currentAge);
      setYearsToRetirement(years > 0 ? years.toString() : "0");
    }
  }, [currentAge, retirementAge]);

  useEffect(() => {
    if (monthlyExpense) {
      const yearly = parseFloat(monthlyExpense) * 365;
      setYearlyExpense(yearly.toFixed(2));
    }
  }, [monthlyExpense]);

  useEffect(() => {
    if (yearlyExpense && yearsToRetirement && inflationData.length > 0) {
      const inflation = getInflationRate() / 100;
      const years = parseInt(yearsToRetirement);
      const presentExpense = parseFloat(yearlyExpense);
      const futureExpense = presentExpense * Math.pow(1 + inflation, years);
      setFutureAnnualExpense(futureExpense.toFixed(2));
    }
  }, [yearlyExpense, yearsToRetirement, selectedCountry, inflationData]);

  useEffect(() => {
    if (futureAnnualExpense && safeWithdrawalRate) {
      const swr = parseFloat(safeWithdrawalRate) / 100;
      const fireNum = parseFloat(futureAnnualExpense) / swr;
      setFireNumber(fireNum.toFixed(2));
    }
  }, [futureAnnualExpense, safeWithdrawalRate]);

  useEffect(() => {
    if (fireNumber && yearsToRetirement) {
      const futureValueTarget = parseFloat(fireNumber);
      const n = parseInt(yearsToRetirement) * 12;
      const calculateSIP = (annualInterestRate) => {
        const monthlyInterestRate = annualInterestRate / 100 / 12;
        if (n <= 0) return 0;
        if (monthlyInterestRate === 0) return futureValueTarget / n;
        const sip =
          (futureValueTarget * monthlyInterestRate) /
          (Math.pow(1 + monthlyInterestRate, n) - 1);
        return sip > 0 ? sip.toFixed(2) : "0.00";
      };
      setSip8Percent(calculateSIP(8));
      setSip10Percent(calculateSIP(10));
      setSip12Percent(calculateSIP(12));
    } else {
      setSip8Percent("0.00");
      setSip10Percent("0.00");
      setSip12Percent("0.00");
    }
  }, [fireNumber, yearsToRetirement]);

  const resetFilters = () => {
    setFilterMonth("All");
    setFilterYear("All");
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const toggleIncludeToday = () => {
    setIncludeToday(!includeToday);
  };

  const handleLinkPress = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(`Don't know how to open this URL: ${url}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#e67e22" />
        <Text style={styles.loadingText}>Loading financial data...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.errorContainer]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.errorSubtext}>
          Please check your connection and try again
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerIconContainer}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Firenumber</Text>
          <View style={styles.headerIconContainer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Age</Text>
              <TextInput
                style={styles.input}
                value={currentAge}
                onChangeText={setCurrentAge}
                keyboardType="numeric"
                placeholder="Enter your current age"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Retirement Age</Text>
              <TextInput
                style={styles.input}
                value={retirementAge}
                onChangeText={setRetirementAge}
                keyboardType="numeric"
                placeholder="Enter your target retirement age"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Years to Retirement</Text>
              <View style={styles.calculatedField}>
                <Text style={styles.calculatedText}>
                  {yearsToRetirement || "0"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Financial Parameters</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  includeToday ? styles.toggleActive : {},
                ]}
                onPress={toggleIncludeToday}
              >
                <Text style={styles.toggleText}>
                  {includeToday ? "Including Today" : "Excluding Today"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelWithHint}>
                <Text style={styles.label}>
                  Average Daily Essential Expenses
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      "Calculation Method",
                      "Daily expense = Total expenses ÷ Number of days with expenses"
                    )
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.calculatedField}>
                <Text style={styles.calculatedText}>
                  {monthlyExpense ? `₹${monthlyExpense}` : "₹0.00"}
                </Text>
              </View>
              <Text style={styles.labelHint}>{getExpensesSummary()}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Yearly Essential Expenses</Text>
              <View style={styles.calculatedField}>
                <Text style={styles.calculatedText}>
                  {yearlyExpense ? `₹${yearlyExpense}` : "₹0.00"}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Country (Avg. Inflation Rate: {getInflationRate().toFixed(2)}%)
              </Text>
              <Picker
                selectedValue={selectedCountry}
                style={styles.picker}
                onValueChange={(itemValue) => setSelectedCountry(itemValue)}
              >
                {inflationData.map((country) => (
                  <Picker.Item
                    key={country.country_name}
                    label={`${country.country_name} (${country.AVG.toFixed(
                      2
                    )}%)`}
                    value={country.country_name}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Safe Withdrawal Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={safeWithdrawalRate}
                onChangeText={setSafeWithdrawalRate}
                keyboardType="numeric"
                placeholder="Usually 4% (4% rule)"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Results</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Future Annual Expenses</Text>
              <View style={styles.calculatedField}>
                <Text style={styles.calculatedText}>
                  {futureAnnualExpense ? `₹${futureAnnualExpense}` : "₹0.00"}
                </Text>
              </View>
            </View>

            <View style={styles.fireNumberContainer}>
              <Text style={styles.fireNumberLabel}>Your FIRE Number</Text>
              <Text style={styles.fireNumber}>
                {fireNumber ? `₹${formatCurrency(fireNumber)}` : "₹0.00"}
              </Text>
            </View>

            <View style={styles.sipTableContainer}>
              <Text style={styles.sipTableTitle}>
                Monthly SIP to reach FIRE Number
              </Text>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableHeader}>Interest Rate</Text>
                  <Text style={styles.tableHeader}>Monthly Investment</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>8%</Text>
                  <Text style={styles.tableCell}>
                    ₹{formatCurrency(sip8Percent)}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>10%</Text>
                  <Text style={styles.tableCell}>
                    ₹{formatCurrency(sip10Percent)}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>12%</Text>
                  <Text style={styles.tableCell}>
                    ₹{formatCurrency(sip12Percent)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.investmentCard}>
            <Ionicons name="rocket-outline" size={32} color="#10B981" />
            <Text style={styles.investmentTitle}>Ready to Invest?</Text>
            <Text style={styles.investmentText}>
              Your FIRE number is a great starting point. The next step is to
              put your money to work. Start your investment journey today with
              one of our trusted partners.
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.mfButton]}
                onPress={() =>
                  handleLinkPress("https://www.assetplus.in/mfd/ARN-249206")
                }
              >
                <Ionicons
                  name="leaf-outline"
                  size={20}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>Invest in Mutual Funds</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.stocksButton]}
                onPress={() =>
                  handleLinkPress("https://upstox.com/open-account/?f=5LBM8X")
                }
              >
                <Ionicons
                  name="analytics-outline"
                  size={20}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>Invest in Stocks</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Essential Expenses</Text>
              <TouchableOpacity
                onPress={toggleFilters}
                style={styles.filterButton}
              >
                <Ionicons name="filter" size={20} color="#e67e22" />
                <Text style={styles.filterButtonText}>Filter</Text>
              </TouchableOpacity>
            </View>

            {showFilters && (
              <View style={styles.filtersContainer}>
                <View style={styles.filterRow}>
                  <View style={styles.filterItem}>
                    <Text style={styles.filterLabel}>Month</Text>
                    <Picker
                      selectedValue={filterMonth}
                      style={styles.filterPicker}
                      itemStyle={styles.pickerItem}
                      onValueChange={setFilterMonth}
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
                  </View>

                  <View style={styles.filterItem}>
                    <Text style={styles.filterLabel}>Year</Text>
                    <Picker
                      selectedValue={filterYear}
                      style={styles.filterPicker}
                      itemStyle={styles.pickerItem}
                      onValueChange={setFilterYear}
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
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={resetFilters}
                >
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.filterSummary}>
              <Text style={styles.filterSummaryText}>
                Showing {filteredExpenses.length} of {expenses.length} expenses
                {filterMonth !== "All" || filterYear !== "All"
                  ? " (filtered)"
                  : ""}
              </Text>
            </View>

            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <View key={expense._id} style={styles.expenseItem}>
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseName}>{expense.name}</Text>
                    <Text style={styles.expenseDate}>
                      {formatDate(expense.date)}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>
                    ₹{expense.amount.toLocaleString("en-IN")}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No essential expenses found
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {expenses.length > 0
                    ? "Adjust your filters to see expenses"
                    : "Record essential expenses in Calendar to see them here"}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const formatCurrency = (value) => {
  return parseFloat(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f7",
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerIconContainer: {
    width: 24, // Matches icon size to ensure proper centering
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f8f4e3",
    borderRadius: 8,
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#e67e22",
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelWithHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  labelHint: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    fontStyle: "italic",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  picker: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  calculatedField: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 12,
  },
  calculatedText: {
    fontSize: 16,
    color: "#333",
  },
  fireNumberContainer: {
    alignItems: "center",
    backgroundColor: "#f8f4e3",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e67e22",
  },
  fireNumberLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e67e22",
    marginBottom: 8,
  },
  fireNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#e67e22",
    marginBottom: 8,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  expenseDetails: {
    flexDirection: "column",
  },
  expenseName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  expenseDate: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e67e22",
  },
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
  pickerItem: {
    height: 120,
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#666",
    fontSize: 14,
  },
  filterSummary: {
    marginBottom: 12,
  },
  filterSummaryText: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "red",
    marginBottom: 10,
    fontWeight: "bold",
  },
  errorSubtext: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
  scrollViewContent: {
    paddingBottom: 80,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleActive: {
    backgroundColor: "#f8f4e3",
    borderColor: "#e67e22",
  },
  toggleText: {
    fontSize: 12,
    color: "#666",
  },
  sipTableContainer: {
    marginTop: 20,
  },
  sipTableTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 10,
    textAlign: "center",
  },
  table: {
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  tableHeader: {
    flex: 1,
    padding: 5,
    backgroundColor: "transparent",
    color: "#555555",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 13,
  },
  tableCell: {
    flex: 1,
    padding: 5,
    textAlign: "center",
    fontSize: 14,
    color: "#666666",
    backgroundColor: "transparent",
  },
  investmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  investmentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 8,
  },
  investmentText: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },
  mfButton: {
    backgroundColor: "#10B981",
    marginRight: 8,
  },
  stocksButton: {
    backgroundColor: "#3B82F6",
    marginLeft: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default FireNumber;
