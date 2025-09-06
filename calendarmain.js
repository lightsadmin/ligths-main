import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  RefreshControl,
  Animated,
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Calendar } from "react-native-calendars";
import { useNavigation } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { EventRegister } from "react-native-event-listeners";
import LottieView from "lottie-react-native";
import voiceRecordingAnimation from "./animations/voice recording.json";

const CalendarMain = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const today = new Date().toISOString().split("T")[0];
  const currentMonthDefault = today.slice(0, 7);
  const navigation = useNavigation();

  const [selectedDate, setSelectedDate] = useState(today);
  const [searchMonth, setSearchMonth] = useState(
    currentMonthDefault.split("-")[1]
  );
  const [searchYear, setSearchYear] = useState(
    new Date().getFullYear().toString()
  );
  const [calendarKey, setCalendarKey] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(currentMonthDefault);
  const [transactions, setTransactions] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [incomeData, setIncomeData] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Function to normalize dates between different formats
  const normalizeDate = (dateString) => {
    // Check if date is in DD/MM/YYYY format
    if (dateString && dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
    }
    // Already in YYYY-MM-DD format or other format
    return dateString;
  };

  // Format data for pie charts with different color schemes based on type
  const formatDataForPieChart = (transactions, type) => {
    // Group transactions by subType and sum their amounts
    const groupedData = {};

    transactions.forEach((transaction) => {
      const category = transaction.subType || "Other";
      if (!groupedData[category]) {
        groupedData[category] = 0;
      }
      groupedData[category] += transaction.amount;
    });

    // Define different color schemes based on type
    const expenseColors = [
      "#FF6B6B", // Light Red
      "#FF9E7A", // Light Orange
      "#FFB56B", // Lighter Orange
      "#FFCF7F", // Light Amber
      "#FFE57F", // Light Yellow
      "#F0A1A1", // Soft Red
      "#F1C0B9", // Light Salmon
      "#F0B6D3", // Light Pink
      "#E0B1CB", // Soft Pink
      "#FFAAA5", // Coral
    ];

    const incomeColors = [
      "#7AE7C7", // Light Green
      "#88D498", // Mint
      "#A5E1AD", // Soft Green
      "#B5EAD7", // Pale Green
      "#C7F9CC", // Very Light Green
      "#98D8C8", // Seafoam
      "#ABDEE6", // Light Blue
      "#CBAACB", // Lavender
      "#D6E5FA", // Light Blue-Gray
      "#C3E8BD", // Pale Mint
    ];

    const investmentColors = [
      "#3B82F6", // Blue
      "#60A5FA", // Light Blue
      "#93C5FD", // Lighter Blue
      "#6366F1", // Indigo
      "#818CF8", // Light Indigo
      "#A5B4FC", // Lighter Indigo
      "#2563EB", // Darker Blue
      "#8B5CF6", // Purple
      "#A78BFA", // Light Purple
      "#C4B5FD", // Lighter Purple
    ];

    // Choose color scheme based on transaction type
    let colors = investmentColors; // Default
    if (type === "Income") {
      colors = incomeColors;
    } else if (type === "Expense") {
      colors = expenseColors;
    }

    // Convert grouped data to pie chart format
    return Object.entries(groupedData).map(([name, amount], index) => ({
      name,
      amount,
      color: colors[index % colors.length],
      legendFontColor: "#1E293B",
      legendFontSize: 12,
    }));
  };

  // Add this right after your PieChart component
  const renderCustomLegend = (data, title) => {
    // Calculate total for percentages
    const total = data.reduce((sum, item) => sum + item.amount, 0);

    return (
      <View style={styles.customLegendContainer}>
        <Text style={styles.customLegendTitle}>{title} Breakdown</Text>
        {data.map((item, index) => {
          // Skip rendering for "No Data" placeholder
          if (item.name === "No Data") return null;

          const percentage = ((item.amount / total) * 100).toFixed(1);

          return (
            <View key={index} style={styles.customLegendItem}>
              <View style={styles.customLegendLeft}>
                <View
                  style={[
                    styles.customLegendColor,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text style={styles.customLegendName}>{item.name}</Text>
              </View>
              <View style={styles.customLegendRight}>
                <Text style={styles.customLegendAmount}>
                  ₹{item.amount.toLocaleString()}
                </Text>
                <Text style={styles.customLegendPercent}>({percentage}%)</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Fetch transactions data
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!userInfo) {
        console.log("No user info found");
        return;
      }

      const parsedInfo = JSON.parse(userInfo);
      const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;

      // Format month with leading zero
      const formattedMonth = searchMonth.padStart(2, "0");

      console.log(`Fetching transactions for ${username}`);

      const response = await fetch(
        `https://ligths-backend.onrender.com/transactions/${username}`
      );

      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        return;
      }

      const text = await response.text();
      const data = JSON.parse(text);

      const transactionsArray = data.transactions || [];
      console.log(
        "Investment transactions:",
        transactionsArray.filter((t) => t.type === "Investment")
      );

      const filteredData = transactionsArray.filter((item) => {
        if (!item.date) return false;

        // Handle different date formats
        if (item.date.includes("/")) {
          // DD/MM/YYYY format
          const [day, month, year] = item.date.split("/");
          return month === formattedMonth && year === searchYear;
        } else if (item.date.includes("-")) {
          // YYYY-MM-DD format
          return item.date.startsWith(`${searchYear}-${formattedMonth}`);
        }
        return false;
      });

      console.log(
        `Filtered ${filteredData.length} transactions for ${formattedMonth}/${searchYear}`
      );
      console.log("Filtered transactions:", filteredData);
      setTransactions(filteredData);

      // Create formatted data for pie charts with type for color selection
      const expenseTransactions = filteredData.filter(
        (t) => t.type === "Expense"
      );
      const incomeTransactions = filteredData.filter(
        (t) => t.type === "Income"
      );

      console.log("Expense transactions:", expenseTransactions);
      console.log("Income transactions:", incomeTransactions);

      if (expenseTransactions.length > 0) {
        const expenseChartData = formatDataForPieChart(
          expenseTransactions,
          "Expense"
        );
        console.log("Expense chart data:", expenseChartData);
        setExpenseData(expenseChartData);
      } else {
        console.log("No expense transactions found, setting default data");
        setExpenseData([
          {
            name: "No Data",
            amount: 1,
            color: "#E2E8F0",
            legendFontColor: "#94A3B8",
          },
        ]);
      }

      if (incomeTransactions.length > 0) {
        const incomeChartData = formatDataForPieChart(
          incomeTransactions,
          "Income"
        );
        console.log("Income chart data:", incomeChartData);
        setIncomeData(incomeChartData);
      } else {
        console.log("No income transactions found, setting default data");
        setIncomeData([
          {
            name: "No Data",
            amount: 1,
            color: "#E2E8F0",
            legendFontColor: "#94A3B8",
          },
        ]);
      }

      // Generate marked dates
      const markedDatesObj = generateMarkedDates(filteredData);
      setMarkedDates(markedDatesObj);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchMonth, searchYear]);

  // Initial load
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Refresh when month/year changes
  useEffect(() => {
    fetchTransactions();
  }, [searchMonth, searchYear, fetchTransactions]);

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log("Calendar screen focused - refreshing data");
      fetchTransactions();
      return () => {}; // cleanup
    }, [fetchTransactions])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [fetchTransactions]);

  // Generate marked dates for calendar
  const generateMarkedDates = (transactions) => {
    const marked = {};

    transactions.forEach((item) => {
      if (!item || !item.date) return;

      // Normalize date format
      let normalizedDate;
      if (item.date.includes("/")) {
        const [day, month, year] = item.date.split("/");
        normalizedDate = `${year}-${month}-${day}`;
      } else {
        normalizedDate = item.date;
      }

      // Always sum all transactions for the day
      if (!marked[normalizedDate]) {
        marked[normalizedDate] = {
          income: 0,
          expense: 0,
          investment: 0,
        };
      }

      if (item.type === "Income") {
        marked[normalizedDate].income += item.amount;
      } else if (item.type === "Expense") {
        marked[normalizedDate].expense += item.amount;
      } else if (item.type === "Investment") {
        marked[normalizedDate].investment += item.amount;
      }
    });

    // Format for calendar display
    const formattedMarkedDates = {};

    Object.keys(marked).forEach((date) => {
      // If already set for FD/RD, keep that color
      if (marked[date].selectedColor) {
        formattedMarkedDates[date] = marked[date];
        return;
      }

      const { income, expense, investment } = marked[date];
      let selectedColor = "#64748B"; // Default gray

      if (income === 0 && expense === 0 && investment > 0) {
        selectedColor = "#3B82F6"; // Only investment present
      } else if (income > expense && income > investment) {
        selectedColor = "#10B981"; // Green for income
      } else if (expense > income && expense > investment) {
        selectedColor = "#EF4444"; // Red for expense
      } else if (investment > income && investment > expense) {
        selectedColor = "#3B82F6"; // Blue for investment
      }

      formattedMarkedDates[date] = {
        selected: true,
        selectedColor: selectedColor,
        marked: true,
        dotColor: selectedColor,
      };
    });

    return formattedMarkedDates;
  };

  // Month name helper
  const getMonthName = (monthNum) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[parseInt(monthNum, 10) - 1];
  };

  // Day press handler
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    navigation.navigate("DateExpenses", { selectedDate: day.dateString });
  };

  // <<< START OF CHANGE >>>
  // Handler for when the user swipes the calendar to a new month
  const handleMonthChange = (month) => {
    const newYear = month.year.toString();
    const newMonth = String(month.month).padStart(2, "0");

    console.log(`Month changed to: ${newMonth}/${newYear}`);
    setSearchYear(newYear);
    setSearchMonth(newMonth);
    setCurrentMonth(`${newYear}-${newMonth}`);
  };
  // <<< END OF CHANGE >>>

  // Search handler
  const handleSearch = () => {
    if (searchYear && searchMonth) {
      const newMonth = `${searchYear}-${searchMonth.padStart(2, "0")}`;
      setCurrentMonth(newMonth);
      setCalendarKey((prevKey) => prevKey + 1);
    }
  };

  // Reset to current date
  const resetToCurrentDate = () => {
    const currentDate = new Date();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
    const currentYear = currentDate.getFullYear().toString();

    setSelectedDate(today);
    setSearchMonth(currentMonth);
    setSearchYear(currentYear);
    setCurrentMonth(`${currentYear}-${currentMonth}`);
    setCalendarKey((prevKey) => prevKey + 1);
  };

  // Calendar legend
  const renderLegend = () => {
    return (
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#10B981" }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#3B82F6" }]} />
          <Text style={styles.legendText}>Investment</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
      </View>
    );
  };

  useEffect(() => {
    // Listen for both transaction and investment events
    const transactionListener = EventRegister.addEventListener(
      "transactionAdded",
      () => {
        fetchTransactions();
      }
    );
    const investmentListener = EventRegister.addEventListener(
      "investmentAdded",
      () => {
        fetchTransactions();
      }
    );
    return () => {
      EventRegister.removeEventListener(transactionListener);
      EventRegister.removeEventListener(investmentListener);
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Image
          source={require("./assets/main-header.png")}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>View Transactions</Text>

          <View style={styles.pickerRow}>
            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>Month</Text>
              <View style={styles.pickerContainer}>
                {Platform.OS === "ios" ? (
                  <Picker
                    selectedValue={searchMonth}
                    onValueChange={(itemValue) => setSearchMonth(itemValue)}
                    style={styles.picker}
                    itemStyle={{ fontSize: 16, color: "#0F172A" }}
                  >
                    {[
                      "01",
                      "02",
                      "03",
                      "04",
                      "05",
                      "06",
                      "07",
                      "08",
                      "09",
                      "10",
                      "11",
                      "12",
                    ].map((month) => (
                      <Picker.Item
                        key={month}
                        label={getMonthName(month)}
                        value={month}
                      />
                    ))}
                  </Picker>
                ) : (
                  <Picker
                    selectedValue={searchMonth}
                    onValueChange={(itemValue) => setSearchMonth(itemValue)}
                    style={styles.picker}
                    dropdownIconColor="#64748B"
                  >
                    {[
                      "01",
                      "02",
                      "03",
                      "04",
                      "05",
                      "06",
                      "07",
                      "08",
                      "09",
                      "10",
                      "11",
                      "12",
                    ].map((month) => (
                      <Picker.Item
                        key={month}
                        label={getMonthName(month)}
                        value={month}
                        style={styles.pickerItem}
                      />
                    ))}
                  </Picker>
                )}
              </View>
            </View>

            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>Year</Text>
              <View style={styles.pickerContainer}>
                {Platform.OS === "ios" ? (
                  <Picker
                    selectedValue={searchYear}
                    onValueChange={(itemValue) => setSearchYear(itemValue)}
                    style={styles.picker}
                    itemStyle={{ fontSize: 16, color: "#0F172A" }}
                  >
                    {Array.from({ length: 10 }, (_, i) =>
                      (new Date().getFullYear() - 2 + i).toString()
                    ).map((year) => (
                      <Picker.Item key={year} label={year} value={year} />
                    ))}
                  </Picker>
                ) : (
                  <Picker
                    selectedValue={searchYear}
                    onValueChange={(itemValue) => setSearchYear(itemValue)}
                    style={styles.picker}
                    dropdownIconColor="#64748B"
                  >
                    {Array.from({ length: 10 }, (_, i) =>
                      (new Date().getFullYear() - 2 + i).toString()
                    ).map((year) => (
                      <Picker.Item
                        key={year}
                        label={year}
                        value={year}
                        style={styles.pickerItem}
                      />
                    ))}
                  </Picker>
                )}
              </View>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleSearch}
              style={styles.searchButton}
            >
              <Ionicons name="search" size={16} color="white" />
              <Text style={styles.buttonText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={resetToCurrentDate}
              style={styles.resetButton}
            >
              <Ionicons name="today" size={16} color="white" />
              <Text style={styles.buttonText}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <Calendar
            key={calendarKey}
            current={currentMonth}
            onDayPress={handleDayPress}
            // <<< START OF CHANGE >>>
            onMonthChange={handleMonthChange} // Connects swiping to the new handler
            // <<< END OF CHANGE >>>
            markedDates={markedDates}
            monthFormat={"MMMM yyyy"}
            hideExtraDays={false}
            enableSwipeMonths={true}
            theme={{
              backgroundColor: "#ffffff",
              calendarBackground: "#ffffff",
              textSectionTitleColor: "#1E293B",
              selectedDayBackgroundColor: "#2563EB",
              selectedDayTextColor: "#ffffff",
              todayTextColor: "#2563EB",
              dayTextColor: "#1E293B",
              textDisabledColor: "#CBD5E1",
              dotColor: "#2563EB",
              selectedDotColor: "#ffffff",
              arrowColor: "#2563EB",
              monthTextColor: "#1E293B",
              indicatorColor: "#2563EB",
              textDayFontWeight: "400",
              textMonthFontWeight: "600",
              textDayHeaderFontWeight: "500",
            }}
          />

          {renderLegend()}
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.incomeButton]}
              onPress={() => navigation.navigate("Income")}
            >
              <Ionicons name="arrow-down-circle" size={24} color="white" />
              <Text style={styles.actionButtonText}>Add Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.investmentButton]}
              onPress={() => navigation.navigate("AddInvestment")}
            >
              <Ionicons name="trending-up" size={24} color="white" />
              <Text style={styles.actionButtonText}>Add Investment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.expenseButton]}
              onPress={() => navigation.navigate("Expenses")}
            >
              <Ionicons name="cash-outline" size={24} color="white" />
              <Text style={styles.actionButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartTabsContainer}>
            <TouchableOpacity
              style={[
                styles.chartTab,
                activeChartIndex === 0 && styles.activeChartTab,
              ]}
              onPress={() => setActiveChartIndex(0)}
            >
              <Text
                style={[
                  styles.chartTabText,
                  activeChartIndex === 0 && styles.activeChartTabText,
                ]}
              >
                Expenses
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chartTab,
                activeChartIndex === 1 && styles.activeChartTab,
              ]}
              onPress={() => setActiveChartIndex(1)}
            >
              <Text
                style={[
                  styles.chartTabText,
                  activeChartIndex === 1 && styles.activeChartTabText,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {activeChartIndex === 0 ? (
            // Expense chart code
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>
                Expense Breakdown
                {expenseData[0]?.name === "No Data"
                  ? ""
                  : ` - ${getMonthName(searchMonth)} ${searchYear}`}
              </Text>
              {expenseData &&
              expenseData.length > 0 &&
              expenseData[0]?.name !== "No Data" ? (
                <>
                  <PieChart
                    data={expenseData}
                    width={screenWidth * 0.9}
                    height={180}
                    chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(30, 41, 59, ${opacity})`,
                    }}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                    hasLegend={false}
                    center={[screenWidth * 0.15, 0]}
                  />
                  {renderCustomLegend(expenseData, "Expense")}
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="analytics" size={48} color="#CBD5E1" />
                  <Text style={styles.noDataText}>
                    No expense data available
                  </Text>
                </View>
              )}
            </View>
          ) : (
            // Income chart code
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>
                Income Breakdown
                {incomeData[0]?.name === "No Data"
                  ? ""
                  : ` - ${getMonthName(searchMonth)} ${searchYear}`}
              </Text>
              {incomeData &&
              incomeData.length > 0 &&
              incomeData[0]?.name !== "No Data" ? (
                <>
                  <PieChart
                    data={incomeData}
                    width={screenWidth * 0.9}
                    height={180}
                    chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(30, 41, 59, ${opacity})`,
                    }}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                    hasLegend={false}
                    center={[screenWidth * 0.15, 0]}
                  />
                  {renderCustomLegend(incomeData, "Income")}
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="analytics" size={48} color="#CBD5E1" />
                  <Text style={styles.noDataText}>
                    No income data available
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Animated Voice Recording Icon - Bottom Right */}
      <View style={styles.animatedIconContainer}>
        <TouchableOpacity
          onPress={() => navigation.navigate("NoteAIScreen")}
          activeOpacity={0.8}
        >
          <LottieView
            source={voiceRecordingAnimation}
            autoPlay
            loop
            style={styles.animatedIcon}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingBottom: Platform.OS === "ios" ? 90 : 70,
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 0, // Remove horizontal padding
    paddingLeft: 8, // Minimal left padding
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 8,
    alignItems: "flex-start", // Align to the left
  },
  headerLogo: {
    height: 40,
    width: 200,
    alignSelf: "flex-start",
    marginLeft: 0, // No left margin
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "left", // Change from "center" to "left"
  },
  scrollContainer: {
    padding: 16,
  },
  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10, // Add gap between pickers
  },
  pickerWrapper: {
    flex: 1,
    marginHorizontal: 0, // Remove horizontal margin
  },
  pickerLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: Platform.OS === "android" ? "#F8FAFC" : "#FFFFFF",
    height: Platform.OS === "android" ? 56 : "auto", // Fix height for Android
  },
  picker: {
    height: Platform.OS === "ios" ? 120 : 56,
    width: "100%",
    color: "#0F172A",
    ...Platform.select({
      android: {
        paddingHorizontal: 8,
        paddingVertical: 8,
        includeFontPadding: true,
      },
    }),
  },
  pickerItem: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0F172A",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  searchButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eb3f25ff",
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 4,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 4,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#64748B",
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  incomeButton: {
    backgroundColor: "#10B981",
  },
  investmentButton: {
    backgroundColor: "#3B82F6",
  },
  expenseButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTabsContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 4,
  },
  chartTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeChartTab: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chartTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  activeChartTabText: {
    color: "#2563EB",
  },
  chartContainer: {
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  noDataText: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
  },
  customLegendContainer: {
    width: "100%",
    marginTop: 12,
    paddingHorizontal: 8,
  },
  customLegendTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  customLegendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  customLegendLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
  },
  customLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  customLegendName: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  customLegendRight: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  customLegendAmount: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
    marginRight: 4,
  },
  customLegendPercent: {
    fontSize: 12,
    color: "#64748B",
  },
  // ADDED: Styles for the new investment tab content
  investmentSection: {
    paddingVertical: 8,
  },
  investmentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  investmentIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  investmentCardContent: {
    flex: 1,
  },
  investmentCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  investmentCardDescription: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  // Animated icon styles
  animatedIconContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 110 : 90,
    right: 20,
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  animatedIcon: {
    width: 100,
    height: 100,
  },
});

export default CalendarMain;
