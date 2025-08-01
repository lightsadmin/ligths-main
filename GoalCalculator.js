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
import { EventRegister } from "react-native-event-listeners";

const screenWidth = Dimensions.get("window").width;

// Backend API URL
const API_BASE_URL = "https://ligths-backend.onrender.com";

// New Pie Chart Colors
const INCOME_GREEN = "#22C55E";
const INVESTMENT_BLUE = "#3B82F6";

// Default inflation is 7.5
const GOAL_TEMPLATES = {
  Education: {
    name: "Education",
    presentCost: "",
    childCurrentAge: "",
    goalAge: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
  Marriage: {
    name: "Marriage",
    presentCost: "",
    childCurrentAge: "",
    goalAge: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
  "Dream Home": {
    name: "Dream Home",
    presentCost: "",
    years: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
  "Wealth Creation": {
    name: "Wealth Creation",
    presentCost: "",
    currentAge: "",
    goalAge: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
  "FIRE Number": {
    name: "FIRE Number",
    presentCost: "",
    years: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
  Custom: {
    name: "Custom Goal",
    customName: "",
    presentCost: "",
    years: "",
    inflation: "7.5",
    returnRate: "12",
    currentSip: "",
    investmentType: "SIP/MF",
    description: "",
  },
};

const INVESTMENT_TYPES = [
  { label: "SIP/MF", value: "SIP/MF" },
  { label: "FD", value: "FD" },
  { label: "RD", value: "RD" },
  { label: "Stocks", value: "Stocks" },
  { label: "Savings", value: "Savings" },
];

export default function GoalCalculator() {
  const navigation = useNavigation();

  const [selectedGoal, setSelectedGoal] = useState("Education");
  const [goalData, setGoalData] = useState({
    ...GOAL_TEMPLATES["Education"],
  });
  const [goalResults, setGoalResults] = useState([]);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [activeTabs, setActiveTabs] = useState({});
  const [expandedTables, setExpandedTables] = useState({}); // Track which return rate tables are expanded
  const [errorFields, setErrorFields] = useState([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    // Listen for investment additions to refresh data
    const listener = EventRegister.addEventListener("investmentAdded", () => {
      if (userName) {
        fetchInvestmentsByGoal();
        fetchGoals(); // Also refresh goals in case calculations changed
      }
    });

    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, [userName]);

  const getUserName = async () => {
    try {
      let storedUserName = await AsyncStorage.getItem("userName");

      if (!storedUserName) {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString);
          storedUserName =
            userInfo.username ||
            userInfo.userName ||
            (userInfo.user && userInfo.user.username) ||
            (userInfo.user && userInfo.user.userName);
        }
      }

      if (!storedUserName) {
        const userString = await AsyncStorage.getItem("user");
        if (userString) {
          const user = JSON.parse(userString);
          storedUserName = user.username || user.userName;
        }
      }

      if (storedUserName) {
        setUserName(storedUserName);
      } else {
        setLoading(false);
        Alert.alert("Error", "User not found. Please log in again.", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      }
    } catch (error) {
      setLoading(false);
      console.error("Error getting username:", error);
      Alert.alert("Error", "Failed to get user information.");
    }
  };

  const fetchGoals = async () => {
    if (!userName) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${userName}`);
      if (response.ok) {
        const goals = await response.json();
        setGoalResults(goals);
        const initialTabs = {};
        goals.forEach((goal) => {
          initialTabs[goal._id] = "SIP Calculation";
        });
        setActiveTabs(initialTabs);
      } else {
        console.error("Error fetching goals:", response.status);
        Alert.alert("Error", "Failed to fetch goals from the server.");
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
      Alert.alert("Connection Error", "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestmentsByGoal = async () => {
    if (!userName) return;
    try {
      // Get user token for investments API
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) return;

      const parsedInfo = JSON.parse(userInfoString);
      const token = parsedInfo.token;
      if (!token) return;

      // Fetch all investments for the user
      const response = await fetch(`${API_BASE_URL}/investments`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const investments = await response.json();
        console.log("Fetched investments:", investments);

        // Group investments by goal ID
        const investmentsByGoalMap = {};
        investments.forEach((investment) => {
          if (investment.goalId) {
            if (!investmentsByGoalMap[investment.goalId]) {
              investmentsByGoalMap[investment.goalId] = [];
            }
            investmentsByGoalMap[investment.goalId].push(investment);
          }
        });

        console.log("Investments grouped by goal:", investmentsByGoalMap);
        setInvestmentsByGoal(investmentsByGoalMap);
      }
    } catch (error) {
      console.error("Error fetching investments:", error);
    }
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
                fetchGoals();
                if (editingGoalId === goalId) {
                  cancelEdit();
                }
                Alert.alert("Success", "Goal deleted successfully.");
              } else {
                Alert.alert(
                  "Error",
                  "Failed to delete the goal on the server."
                );
              }
            } catch (error) {
              console.error("Error deleting goal:", error);
              Alert.alert("Connection Error", "Failed to delete the goal.");
            }
          },
        },
      ]
    );
  };

  const calculateGoal = async () => {
    if (!userName) {
      Alert.alert(
        "Error",
        "User information not available. Please log in again."
      );
      return;
    }

    const g = goalData;
    const cost = parseFloat(g.presentCost);
    let y;

    if (g.name === "Education" || g.name === "Marriage") {
      y = parseFloat(g.goalAge) - parseFloat(g.childCurrentAge);
    } else if (g.name === "Wealth Creation") {
      y = parseFloat(g.goalAge) - parseFloat(g.currentAge);
    } else {
      y = parseFloat(g.years);
    }

    const inf = parseFloat(g.inflation);
    const ret = parseFloat(g.returnRate) || 12; // Default 12% return rate if not specified
    const inHandValue = parseFloat(g.currentSip) || 0;

    const requiredFields = [];
    requiredFields.push({
      key: "presentCost",
      value: cost,
      fieldValue: g.presentCost,
    });
    requiredFields.push({
      key: "description",
      value: g.description,
      fieldValue: g.description,
    });
    requiredFields.push({
      key: "inflation",
      value: inf,
      fieldValue: g.inflation,
    });

    if (g.name === "Education" || g.name === "Marriage") {
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
    } else if (
      g.name === "Dream Home" ||
      g.name === "Custom Goal" ||
      g.name === "FIRE Number"
    ) {
      requiredFields.push({
        key: "years",
        value: parseFloat(g.years),
        fieldValue: g.years,
      });
    }

    if (g.name === "Custom Goal") {
      requiredFields.push({
        key: "customName",
        value: g.customName,
        fieldValue: g.customName,
      });
    }

    // --- FIX STARTS HERE ---
    // Corrected the validation logic for required fields.
    const invalidFields = requiredFields.filter((field) => {
      const isStringField =
        field.key === "customName" || field.key === "description";

      if (isStringField) {
        return !field.fieldValue || field.fieldValue.trim() === "";
      } else {
        // For numeric fields, check all conditions
        return (
          !field.fieldValue ||
          field.fieldValue.trim() === "" ||
          isNaN(field.value) ||
          field.value <= 0
        );
      }
    });
    // --- FIX ENDS HERE ---

    if (invalidFields.length > 0) {
      const invalidFieldNames = invalidFields.map((field) => field.key);
      setErrorFields(invalidFieldNames);
      Alert.alert(
        "Validation Error",
        `Please fill the following required fields with valid values:\n${invalidFieldNames
          .map((field) => {
            switch (field) {
              case "presentCost":
                return "• Present Cost";
              case "description":
                return "• Description";
              case "goalAge":
                return "• Goal Age";
              case "childCurrentAge":
                return "• Current Age of Child";
              case "currentAge":
                return "• Current Age";
              case "years":
                return "• Years to Goal";
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

    if (g.name === "Education" || g.name === "Marriage") {
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

    setErrorFields([]);
    const futureCost = cost * Math.pow(1 + inf / 100, y);
    const futureValueOfInHand = inHandValue * Math.pow(1 + ret / 100, y);
    const totalFutureValueOfSavings = futureValueOfInHand;
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

    const result = {
      name: g.name,
      customName: g.customName,
      description: g.description,
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
      monthlySIP: monthlySIP > 0 ? monthlySIP : 0,
    };

    try {
      const method = editingGoalId ? "PUT" : "POST";
      const url = editingGoalId
        ? `${API_BASE_URL}/goals/${userName}/${editingGoalId}`
        : `${API_BASE_URL}/goals/${userName}`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });

      if (response.ok) {
        Alert.alert(
          "Success",
          `Goal ${editingGoalId ? "updated" : "saved"} successfully!`
        );
        await fetchGoals();
        cancelEdit();
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
        "Connection Error",
        `Failed to ${editingGoalId ? "update" : "save"} the goal.`
      );
    }
  };

  const updateGoal = (key, value) => {
    let updatedData = { ...goalData, [key]: value };

    setGoalData(updatedData);
    if (errorFields.includes(key)) {
      setErrorFields(errorFields.filter((field) => field !== key));
    }
  };

  const editGoal = (goal) => {
    setGoalData({
      name: goal.name,
      customName: goal.customName || "",
      description: goal.description || "",
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

  const chartConfig = {
    backgroundGradientFrom: "#1E2923",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: "#08130D",
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  // Calculate current value of RD investment
  const calculateRDCurrentValue = (investment) => {
    const monthlyDeposit = investment.monthlyDeposit || investment.amount || 0;
    const annualRate = (investment.interestRate || 0) / 100;
    const quarterlyRate = annualRate / 4;
    const duration = investment.duration || 12;
    const startDate = investment.startDate;

    if (!startDate || !monthlyDeposit) {
      return investment.currentAmount || investment.amount || 0;
    }

    // Calculate elapsed months since start date
    const start = new Date(startDate);
    const now = new Date();
    const elapsedMonths = Math.max(
      1,
      (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth()) +
        1
    );

    // Limit to actual duration or elapsed time, whichever is smaller
    const depositsCompleted = Math.min(elapsedMonths, duration);
    const elapsedQuarters = depositsCompleted / 3;

    if (quarterlyRate === 0) {
      // If no interest, just return total deposits made so far
      return monthlyDeposit * depositsCompleted;
    }

    // Calculate current value with quarterly compounding
    const factor = Math.pow(1 + quarterlyRate, elapsedQuarters) - 1;
    const currentValue = monthlyDeposit * 3 * (factor / quarterlyRate);

    return Math.max(currentValue, monthlyDeposit * depositsCompleted);
  };

  const getPieChartData = (goal) => {
    const data = [];

    // Calculate investment amounts by type for this goal
    const goalInvestments = investmentsByGoal[goal._id] || [];
    console.log(
      `Goal ${goal.name} (${goal._id}) investments:`,
      goalInvestments
    );

    // Track investment amounts by type - shows different colors for each type
    const investmentAmountsByType = {
      FD: 0, // Green - Fixed Deposit
      RD: 0, // Blue - Recurring Deposit
      Savings: 0, // Orange - Savings Account
      "SIP/MF": 0, // Purple - SIP/Mutual Funds
      "Mutual Fund": 0, // Teal - Mutual Funds
    };

    let totalInvestmentAmount = 0;

    goalInvestments.forEach((investment) => {
      let amount = 0;
      console.log(`Processing investment:`, investment);

      // Calculate accurate current value based on investment type
      if (investment.investmentType === "Fixed Deposit") {
        amount = investment.currentAmount || investment.amount || 0;
        investmentAmountsByType.FD += amount;
        totalInvestmentAmount += amount;
        console.log(`FD amount: ₹${amount}`);
      } else if (investment.investmentType === "Recurring Deposit") {
        // For RD, calculate current value based on deposits made and interest earned
        amount = calculateRDCurrentValue(investment);
        investmentAmountsByType.RD += amount;
        totalInvestmentAmount += amount;
        console.log(`RD amount calculated: ₹${amount}`);
      } else if (investment.investmentType === "Savings") {
        amount = investment.currentAmount || investment.amount || 0;
        investmentAmountsByType.Savings += amount;
        totalInvestmentAmount += amount;
        console.log(`Savings amount: ₹${amount}`);
      } else if (investment.investmentType === "SIP/MF") {
        amount = investment.currentAmount || investment.amount || 0;
        investmentAmountsByType["SIP/MF"] += amount;
        totalInvestmentAmount += amount;
        console.log(`SIP/MF amount: ₹${amount}`);
      } else if (investment.investmentType === "Mutual Fund") {
        amount = investment.currentAmount || investment.amount || 0;
        investmentAmountsByType["Mutual Fund"] += amount;
        totalInvestmentAmount += amount;
        console.log(`Mutual Fund amount: ₹${amount}`);
      } else {
        // Handle any other investment types
        console.log(`Unknown investment type: ${investment.investmentType}`);
        amount = investment.currentAmount || investment.amount || 0;
        // For unknown types, add to the most appropriate category or create a generic one
        if (investment.investmentType) {
          console.log(
            `Adding unknown investment type to general tracking: ₹${amount}`
          );
          totalInvestmentAmount += amount;
        }
      }
    });

    console.log(`Total investment amount for goal: ₹${totalInvestmentAmount}`);
    console.log(`Investment amounts by type:`, investmentAmountsByType);

    // Debug: Show which investment types have amounts > 0
    Object.keys(investmentAmountsByType).forEach((type) => {
      const amount = investmentAmountsByType[type];
      if (amount > 0) {
        console.log(`✅ ${type}: ₹${amount} - Will be shown in pie chart`);
      } else {
        console.log(`❌ ${type}: ₹${amount} - Will NOT be shown in pie chart`);
      }
    });

    // Create pie chart data with distinct colors for each investment type
    // When a user has multiple investment types for one goal, each will show with its own color
    // Color scheme: FD=Light Cyan, RD=Light Purple, Savings=Light Yellow, SIP/MF=Purple, Mutual Fund=Teal
    // Add investment type slices to pie chart with distinct colors
    const investmentColors = {
      FD: "#4ce4f8ff", // Light Cyan for Fixed Deposit
      RD: "#ee99fcff", // Light Purple for Recurring Deposit
      Savings: "#ffe88aff", // Light Yellow for Savings
      "SIP/MF": "#8B5CF6", // Purple for SIP/MF
      "Mutual Fund": "#14B8A6", // Teal for Mutual Funds
    };

    // Add each investment type as separate slice if amount > 0
    Object.keys(investmentAmountsByType).forEach((type, index) => {
      const amount = investmentAmountsByType[type];
      if (amount > 0) {
        data.push({
          name: `${type} Investment`,
          population: parseFloat(amount.toFixed(0)),
          color: investmentColors[type],
          legendFontColor: "#374151",
          legendFontSize: 14,
          key: `investment-${type}-${index}`, // Unique key for each slice
        });
        console.log(
          `Added ${type} slice with amount: ₹${amount} and color: ${investmentColors[type]}`
        );
      }
    });

    // Add current savings (if any) from goal
    const originalFutureValueOfSavings = goal.futureValueOfSavings || 0;
    if (originalFutureValueOfSavings > 0) {
      data.push({
        name: "Current Savings",
        population: parseFloat(originalFutureValueOfSavings.toFixed(0)),
        color: "#6B7280", // Gray for current savings
        legendFontColor: "#374151",
        legendFontSize: 14,
        key: "current-savings", // Unique key
      });
    }

    // Calculate required investment (reduced by all investment amounts)
    const updatedRequired = Math.max(
      0,
      (goal.required || 0) - totalInvestmentAmount
    );

    if (updatedRequired > 0) {
      data.push({
        name: "Required Amount",
        population: parseFloat(updatedRequired.toFixed(0)),
        color: "#fb746aff", // Red for required investment
        legendFontColor: "#374151",
        legendFontSize: 14,
        key: "required-investment", // Unique key
      });
    }

    console.log(`Final pie chart data for goal ${goal.name}:`, data);
    console.log(`Total data items: ${data.length}`);
    data.forEach((item, index) => {
      console.log(
        `Slice ${index}: ${item.name} - ₹${item.population} - ${item.color}`
      );
    });

    return data;
  };

  const getGoalIcon = (goalName) => {
    switch (goalName) {
      case "Education":
        return "school";
      case "Marriage":
        return "heart";
      case "Dream Home":
        return "home";
      case "Wealth Creation":
        return "trending-up";
      case "FIRE Number":
        return "flame";
      case "Custom Goal":
        return "star";
      default:
        return "bulb";
    }
  };

  const getFilterLabels = () => {
    const labels = new Map();
    goalResults.forEach((goal) => {
      if (goal.name === "Custom Goal") {
        labels.set(goal.customName, goal.customName);
      } else {
        labels.set(goal.name, goal.name);
      }
    });
    return Array.from(labels.values());
  };

  const getFilteredGoals = () => {
    if (selectedFilter === "All") {
      return goalResults;
    }
    return goalResults.filter((goal) => {
      const displayName =
        goal.name === "Custom Goal" ? goal.customName : goal.name;
      return displayName === selectedFilter;
    });
  };

  const formatCurrency = (amount) => {
    if (typeof amount !== "number") return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate SIP for different return rates
  const calculateSIPForReturnRates = (goal, totalInvestmentAmount) => {
    const returnRates = [6, 8, 10, 12];
    const results = [];

    const originalInHand = goal.futureValueOfSavings || 0;
    const updatedInHand = originalInHand + totalInvestmentAmount;
    const updatedRequired = Math.max(
      0,
      (goal.required || 0) - totalInvestmentAmount
    );
    const months = goal.years * 12;

    returnRates.forEach((rate) => {
      const monthlyRate = rate / 1200;
      let monthlySIP = 0;

      if (updatedRequired > 0 && monthlyRate > 0) {
        monthlySIP =
          (updatedRequired * monthlyRate) /
          (Math.pow(1 + monthlyRate, months) - 1);
      } else if (updatedRequired > 0) {
        monthlySIP = updatedRequired / months;
      }

      results.push({
        rate: rate,
        sip: monthlySIP > 0 ? monthlySIP : 0,
      });
    });

    return results;
  };

  const renderGoalInputs = () => {
    const g = goalData;

    const commonInputs = (
      <>
        <View
          style={[
            styles.inputGroup,
            errorFields.includes("presentCost") && styles.errorInput,
          ]}
        >
          <Text style={styles.label}>Present Cost of Goal (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={g.presentCost}
            onChangeText={(text) => updateGoal("presentCost", text)}
            placeholder="e.g., 50,00,000"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View
          style={[
            styles.inputGroup,
            errorFields.includes("description") && styles.errorInput,
          ]}
        >
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={g.description}
            onChangeText={(text) => updateGoal("description", text)}
            placeholder="e.g., For my child's higher education"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </>
    );

    const otherInputs = (
      <>
        <View
          style={[
            styles.inputGroup,
            errorFields.includes("inflation") && styles.errorInput,
          ]}
        >
          <Text style={styles.label}>Expected Inflation Rate (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={g.inflation}
            onChangeText={(text) => updateGoal("inflation", text)}
            placeholder="e.g., 7.5"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Inhand value (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={g.currentSip}
            onChangeText={(text) => updateGoal("currentSip", text)}
            placeholder="e.g., 10,000"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </>
    );

    switch (selectedGoal) {
      case "Education":
      case "Marriage":
        return (
          <>
            {commonInputs}
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("childCurrentAge") && styles.errorInput,
              ]}
            >
              <Text style={styles.label}>Child's Current Age (years)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.childCurrentAge}
                onChangeText={(text) => updateGoal("childCurrentAge", text)}
                placeholder="e.g., 5"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("goalAge") && styles.errorInput,
              ]}
            >
              <Text style={styles.label}>Child's Age at Goal (years)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.goalAge}
                onChangeText={(text) => updateGoal("goalAge", text)}
                placeholder="e.g., 18"
                placeholderTextColor="#9ca3af"
              />
            </View>
            {otherInputs}
          </>
        );
      case "Dream Home":
      case "FIRE Number":
        return (
          <>
            {commonInputs}
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("years") && styles.errorInput,
              ]}
            >
              <Text style={styles.label}>Years to Goal</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.years}
                onChangeText={(text) => updateGoal("years", text)}
                placeholder="e.g., 10"
                placeholderTextColor="#9ca3af"
              />
            </View>
            {otherInputs}
          </>
        );
      case "Wealth Creation":
        return (
          <>
            {commonInputs}
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("currentAge") && styles.errorInput,
              ]}
            >
              <Text style={styles.label}>Your Current Age (years)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.currentAge}
                onChangeText={(text) => updateGoal("currentAge", text)}
                placeholder="e.g., 30"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("goalAge") && styles.errorInput,
              ]}
            >
              <Text style={styles.label}>Your Age at Goal (years)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.goalAge}
                onChangeText={(text) => updateGoal("goalAge", text)}
                placeholder="e.g., 60"
                placeholderTextColor="#9ca3af"
              />
            </View>
            {otherInputs}
          </>
        );
      case "Custom":
        return (
          <>
            {commonInputs}
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("customName") && styles.errorInput,
              ]}
            >
              <Text style={styles.label}>Custom Goal Name</Text>
              <TextInput
                style={styles.input}
                value={g.customName}
                onChangeText={(text) => updateGoal("customName", text)}
                placeholder="e.g., World Tour"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View
              style={[
                styles.inputGroup,
                errorFields.includes("years") && styles.errorInput,
              ]}
            >
              <Text style={styles.label}>Years to Goal</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={g.years}
                onChangeText={(text) => updateGoal("years", text)}
                placeholder="e.g., 15"
                placeholderTextColor="#9ca3af"
              />
            </View>
            {otherInputs}
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal Calculator</Text>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list-outline" size={20} color="#6366f1" />
            <Text style={styles.cardTitle}>Select Goal Type</Text>
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedGoal}
              onValueChange={(itemValue) => {
                setSelectedGoal(itemValue);
                setGoalData({ ...GOAL_TEMPLATES[itemValue] });
                setEditingGoalId(null);
                setErrorFields([]);
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
          <View style={styles.cardHeader}>
            <Ionicons name="enter-outline" size={20} color="#6366f1" />
            <Text style={styles.cardTitle}>Enter Goal Details</Text>
          </View>
          {editingGoalId && (
            <View style={styles.editingBanner}>
              <Ionicons name="create-outline" size={16} color="#92400e" />
              <Text style={styles.editingText}>Editing Goal</Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelEdit}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          {renderGoalInputs()}
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={calculateGoal}
          >
            <Ionicons
              name="calculator-outline"
              size={20}
              color="#ffffff"
              style={styles.buttonIcon}
            />
            <Text style={styles.calculateButtonText}>
              {editingGoalId ? "Update Goal" : "Calculate Goal"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.resultsTitle}>Your Financial Goals</Text>

        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by Goal:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === "All" && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter("All")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "All" && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {getFilterLabels().map((label) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.filterChip,
                  selectedFilter === label && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(label)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === label && styles.filterChipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#6366f1"
            style={{ marginTop: 30 }}
          />
        ) : getFilteredGoals().length === 0 ? (
          <View style={styles.noGoalsContainer}>
            <Ionicons name="documents-outline" size={50} color="#9ca3af" />
            <Text style={styles.noGoalsText}>No goals saved yet!</Text>
            <Text style={styles.noGoalsSubText}>
              Start by calculating your first financial goal above.
            </Text>
          </View>
        ) : (
          getFilteredGoals().map((goal) => (
            <View key={goal._id} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.resultTitleContainer}>
                  <Ionicons
                    name={getGoalIcon(goal.name)}
                    size={24}
                    color="#1f2937"
                  />
                  <View style={{ flex: 1 }}>
                    {/* UPDATED LOGIC FOR TITLE */}
                    <Text style={styles.resultTitle}>
                      {/* Check if description exists and is not just whitespace. If so, use it. */}
                      {
                        goal.description && goal.description.trim() !== ""
                          ? goal.description
                          : goal.name === "Custom Goal"
                          ? goal.customName
                          : goal.name // Fallback to goal name
                      }
                    </Text>
                    {/* UPDATED LOGIC FOR SUBTITLE */}
                    <Text style={styles.resultSubtitle}>
                      {/* Always show goal name/custom name */}
                      {goal.name === "Custom Goal"
                        ? goal.customName
                        : goal.name}
                      {/* Add investment type and years only if goal name is displayed or there's a description */}
                      {` • ${goal.investmentType} • ${goal.years} years`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => deleteGoal(goal._id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.goalCardContent}>
                <View style={styles.tabContainer}>
                  {[
                    { key: "SIP Calculation", icon: "calculator-outline" },
                    { key: "Pie Chart", icon: "pie-chart-outline" },
                  ].map((tab) => (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.tabButton,
                        activeTabs[goal._id] === tab.key &&
                          styles.tabButtonActive,
                      ]}
                      onPress={() =>
                        setActiveTabs((prev) => ({
                          ...prev,
                          [goal._id]: tab.key,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.tabButtonText,
                          activeTabs[goal._id] === tab.key &&
                            styles.tabButtonTextActive,
                        ]}
                      >
                        {tab.key}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {activeTabs[goal._id] === "Pie Chart" && (
                  <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>
                      {/* Updated logic for chart title */}
                      {goal.description && goal.description.trim() !== ""
                        ? goal.description
                        : goal.name === "Custom Goal"
                        ? goal.customName
                        : goal.name}{" "}
                      Breakdown
                    </Text>
                    {getPieChartData(goal).length > 0 ? (
                      <>
                        <PieChart
                          data={getPieChartData(goal)}
                          width={screenWidth - 100}
                          height={200}
                          chartConfig={chartConfig}
                          accessor={"population"}
                          backgroundColor={"transparent"}
                          paddingLeft={"15"}
                          center={[10, 0]}
                          hasLegend={false}
                          absolute={false}
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
                    ) : (
                      <View style={styles.noChartContainer}>
                        <Text style={styles.noChartText}>
                          No breakdown available
                        </Text>
                        <Text style={styles.noChartSubtext}>
                          Add existing savings to see the breakdown
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {activeTabs[goal._id] === "SIP Calculation" && (
                  <View>
                    {(() => {
                      // Calculate total investment amounts for this goal (all types)
                      const goalInvestments = investmentsByGoal[goal._id] || [];
                      const investmentAmountsByType = {
                        FD: 0,
                        RD: 0,
                        Savings: 0,
                        "SIP/MF": 0,
                        "Mutual Fund": 0,
                      };

                      let totalInvestmentAmount = 0;

                      goalInvestments.forEach((investment) => {
                        let amount = 0;

                        // Calculate accurate current value based on investment type
                        if (investment.investmentType === "Fixed Deposit") {
                          amount =
                            investment.currentAmount || investment.amount || 0;
                          investmentAmountsByType.FD += amount;
                          totalInvestmentAmount += amount;
                        } else if (
                          investment.investmentType === "Recurring Deposit"
                        ) {
                          // For RD, calculate current value based on deposits made and interest earned
                          amount = calculateRDCurrentValue(investment);
                          investmentAmountsByType.RD += amount;
                          totalInvestmentAmount += amount;
                        } else if (investment.investmentType === "Savings") {
                          amount =
                            investment.currentAmount || investment.amount || 0;
                          investmentAmountsByType.Savings += amount;
                          totalInvestmentAmount += amount;
                        } else if (investment.investmentType === "SIP/MF") {
                          amount =
                            investment.currentAmount || investment.amount || 0;
                          investmentAmountsByType["SIP/MF"] += amount;
                          totalInvestmentAmount += amount;
                        } else if (
                          investment.investmentType === "Mutual Fund"
                        ) {
                          amount =
                            investment.currentAmount || investment.amount || 0;
                          investmentAmountsByType["Mutual Fund"] += amount;
                          totalInvestmentAmount += amount;
                        }
                      });

                      // Calculate updated values
                      const originalInHand = goal.futureValueOfSavings || 0;
                      const updatedInHand =
                        originalInHand + totalInvestmentAmount;
                      const updatedRequired = Math.max(
                        0,
                        (goal.required || 0) - totalInvestmentAmount
                      );

                      // Create investment breakdown text
                      const investmentBreakdown = Object.keys(
                        investmentAmountsByType
                      )
                        .filter((type) => investmentAmountsByType[type] > 0)
                        .map(
                          (type) =>
                            `${type}: ₹${Math.round(
                              investmentAmountsByType[type]
                            ).toLocaleString("en-IN")}`
                        )
                        .join(", ");

                      return (
                        <>
                          <View style={styles.resultGrid}>
                            <View style={styles.resultItem}>
                              <Text style={styles.resultLabel}>
                                Future Value
                              </Text>
                              <Text style={styles.resultValue}>
                                {formatCurrency(goal.futureCost)}
                              </Text>
                            </View>
                            <View style={styles.resultItem}>
                              <Text style={styles.resultLabel}>
                                In-hand (Future Value)
                              </Text>
                              <Text style={styles.resultValue}>
                                {formatCurrency(updatedInHand)}
                              </Text>
                            </View>
                            <View style={styles.resultItem}>
                              <Text style={styles.resultLabel}>
                                Amount Needed
                              </Text>
                              <Text style={styles.resultValue}>
                                {formatCurrency(updatedRequired)}
                              </Text>
                            </View>
                            <View style={styles.resultItem}>
                              <Text style={styles.resultLabel}>Time Frame</Text>
                              <Text style={styles.resultValue}>
                                {goal.years} Years
                              </Text>
                            </View>
                          </View>

                          {/* Return Rate Table */}
                          <TouchableOpacity
                            style={styles.returnRateHeader}
                            onPress={() =>
                              setExpandedTables((prev) => ({
                                ...prev,
                                [goal._id]: !prev[goal._id],
                              }))
                            }
                          >
                            <View style={styles.returnRateHeaderContent}>
                              <Ionicons
                                name="calculator-outline"
                                size={18}
                                color="#5b21b6"
                              />
                              <Text style={styles.returnRateTitle}>
                                Monthly SIP for Different Return Rates
                              </Text>
                              <Ionicons
                                name={
                                  expandedTables[goal._id]
                                    ? "chevron-up"
                                    : "chevron-down"
                                }
                                size={18}
                                color="#5b21b6"
                              />
                            </View>
                          </TouchableOpacity>

                          {expandedTables[goal._id] && (
                            <View style={styles.returnRateTable}>
                              <View
                                style={[styles.tableRow, styles.tableHeaderRow]}
                              >
                                <Text style={styles.tableHeader}>
                                  Return Rate
                                </Text>
                                <Text style={styles.tableHeader}>
                                  Monthly SIP Required
                                </Text>
                              </View>
                              {(() => {
                                const sipResults = calculateSIPForReturnRates(
                                  goal,
                                  totalInvestmentAmount
                                );
                                return sipResults.map((result, index) => (
                                  <View
                                    key={`sip-${goal._id}-${result.rate}`}
                                    style={styles.tableRow}
                                  >
                                    <Text style={styles.tableCell}>
                                      {result.rate}%
                                    </Text>
                                    <Text style={styles.tableCell}>
                                      {formatCurrency(result.sip)}
                                    </Text>
                                  </View>
                                ));
                              })()}
                            </View>
                          )}
                        </>
                      );
                    })()}
                  </View>
                )}

                <View style={styles.timestamp}>
                  <View style={styles.timestampContainer}>
                    <Ionicons name="time-outline" size={14} color="#9ca3af" />
                    <Text style={styles.timestampText}>
                      Updated{" "}
                      {new Date(goal.updatedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => editGoal(goal)}
                    style={styles.editButton}
                  >
                    <Ionicons name="create-outline" size={16} color="#6366f1" />
                    <Text style={styles.editHintText}>Edit Goal</Text>
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
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
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
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  picker: {
    height: 50,
    backgroundColor: "transparent",
  },
  pickerItem: {
    fontSize: 16,
    color: "#1f2937",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
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
  calculateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 24,
    marginBottom: 16,
    paddingLeft: 4,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
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
    flexShrink: 1,
  },
  resultSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  goalCardContent: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  tabButtonTextActive: {
    color: "#6366f1",
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
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
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
  timestampContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timestampText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#dbeafe",
    gap: 4,
  },
  editHintText: {
    fontSize: 12,
    color: "#6366f1",
    fontWeight: "500",
  },
  noGoalsContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  noGoalsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 12,
  },
  noGoalsSubText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  filterContainer: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  filterLabel: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    marginRight: 10,
  },
  filterScrollView: {
    flex: 1,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  filterChipActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  investmentNote: {
    fontSize: 12,
    color: "#059669",
    fontStyle: "italic",
    marginTop: 4,
  },
  returnRateHeader: {
    marginBottom: 8,
    marginTop: 8,
  },
  returnRateHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ede9fe",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  returnRateTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#5b21b6",
  },
  returnRateTable: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableHeaderRow: {
    backgroundColor: "#f9fafb",
    borderBottomWidth: 2,
    borderBottomColor: "#e5e7eb",
  },
  tableHeader: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    textAlign: "center",
  },
});
