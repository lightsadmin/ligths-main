import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const screenWidth = Dimensions.get("window").width;

// Replace with your backend URL
const API_BASE_URL = "https://ligths-backend.onrender.com"; // Update this to your actual backend URL

// Default inflation is now 7.5
const GOAL_TEMPLATES = {
  "B Education": {
    name: "B Education",
    presentCost: "",
    childCurrentAge: "",
    goalAge: "",
    inflation: "7.5",
    returnRate: "",
    currentSip: "",
    investmentType: "SIP/MF",
  },
  "B Marriage": {
    name: "B Marriage",
    presentCost: "",
    childCurrentAge: "",
    goalAge: "",
    inflation: "7.5",
    returnRate: "",
    currentSip: "",
    investmentType: "SIP/MF",
  },
  "Dream Home": {
    name: "Dream Home",
    presentCost: "",
    years: "",
    inflation: "7.5",
    returnRate: "",
    currentSip: "",
    investmentType: "SIP/MF",
  },
  "Wealth Creation": {
    name: "Wealth Creation",
    presentCost: "",
    currentAge: "",
    goalAge: "",
    inflation: "7.5",
    returnRate: "",
    currentSip: "",
    investmentType: "SIP/MF",
  },
  Custom: {
    name: "Custom Goal",
    customName: "",
    presentCost: "",
    years: "",
    inflation: "7.5",
    returnRate: "",
    currentSip: "",
    investmentType: "SIP/MF",
  },
};

const INVESTMENT_TYPES = [
  { label: "SIP/MF", value: "SIP/MF" },
  { label: "FD", value: "FD" },
  { label: "Stocks", value: "Stocks" },
  { label: "Savings", value: "Savings" },
];

export default function GoalCalculator() {
  const navigation = useNavigation();

  const [selectedGoal, setSelectedGoal] = useState("B Education");
  const [goalData, setGoalData] = useState({
    ...GOAL_TEMPLATES["B Education"],
  });
  const [goalResults, setGoalResults] = useState([]);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [activeTabs, setActiveTabs] = useState({});
  const [errorFields, setErrorFields] = useState([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);

  // State to hold investments fetched from the investment module
  const [investmentsByGoal, setInvestmentsByGoal] = useState({});

  useEffect(() => {
    const initializeComponent = async () => {
      await getUserName();
    };
    initializeComponent();
  }, []);

  useEffect(() => {
    if (userName) {
      fetchGoals();
      fetchInvestmentsByGoal();
    }
  }, [userName]);

  const getUserName = async () => {
    try {
      // Check multiple possible storage keys for username
      let storedUserName = await AsyncStorage.getItem("userName");

      // If not found, try checking for userInfo object which might contain the username
      if (!storedUserName) {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString);
          storedUserName = userInfo.username || userInfo.userName;
        }
      }

      if (storedUserName) {
        console.log("Found username:", storedUserName);
        setUserName(storedUserName);
      } else {
        console.log("Username not found in AsyncStorage");

        // Use a default username for testing or show an error message
        // For development only - remove in production
        const defaultUsername = "testuser";
        console.log("Using default username for testing:", defaultUsername);
        setUserName(defaultUsername);

        // Comment this in production and uncomment the Alert
        // Alert.alert("Error", "User not found. Please login again.");
      }
    } catch (error) {
      console.error("Error getting username:", error);
      Alert.alert("Error", "Failed to get user information.");
    }
  };

  const fetchGoals = async () => {
    if (!userName) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/goals/${userName}`);

      if (response.ok) {
        const goals = await response.json();
        setGoalResults(goals);

        // Initialize tabs for each goal
        const initialTabs = {};
        goals.forEach((goal) => {
          initialTabs[goal._id] = "SIP Calculation";
        });
        setActiveTabs(initialTabs);
      } else {
        console.error("Error fetching goals:", response.status);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
      Alert.alert("Error", "Failed to fetch goals from server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestmentsByGoal = async () => {
    if (!userName) return;

    try {
      // This is a placeholder for when your investment module is ready
      const mockInvestments = {};
      setInvestmentsByGoal(mockInvestments);
    } catch (error) {
      console.error("Error fetching investments:", error);
    }
  };

  const updateGoal = (key, value) => {
    let updatedData = { ...goalData, [key]: value };

    if (key === "investmentType" && (value === "Savings" || value === "FD")) {
      updatedData.returnRate = "0";
    }

    setGoalData(updatedData);
    if (errorFields.includes(key)) {
      setErrorFields(errorFields.filter((field) => field !== key));
    }
  };

  const editGoal = (goal) => {
    setGoalData({
      name: goal.name,
      customName: goal.customName || "",
      presentCost: goal.presentCost?.toString() || "",
      childCurrentAge: goal.childCurrentAge?.toString() || "",
      goalAge: goal.goalAge?.toString() || "",
      years: goal.years?.toString() || "",
      currentAge: goal.currentAge?.toString() || "",
      inflation: goal.inflation?.toString() || "7.5",
      returnRate: goal.returnRate?.toString() || "",
      currentSip: goal.currentSip?.toString() || "",
      investmentType: goal.investmentType || "SIP/MF",
    });

    setSelectedGoal(goal.name === "Custom Goal" ? "Custom" : goal.name);
    setEditingGoalId(goal._id);
  };

  const cancelEdit = () => {
    setEditingGoalId(null);
    setGoalData({ ...GOAL_TEMPLATES[selectedGoal] });
    setErrorFields([]);
  };

  const deleteGoal = async (goalId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this goal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/goals/${userName}/${goalId}`,
                {
                  method: "DELETE",
                }
              );

              if (response.ok) {
                // Remove from local state
                setGoalResults((prevGoals) =>
                  prevGoals.filter((goal) => goal._id !== goalId)
                );
                setActiveTabs((prev) => {
                  const newTabs = { ...prev };
                  delete newTabs[goalId];
                  return newTabs;
                });

                if (editingGoalId === goalId) {
                  cancelEdit();
                }
              } else {
                Alert.alert("Error", "Failed to delete goal.");
              }
            } catch (error) {
              console.error("Error deleting goal:", error);
              Alert.alert("Error", "Failed to delete goal.");
            }
          },
        },
      ]
    );
  };

  const calculateGoal = async () => {
    const g = goalData;
    const cost = parseFloat(g.presentCost);
    let y;

    if (g.name === "B Education" || g.name === "B Marriage") {
      y = parseFloat(g.goalAge) - parseFloat(g.childCurrentAge);
    } else if (g.name === "Wealth Creation") {
      y = parseFloat(g.goalAge) - parseFloat(g.currentAge);
    } else {
      y = parseFloat(g.years);
    }

    const inf = parseFloat(g.inflation);
    const ret = parseFloat(g.returnRate);
    const inHandValue = parseFloat(g.currentSip) || 0;

    // --- Enhanced Validation ---
    const requiredFields = [];

    // Always required fields
    requiredFields.push({
      key: "presentCost",
      value: cost,
      fieldValue: g.presentCost,
    });
    requiredFields.push({
      key: "inflation",
      value: inf,
      fieldValue: g.inflation,
    });

    // Goal-specific required fields
    if (g.name === "B Education" || g.name === "B Marriage") {
      requiredFields.push({
        key: "goalAge",
        value: parseFloat(g.goalAge),
        fieldValue: g.goalAge,
      });
      requiredFields.push({
        key: "childCurrentAge",
        value: parseFloat(g.childCurrentAge),
        fieldValue: g.childCurrentAge,
      });
    } else if (g.name === "Wealth Creation") {
      requiredFields.push({
        key: "goalAge",
        value: parseFloat(g.goalAge),
        fieldValue: g.goalAge,
      });
      requiredFields.push({
        key: "currentAge",
        value: parseFloat(g.currentAge),
        fieldValue: g.currentAge,
      });
    } else if (g.name === "Dream Home") {
      requiredFields.push({
        key: "years",
        value: parseFloat(g.years),
        fieldValue: g.years,
      });
    } else if (g.name === "Custom Goal") {
      requiredFields.push({
        key: "years",
        value: parseFloat(g.years),
        fieldValue: g.years,
      });
      requiredFields.push({
        key: "customName",
        value: g.customName,
        fieldValue: g.customName,
      });
    }

    // Return rate validation (only if not Savings or FD)
    if (g.investmentType !== "Savings" && g.investmentType !== "FD") {
      requiredFields.push({
        key: "returnRate",
        value: ret,
        fieldValue: g.returnRate,
      });
    }

    // Check for invalid fields
    const invalidFields = requiredFields.filter((field) => {
      if (field.key === "customName") {
        // For custom name, just check if it exists and is not empty
        return !field.fieldValue || field.fieldValue.trim() === "";
      } else {
        // For numeric fields, check if the value is valid and the field is not empty
        return (
          isNaN(field.value) ||
          field.value <= 0 ||
          !field.fieldValue ||
          field.fieldValue.trim() === ""
        );
      }
    });

    console.log("Validation Debug:");
    console.log("Goal Data:", g);
    console.log("Required Fields:", requiredFields);
    console.log("Invalid Fields:", invalidFields);

    if (invalidFields.length > 0) {
      const invalidFieldNames = invalidFields.map((field) => field.key);
      setErrorFields(invalidFieldNames);

      console.log("Setting error fields:", invalidFieldNames);

      Alert.alert(
        "Validation Error",
        `Please fill the following required fields with valid values:\n${invalidFieldNames
          .map((field) => {
            switch (field) {
              case "presentCost":
                return "• Present Cost";
              case "goalAge":
                return "• Goal Age";
              case "childCurrentAge":
                return "• Current Age of Child";
              case "currentAge":
                return "• Current Age";
              case "years":
                return "• Years to Goal";
              case "returnRate":
                return "• Expected Return Rate";
              case "customName":
                return "• Custom Goal Name";
              default:
                return `• ${field}`;
            }
          })
          .join("\n")}`
      );
      return;
    }

    // Additional logical validation
    if (g.name === "B Education" || g.name === "B Marriage") {
      if (parseFloat(g.goalAge) <= parseFloat(g.childCurrentAge)) {
        setErrorFields(["goalAge", "childCurrentAge"]);
        Alert.alert(
          "Validation Error",
          "Goal age must be greater than current age of child."
        );
        return;
      }
    } else if (g.name === "Wealth Creation") {
      if (parseFloat(g.goalAge) <= parseFloat(g.currentAge)) {
        setErrorFields(["goalAge", "currentAge"]);
        Alert.alert(
          "Validation Error",
          "Goal age must be greater than current age."
        );
        return;
      }
    }

    // Clear error fields if validation passes
    setErrorFields([]);

    // --- Calculations ---
    const futureCost = cost * Math.pow(1 + inf / 100, y);

    // Get dynamic investment data for the current goal
    const dynamicInvestments = editingGoalId
      ? investmentsByGoal[editingGoalId] || {
          totalInvested: 0,
          monthlySip: 0,
        }
      : { totalInvested: 0, monthlySip: 0 };

    // Calculate future value of the in-hand value (as a lumpsum)
    const futureValueOfInHand = inHandValue * Math.pow(1 + ret / 100, y);

    // Future value of ongoing SIPs from the investment module
    const futureValueOfDynamicSIPs = 0; // Replace with actual FV of SIP calculation

    const totalFutureValueOfSavings =
      futureValueOfInHand + futureValueOfDynamicSIPs;

    const requiredAmount =
      futureCost - totalFutureValueOfSavings > 0
        ? futureCost - totalFutureValueOfSavings
        : 0;

    const months = y * 12;
    const monthlyRate = ret / 1200;

    let monthlySIP = 0;
    if (requiredAmount > 0 && monthlyRate > 0) {
      monthlySIP =
        (requiredAmount * monthlyRate) /
        (Math.pow(1 + monthlyRate, months) - 1);
    } else if (requiredAmount > 0) {
      monthlySIP = requiredAmount / months;
    }

    // This is the net new SIP required, on top of any existing SIPs
    const netNewMonthlySip = monthlySIP - (dynamicInvestments.monthlySip || 0);

    const result = {
      name: g.name,
      customName: g.customName,
      presentCost: cost,
      childCurrentAge: parseFloat(g.childCurrentAge) || null,
      goalAge: parseFloat(g.goalAge) || null,
      years: y,
      currentAge: parseFloat(g.currentAge) || null,
      inflation: inf,
      returnRate: ret,
      currentSip: inHandValue,
      investmentType: g.investmentType,
      futureCost,
      required: requiredAmount,
      futureValueOfSavings: totalFutureValueOfSavings,
      monthlySIP: netNewMonthlySip > 0 ? netNewMonthlySip : 0,
    };

    console.log("Saving goal for user:", userName);
    console.log("Goal data being sent:", result);
    console.log("API endpoint:", `${API_BASE_URL}/goals/${userName}`);

    try {
      setLoading(true);
      let response;

      if (editingGoalId) {
        // Update existing goal
        console.log("Updating goal with ID:", editingGoalId);
        response = await fetch(
          `${API_BASE_URL}/goals/${userName}/${editingGoalId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(result),
          }
        );
      } else {
        // Create new goal
        console.log("Creating new goal");
        response = await fetch(`${API_BASE_URL}/goals/${userName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(result),
        });
      }

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (response.ok) {
        const savedGoal = await response.json();
        console.log("Goal saved successfully:", savedGoal);

        if (editingGoalId) {
          // Update existing goal in state
          setGoalResults((prevGoals) =>
            prevGoals.map((goal) =>
              goal._id === editingGoalId ? savedGoal : goal
            )
          );
        } else {
          // Add new goal to state
          setGoalResults((prevGoals) => [...prevGoals, savedGoal]);
          setActiveTabs((prev) => ({
            ...prev,
            [savedGoal._id]: "SIP Calculation",
          }));
        }

        // Reset form
        setGoalData({ ...GOAL_TEMPLATES[selectedGoal] });
        setEditingGoalId(null);
        setErrorFields([]);

        Alert.alert(
          "Success",
          editingGoalId
            ? "Goal updated successfully!"
            : "Goal created successfully!"
        );
      } else {
        const errorText = await response.text();
        console.error("Server response error:", errorText);
        Alert.alert(
          "Error",
          `Failed to save goal. Server responded with: ${response.status} - ${errorText}`
        );
      }
    } catch (error) {
      console.error("Network error saving goal:", error);
      Alert.alert(
        "Error",
        `Network error: ${error.message}. Please check your internet connection and try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const getUniqueGoalTypes = () => {
    const types = [...new Set(goalResults.map((goal) => goal.name))];
    return ["All", ...types];
  };

  const getFilteredGoals = () => {
    if (selectedFilter === "All") {
      return goalResults;
    }
    return goalResults.filter((goal) => goal.name === selectedFilter);
  };

  const getPieChartData = (goal) => {
    const data = [
      {
        name: "Amount Needed",
        population: goal.required || 0,
        color: "#ff6b6b",
      },
      {
        name: "In Hand (Future Value)",
        population: goal.futureValueOfSavings || 0,
        color: "#4ecdc4",
      },
    ];

    return data
      .sort((a, b) => b.population - a.population)
      .reverse()
      .filter((item) => item.population > 0);
  };

  const filteredGoals = getFilteredGoals();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal Calculator</Text>
        <View style={styles.backButton} /> {/* Empty view for balance */}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Goal Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="radio-button-on" size={24} color="#6366f1" />
            <Text style={styles.cardTitle}>
              {editingGoalId ? "Edit Your Goal" : "Select Your Goal"}
            </Text>
          </View>
          {editingGoalId && (
            <View style={styles.editingBanner}>
              <Ionicons name="create" size={16} color="#f59e0b" />
              <Text style={styles.editingText}>You are editing a goal</Text>
              <TouchableOpacity
                onPress={cancelEdit}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedGoal}
              onValueChange={(val) => {
                if (!editingGoalId) {
                  setSelectedGoal(val);
                  setGoalData({ ...GOAL_TEMPLATES[val] });
                  setEditingGoalId(null);
                  setErrorFields([]);
                }
              }}
              style={styles.picker}
              enabled={!editingGoalId}
            >
              {Object.keys(GOAL_TEMPLATES).map((g) => (
                <Picker.Item key={g} label={g} value={g} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Input Fields Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calculator" size={24} color="#06b6d4" />
            <Text style={styles.cardTitle}>Enter Details</Text>
          </View>

          {/* Custom Goal Name */}
          {selectedGoal === "Custom" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="create" size={16} color="#666" />
                <Text> Custom Goal Name</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Vacation Fund"
                placeholderTextColor="#9ca3af"
                value={goalData.customName}
                onChangeText={(val) => updateGoal("customName", val)}
              />
            </View>
          )}

          {/* Present Cost */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="cash" size={16} color="#666" />
              <Text> Present Cost (₹)</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                errorFields.includes("presentCost") && styles.errorInput,
              ]}
              placeholder="e.g., 1000000"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={goalData.presentCost}
              onChangeText={(val) => updateGoal("presentCost", val)}
            />
          </View>

          {/* Years to Goal */}
          {(selectedGoal === "Dream Home" || selectedGoal === "Custom") && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text> Years to Goal</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  errorFields.includes("years") && styles.errorInput,
                ]}
                placeholder="e.g., 25"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={goalData.years}
                onChangeText={(val) => updateGoal("years", val)}
              />
            </View>
          )}

          {/* Age Inputs for Education/Marriage */}
          {(selectedGoal === "B Education" ||
            selectedGoal === "B Marriage") && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <Ionicons name="person" size={16} color="#666" />
                  <Text> Current Age of Child</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errorFields.includes("childCurrentAge") &&
                      styles.errorInput,
                  ]}
                  placeholder="e.g., 5"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={goalData.childCurrentAge}
                  onChangeText={(val) => updateGoal("childCurrentAge", val)}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <Ionicons name="person" size={16} color="#666" />
                  <Text> Goal Age</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errorFields.includes("goalAge") && styles.errorInput,
                  ]}
                  placeholder="e.g., 25"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={goalData.goalAge}
                  onChangeText={(val) => updateGoal("goalAge", val)}
                />
              </View>
            </>
          )}

          {/* Age Inputs for Wealth Creation */}
          {selectedGoal === "Wealth Creation" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <Ionicons name="person" size={16} color="#666" />
                  <Text> Current Age</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errorFields.includes("currentAge") && styles.errorInput,
                  ]}
                  placeholder="e.g., 30"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={goalData.currentAge}
                  onChangeText={(val) => updateGoal("currentAge", val)}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <Ionicons name="person" size={16} color="#666" />
                  <Text> Goal Age</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errorFields.includes("goalAge") && styles.errorInput,
                  ]}
                  placeholder="e.g., 60"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={goalData.goalAge}
                  onChangeText={(val) => updateGoal("goalAge", val)}
                />
              </View>
            </>
          )}

          {/* Inflation Rate (Non-Editable) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="trending-up" size={16} color="#666" />
              <Text> Inflation Rate (%)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={goalData.inflation}
              editable={false}
            />
          </View>

          {/* In-hand Value */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="wallet" size={16} color="#666" />
              <Text> In-hand Value (₹)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 200000 (Optional)"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={goalData.currentSip}
              onChangeText={(val) => updateGoal("currentSip", val)}
            />
          </View>

          {/* Investment Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="trending-up" size={16} color="#666" />
              <Text> Investment Type</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={goalData.investmentType}
                onValueChange={(val) => updateGoal("investmentType", val)}
                style={styles.picker}
              >
                {INVESTMENT_TYPES.map((type) => (
                  <Picker.Item
                    key={type.value}
                    label={type.label}
                    value={type.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Expected Return */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="stats-chart" size={16} color="#666" /> Expected
              Return (%)
            </Text>
            <TextInput
              style={[
                styles.input,
                (goalData.investmentType === "Savings" ||
                  goalData.investmentType === "FD") &&
                  styles.disabledInput,
                errorFields.includes("returnRate") && styles.errorInput,
              ]}
              placeholder="e.g., 12"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={goalData.returnRate}
              onChangeText={(val) => updateGoal("returnRate", val)}
              editable={
                !(
                  goalData.investmentType === "Savings" ||
                  goalData.investmentType === "FD"
                )
              }
            />
            {(goalData.investmentType === "Savings" ||
              goalData.investmentType === "FD") && (
              <Text style={styles.helperText}>
                Return rate is 0% for Savings or FD type
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.calculateButton, loading && styles.disabledButton]}
            onPress={calculateGoal}
            disabled={loading}
          >
            <Ionicons
              name={editingGoalId ? "checkmark" : "calculator"}
              size={20}
              color="#fff"
            />
            <Text style={styles.calculateButtonText}>
              {loading
                ? "Processing..."
                : editingGoalId
                ? "Update Goal"
                : "Calculate Goal"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        {goalResults.length > 0 && (
          <>
            <Text style={styles.resultsTitle}>Your Financial Goals</Text>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Filter by Goal:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScrollView}
              >
                {getUniqueGoalTypes().map((goalType) => (
                  <TouchableOpacity
                    key={goalType}
                    style={[
                      styles.filterChip,
                      selectedFilter === goalType && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedFilter(goalType)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedFilter === goalType &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {goalType}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {/* Mapped Results */}
        {filteredGoals.map((g) => {
          const pieData = getPieChartData(g);
          return (
            <TouchableOpacity
              key={g._id}
              style={[
                styles.resultCard,
                editingGoalId === g._id && styles.editingCard,
              ]}
              onPress={() => editGoal(g)}
              activeOpacity={0.7}
            >
              {/* Result Card Header */}
              <View style={styles.resultHeader}>
                <View style={styles.resultTitleContainer}>
                  <View>
                    <Text style={styles.resultTitle}>{g.name}</Text>
                    <Text style={styles.investmentTypeLabel}>
                      {g.investmentType || "SIP/MF"} Investment
                    </Text>
                  </View>
                  {editingGoalId === g._id && (
                    <View style={styles.editingIndicator}>
                      <Ionicons name="create" size={16} color="#f59e0b" />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteGoal(g._id);
                  }}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Tab Navigation */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTabs[g._id] === "SIP Calculation" &&
                      styles.tabButtonActive,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    setActiveTabs((prev) => ({
                      ...prev,
                      [g._id]: "SIP Calculation",
                    }));
                  }}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTabs[g._id] === "SIP Calculation" &&
                        styles.tabButtonTextActive,
                    ]}
                  >
                    SIP Calculation
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTabs[g._id] === "Pie Chart" && styles.tabButtonActive,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    setActiveTabs((prev) => ({
                      ...prev,
                      [g._id]: "Pie Chart",
                    }));
                  }}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTabs[g._id] === "Pie Chart" &&
                        styles.tabButtonTextActive,
                    ]}
                  >
                    Pie Chart
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              {activeTabs[g._id] === "SIP Calculation" ? (
                <View>
                  <View style={styles.resultGrid}>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>Future Value</Text>
                      <Text style={styles.resultValue}>
                        ₹
                        {g.futureCost.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>
                        In-hand (Future Value)
                      </Text>
                      <Text style={styles.resultValue}>
                        ₹
                        {g.futureValueOfSavings.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>Amount Needed</Text>
                      <Text style={styles.resultValue}>
                        ₹
                        {g.required.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>Time Frame</Text>
                      <Text style={styles.resultValue}>{g.years} Years</Text>
                    </View>
                  </View>

                  <View style={styles.sipHighlight}>
                    <Ionicons name="repeat" size={20} color="#6366f1" />
                    <Text style={styles.sipLabel}>
                      {`Additional Monthly ${
                        g.investmentType === "Savings" ||
                        g.investmentType === "FD"
                          ? "Savings"
                          : "SIP"
                      } Required`}
                    </Text>
                    <Text style={styles.sipAmount}>
                      ₹
                      {g.monthlySIP.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.chartContainer}>
                  <Text style={styles.chartTitle}>{g.name} Breakdown</Text>
                  <PieChart
                    data={pieData}
                    width={screenWidth - 80}
                    height={200}
                    chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[10, 10]}
                    absolute
                    hasLegend={false}
                  />
                  <View style={styles.legendContainer}>
                    {pieData.map((item) => (
                      <View key={item.name} style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendColorBox,
                            { backgroundColor: item.color },
                          ]}
                        />
                        <Text style={styles.legendText}>
                          {`${item.name}: ₹${item.population.toLocaleString(
                            "en-IN",
                            {
                              maximumFractionDigits: 0,
                            }
                          )}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Timestamp and Edit Hint */}
              <View style={styles.timestamp}>
                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                <Text style={styles.timestampText}>{g.calculatedAt}</Text>
                <View style={styles.editHint}>
                  <Ionicons
                    name="hand-left-outline"
                    size={14}
                    color="#9ca3af"
                  />
                  <Text style={styles.editHintText}>Tap to edit</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8fafc",
    minHeight: "100%",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  editingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  editingText: {
    flex: 1,
    fontSize: 14,
    color: "#92400e",
    fontWeight: "500",
  },
  cancelButton: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  pickerContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  picker: {
    height: 50,
    backgroundColor: "transparent",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  errorInput: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  disabledInput: {
    backgroundColor: "#f9fafb",
    color: "#9ca3af",
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  calculateButton: {
    backgroundColor: "#6366f1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  calculateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  filterScrollView: {
    flex: 1,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  editingCard: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  resultTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  investmentTypeLabel: {
    fontSize: 12,
    color: "#6366f1",
    fontWeight: "500",
    marginTop: 2,
  },
  editingIndicator: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 4,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: "#6366f1",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  tabButtonTextActive: {
    color: "#6366f1",
    fontWeight: "600",
  },
  resultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  resultItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#06b6d4",
  },
  resultLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  sipHighlight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ede9fe",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#6366f1",
  },
  sipLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#5b21b6",
  },
  sipAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6366f1",
  },
  chartContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  legendContainer: {
    marginTop: 16,
    alignItems: "flex-start",
    width: "100%",
    paddingLeft: 15,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  legendColorBox: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: "#374151",
  },
  timestamp: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 6,
  },
  timestampText: {
    fontSize: 12,
    color: "#9ca3af",
    flex: 1,
  },
  editHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editHintText: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    paddingLeft: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
