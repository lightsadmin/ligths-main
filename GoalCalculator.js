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
  ActivityIndicator,
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
        console.log("Username not found in AsyncStorage.");

        // For development/testing:
        const defaultUsername = "testuser";
        console.log("Using default username for testing:", defaultUsername);
        setUserName(defaultUsername);

        // In a real app, you would typically navigate to the login screen here:
        // Alert.alert("Error", "User not found. Please log in again.", [
        //   { text: "OK", onPress: () => navigation.navigate('Login') }
        // ]);
      }
    } catch (error) {
      console.error("Error getting username:", error);
      Alert.alert("Error", "Failed to get user information.");
      // Fallback to default username even on error for dev/testing
      setUserName("testuser");
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
    // --- START OF ADDED GUARD CLAUSE ---
    if (!userName) {
      Alert.alert(
        "Error",
        "User information not available. Please ensure you are logged in or try again."
      );
      // Attempt to re-fetch username if it's missing (might be a timing issue)
      await getUserName();
      return; // Crucial: Stop execution if userName is not present
    }
    // --- END OF ADDED GUARD CLAUSE ---

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
    } else if (g.name === "Dream Home" || g.name === "Custom Goal") {
      requiredFields.push({
        key: "years",
        value: parseFloat(g.years),
        fieldValue: g.years,
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

    // Custom name validation
    if (g.name === "Custom Goal") {
      requiredFields.push({
        key: "customName",
        value: g.customName,
        fieldValue: g.customName,
      });
    }

    // Check for invalid fields
    const invalidFields = requiredFields.filter((field) => {
      if (field.key === "customName") {
        return !field.fieldValue || field.fieldValue.trim() === "";
      } else {
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
      ? investmentsByGoal[editingGoalId] || { totalInvested: 0, monthlySip: 0 }
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
    console.log("Calculated Result:", result);

    try {
      const method = editingGoalId ? "PUT" : "POST";
      const url = editingGoalId
        ? `${API_BASE_URL}/goals/${userName}/${editingGoalId}`
        : `${API_BASE_URL}/goals/${userName}`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });

      if (response.ok) {
        const savedGoal = await response.json();
        console.log("Goal saved/updated:", savedGoal);
        Alert.alert(
          "Success",
          `Goal ${editingGoalId ? "updated" : "saved"} successfully!`
        );
        fetchGoals(); // Refresh the list of goals
        cancelEdit(); // Exit edit mode
      } else {
        const errorData = await response.json();
        Alert.alert(
          "Error",
          `Failed to ${editingGoalId ? "update" : "save"} goal: ${
            errorData.error || response.statusText
          }`
        );
      }
    } catch (error) {
      console.error("Error saving/updating goal:", error);
      Alert.alert(
        "Error",
        `Failed to ${editingGoalId ? "update" : "save"} goal.`
      );
    }
  };

  const chartConfig = {
    backgroundGradientFrom: "#1E2923",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: "#08130D",
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2, // optional, default 3
    barPercentage: 0.5,
    useShadowColorFromDataset: false, // optional
  };

  const getPieChartData = (goal) => {
    const data = [];
    if (goal.futureValueOfSavings > 0) {
      data.push({
        name: "Existing Savings",
        population: parseFloat(goal.futureValueOfSavings.toFixed(0)),
        color: "#60A5FA", // Blue for existing savings
        legendFontColor: "#7F7F7F",
        legendFontSize: 15,
      });
    }
    if (goal.required > 0) {
      data.push({
        name: "Required Investment",
        population: parseFloat(goal.required.toFixed(0)),
        color: "#F87171", // Red for required investment
        legendFontColor: "#7F7F7F",
        legendFontSize: 15,
      });
    }
    return data;
  };

  const getGoalCardColor = (goalName) => {
    switch (goalName) {
      case "B Education":
        return "#6366F1"; // Indigo
      case "B Marriage":
        return "#EF4444"; // Red
      case "Dream Home":
        return "#22C55E"; // Green
      case "Wealth Creation":
        return "#F59E0B"; // Amber
      case "Custom Goal":
        return "#8B5CF6"; // Violet
      default:
        return "#64748B"; // Slate
    }
  };

  const getGoalIcon = (goalName) => {
    switch (goalName) {
      case "B Education":
        return "school";
      case "B Marriage":
        return "heart";
      case "Dream Home":
        return "home";
      case "Wealth Creation":
        return "trending-up";
      case "Custom Goal":
        return "star";
      default:
        return "bulb";
    }
  };

  const getFilteredGoals = () => {
    if (selectedFilter === "All") {
      return goalResults;
    }
    return goalResults.filter((goal) => goal.name === selectedFilter);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderGoalInputs = () => {
    const g = goalData;
    const commonInputs = (
      <>
        <View
          style={[
            styles.inputGroup,
            errorFields.includes("presentCost") && styles.inputError,
          ]}
        >
          <Text style={styles.label}>Present Cost of Goal (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={g.presentCost}
            onChangeText={(text) => updateGoal("presentCost", text)}
            placeholder="e.g., 50,00,000"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View
          style={[
            styles.inputGroup,
            errorFields.includes("inflation") && styles.inputError,
          ]}
        >
          <Text style={styles.label}>Expected Inflation Rate (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={g.inflation}
            onChangeText={(text) => updateGoal("inflation", text)}
            placeholder="e.g., 7.5"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Investment Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={g.investmentType}
              onValueChange={(itemValue) =>
                updateGoal("investmentType", itemValue)
              }
              style={styles.picker}
              itemStyle={styles.pickerItem}
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

        {g.investmentType !== "Savings" && g.investmentType !== "FD" && (
          <View
            style={[
              styles.inputGroup,
              errorFields.includes("returnRate") && styles.inputError,
            ]}
          >
            <Text style={styles.label}>
              Expected Return Rate on Investment (%)
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={g.returnRate}
              onChangeText={(text) => updateGoal("returnRate", text)}
              placeholder="e.g., 12"
              placeholderTextColor="#94a3b8"
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Current In-hand Value for this Goal (₹)
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={g.currentSip}
            onChangeText={(text) => updateGoal("currentSip", text)}
            placeholder="e.g., 10,000 (optional)"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </>
    );

    switch (selectedGoal) {
      case "B Education":
      case "B Marriage":
        return (
          <>
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("childCurrentAge") && styles.inputError,
              ]}
            >
              <Text style={styles.label}>Child's Current Age (Years)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.childCurrentAge}
                onChangeText={(text) => updateGoal("childCurrentAge", text)}
                placeholder="e.g., 5"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("goalAge") && styles.inputError,
              ]}
            >
              <Text style={styles.label}>Child's Age at Goal (Years)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.goalAge}
                onChangeText={(text) => updateGoal("goalAge", text)}
                placeholder="e.g., 18"
                placeholderTextColor="#94a3b8"
              />
            </View>
            {commonInputs}
          </>
        );
      case "Dream Home":
        return (
          <>
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("years") && styles.inputError,
              ]}
            >
              <Text style={styles.label}>Years to Goal</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.years}
                onChangeText={(text) => updateGoal("years", text)}
                placeholder="e.g., 10"
                placeholderTextColor="#94a3b8"
              />
            </View>
            {commonInputs}
          </>
        );
      case "Wealth Creation":
        return (
          <>
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("currentAge") && styles.inputError,
              ]}
            >
              <Text style={styles.label}>Your Current Age (Years)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.currentAge}
                onChangeText={(text) => updateGoal("currentAge", text)}
                placeholder="e.g., 30"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("goalAge") && styles.inputError,
              ]}
            >
              <Text style={styles.label}>Your Age at Goal (Years)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.goalAge}
                onChangeText={(text) => updateGoal("goalAge", text)}
                placeholder="e.g., 60"
                placeholderTextColor="#94a3b8"
              />
            </View>
            {commonInputs}
          </>
        );
      case "Custom":
        return (
          <>
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("customName") && styles.inputError,
              ]}
            >
              <Text style={styles.label}>Custom Goal Name</Text>
              <TextInput
                style={styles.input}
                value={g.customName}
                onChangeText={(text) => updateGoal("customName", text)}
                placeholder="e.g., World Tour"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("years") && styles.inputError,
              ]}
            >
              <Text style={styles.label}>Years to Goal</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.years}
                onChangeText={(text) => updateGoal("years", text)}
                placeholder="e.g., 15"
                placeholderTextColor="#94a3b8"
              />
            </View>
            {commonInputs}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Financial Goal Calculator</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Select Goal Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedGoal}
              onValueChange={(itemValue) => {
                setSelectedGoal(itemValue);
                setGoalData({ ...GOAL_TEMPLATES[itemValue] });
                setEditingGoalId(null); // Exit edit mode when changing goal type
                setErrorFields([]); // Clear errors
              }}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {Object.keys(GOAL_TEMPLATES).map((key) => (
                <Picker.Item key={key} label={key} value={key} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Enter Goal Details</Text>
          {renderGoalInputs()}

          <TouchableOpacity style={styles.button} onPress={calculateGoal}>
            <Text style={styles.buttonText}>
              {editingGoalId ? "Update Goal" : "Calculate & Save Goal"}
            </Text>
          </TouchableOpacity>
          {editingGoalId && (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={cancelEdit}
            >
              <Text style={styles.cancelButtonText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionHeader}>Your Saved Goals</Text>

        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter By:</Text>
          <View style={styles.pickerContainerSmall}>
            <Picker
              selectedValue={selectedFilter}
              onValueChange={(itemValue) => setSelectedFilter(itemValue)}
              style={styles.pickerSmall}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="All Goals" value="All" />
              {Object.keys(GOAL_TEMPLATES).map((key) => (
                <Picker.Item key={key} label={key} value={key} />
              ))}
            </Picker>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={{ marginVertical: 20 }}
          />
        ) : getFilteredGoals().length === 0 ? (
          <View style={styles.noGoalsContainer}>
            <Ionicons name="documents-outline" size={50} color="#CBD5E1" />
            <Text style={styles.noGoalsText}>No goals saved yet!</Text>
            <Text style={styles.noGoalsSubText}>
              Start by calculating your first financial goal above.
            </Text>
          </View>
        ) : (
          getFilteredGoals().map((goal) => (
            <View key={goal._id} style={styles.goalCard}>
              <View
                style={[
                  styles.goalCardHeader,
                  { backgroundColor: getGoalCardColor(goal.name) },
                ]}
              >
                <Ionicons
                  name={getGoalIcon(goal.name)}
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.goalCardTitle}>
                  {goal.name === "Custom Goal" ? goal.customName : goal.name}
                </Text>
                <TouchableOpacity
                  onPress={() => deleteGoal(goal._id)}
                  style={styles.deleteIcon}
                >
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.goalCardContent}>
                <View style={styles.tabContainer}>
                  {[
                    "SIP Calculation",
                    "Lumpsum Calculation",
                    "Goal Summary",
                  ].map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.tabButton,
                        activeTabs[goal._id] === tab && styles.tabButtonActive,
                      ]}
                      onPress={() =>
                        setActiveTabs((prev) => ({
                          ...prev,
                          [goal._id]: tab,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.tabButtonText,
                          activeTabs[goal._id] === tab &&
                            styles.tabButtonTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {activeTabs[goal._id] === "Goal Summary" && (
                  <View style={styles.tabContent}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Present Cost:</Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency(goal.presentCost)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Years to Goal:</Text>
                      <Text style={styles.summaryValue}>
                        {goal.years} Years
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Inflation Rate:</Text>
                      <Text style={styles.summaryValue}>{goal.inflation}%</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Return Rate:</Text>
                      <Text style={styles.summaryValue}>
                        {goal.returnRate}%
                      </Text>
                    </View>
                    {goal.currentSip > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                          Current Savings:
                        </Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrency(goal.currentSip)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Future Value Needed:
                      </Text>
                      <Text style={styles.summaryValueImportant}>
                        {formatCurrency(goal.futureCost)}
                      </Text>
                    </View>
                    {goal.futureValueOfSavings > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                          FV of Existing Savings:
                        </Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrency(goal.futureValueOfSavings)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Net Amount Required:
                      </Text>
                      <Text style={styles.summaryValueImportant}>
                        {formatCurrency(goal.required)}
                      </Text>
                    </View>

                    {getPieChartData(goal).length > 0 && (
                      <>
                        <Text style={styles.chartTitle}>Allocation</Text>
                        <PieChart
                          data={getPieChartData(goal)}
                          width={screenWidth - 60} // Adjust width for padding
                          height={200}
                          chartConfig={chartConfig}
                          accessor={"population"}
                          backgroundColor={"transparent"}
                          paddingLeft={"15"}
                          //absolute // Show actual values, not percentages
                        />
                        <View style={styles.legendContainer}>
                          {getPieChartData(goal).map((item, index) => (
                            <View key={index} style={styles.legendItem}>
                              <View
                                style={[
                                  styles.legendColorBox,
                                  { backgroundColor: item.color },
                                ]}
                              />
                              <Text style={styles.legendText}>
                                {item.name}: {formatCurrency(item.population)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                )}

                {activeTabs[goal._id] === "SIP Calculation" && (
                  <View style={styles.tabContent}>
                    <Text style={styles.tabContentText}>
                      To achieve your goal of {formatCurrency(goal.futureCost)}{" "}
                      in {goal.years} years (adjusting for {goal.inflation}%{" "}
                      inflation and {goal.returnRate}% return), you need to save{" "}
                      <Text style={styles.highlightText}>
                        {formatCurrency(goal.monthlySIP)}
                      </Text>{" "}
                      per month.
                    </Text>
                    {goal.currentSip > 0 && (
                      <Text style={styles.tabContentText}>
                        This calculation considers your existing in-hand savings
                        of {formatCurrency(goal.currentSip)}.
                      </Text>
                    )}
                  </View>
                )}

                {activeTabs[goal._id] === "Lumpsum Calculation" && (
                  <View style={styles.tabContent}>
                    <Text style={styles.tabContentText}>
                      To achieve your goal of {formatCurrency(goal.futureCost)}{" "}
                      in {goal.years} years (adjusting for {goal.inflation}%{" "}
                      inflation and {goal.returnRate}% return), you need to
                      invest a one-time lumpsum of{" "}
                      <Text style={styles.highlightText}>
                        {formatCurrency(
                          goal.required /
                            Math.pow(1 + goal.returnRate / 100, goal.years)
                        )}
                      </Text>{" "}
                      today.
                    </Text>
                    {goal.currentSip > 0 && (
                      <Text style={styles.tabContentText}>
                        This calculation considers your existing in-hand savings
                        of {formatCurrency(goal.currentSip)}.
                      </Text>
                    )}
                  </View>
                )}
                <View style={styles.timestamp}>
                  <Text style={styles.timestampText}>
                    Last updated:{" "}
                    {new Date(goal.updatedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    {new Date(goal.updatedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => editGoal(goal)}
                    style={styles.editHint}
                  >
                    <Ionicons name="create-outline" size={16} color="#9ca3af" />
                    <Text style={styles.editHintText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100, // Add padding for the bottom to ensure content isn't hidden by keyboard/tabs
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1E293B",
    backgroundColor: "#F1F5F9",
  },
  inputError: {
    borderColor: "#EF4444", // Red border for error
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    overflow: "hidden", // Ensures the picker's border-radius is respected
  },
  picker: {
    height: 50,
    width: "100%",
    color: "#1E293B",
  },
  pickerItem: {
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#E2E8F0",
    marginTop: 10,
  },
  cancelButtonText: {
    color: "#475569",
    fontSize: 18,
    fontWeight: "600",
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 30,
    marginBottom: 20,
    textAlign: "center",
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 3,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#475569",
    marginRight: 10,
  },
  pickerContainerSmall: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  pickerSmall: {
    height: 40, // Smaller height for filter picker
    width: "100%",
    color: "#1E293B",
  },
  goalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden", // Ensures children respect borderRadius
  },
  goalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  goalCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 10,
    flex: 1, // Take up remaining space
  },
  deleteIcon: {
    padding: 5,
  },
  goalCardContent: {
    padding: 15,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 15,
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    overflow: "hidden",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  tabContent: {
    marginTop: 10,
  },
  tabContentText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#334155",
    marginBottom: 10,
  },
  highlightText: {
    fontWeight: "700",
    color: "#2563EB",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  summaryLabel: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "600",
  },
  summaryValueImportant: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "700",
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
  noGoalsContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noGoalsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 15,
  },
  noGoalsSubText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 5,
  },
});
