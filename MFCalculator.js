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
  const [expectedReturn, setExpectedReturn] = useState("12");

  // --- NEW: State for Investment Tracking ---
  const [investmentDate, setInvestmentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- State for Results and UI ---
  const [calculationResult, setCalculationResult] = useState(null);
  const [calculationType, setCalculationType] = useState("SIP");
  const [showBreakdown, setShowBreakdown] = useState(false);

  // --- NEW: State for existing investment ---
  const [existingInvestment, setExistingInvestment] = useState(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  useEffect(() => {
    // Changed title to reflect new purpose
    navigation.setOptions({
      title: "Calculate MF",
    });

    // Load existing investment when component mounts
    loadExistingInvestment();
  }, [navigation]);

  // --- NEW: Load existing investment for this fund ---
  const loadExistingInvestment = async () => {
    try {
      setIsLoadingExisting(true);
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        setIsLoadingExisting(false);
        return;
      }

      const token = JSON.parse(userInfoString).token;
      if (!token) {
        setIsLoadingExisting(false);
        return;
      }

      const response = await fetch(buildURL(ENDPOINTS.INVESTMENTS), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const investments = await response.json();
        const existing = investments.find(
          (investment) =>
            investment.name === fund.schemeName &&
            investment.investmentType === "Mutual Fund"
        );

        if (existing) {
          setExistingInvestment(existing);

          // Pre-populate form with existing data
          if (existing.calculationType === "SIP" || existing.monthlyDeposit) {
            setCalculationType("SIP");
            setSipAmount(String(existing.monthlyDeposit || existing.amount));
          } else {
            setCalculationType("LUMPSUM");
            setLumpsumAmount(String(existing.amount));
          }

          if (existing.startDate) {
            setInvestmentDate(new Date(existing.startDate));
          }

          if (existing.interestRate) {
            setExpectedReturn(String(existing.interestRate));
          }

          // Auto-calculate and display results for existing investment
          setTimeout(() => {
            displayExistingInvestmentResult(existing);
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error loading existing investment:", error);
    } finally {
      setIsLoadingExisting(false);
    }
  };

  // --- NEW: Display result for existing investment ---
  const displayExistingInvestmentResult = (existing) => {
    const currentNAV = parseFloat(fund.nav);

    if (existing.calculationType === "SIP" || existing.monthlyDeposit) {
      // Display SIP result
      const monthlyAmount = existing.monthlyDeposit || existing.amount;
      const totalUnits = existing.totalUnits || existing.amount / existing.nav;
      const averageNAV = existing.averageNAV || existing.nav;
      const currentValue = totalUnits * currentNAV;
      const totalInvestment = existing.amount;
      const totalReturns = currentValue - totalInvestment;

      // Create simplified breakdown for existing investment
      const sipBreakdown = [];
      const months = 12;
      for (let i = 1; i <= months; i++) {
        const navVariation = (Math.random() - 0.5) * 0.2;
        const monthlyNAV = currentNAV * (1 + navVariation);
        const monthlyUnits = monthlyAmount / monthlyNAV;

        sipBreakdown.push({
          month: i,
          invested: monthlyAmount,
          nav: monthlyNAV,
          units: monthlyUnits,
          navStatus:
            monthlyNAV > currentNAV
              ? "high"
              : monthlyNAV < currentNAV
              ? "low"
              : "neutral",
        });
      }

      setCalculationResult({
        type: "SIP",
        monthlyAmount: monthlyAmount,
        totalInvestment: totalInvestment,
        totalUnits: totalUnits,
        averageNAV: averageNAV,
        currentNAV: currentNAV,
        currentValue: currentValue,
        totalReturns: totalReturns,
        sipBreakdown: sipBreakdown,
        startDate: existing.startDate
          ? new Date(existing.startDate)
          : new Date(),
        isExisting: true, // Flag to indicate this is an existing investment
      });
    } else {
      // Display Lumpsum result
      const totalUnits = existing.totalUnits || existing.amount / existing.nav;
      const currentValue = totalUnits * currentNAV;
      const totalReturns = currentValue - existing.amount;

      setCalculationResult({
        type: "LUMPSUM",
        principal: existing.amount,
        units: totalUnits,
        currentNAV: currentNAV,
        currentValue: currentValue,
        totalReturns: totalReturns,
        startDate: existing.startDate
          ? new Date(existing.startDate)
          : new Date(),
        isExisting: true, // Flag to indicate this is an existing investment
      });
    }
  };

  // --- Date Picker Logic ---
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || investmentDate;
    setShowDatePicker(Platform.OS === "ios"); // On iOS, the picker is a modal
    setInvestmentDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  // --- SIP Calculation with NAV-based Units ---
  const calculateSIP = () => {
    const monthlyAmount = parseFloat(sipAmount);
    const currentNAV = parseFloat(fund.nav);

    console.log("SIP Input values:", { monthlyAmount, currentNAV });

    if (isNaN(monthlyAmount) || monthlyAmount <= 0) {
      Alert.alert("Error", "Please enter valid SIP amount.");
      console.log("SIP validation failed");
      return;
    }

    // Calculate units based on current NAV
    const unitsPerSIP = monthlyAmount / currentNAV;

    // Simulate 12 months of SIP with varying NAV (demo)
    const months = 12;
    let totalInvestment = 0;
    let totalUnits = 0;
    const sipBreakdown = [];

    for (let i = 1; i <= months; i++) {
      // Simulate NAV variation (±10% from current NAV)
      const navVariation = (Math.random() - 0.5) * 0.2; // ±10%
      const monthlyNAV = currentNAV * (1 + navVariation);
      const monthlyUnits = monthlyAmount / monthlyNAV;

      totalInvestment += monthlyAmount;
      totalUnits += monthlyUnits;

      sipBreakdown.push({
        month: i,
        invested: monthlyAmount,
        nav: monthlyNAV,
        units: monthlyUnits,
        totalInvested: totalInvestment,
        totalUnits: totalUnits,
        navStatus:
          monthlyNAV > currentNAV
            ? "high"
            : monthlyNAV < currentNAV
            ? "low"
            : "neutral",
      });
    }

    const averageNAV = totalInvestment / totalUnits;
    const currentValue = totalUnits * currentNAV;
    const totalReturns = currentValue - totalInvestment;

    const result = {
      type: "SIP",
      monthlyAmount,
      totalInvestment,
      totalUnits: totalUnits,
      averageNAV: averageNAV,
      currentNAV: currentNAV,
      currentValue: currentValue,
      totalReturns: totalReturns,
      sipBreakdown: sipBreakdown, // Keep all 12 months
      startDate: investmentDate,
    };

    console.log("SIP Calculation Result:", result);
    setCalculationResult(result);
  };

  const calculateLumpsum = () => {
    const principal = parseFloat(lumpsumAmount);
    const currentNAV = parseFloat(fund.nav);

    console.log("Lumpsum Input values:", { principal, currentNAV });

    if (isNaN(principal) || principal <= 0) {
      Alert.alert("Error", "Please enter valid lumpsum amount.");
      console.log("Lumpsum validation failed");
      return;
    }

    const units = principal / currentNAV;
    const currentValue = units * currentNAV; // Same as principal initially

    const result = {
      type: "LUMPSUM",
      principal,
      units: units,
      currentNAV: currentNAV,
      currentValue: currentValue,
      totalReturns: 0, // No returns initially
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

  // --- UPDATED: Update existing investment or create new one ---
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

      const schemeName = fund.schemeName;
      const currentNAV = parseFloat(fund.nav);

      // First, check if this fund already exists in user's portfolio
      const existingResponse = await fetch(buildURL(ENDPOINTS.INVESTMENTS), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!existingResponse.ok) {
        throw new Error("Failed to fetch existing investments");
      }

      const existingInvestments = await existingResponse.json();
      const existingFund = existingInvestments.find(
        (investment) =>
          investment.name === schemeName &&
          investment.investmentType === "Mutual Fund"
      );

      let investmentData;
      const defaultYears = 5;

      if (calculationType === "SIP") {
        const monthlyAmount = parseFloat(sipAmount);
        if (!monthlyAmount) {
          Alert.alert("Error", "Please enter a valid SIP amount.");
          return;
        }

        if (existingFund) {
          // Update existing SIP - combine amounts and recalculate units
          const existingMonthlyAmount =
            existingFund.monthlyDeposit || existingFund.amount;
          const newTotalMonthlyAmount = existingMonthlyAmount + monthlyAmount;

          // Calculate 2-month average scenario
          const month1Units = newTotalMonthlyAmount / currentNAV;
          const month2NAV = currentNAV * 1.05; // Simulate 5% increase for demo
          const month2Units = newTotalMonthlyAmount / month2NAV;
          const totalUnits = month1Units + month2Units;
          const averageNAV = (newTotalMonthlyAmount * 2) / totalUnits;

          investmentData = {
            ...existingFund,
            amount: newTotalMonthlyAmount,
            monthlyDeposit: newTotalMonthlyAmount,
            description: `Updated SIP in ${schemeName} - Monthly: ₹${newTotalMonthlyAmount}`,
            lastUpdated: new Date().toISOString(),
            currentNAV: currentNAV,
            averageNAV: averageNAV,
            totalUnits: totalUnits,
            currentValue: totalUnits * currentNAV,
          };

          // Update existing investment
          const updateResponse = await fetch(
            buildURL(ENDPOINTS.CREATE_INVESTMENT),
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ...investmentData, id: existingFund._id }),
            }
          );

          if (updateResponse.ok) {
            EventRegister.emit("investmentAdded");
            Alert.alert(
              "Investment Updated! 🎉",
              `Your SIP in ${schemeName} has been updated.\nNew Monthly Amount: ₹${newTotalMonthlyAmount}\nAverage NAV (2M): ₹${averageNAV.toFixed(
                2
              )}\nTotal Units: ${totalUnits.toFixed(2)}\nCurrent Value: ₹${(
                totalUnits * currentNAV
              ).toFixed(0)}`,
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          } else {
            throw new Error("Failed to update investment");
          }
        } else {
          // Create new SIP investment with 2-month calculation
          const month1Units = monthlyAmount / currentNAV;
          const month2NAV = currentNAV * 1.05; // Simulate 5% increase
          const month2Units = monthlyAmount / month2NAV;
          const totalUnits = month1Units + month2Units;
          const averageNAV = (monthlyAmount * 2) / totalUnits;

          investmentData = {
            name: schemeName,
            amount: monthlyAmount,
            monthlyDeposit: monthlyAmount,
            duration: defaultYears,
            interestRate: parseFloat(expectedReturn),
            investmentType: "Mutual Fund",
            description: `SIP in ${schemeName}`,
            startDate: investmentDate.toISOString(),
            currentNAV: currentNAV,
            averageNAV: averageNAV,
            totalUnits: totalUnits,
            currentValue: totalUnits * currentNAV,
          };

          const response = await fetch(buildURL(ENDPOINTS.CREATE_INVESTMENT), {
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
              "SIP Started! 🎉",
              `Your SIP in ${schemeName} has been added.\nMonthly Amount: ₹${monthlyAmount}\nAverage NAV (2M): ₹${averageNAV.toFixed(
                2
              )}\nTotal Units: ${totalUnits.toFixed(2)}\nCurrent Value: ₹${(
                totalUnits * currentNAV
              ).toFixed(0)}`,
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          } else {
            throw new Error("Failed to create investment");
          }
        }
      } else {
        // LUMPSUM handling
        const lumpsumValue = parseFloat(lumpsumAmount);
        if (!lumpsumValue) {
          Alert.alert("Error", "Please enter a valid lumpsum amount.");
          return;
        }

        if (existingFund) {
          // Update existing lumpsum
          const existingAmount = existingFund.amount;
          const newTotalAmount = existingAmount + lumpsumValue;
          const newUnits = newTotalAmount / currentNAV;

          investmentData = {
            ...existingFund,
            amount: newTotalAmount,
            description: `Updated Lumpsum in ${schemeName} - Total: ₹${newTotalAmount}`,
            lastUpdated: new Date().toISOString(),
            currentNAV: currentNAV,
            totalUnits: newUnits,
            currentValue: newUnits * currentNAV,
          };

          const updateResponse = await fetch(
            buildURL(ENDPOINTS.CREATE_INVESTMENT),
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ...investmentData, id: existingFund._id }),
            }
          );

          if (updateResponse.ok) {
            EventRegister.emit("investmentAdded");
            Alert.alert(
              "Investment Updated! 🎉",
              `Your lumpsum in ${schemeName} has been updated.\nTotal Amount: ₹${newTotalAmount}\nTotal Units: ${newUnits.toFixed(
                2
              )}\nCurrent Value: ₹${(newUnits * currentNAV).toFixed(0)}`,
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          } else {
            throw new Error("Failed to update investment");
          }
        } else {
          // Create new lumpsum investment
          const units = lumpsumValue / currentNAV;

          investmentData = {
            name: schemeName,
            amount: lumpsumValue,
            duration: defaultYears,
            interestRate: parseFloat(expectedReturn),
            investmentType: "Mutual Fund",
            description: `Lumpsum in ${schemeName}`,
            startDate: investmentDate.toISOString(),
            currentNAV: currentNAV,
            totalUnits: units,
            currentValue: units * currentNAV,
          };

          const response = await fetch(buildURL(ENDPOINTS.CREATE_INVESTMENT), {
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
              "Lumpsum Investment Added! 🎉",
              `Your lumpsum in ${schemeName} has been added.\nAmount: ₹${lumpsumValue}\nUnits: ${units.toFixed(
                2
              )}\nCurrent Value: ₹${(units * currentNAV).toFixed(0)}`,
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          } else {
            throw new Error("Failed to create investment");
          }
        }
      }
    } catch (error) {
      Alert.alert("Error", `Failed to process investment: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Loading indicator while checking for existing investment */}
        {isLoadingExisting && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              Loading existing investment...
            </Text>
          </View>
        )}
        {/* Fund Info (no change) */}
        <View style={styles.fundInfo}>
          <Text style={styles.fundName}>{fund.schemeName}</Text>

          {/* Show existing investment indicator */}
          {existingInvestment && (
            <View style={styles.existingInvestmentBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.existingInvestmentText}>
                You have an existing investment in this fund
              </Text>
            </View>
          )}

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
            <>
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

              {/* Auto-calculated Quantity field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Units per SIP (Auto-calculated)
                </Text>
                <TextInput
                  style={[styles.input, styles.readOnlyInput]}
                  value={
                    sipAmount && fund.nav
                      ? (parseFloat(sipAmount) / parseFloat(fund.nav)).toFixed(
                          2
                        )
                      : ""
                  }
                  placeholder="Units will be calculated automatically"
                  editable={false}
                  selectTextOnFocus={false}
                />
              </View>
            </>
          ) : (
            <>
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

              {/* Auto-calculated Quantity field for Lumpsum */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Total Units (Auto-calculated)
                </Text>
                <TextInput
                  style={[styles.input, styles.readOnlyInput]}
                  value={
                    lumpsumAmount && fund.nav
                      ? (
                          parseFloat(lumpsumAmount) / parseFloat(fund.nav)
                        ).toFixed(2)
                      : ""
                  }
                  placeholder="Units will be calculated automatically"
                  editable={false}
                  selectTextOnFocus={false}
                />
              </View>
            </>
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
            <View style={styles.resultTitleContainer}>
              <Text style={styles.resultTitle}>Projected Growth</Text>
              {calculationResult.isExisting && (
                <View style={styles.existingResultBadge}>
                  <Ionicons name="refresh-circle" size={16} color="#3B82F6" />
                  <Text style={styles.existingResultText}>Live Update</Text>
                </View>
              )}
            </View>
            <View style={styles.resultGrid}>
              {/* Investment Start Date */}
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Investment Start Date</Text>
                <Text style={styles.resultValue}>
                  {calculationResult.startDate.toLocaleDateString("en-IN")}
                </Text>
              </View>

              {calculationResult.type === "SIP" ? (
                <>
                  {/* Monthly SIP Amount */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Monthly SIP Amount</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.monthlyAmount)}
                    </Text>
                  </View>

                  {/* Number of Months */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Number of Months</Text>
                    <Text style={styles.resultValue}>12 months</Text>
                  </View>

                  {/* Total Investment */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Total Investment</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.totalInvestment)}
                    </Text>
                  </View>

                  {/* Total Units Purchased */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>
                      Total Units Purchased
                    </Text>
                    <Text style={styles.resultValue}>
                      {calculationResult.totalUnits.toFixed(2)}
                    </Text>
                  </View>

                  {/* Average NAV */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Average NAV</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.averageNAV)}
                    </Text>
                  </View>

                  {/* Current NAV */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Current NAV</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.currentNAV)}
                    </Text>
                  </View>

                  {/* Current Value */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Current Value</Text>
                    <Text style={[styles.resultValue, styles.highlightValue]}>
                      {formatCurrency(calculationResult.currentValue)}
                    </Text>
                  </View>

                  {/* Total Profit */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>
                      Total{" "}
                      {calculationResult.totalReturns >= 0 ? "Profit" : "Loss"}
                    </Text>
                    <Text
                      style={[
                        styles.resultValue,
                        calculationResult.totalReturns >= 0
                          ? styles.successValue
                          : styles.errorValue,
                      ]}
                    >
                      {formatCurrency(Math.abs(calculationResult.totalReturns))}{" "}
                      (
                      {calculationResult.totalInvestment > 0
                        ? (
                            (calculationResult.totalReturns /
                              calculationResult.totalInvestment) *
                            100
                          ).toFixed(0)
                        : 0}
                      %)
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Lumpsum Amount */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Lumpsum Amount</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.principal)}
                    </Text>
                  </View>

                  {/* Current NAV */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Current NAV</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.currentNAV)}
                    </Text>
                  </View>

                  {/* Units Purchased */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Units Purchased</Text>
                    <Text style={styles.resultValue}>
                      {calculationResult.units.toFixed(2)}
                    </Text>
                  </View>

                  {/* Current Value */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Current Value</Text>
                    <Text style={[styles.resultValue, styles.highlightValue]}>
                      {formatCurrency(calculationResult.currentValue)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Add to Portfolio Button */}
            <TouchableOpacity
              style={styles.investButton}
              onPress={addInvestmentToPortfolio}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.investButtonText}>
                {existingInvestment ? "Update Portfolio" : "Add to Portfolio"}
              </Text>
            </TouchableOpacity>

            {/* SIP Breakdown Section - Only for SIP */}
            {calculationResult.type === "SIP" && (
              <View style={styles.breakdownSection}>
                <TouchableOpacity
                  style={styles.toggleBreakdownButton}
                  onPress={() => setShowBreakdown(!showBreakdown)}
                >
                  <Ionicons
                    name={showBreakdown ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#3B82F6"
                  />
                  <Text style={styles.toggleBreakdownText}>
                    {showBreakdown ? "Hide" : "Show"} Monthly Breakdown
                  </Text>
                </TouchableOpacity>

                {/* Breakdown Content */}
                {showBreakdown && (
                  <View style={styles.breakdownContent}>
                    <View style={styles.breakdownTitleSection}>
                      <Ionicons name="bulb" size={20} color="#F59E0B" />
                      <Text style={styles.breakdownTitle}>
                        SIP Calculation Breakdown
                      </Text>
                    </View>

                    <Text style={styles.exampleFundName}>
                      Example: {fund.schemeName}
                    </Text>

                    <View style={styles.investmentDetailsHeader}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#059669"
                      />
                      <Text style={styles.investmentDetailsTitle}>
                        Investment Details:
                      </Text>
                    </View>

                    {/* Monthly Breakdown Table */}
                    <View style={styles.monthlyTable}>
                      <View style={styles.tableHeader}>
                        <Text style={styles.tableHeaderCell}>Month</Text>
                        <Text style={styles.tableHeaderCell}>NAV</Text>
                        <Text style={styles.tableHeaderCell}>Investment</Text>
                        <Text style={styles.tableHeaderCell}>Units</Text>
                      </View>

                      {calculationResult.sipBreakdown
                        ?.slice(0, 2)
                        .map((month, index) => (
                          <View key={index} style={styles.tableDataRow}>
                            <Text style={styles.tableCell}>
                              {new Date(2025, 7 + index).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </Text>
                            <Text style={styles.tableCell}>
                              ₹{month.nav.toFixed(2)}
                            </Text>
                            <Text style={styles.tableCell}>
                              {formatCurrency(month.invested)}
                            </Text>
                            <Text style={styles.tableCell}>
                              {month.units.toFixed(2)}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </View>
                )}
              </View>
            )}
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
  loadingContainer: {
    backgroundColor: "#E0F2FE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#0369A1",
    fontWeight: "500",
  },
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
  existingInvestmentBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: "#059669",
  },
  existingInvestmentText: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "600",
    marginLeft: 6,
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
  readOnlyInput: {
    backgroundColor: "#F9FAFB",
    color: "#6B7280",
    fontStyle: "italic",
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
  resultTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "left",
  },
  existingResultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  existingResultText: {
    fontSize: 11,
    color: "#3B82F6",
    fontWeight: "600",
    marginLeft: 4,
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
  errorValue: { color: "#DC2626", fontWeight: "bold" },

  // Rupee Cost Averaging Styles
  rupeeAveragingContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  conceptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  conceptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 8,
  },
  conceptDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 12,
  },
  averagingBenefits: {
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 13,
    color: "#374151",
    marginLeft: 8,
    fontWeight: "500",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginBottom: 12,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
    marginLeft: 6,
  },
  detailedBreakdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
  },
  breakdownHeader: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  breakdownScroll: {
    marginBottom: 12,
  },
  breakdownTable: {
    minWidth: 300,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 8,
  },
  tableCell: {
    width: 75,
    fontSize: 12,
    color: "#374151",
    textAlign: "center",
  },
  tableHeader: {
    fontWeight: "600",
    color: "#1E293B",
    backgroundColor: "#F8FAFC",
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusCell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 3,
  },
  breakdownSummary: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  summaryText: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
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

  // New Breakdown Section Styles
  breakdownSection: {
    marginTop: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    overflow: "hidden",
  },
  toggleBreakdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  toggleBreakdownText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B82F6",
    marginLeft: 8,
  },
  breakdownContent: {
    padding: 20,
  },
  breakdownTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginLeft: 8,
  },
  exampleFundName: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  investmentDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  investmentDetailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
    marginLeft: 6,
  },
  monthlyTable: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  tableDataRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: "#1E293B",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default MFCalculator;
