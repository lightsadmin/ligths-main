import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform, // Import Platform to handle OS-specific UI
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventRegister } from "react-native-event-listeners";
import DateTimePicker from "@react-native-community/datetimepicker"; // Import the date picker
import { buildURL, ENDPOINTS } from "./config/api";

const MFCalculator = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { fund } = route.params;

  // --- State for Calculator Inputs ---
  const [sipAmount, setSipAmount] = useState("");
  const [lumpsumAmount, setLumpsumAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("12");

  // --- NEW: State for Investment Tracking ---
  const [investmentDate, setInvestmentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- State for Results and UI ---
  const [calculationResult, setCalculationResult] = useState(null);
  const [calculationType, setCalculationType] = useState("SIP");

  useEffect(() => {
    // Changed title to reflect new purpose
    navigation.setOptions({
      title: "Calculate MF",
    });
  }, [navigation]);

  // --- Date Picker Logic ---
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || investmentDate;
    setShowDatePicker(Platform.OS === "ios"); // On iOS, the picker is a modal
    setInvestmentDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  // --- Calculation Logic (remains the same) ---
  const calculateSIP = () => {
    const monthlyAmount = parseFloat(sipAmount);
    const years = parseFloat(duration);
    const annualRate = parseFloat(expectedReturn) / 100;
    const monthlyRate = annualRate / 12;
    const totalMonths = years * 12;

    console.log("SIP Input values:", { monthlyAmount, years, annualRate });

    if (
      isNaN(monthlyAmount) ||
      isNaN(years) ||
      monthlyAmount <= 0 ||
      years <= 0
    ) {
      Alert.alert("Error", "Please enter valid amount and duration.");
      console.log("SIP validation failed");
      return;
    }

    const futureValue =
      monthlyAmount *
      (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) *
        (1 + monthlyRate));
    const totalInvestment = monthlyAmount * totalMonths;
    const totalReturns = futureValue - totalInvestment;

    const result = {
      type: "SIP",
      monthlyAmount,
      totalInvestment,
      futureValue,
      totalReturns,
      duration: years,
      expectedReturn: parseFloat(expectedReturn),
      startDate: investmentDate,
    };

    console.log("SIP Calculation Result:", result);
    setCalculationResult(result);
  };

  const calculateLumpsum = () => {
    const principal = parseFloat(lumpsumAmount);
    const years = parseFloat(duration);
    const annualRate = parseFloat(expectedReturn) / 100;

    console.log("Lumpsum Input values:", { principal, years, annualRate });

    if (isNaN(principal) || isNaN(years) || principal <= 0 || years <= 0) {
      Alert.alert("Error", "Please enter valid amount and duration.");
      console.log("Lumpsum validation failed");
      return;
    }
    const futureValue = principal * Math.pow(1 + annualRate, years);
    const totalReturns = futureValue - principal;

    const result = {
      type: "LUMPSUM",
      principal,
      futureValue,
      totalReturns,
      duration: years,
      expectedReturn: parseFloat(expectedReturn),
      startDate: investmentDate,
    };

    console.log("Lumpsum Calculation Result:", result);
    setCalculationResult(result);
  };

  const handleCalculate = () => {
    console.log("Calculate button clicked");
    console.log("Current state:", {
      sipAmount,
      lumpsumAmount,
      duration,
      expectedReturn,
      calculationType,
    });

    if (calculationType === "SIP") {
      console.log("Calling calculateSIP");
      calculateSIP();
    } else {
      console.log("Calling calculateLumpsum");
      calculateLumpsum();
    }
  };

  const formatCurrency = (amount) => {
    const number = parseFloat(amount);
    if (isNaN(number)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(number);
  };

  // --- UPDATED: createInvestment function to add investment to portfolio ---
  const addInvestmentToPortfolio = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Authentication Error", "You must be logged in.");
        return;
      }
      const token = JSON.parse(userInfoString).token;
      if (!token) {
        Alert.alert("Authentication Error", "Token not found.");
        return;
      }

      let investmentData;
      const years = parseFloat(duration);

      // The fund name is taken automatically from the fund object
      const schemeName = fund.schemeName;

      if (calculationType === "SIP") {
        const monthlyDeposit = parseFloat(sipAmount);
        if (!monthlyDeposit || !years) {
          Alert.alert("Error", "Please enter a valid SIP amount and duration.");
          return;
        }
        investmentData = {
          name: schemeName,
          amount: monthlyDeposit,
          monthlyDeposit: monthlyDeposit,
          duration: years,
          interestRate: parseFloat(expectedReturn),
          investmentType: "Mutual Fund",
          description: `SIP in ${schemeName}`,
          // NEW: Send the actual start date to the server
          startDate: investmentDate.toISOString(),
        };
      } else {
        // LUMPSUM
        const lumpsumValue = parseFloat(lumpsumAmount);
        if (!lumpsumValue || !years) {
          Alert.alert(
            "Error",
            "Please enter a valid lumpsum amount and duration."
          );
          return;
        }
        investmentData = {
          name: schemeName,
          amount: lumpsumValue,
          duration: years,
          interestRate: parseFloat(expectedReturn),
          investmentType: "Mutual Fund",
          description: `Lumpsum in ${schemeName}`,
          // NEW: Send the actual start date to the server
          startDate: investmentDate.toISOString(),
        };
      }

      const response = await fetch(buildURL(ENDPOINTS.INVESTMENTS), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(investmentData),
      });

      if (response.ok) {
        EventRegister.emit("investmentAdded");
        Alert.alert(
          "Success!",
          `Your investment in ${schemeName} has been added to your portfolio.`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add investment");
      }
    } catch (error) {
      Alert.alert("Error", `Failed to add investment: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Fund Info (no change) */}
        <View style={styles.fundInfo}>
          <Text style={styles.fundName}>{fund.schemeName}</Text>
          <View style={styles.fundDetails}>
            <View style={styles.navContainer}>
              <Text style={styles.navLabel}>Current NAV</Text>
              <Text style={styles.navValue}>{formatCurrency(fund.nav)}</Text>
            </View>
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Scheme Code</Text>
              <Text style={styles.codeValue}>{fund.schemeCode}</Text>
            </View>
          </View>
        </View>

        {/* Calculation Type Selector (no change) */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              calculationType === "SIP" && styles.activeTypeButton,
            ]}
            onPress={() => setCalculationType("SIP")}
          >
            <Text
              style={[
                styles.typeButtonText,
                calculationType === "SIP" && styles.activeTypeButtonText,
              ]}
            >
              Track a SIP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              calculationType === "LUMPSUM" && styles.activeTypeButton,
            ]}
            onPress={() => setCalculationType("LUMPSUM")}
          >
            <Text
              style={[
                styles.typeButtonText,
                calculationType === "LUMPSUM" && styles.activeTypeButtonText,
              ]}
            >
              Track Lumpsum
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- UPDATED: Input Form now includes Date Picker --- */}
        <View style={styles.inputContainer}>
          {calculationType === "SIP" ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Monthly SIP Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={sipAmount}
                onChangeText={setSipAmount}
                placeholder="e.g., 5000"
                keyboardType="numeric"
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Lumpsum Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={lumpsumAmount}
                onChangeText={setLumpsumAmount}
                placeholder="e.g., 50000"
                keyboardType="numeric"
              />
            </View>
          )}

          {/* NEW: Investment Start Date Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {calculationType === "SIP"
                ? "SIP Start Date"
                : "Lumpsum Investment Date"}
            </Text>
            <TouchableOpacity style={styles.dateInput} onPress={showDatepicker}>
              <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
              <Text style={styles.dateInputText}>
                {investmentDate.toLocaleDateString("en-IN")}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={investmentDate}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()} // User cannot select a future date
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Investment Duration (Years)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g., 10"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Expected Annual Return (%)</Text>
            <TextInput
              style={styles.input}
              value={expectedReturn}
              onChangeText={setExpectedReturn}
              placeholder="e.g., 12"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.calculateButton}
            onPress={handleCalculate}
          >
            <Ionicons name="calculator" size={20} color="#FFFFFF" />
            <Text style={styles.calculateButtonText}>Calculate Projection</Text>
          </TouchableOpacity>
        </View>

        {/* Results Display */}
        {calculationResult && (
          <View style={styles.resultContainer}>
            {console.log("Current calculationResult state:", calculationResult)}
            <Text style={styles.resultTitle}>Projected Growth</Text>
            <View style={styles.resultGrid}>
              {/* Display the start date in the results */}
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Investment Start Date</Text>
                <Text style={styles.resultValue}>
                  {calculationResult.startDate.toLocaleDateString("en-IN")}
                </Text>
              </View>

              {calculationResult.type === "SIP" ? (
                <>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Monthly Investment</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.monthlyAmount)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Total Investment</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.totalInvestment)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Future Value</Text>
                    <Text style={[styles.resultValue, styles.highlightValue]}>
                      {formatCurrency(calculationResult.futureValue)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Total Returns</Text>
                    <Text style={[styles.resultValue, styles.successValue]}>
                      {formatCurrency(calculationResult.totalReturns)}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Principal Amount</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.principal)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Future Value</Text>
                    <Text style={[styles.resultValue, styles.highlightValue]}>
                      {formatCurrency(calculationResult.futureValue)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Total Returns</Text>
                    <Text style={[styles.resultValue, styles.successValue]}>
                      {formatCurrency(calculationResult.totalReturns)}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Duration</Text>
                <Text style={styles.resultValue}>
                  {calculationResult.duration} years
                </Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Expected Annual Return</Text>
                <Text style={styles.resultValue}>
                  {calculationResult.expectedReturn}%
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.investButton}
              onPress={addInvestmentToPortfolio}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.investButtonText}>Add to Portfolio</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles (with additions for the date picker) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FC" },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  fundInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  fundName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 15,
    lineHeight: 24,
  },
  fundDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navContainer: { flex: 1 },
  navLabel: { fontSize: 12, color: "#64748B", marginBottom: 5 },
  navValue: { fontSize: 20, fontWeight: "bold", color: "#059669" },
  codeContainer: { alignItems: "flex-end" },
  codeLabel: { fontSize: 12, color: "#64748B", marginBottom: 5 },
  codeValue: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  typeSelector: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTypeButton: { backgroundColor: "#3B82F6" },
  typeButtonText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  activeTypeButtonText: { color: "#FFFFFF" },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  dateInputText: { fontSize: 16, color: "#1E293B", marginLeft: 10 },
  calculateButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  calculateButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  resultContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 20,
    textAlign: "center",
  },
  resultGrid: { gap: 16 },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  resultLabel: { fontSize: 14, color: "#64748B", flex: 1 },
  resultValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "right",
  },
  highlightValue: { color: "#3B82F6", fontSize: 18, fontWeight: "bold" },
  successValue: { color: "#059669", fontWeight: "bold" },
  investButton: {
    backgroundColor: "#059669",
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  investButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});

export default MFCalculator;
