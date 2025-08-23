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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
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

  // --- NEW: State for Real-time SIP Investment Tracking ---
  const [investmentDate, setInvestmentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(1);
  const [sipHistory, setSipHistory] = useState([]); // Store monthly SIP data
  const [isActiveSIP, setIsActiveSIP] = useState(false);
  const [nextSIPDate, setNextSIPDate] = useState(null);

  // --- State for Results and UI ---
  const [calculationResult, setCalculationResult] = useState(null);
  const [calculationType, setCalculationType] = useState("SIP");
  const [showBreakdown, setShowBreakdown] = useState(false);

  // --- NEW: State for existing investment ---
  const [existingInvestment, setExistingInvestment] = useState(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  // --- NEW: Goals and Delete functionality ---
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [hasInvestedThisMonth, setHasInvestedThisMonth] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [nextAllowedInvestmentDate, setNextAllowedInvestmentDate] =
    useState(null);

  // --- NEW: Enhanced date-based investment control ---
  const [firstInvestmentDate, setFirstInvestmentDate] = useState(null);
  const [showInvestmentDialog, setShowInvestmentDialog] = useState(false);
  const [tempInvestmentData, setTempInvestmentData] = useState(null);
  const [notificationScheduled, setNotificationScheduled] = useState(false);

  useEffect(() => {
    // Changed title to reflect new purpose
    navigation.setOptions({
      title: "Calculate MF",
    });

    // Load existing investment when component mounts
    loadExistingInvestment();
    loadInvestmentStateFromStorage();

    // Load goals for dropdown
    loadGoals();
  }, [navigation]);

  // Add focus listener to reload investment when returning to screen
  useFocusEffect(
    React.useCallback(() => {
      loadExistingInvestment();
      loadInvestmentStateFromStorage();
    }, [])
  );

  // --- NEW: Load investment state from AsyncStorage ---
  const loadInvestmentStateFromStorage = async () => {
    try {
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!userInfo) return;

      const parsedInfo = JSON.parse(userInfo);
      const username = parsedInfo?.user?.username; // Fixed: use same pattern as FD/RD
      if (!username) return;

      const key = `mf_investment_${username}_${fund.schemeCode}`;
      const savedState = await AsyncStorage.getItem(key);

      if (savedState) {
        const state = JSON.parse(savedState);
        console.log("Loaded investment state from storage:", state);

        // Restore investment state
        setCalculationType(state.calculationType || "SIP");
        setExpectedReturn(state.expectedReturn || "12");

        if (state.amount) {
          if (state.calculationType === "SIP") {
            setSipAmount(String(state.amount));
          } else {
            setLumpsumAmount(String(state.amount));
          }
        }

        if (state.firstInvestmentDate) {
          const firstDate = new Date(state.firstInvestmentDate);
          setFirstInvestmentDate(firstDate);
          setInvestmentDate(firstDate);

          // Check if user can invest today for SIP
          if (state.calculationType === "SIP") {
            const today = new Date();
            const dayOfMonth = firstDate.getDate();

            // Check if at least a month has passed and it's the right day
            const monthsPassed =
              (today.getFullYear() - firstDate.getFullYear()) * 12 +
              (today.getMonth() - firstDate.getMonth());

            if (monthsPassed > 0 && today.getDate() === dayOfMonth) {
              setHasInvestedThisMonth(false); // Allow investment
            } else {
              setHasInvestedThisMonth(true); // Prevent investment
            }

            const nextDate = calculateNextInvestmentDate(firstDate);
            setNextAllowedInvestmentDate(nextDate);
          }
        }

        // Auto-calculate results
        setTimeout(() => {
          if (state.calculationType === "SIP" && state.amount) {
            handleSIPCalculation(String(state.amount));
          } else if (state.calculationType === "LUMPSUM" && state.amount) {
            handleLumpsumCalculation(String(state.amount));
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error loading investment state from storage:", error);
    }
  };

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

      // Use the specific scheme endpoint instead of fetching all investments
      const response = await fetch(
        buildURL(`/mf-investment/scheme/${fund.schemeCode}`),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const existing = await response.json();
        console.log("Loaded existing investment:", existing);

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
            const startDate = new Date(existing.startDate);
            setInvestmentDate(startDate);

            // Set first investment date for date-based restrictions
            setFirstInvestmentDate(startDate);

            // Calculate next allowed investment date for SIP
            if (existing.calculationType === "SIP" || existing.monthlyDeposit) {
              const nextDate = calculateNextInvestmentDate(startDate);
              setNextAllowedInvestmentDate(nextDate);

              // Check if user has invested within the last 30 days (strict rule)
              const today = new Date();
              const daysSinceLastInvestment = Math.floor(
                (today - startDate) / (1000 * 60 * 60 * 24)
              );

              if (daysSinceLastInvestment < 30) {
                setHasInvestedThisMonth(true);
              }
            }
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

  // --- NEW: Load goals for dropdown ---
  // --- NEW: Helper function to get goal display name like FD/RD ---
  const loadGoals = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        console.log("No userInfo found in AsyncStorage");
        return;
      }

      const userInfo = JSON.parse(userInfoString);
      const username = userInfo?.user?.username; // Fixed: use same pattern as FD/RD
      if (!username) {
        console.log("No username found in userInfo:", userInfo);
        return;
      }

      console.log("Fetching goals for username:", username);
      const response = await fetch(buildURL(`${ENDPOINTS.GOALS}/${username}`), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const goalsData = await response.json();
        setGoals(goalsData);
        console.log(
          "Successfully fetched",
          goalsData.length,
          "goals for MF:",
          goalsData
        );
      } else {
        console.error(
          "Failed to fetch goals:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error loading goals:", error);
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

  // --- Real-time SIP Calculation with Monthly Investment ---
  const calculateRealTimeSIP = () => {
    const monthlyAmount = parseFloat(sipAmount);
    const currentNAV = parseFloat(fund.nav);

    if (isNaN(monthlyAmount) || monthlyAmount <= 0) {
      Alert.alert("Error", "Please enter valid SIP amount.");
      return;
    }

    // First month investment
    const firstMonthUnits = monthlyAmount / currentNAV;
    const firstMonthData = {
      month: 1,
      date: new Date(investmentDate),
      invested: monthlyAmount,
      nav: currentNAV,
      units: firstMonthUnits,
      totalInvested: monthlyAmount,
      totalUnits: firstMonthUnits,
      currentValue: firstMonthUnits * currentNAV,
      profit: 0,
    };

    // Calculate next SIP date (same date next month)
    const nextDate = new Date(investmentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);

    // Handle month-end dates (30/31)
    if (investmentDate.getDate() > 28) {
      nextDate.setDate(0); // Set to last day of month
      nextDate.setDate(nextDate.getDate() + 1); // Adjust to correct last day
    }

    setSipHistory([firstMonthData]);
    setCurrentMonth(1);
    setNextSIPDate(nextDate);
    setIsActiveSIP(true);

    // Set result for first month
    setCalculationResult({
      type: "REAL_TIME_SIP",
      monthlyAmount: monthlyAmount,
      currentMonth: 1,
      totalInvestment: monthlyAmount,
      totalUnits: firstMonthUnits,
      averageNAV: currentNAV,
      currentNAV: currentNAV,
      currentValue: firstMonthUnits * currentNAV,
      totalReturns: 0,
      profitPercentage: 0,
      sipHistory: [firstMonthData],
      nextSIPDate: nextDate,
      startDate: investmentDate,
      isActiveSIP: true,
    });

    console.log("First Month SIP Investment:", firstMonthData);
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
      selectedGoal,
    });

    // Validate goal selection
    if (!selectedGoal) {
      Alert.alert(
        "Select a Goal",
        "Please select a goal before calculating. This helps track your investments towards specific financial objectives.",
        [
          {
            text: "Select Goal",
            onPress: () => setShowGoalModal(true),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
      return;
    }

    if (calculationType === "SIP") {
      console.log("Starting Real-time SIP");
      calculateRealTimeSIP();
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

  // --- NEW: Enhanced date-based investment checking ---
  const canInvestToday = () => {
    if (!firstInvestmentDate && !nextAllowedInvestmentDate) return true;

    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // If we have a first investment date, check if today matches the allowed date
    if (firstInvestmentDate) {
      const firstDate = new Date(firstInvestmentDate);
      const expectedDay = firstDate.getDate();

      // Check if today's date matches the investment day and we're in a new month
      if (todayDate === expectedDay) {
        // Check if we're in a different month than the last investment
        if (nextAllowedInvestmentDate) {
          const nextDate = new Date(nextAllowedInvestmentDate);
          return today >= nextDate;
        }
        return true;
      }
      return false;
    }

    // Fallback to original logic if no first investment date
    if (!nextAllowedInvestmentDate) return true;
    const allowedDate = new Date(nextAllowedInvestmentDate);
    today.setHours(0, 0, 0, 0);
    allowedDate.setHours(0, 0, 0, 0);
    return today >= allowedDate;
  };

  // --- NEW: Calculate remaining days until next investment ---
  const getRemainingDaysToInvest = () => {
    if (!firstInvestmentDate) return 0;

    const today = new Date();
    const firstDate = new Date(firstInvestmentDate);

    // Calculate 30 days from first investment
    const thirtyDaysFromFirst = new Date(firstDate);
    thirtyDaysFromFirst.setDate(thirtyDaysFromFirst.getDate() + 30);

    // If less than 30 days have passed, return days until 30-day mark
    if (today < thirtyDaysFromFirst) {
      return Math.ceil((thirtyDaysFromFirst - today) / (1000 * 60 * 60 * 24));
    }

    // If 30+ days have passed, calculate next SIP date
    const expectedDay = firstDate.getDate();
    const nextInvestment = new Date(today);
    nextInvestment.setDate(expectedDay);

    // If the day has passed this month, move to next month
    if (
      today.getDate() > expectedDay ||
      (today.getDate() === expectedDay && hasInvestedThisMonth)
    ) {
      nextInvestment.setMonth(nextInvestment.getMonth() + 1);
    }

    // Handle month-end dates
    if (expectedDay > 28) {
      const lastDayOfMonth = new Date(
        nextInvestment.getFullYear(),
        nextInvestment.getMonth() + 1,
        0
      ).getDate();
      if (expectedDay > lastDayOfMonth) {
        nextInvestment.setDate(lastDayOfMonth);
      }
    }

    const diffTime = nextInvestment.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(diffDays, 0);
  };

  // --- NEW: Check if today is the exact investment date ---
  const isTodayInvestmentDate = () => {
    if (!firstInvestmentDate) return true;

    const today = new Date();
    const firstDate = new Date(firstInvestmentDate);

    // Check if it's the first investment
    if (!hasInvestedThisMonth) return true;

    // If user has invested this month, check if at least 30 days have passed
    const daysSinceLastInvestment = Math.floor(
      (today - firstDate) / (1000 * 60 * 60 * 24)
    );

    // Strict 30-day rule: user can only invest after 30 days
    if (daysSinceLastInvestment < 30) {
      return false;
    }

    // Check if it's the same date in a new month
    const isSameDateInMonth = today.getDate() === firstDate.getDate();

    // Allow investment only if:
    // 1. At least 30 days have passed
    // 2. It's the same date in the new month
    // 3. User hasn't invested this month yet
    return isSameDateInMonth && !hasInvestedThisMonth;
  };

  // --- NEW: Calculate next allowed investment date ---
  const calculateNextInvestmentDate = (lastInvestmentDate) => {
    const nextDate = new Date(lastInvestmentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);

    // Handle month-end dates (30/31)
    if (lastInvestmentDate.getDate() > 28) {
      nextDate.setDate(0); // Set to last day of month
      nextDate.setDate(nextDate.getDate() + 1); // Adjust to correct last day
    }

    return nextDate;
  };

  // --- NEW: Show investment permission dialog ---
  const showInvestmentPermissionDialog = () => {
    if (!selectedGoal) {
      Alert.alert("Error", "Please select a goal to invest in.");
      return;
    }

    const investmentAmount =
      calculationType === "SIP"
        ? parseFloat(sipAmount)
        : parseFloat(lumpsumAmount);

    if (!investmentAmount || investmentAmount <= 0) {
      Alert.alert("Error", "Please enter a valid investment amount.");
      return;
    }

    // Store temporary investment data
    setTempInvestmentData({
      amount: investmentAmount,
      goal: selectedGoal,
      type: calculationType,
      date: new Date(),
    });

    // Show custom confirmation modal
    setShowConfirmModal(true);
  };

  // --- NEW: Schedule notification for next SIP ---
  const scheduleNextSIPNotification = (nextDate, fundName, amount) => {
    // Calculate notification date (2 days before SIP date)
    const notificationDate = new Date(nextDate);
    notificationDate.setDate(notificationDate.getDate() - 2);

    // Only schedule if notification date is in the future
    if (notificationDate > new Date()) {
      PushNotification.localNotificationSchedule({
        id: `sip_${fund.schemeCode}_${Date.now()}`,
        title: "SIP Investment Reminder 💰",
        message: `Your ₹${amount.toLocaleString()} SIP for ${fundName} is due on ${nextDate.toLocaleDateString(
          "en-IN"
        )}`,
        date: notificationDate,
        allowWhileIdle: true,
        repeatType: null,
      });

      console.log(
        `✅ SIP notification scheduled for ${notificationDate.toLocaleString()}`
      );
    }
  };

  // --- NEW: Process the confirmed investment ---
  const processInvestment = async () => {
    if (!tempInvestmentData) return;

    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Authentication Error", "You must be logged in.");
        return;
      }

      const userInfo = JSON.parse(userInfoString);
      const { token, username } = userInfo;

      if (!token) {
        Alert.alert("Authentication Error", "Token not found.");
        return;
      }

      // 🔹 STEP 1: Create MF investment record FIRST (primary operation)
      const mfInvestmentData = {
        schemeCode: fund.schemeCode,
        schemeName: fund.schemeName,
        amount: tempInvestmentData.amount,
        units: tempInvestmentData.amount / parseFloat(fund.nav),
        nav: parseFloat(fund.nav),
        currentNAV: parseFloat(fund.nav),
        averageNAV: parseFloat(fund.nav),
        calculationType: calculationType,
        investmentDate: investmentDate.toISOString(),
        sipDate: calculationType === "SIP" ? investmentDate.getDate() : null,
        interestRate: parseFloat(expectedReturn) || 12,
        goalId: tempInvestmentData.goal._id, // Link to goal for tracking
        investmentType: "Mutual Fund", // Explicit investment type for pie chart
      };

      console.log("🚀 Creating MF investment:", mfInvestmentData);

      const mfResponse = await fetch(buildURL(ENDPOINTS.CREATE_MF_INVESTMENT), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mfInvestmentData),
      });

      if (!mfResponse.ok) {
        const errorText = await mfResponse.text();
        console.error("❌ MF investment creation failed:", errorText);
        throw new Error(`Failed to create MF investment: ${errorText}`);
      }

      const savedMFInvestment = await mfResponse.json();
      console.log(
        "✅ MF investment created successfully:",
        savedMFInvestment._id
      );
      console.log("✅ MF investment goalId:", savedMFInvestment.goalId);
      console.log("✅ MF investment type:", savedMFInvestment.investmentType);
      console.log("✅ Full MF investment data:", savedMFInvestment);

      // 🔹 STEP 2: Update the selected goal (secondary operation)
      const updatedGoal = {
        ...tempInvestmentData.goal,
        currentAmount:
          tempInvestmentData.goal.currentAmount + tempInvestmentData.amount,
        lastUpdated: new Date().toISOString(),
        investments: [
          ...(tempInvestmentData.goal.investments || []),
          {
            type: "Mutual Fund",
            name: fund.schemeName,
            amount: tempInvestmentData.amount,
            investmentType: calculationType,
            date: investmentDate.toISOString(),
            nav: parseFloat(fund.nav),
            units: tempInvestmentData.amount / parseFloat(fund.nav),
            mfInvestmentId: savedMFInvestment._id, // Link to MF investment
          },
        ],
      };

      const goalResponse = await fetch(
        buildURL(
          `${ENDPOINTS.GOALS}/${username}/${tempInvestmentData.goal._id}`
        ),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedGoal),
        }
      );

      if (!goalResponse.ok) {
        console.warn(
          "Goal update failed, but MF investment was created successfully"
        );
        // Don't throw error - MF investment is the primary record
      } else {
        console.log("✅ Goal updated successfully");

        // 🔹 STEP 3: Create a transaction record for calendar display
        const transactionData = {
          amount: tempInvestmentData.amount,
          type: "Investment",
          subType: "Mutual Fund",
          description: `MF Investment: ${fund.schemeName}`,
          date: investmentDate.toISOString().split("T")[0], // YYYY-MM-DD format
          goalId: tempInvestmentData.goal._id,
          investmentId: savedMFInvestment._id, // Link to the MF investment
          units: tempInvestmentData.amount / parseFloat(fund.nav),
          nav: parseFloat(fund.nav),
        };

        console.log("📅 Creating transaction for calendar:", transactionData);

        const transactionResponse = await fetch(
          "https://ligths-backend.onrender.com/transactions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(transactionData),
          }
        );

        if (transactionResponse.ok) {
          console.log("✅ Transaction created successfully for calendar");
        } else {
          console.warn(
            "⚠️ Transaction creation failed, but MF investment was created successfully"
          );
        }
      }

      // Set first investment date if this is the first investment
      if (!firstInvestmentDate) {
        setFirstInvestmentDate(tempInvestmentData.date);
      }

      // For SIP, set the next allowed investment date
      if (calculationType === "SIP") {
        const nextInvestmentDate = calculateNextInvestmentDate(
          tempInvestmentData.date
        );
        setNextAllowedInvestmentDate(nextInvestmentDate);
        setHasInvestedThisMonth(true);

        // Schedule notification for next SIP only if user enabled it
        if (enableNotifications) {
          try {
            scheduleNextSIPNotification(
              nextInvestmentDate,
              fund.schemeName,
              tempInvestmentData.amount
            );
          } catch (notifError) {
            console.warn("Failed to schedule SIP notification:", notifError);
          }
        }
      }

      // Save investment state to AsyncStorage for persistence
      try {
        const investmentState = {
          fundSchemeCode: fund.schemeCode,
          fundSchemeName: fund.schemeName,
          calculationType: calculationType,
          amount: tempInvestmentData.amount,
          firstInvestmentDate: tempInvestmentData.date.toISOString(),
          hasInvestedThisMonth: calculationType === "SIP",
          expectedReturn: expectedReturn,
          goalId: tempInvestmentData.goal._id,
          lastUpdated: new Date().toISOString(),
          mfInvestmentId: savedMFInvestment._id,
        };

        const userInfo = await AsyncStorage.getItem("userInfo");
        const parsedInfo = JSON.parse(userInfo);
        const username = parsedInfo?.user?.username; // Fixed: use same pattern as FD/RD
        const key = `mf_investment_${username}_${fund.schemeCode}`;

        await AsyncStorage.setItem(key, JSON.stringify(investmentState));
        console.log("Investment state saved to AsyncStorage");
      } catch (storageError) {
        console.warn("Failed to save investment state:", storageError.message);
      }

      // Reset form fields
      setSipAmount("");
      setLumpsumAmount("");
      setSelectedGoal(null);
      setCalculationResult(null);

      EventRegister.emit("goalUpdated");
      EventRegister.emit("investmentAdded");
      EventRegister.emit("transactionAdded"); // Also emit transaction event for calendar
      console.log(
        "📡 🚨 EVENTS EMITTED: goalUpdated, investmentAdded, transactionAdded"
      );
      console.log("📡 Event emitted at:", new Date().toISOString());
      Alert.alert(
        "Investment Successful! 🎉",
        `₹${tempInvestmentData.amount.toLocaleString()} has been invested in ${
          fund.schemeName
        }!\n\n` +
          `Investment ID: ${savedMFInvestment._id.slice(-6)}\n` +
          `Goal: "${
            tempInvestmentData.goal?.description &&
            tempInvestmentData.goal?.description.trim() !== ""
              ? tempInvestmentData.goal.description
              : tempInvestmentData.goal?.name === "Custom Goal"
              ? tempInvestmentData.goal.customName
              : tempInvestmentData.goal?.name || "Unknown Goal"
          }"\n` +
          `Progress: ₹${updatedGoal.currentAmount.toLocaleString()} / ₹${tempInvestmentData.goal.targetAmount.toLocaleString()}${
            calculationType === "SIP"
              ? `\n\nNext SIP scheduled for: ${calculateNextInvestmentDate(
                  tempInvestmentData.date
                ).toLocaleDateString("en-IN")}`
              : ""
          }`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("❌ Investment processing error:", error);
      Alert.alert("Error", `Failed to process investment: ${error.message}`);
    } finally {
      setTempInvestmentData(null);
    }
  };

  // --- NEW: Schedule notification for next investment date ---
  const scheduleNotification = () => {
    const remainingDays = getRemainingDaysToInvest();

    Alert.alert(
      "Notification Scheduled",
      `We'll notify you ${remainingDays} day${
        remainingDays !== 1 ? "s" : ""
      } before your next investment date.\n\n` +
        `Next investment: ${new Date(
          Date.now() + remainingDays * 24 * 60 * 60 * 1000
        ).toLocaleDateString("en-IN")}`,
      [{ text: "OK" }]
    );

    setNotificationScheduled(true);

    // Here you would implement actual notification scheduling
    // using libraries like @react-native-async-storage/async-storage
    // and Expo Notifications or similar
  };

  // --- NEW: Delete existing investment ---
  const deleteInvestment = async () => {
    if (!existingInvestment) return;

    Alert.alert(
      "Delete Investment",
      `Are you sure you want to delete your investment in ${fund.schemeName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const userInfoString = await AsyncStorage.getItem("userInfo");
              if (!userInfoString) {
                Alert.alert("Error", "Authentication required.");
                return;
              }

              const token = JSON.parse(userInfoString).token;
              const response = await fetch(
                buildURL(
                  `${ENDPOINTS.DELETE_MF_INVESTMENT}/${existingInvestment._id}`
                ),
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (response.ok) {
                EventRegister.emit("investmentAdded");
                Alert.alert("Success", "Investment deleted successfully!", [
                  { text: "OK", onPress: () => navigation.goBack() },
                ]);
              } else {
                throw new Error("Failed to delete investment");
              }
            } catch (error) {
              Alert.alert(
                "Error",
                `Failed to delete investment: ${error.message}`
              );
            }
          },
        },
      ]
    );
  };

  // --- NEW: Add investment to selected goal (updated with enhanced date checking) ---
  const addToGoal = async () => {
    if (!selectedGoal) {
      Alert.alert("Error", "Please select a goal to invest in.");
      return;
    }

    // Enhanced date checking for SIP
    if (calculationType === "SIP") {
      if (!isTodayInvestmentDate()) {
        const remainingDays = getRemainingDaysToInvest();

        Alert.alert(
          "Investment Not Allowed Yet",
          `You can only invest on the ${
            firstInvestmentDate
              ? new Date(firstInvestmentDate).getDate()
              : "same"
          } day of each month.\n\n` +
            `Remaining days until next investment: ${remainingDays}\n\n` +
            `Would you like to be notified when it's time to invest?`,
          [
            { text: "Maybe Later", style: "cancel" },
            {
              text: "Notify Me",
              style: "default",
              onPress: scheduleNotification,
            },
          ]
        );
        return;
      }
    }

    // Show permission dialog
    showInvestmentPermissionDialog();
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
                <Text style={styles.inputLabel}>
                  Monthly SIP Amount (₹)
                  {isActiveSIP && (
                    <Text style={styles.editableLabel}>
                      {" "}
                      - Editable for Next Month
                    </Text>
                  )}
                </Text>
                <TextInput
                  style={[styles.input, isActiveSIP && styles.editableInput]}
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

          {/* Goals Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Link to Goal</Text>
            <TouchableOpacity
              style={styles.goalSelector}
              onPress={() => setShowGoalModal(true)}
            >
              <Text style={styles.goalSelectorText}>
                {selectedGoal
                  ? selectedGoal.description &&
                    selectedGoal.description.trim() !== ""
                    ? selectedGoal.description
                    : selectedGoal.name === "Custom Goal"
                    ? selectedGoal.customName
                    : selectedGoal.name
                  : "Select a goal"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.calculateButton}
            onPress={handleCalculate}
          >
            <Ionicons name="calculator" size={20} color="#FFFFFF" />
            <Text style={styles.calculateButtonText}>
              {calculationType === "SIP"
                ? "Calculate SIP"
                : "Calculate Lumpsum"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results Display */}
        {calculationResult && (
          <View style={styles.resultContainer}>
            <View style={styles.resultTitleContainer}>
              <Text style={styles.resultTitle}>
                {calculationResult.type === "REAL_TIME_SIP"
                  ? `SIP Progress - Month ${calculationResult.currentMonth}`
                  : "Projected Growth"}
              </Text>
              {calculationResult.type === "REAL_TIME_SIP" && (
                <View style={styles.liveBadge}>
                  <Ionicons name="pulse" size={12} color="#EF4444" />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>

            <View style={styles.resultGrid}>
              {/* Next SIP Date - Only for Real-time SIP */}
              {calculationResult.type === "REAL_TIME_SIP" &&
                calculationResult.nextSIPDate && (
                  <View style={styles.nextSipContainer}>
                    <Ionicons name="calendar" size={16} color="#3B82F6" />
                    <Text style={styles.nextSipText}>
                      Next SIP:{" "}
                      {calculationResult.nextSIPDate.toLocaleDateString(
                        "en-IN"
                      )}
                    </Text>
                  </View>
                )}

              {calculationResult.type === "REAL_TIME_SIP" ? (
                <>
                  {/* Monthly SIP Amount */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Monthly SIP Amount</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculationResult.monthlyAmount)}
                    </Text>
                  </View>

                  {/* Current Month */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Investment Month</Text>
                    <Text style={styles.resultValue}>
                      Month {calculationResult.currentMonth}
                    </Text>
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
                    <Text style={styles.resultLabel}>Total Units Owned</Text>
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

                  {/* Latest Month NAV */}
                  {calculationResult.latestMonthNAV && (
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>Latest Month NAV</Text>
                      <Text style={styles.resultValue}>
                        {formatCurrency(calculationResult.latestMonthNAV)}
                      </Text>
                    </View>
                  )}

                  {/* Current Portfolio Value */}
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>
                      Current Portfolio Value
                    </Text>
                    <Text style={[styles.resultValue, styles.highlightValue]}>
                      {formatCurrency(calculationResult.currentValue)}
                    </Text>
                  </View>

                  {/* Total Profit/Loss */}
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
                      {formatCurrency(Math.abs(calculationResult.totalReturns))}
                      {calculationResult.profitPercentage !== undefined && (
                        <Text style={styles.percentageText}>
                          {" "}
                          ({calculationResult.profitPercentage >= 0 ? "+" : ""}
                          {calculationResult.profitPercentage.toFixed(1)}%)
                        </Text>
                      )}
                    </Text>
                  </View>
                </>
              ) : calculationResult.type === "SIP" ? (
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

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              {/* Enhanced Investment Status Info for SIP */}
              {calculationType === "SIP" && (
                <View style={styles.investmentStatusContainer}>
                  <Ionicons
                    name={isTodayInvestmentDate() ? "checkmark-circle" : "time"}
                    size={16}
                    color={isTodayInvestmentDate() ? "#059669" : "#F59E0B"}
                  />
                  <Text style={styles.investmentStatusText}>
                    {isTodayInvestmentDate()
                      ? "Today is your investment date!"
                      : firstInvestmentDate
                      ? `Investment allowed on ${new Date(
                          firstInvestmentDate
                        ).getDate()}${
                          ["th", "st", "nd", "rd"][
                            new Date(firstInvestmentDate).getDate() % 10 > 3
                              ? 0
                              : new Date(firstInvestmentDate).getDate() % 10
                          ]
                        } of each month`
                      : "First investment can be made anytime"}
                  </Text>
                </View>
              )}

              {/* Remaining Days Info for early investment attempts */}
              {calculationType === "SIP" &&
                !isTodayInvestmentDate() &&
                firstInvestmentDate && (
                  <View style={styles.remainingDaysContainer}>
                    <Ionicons name="calendar" size={14} color="#6B7280" />
                    <Text style={styles.remainingDaysText}>
                      {getRemainingDaysToInvest()} days remaining until next
                      investment
                    </Text>
                  </View>
                )}

              {/* Add to Goal Button */}
              <TouchableOpacity
                style={[
                  styles.addToGoalButton,
                  calculationType === "SIP" &&
                    !isTodayInvestmentDate() &&
                    styles.disabledButton,
                ]}
                onPress={addToGoal}
                disabled={calculationType === "SIP" && !isTodayInvestmentDate()}
              >
                <Ionicons
                  name="flag"
                  size={20}
                  color={
                    calculationType === "SIP" && !isTodayInvestmentDate()
                      ? "#9CA3AF"
                      : "#FFFFFF"
                  }
                />
                <Text
                  style={[
                    styles.addToGoalButtonText,
                    calculationType === "SIP" &&
                      !isTodayInvestmentDate() &&
                      styles.disabledButtonText,
                  ]}
                >
                  {calculationType === "SIP" && !isTodayInvestmentDate()
                    ? "Investment Scheduled"
                    : calculationType === "SIP"
                    ? "Invest This Month"
                    : "Add to Goal"}
                </Text>
              </TouchableOpacity>

              {/* Notify Me Button - Show when investment is not allowed */}
              {calculationType === "SIP" &&
                !isTodayInvestmentDate() &&
                firstInvestmentDate && (
                  <TouchableOpacity
                    style={styles.notifyButton}
                    onPress={scheduleNotification}
                    disabled={notificationScheduled}
                  >
                    <Ionicons
                      name={
                        notificationScheduled
                          ? "checkmark-circle"
                          : "notifications"
                      }
                      size={20}
                      color={notificationScheduled ? "#059669" : "#3B82F6"}
                    />
                    <Text
                      style={[
                        styles.notifyButtonText,
                        notificationScheduled && styles.notifiedText,
                      ]}
                    >
                      {notificationScheduled ? "Notification Set" : "Notify Me"}
                    </Text>
                  </TouchableOpacity>
                )}

              {/* Delete Button - Only show if existing investment */}
              {existingInvestment && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={deleteInvestment}
                >
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* SIP History Section - Only for Real-time SIP */}
            {calculationResult.type === "REAL_TIME_SIP" &&
              calculationResult.sipHistory && (
                <View style={styles.historySection}>
                  <TouchableOpacity
                    style={styles.toggleHistoryButton}
                    onPress={() => setShowBreakdown(!showBreakdown)}
                  >
                    <Ionicons
                      name={showBreakdown ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#059669"
                    />
                    <Text style={styles.toggleHistoryText}>
                      {showBreakdown ? "Hide" : "Show"} SIP Investment History (
                      {calculationResult.sipHistory.length} months)
                    </Text>
                  </TouchableOpacity>

                  {showBreakdown && (
                    <View style={styles.historyContent}>
                      <View style={styles.historyTitleSection}>
                        <Ionicons name="calendar" size={20} color="#059669" />
                        <Text style={styles.historyTitle}>
                          Your SIP Investment Journey
                        </Text>
                      </View>

                      {/* SIP History Table */}
                      <View style={styles.historyTable}>
                        <View style={styles.tableHeader}>
                          <Text style={styles.tableHeaderCell}>Month</Text>
                          <Text style={styles.tableHeaderCell}>Invested</Text>
                          <Text style={styles.tableHeaderCell}>NAV</Text>
                          <Text style={styles.tableHeaderCell}>Units</Text>
                        </View>

                        {calculationResult.sipHistory.map(
                          (monthData, index) => (
                            <View key={index} style={styles.tableDataRow}>
                              <Text style={styles.tableCell}>
                                Month {monthData.month}
                              </Text>
                              <Text style={styles.tableCell}>
                                ₹{monthData.invested.toLocaleString()}
                              </Text>
                              <Text style={styles.tableCell}>
                                ₹{monthData.nav.toFixed(2)}
                              </Text>
                              <Text style={styles.tableCell}>
                                {monthData.units.toFixed(2)}
                              </Text>
                            </View>
                          )
                        )}
                      </View>

                      <View style={styles.historySummary}>
                        <Text style={styles.historySummaryText}>
                          🎯 Your SIP shows the power of rupee cost averaging -
                          you bought more units when NAV was low and fewer when
                          it was high, leading to a better average NAV!
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

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

                    <View style={styles.historySummary}>
                      <Text style={styles.historySummaryText}>
                        🎯 Your SIP shows the power of rupee cost averaging -
                        you bought more units when NAV was low and fewer when it
                        was high, leading to a better average NAV!
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Goal Selection Modal */}
      <Modal
        visible={showGoalModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a goal</Text>
              <TouchableOpacity
                onPress={() => setShowGoalModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.goalsList}
              showsVerticalScrollIndicator={false}
            >
              {goals.length === 0 ? (
                <View style={styles.noGoalsContainer}>
                  <Text style={styles.noGoalsText}>
                    No goals found. Create a goal first!
                  </Text>
                  <TouchableOpacity
                    style={styles.createGoalButton}
                    onPress={() => {
                      setShowGoalModal(false);
                      navigation.navigate("GoalCalculator");
                    }}
                  >
                    <Text style={styles.createGoalButtonText}>Create Goal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                goals.map((goal) => (
                  <TouchableOpacity
                    key={goal._id}
                    style={[
                      styles.goalOption,
                      selectedGoal?._id === goal._id &&
                        styles.selectedGoalOption,
                    ]}
                    onPress={() => {
                      setSelectedGoal(goal);
                      setShowGoalModal(false);
                    }}
                  >
                    <Text style={styles.goalOptionText}>
                      {goal.description && goal.description.trim() !== ""
                        ? goal.description
                        : goal.name === "Custom Goal"
                        ? goal.customName
                        : goal.name}
                    </Text>
                    {goal.targetAmount && (
                      <Text style={styles.goalAmountText}>
                        Target: ₹{goal.targetAmount.toLocaleString("en-IN")}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Investment Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContainer}>
            {/* Header */}
            <View style={styles.confirmModalHeader}>
              <View style={styles.confirmHeaderIcon}>
                <Ionicons name="wallet" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.confirmModalTitle}>Confirm Investment</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowConfirmModal(false);
                  setTempInvestmentData(null);
                }}
                style={styles.confirmCloseButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Investment Details */}
            <View style={styles.investmentDetailsSection}>
              <View style={styles.investmentDetailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="business" size={18} color="#10B981" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Fund</Text>
                  <Text style={styles.detailValue}>{fund.schemeName}</Text>
                </View>
              </View>

              <View style={styles.investmentDetailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="cash" size={18} color="#F59E0B" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValueAmount}>
                    ₹{tempInvestmentData?.amount?.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>

              <View style={styles.investmentDetailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons
                    name={calculationType === "SIP" ? "repeat" : "trending-up"}
                    size={18}
                    color="#8B5CF6"
                  />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Investment Type</Text>
                  <Text style={styles.detailValue}>
                    {calculationType === "SIP"
                      ? "Systematic Investment Plan"
                      : "Lumpsum Investment"}
                  </Text>
                </View>
              </View>

              <View style={styles.investmentDetailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="flag" size={18} color="#EF4444" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Goal</Text>
                  <Text style={styles.detailValue}>
                    {selectedGoal?.description &&
                    selectedGoal?.description.trim() !== ""
                      ? selectedGoal.description
                      : selectedGoal?.name === "Custom Goal"
                      ? selectedGoal.customName
                      : selectedGoal?.name || "Unknown Goal"}
                  </Text>
                </View>
              </View>

              <View style={styles.investmentDetailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="calendar" size={18} color="#06B6D4" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Investment Date</Text>
                  <Text style={styles.detailValue}>
                    {investmentDate.toLocaleDateString("en-IN")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Notification Option */}
            {calculationType === "SIP" && (
              <TouchableOpacity
                style={[
                  styles.notificationSection,
                  !enableNotifications && styles.notificationSectionDisabled,
                ]}
                onPress={() => setEnableNotifications(!enableNotifications)}
                activeOpacity={0.7}
              >
                <View style={styles.notificationIconContainer}>
                  <Ionicons
                    name={
                      enableNotifications
                        ? "notifications"
                        : "notifications-off"
                    }
                    size={20}
                    color={enableNotifications ? "#3B82F6" : "#9CA3AF"}
                  />
                </View>
                <View style={styles.notificationTextContainer}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      !enableNotifications && styles.notificationTitleDisabled,
                    ]}
                  >
                    SIP Reminder{" "}
                    {enableNotifications ? "(Enabled)" : "(Disabled)"}
                  </Text>
                  <Text
                    style={[
                      styles.notificationSubtitle,
                      !enableNotifications &&
                        styles.notificationSubtitleDisabled,
                    ]}
                  >
                    {enableNotifications
                      ? "We'll notify you for your next SIP investment"
                      : "Tap to enable SIP investment reminders"}
                  </Text>
                </View>
                <Ionicons
                  name={
                    enableNotifications
                      ? "checkmark-circle"
                      : "radio-button-off"
                  }
                  size={24}
                  color={enableNotifications ? "#10B981" : "#9CA3AF"}
                />
              </TouchableOpacity>
            )}

            {/* Action Buttons */}
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  setTempInvestmentData(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  // Keep tempInvestmentData so user can re-open modal with same data
                }}
              >
                <Ionicons name="create" size={18} color="#3B82F6" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  processInvestment();
                }}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>

            {/* Disclaimer */}
            <Text style={styles.disclaimer}>
              This investment will be added to your portfolio and linked to your
              selected goal.
            </Text>
          </View>
        </View>
      </Modal>
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
  editableInput: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
  },
  editableLabel: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
    fontStyle: "italic",
  },
  goalSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f8fafc",
  },
  goalSelectorText: {
    fontSize: 16,
    color: "#1f2937",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "90%",
    maxHeight: "70%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  closeButton: {
    padding: 4,
  },
  goalsList: {
    maxHeight: 400,
  },
  goalOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  selectedGoalOption: {
    backgroundColor: "#eff6ff",
  },
  goalOptionText: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  goalAmountText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  noGoalsContainer: {
    padding: 40,
    alignItems: "center",
  },
  noGoalsText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  createGoalButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createGoalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Confirmation Modal Styles
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmModalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  confirmHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    flex: 1,
  },
  confirmCloseButton: {
    padding: 4,
  },
  investmentDetailsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  investmentDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "600",
  },
  detailValueAmount: {
    fontSize: 18,
    color: "#059669",
    fontWeight: "700",
  },
  notificationSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  notificationIconContainer: {
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  notificationSectionDisabled: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  notificationTitleDisabled: {
    color: "#9ca3af",
  },
  notificationSubtitleDisabled: {
    color: "#d1d5db",
  },
  confirmModalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "600",
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3b82f6",
    backgroundColor: "#ffffff",
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "700",
  },
  disclaimer: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    lineHeight: 16,
  },
  actionButtonsContainer: {
    flexDirection: "column",
    gap: 12,
    marginTop: 20,
  },
  investmentStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  investmentStatusText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  addToGoalButton: {
    backgroundColor: "#059669",
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addToGoalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#E5E7EB",
    opacity: 0.6,
  },
  disabledButtonText: {
    color: "#9CA3AF",
  },
  deleteButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "center",
    minWidth: 120,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
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
  continueButton: {
    backgroundColor: "#059669",
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  continueButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  nextMonthInstruction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  instructionText: {
    fontSize: 13,
    color: "#1E40AF",
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  liveText: {
    fontSize: 10,
    color: "#EF4444",
    fontWeight: "bold",
    marginLeft: 4,
  },
  nextSipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  nextSipText: {
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "600",
    marginLeft: 8,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: "500",
  },
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
  // SIP History Section Styles
  historySection: {
    marginTop: 20,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    overflow: "hidden",
  },
  toggleHistoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D1FAE5",
  },
  toggleHistoryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#059669",
    marginLeft: 8,
  },
  historyContent: {
    padding: 20,
  },
  historyTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginLeft: 8,
  },
  historyTable: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    overflow: "hidden",
    marginBottom: 16,
  },
  historySummary: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  historySummaryText: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
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
  // --- NEW: Enhanced investment status styles ---
  remainingDaysContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  remainingDaysText: {
    fontSize: 12,
    color: "#92400E",
    marginLeft: 4,
  },
  notifyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
    justifyContent: "center",
  },
  notifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  notifiedText: {
    color: "#059669",
  },
  disabledButtonText: {
    color: "#9CA3AF",
  },
});

export default MFCalculator;
