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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventRegister } from "react-native-event-listeners";
import { buildURL, ENDPOINTS } from "./config/api";

const MFCalculator = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { fund } = route.params;

  const [sipAmount, setSipAmount] = useState("");
  const [lumpsumAmount, setLumpsumAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("12");
  const [calculationResult, setCalculationResult] = useState(null);
  const [calculationType, setCalculationType] = useState("SIP"); // SIP or LUMPSUM

  useEffect(() => {
    navigation.setOptions({
      title: "MF Calculator",
    });
  }, [navigation]);

  const calculateSIP = () => {
    const monthlyAmount = parseFloat(sipAmount);
    const years = parseFloat(duration);
    const annualRate = parseFloat(expectedReturn) / 100;
    const monthlyRate = annualRate / 12;
    const totalMonths = years * 12;

    if (!monthlyAmount || !years || monthlyAmount <= 0 || years <= 0) {
      Alert.alert("Error", "Please enter valid values");
      return;
    }

    // SIP Future Value Formula: M = P × [{(1 + i)^n - 1} / i] × (1 + i)
    const futureValue =
      monthlyAmount *
      (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) *
        (1 + monthlyRate));

    const totalInvestment = monthlyAmount * totalMonths;
    const totalReturns = futureValue - totalInvestment;

    setCalculationResult({
      type: "SIP",
      monthlyAmount,
      totalInvestment,
      futureValue,
      totalReturns,
      duration: years,
      expectedReturn: parseFloat(expectedReturn),
    });
  };

  const calculateLumpsum = () => {
    const principal = parseFloat(lumpsumAmount);
    const years = parseFloat(duration);
    const annualRate = parseFloat(expectedReturn) / 100;

    if (!principal || !years || principal <= 0 || years <= 0) {
      Alert.alert("Error", "Please enter valid values");
      return;
    }

    // Compound Interest Formula: A = P(1 + r)^t
    const futureValue = principal * Math.pow(1 + annualRate, years);
    const totalReturns = futureValue - principal;

    setCalculationResult({
      type: "LUMPSUM",
      principal,
      futureValue,
      totalReturns,
      duration: years,
      expectedReturn: parseFloat(expectedReturn),
    });
  };

  const handleCalculate = () => {
    if (calculationType === "SIP") {
      calculateSIP();
    } else {
      calculateLumpsum();
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const resetCalculation = () => {
    setSipAmount("");
    setLumpsumAmount("");
    setDuration("");
    setExpectedReturn("12");
    setCalculationResult(null);
  };

  const createInvestment = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "Please login again");
        return;
      }

      const parsedInfo = JSON.parse(userInfoString);
      const token = parsedInfo.token;

      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please log in again."
        );
        return;
      }

      let investmentData;

      if (calculationType === "SIP") {
        if (
          !sipAmount ||
          !duration ||
          parseFloat(sipAmount) <= 0 ||
          parseFloat(duration) <= 0
        ) {
          Alert.alert("Error", "Please enter valid SIP amount and duration");
          return;
        }

        investmentData = {
          name: fund.schemeName,
          amount: parseFloat(sipAmount),
          monthlyDeposit: parseFloat(sipAmount),
          duration: parseFloat(duration),
          interestRate: parseFloat(expectedReturn),
          investmentType: "Mutual Fund",
          description: `SIP investment in ${fund.schemeName} (Scheme Code: ${fund.schemeCode})`,
          maturityDate: new Date(
            Date.now() + parseFloat(duration) * 365 * 24 * 60 * 60 * 1000
          ),
        };
      } else {
        if (
          !lumpsumAmount ||
          !duration ||
          parseFloat(lumpsumAmount) <= 0 ||
          parseFloat(duration) <= 0
        ) {
          Alert.alert(
            "Error",
            "Please enter valid lumpsum amount and duration"
          );
          return;
        }

        investmentData = {
          name: fund.schemeName,
          amount: parseFloat(lumpsumAmount),
          interestRate: parseFloat(expectedReturn),
          investmentType: "Mutual Fund",
          description: `Lumpsum investment in ${fund.schemeName} (Scheme Code: ${fund.schemeCode})`,
          maturityDate: new Date(
            Date.now() + parseFloat(duration) * 365 * 24 * 60 * 60 * 1000
          ),
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
        const newInvestment = await response.json();

        // Emit event to refresh investments in other screens
        EventRegister.emit("investmentAdded", {
          type: "Investment",
          subType: "Mutual Fund",
          name: fund.schemeName,
          amount:
            calculationType === "SIP"
              ? parseFloat(sipAmount)
              : parseFloat(lumpsumAmount),
        });

        Alert.alert(
          "Success",
          `Your ${calculationType} investment in ${fund.schemeName} has been created successfully!`,
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create investment");
      }
    } catch (error) {
      console.error("Error creating investment:", error);
      Alert.alert("Error", "Failed to create investment. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Fund Info */}
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
          <Text style={styles.lastUpdated}>
            Last Updated: {new Date(fund.lastUpdated).toLocaleDateString()}
          </Text>
        </View>

        {/* Calculation Type Selector */}
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
              SIP Calculator
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
              Lumpsum Calculator
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Form */}
        <View style={styles.inputContainer}>
          {calculationType === "SIP" ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Monthly SIP Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={sipAmount}
                onChangeText={setSipAmount}
                placeholder="Enter monthly amount"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Lumpsum Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={lumpsumAmount}
                onChangeText={setLumpsumAmount}
                placeholder="Enter lumpsum amount"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Investment Duration (Years)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="Enter duration in years"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Expected Annual Return (%)</Text>
            <TextInput
              style={styles.input}
              value={expectedReturn}
              onChangeText={setExpectedReturn}
              placeholder="Enter expected return"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={handleCalculate}
            >
              <Ionicons name="calculator" size={20} color="#FFFFFF" />
              <Text style={styles.calculateButtonText}>Calculate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetCalculation}
            >
              <Ionicons name="refresh" size={20} color="#3B82F6" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        {calculationResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Calculation Results</Text>

            {calculationResult.type === "SIP" ? (
              <View style={styles.resultGrid}>
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
              </View>
            ) : (
              <View style={styles.resultGrid}>
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
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Duration</Text>
                  <Text style={styles.resultValue}>
                    {calculationResult.duration} years
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.returnInfo}>
              <Text style={styles.returnText}>
                Expected Annual Return: {calculationResult.expectedReturn}%
              </Text>
            </View>

            <TouchableOpacity
              style={styles.investButton}
              onPress={createInvestment}
            >
              <Ionicons name="trending-up" size={20} color="#FFFFFF" />
              <Text style={styles.investButtonText}>
                Invest Now ({calculationResult.type})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  scrollContainer: {
    padding: 20,
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
  fundDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navContainer: {
    flex: 1,
  },
  navLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 5,
  },
  navValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#059669",
  },
  codeContainer: {
    alignItems: "flex-end",
  },
  codeLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 5,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  lastUpdated: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 10,
  },
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
  activeTypeButton: {
    backgroundColor: "#3B82F6",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTypeButtonText: {
    color: "#FFFFFF",
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputGroup: {
    marginBottom: 20,
  },
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
    backgroundColor: "#FFFFFF",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  calculateButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  calculateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  resetButtonText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
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
  resultGrid: {
    gap: 16,
  },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  resultLabel: {
    fontSize: 14,
    color: "#64748B",
    flex: 1,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "right",
  },
  highlightValue: {
    color: "#3B82F6",
    fontSize: 18,
    fontWeight: "bold",
  },
  successValue: {
    color: "#059669",
    fontWeight: "bold",
  },
  returnInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  returnText: {
    fontSize: 14,
    color: "#0369A1",
    textAlign: "center",
    fontWeight: "500",
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
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  investButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default MFCalculator;
