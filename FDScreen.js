import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { EventRegister } from "react-native-event-listeners";
import { Picker } from "@react-native-picker/picker";

const API_URL = "https://ligths-backend.onrender.com";

export default function FDScreen({ navigation }) {
  const [investments, setInvestments] = useState([]);
  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [maturityDate, setMaturityDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation reference for the loading icon
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    fetchInvestments();
    fetchGoals();
  }, []);

  // Start rotation animation when loading
  useEffect(() => {
    if (loading) {
      const startRotation = () => {
        rotateAnim.setValue(0);
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ).start();
      };
      startRotation();
    }
  }, [loading]);

  // Interpolate rotation value
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const fetchInvestments = async () => {
    try {
      setLoading(true);

      // Get user info from AsyncStorage
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "User not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      const parsedInfo = JSON.parse(userInfoString);
      const token = parsedInfo.token;

      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please log in again."
        );
        setLoading(false);
        return;
      }

      // Call the API with token
      const response = await fetch(`${API_URL}/investments`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      // Filter FD investments
      const fdInvestments = data.filter(
        (item) => item.investmentType === "Fixed Deposit"
      );
      setInvestments(fdInvestments);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching investments:", error);
      Alert.alert("Error", "Failed to fetch investments. Please try again.");
      setLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      const userInfo = await AsyncStorage.getItem("userInfo");
      const parsedInfo = JSON.parse(userInfo);
      const username = parsedInfo?.user?.username;

      const response = await fetch(`${API_URL}/goals/${username}`);
      if (response.ok) {
        const goalsData = await response.json();
        setGoals(goalsData);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const addFD = async () => {
    if (!amount || !interestRate) {
      Alert.alert("Error", "Please enter amount and interest rate");
      return;
    }

    // --- Goal Link Validation ---
    if (selectedGoal) {
      const goal = goals.find((g) => g._id === selectedGoal);
      if (goal) {
      }
    }
    // --- End Goal Link Validation ---

    try {
      setLoading(true);

      // Get user info from AsyncStorage
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "User not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      const parsedInfo = JSON.parse(userInfoString);
      const token = parsedInfo.token;

      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please log in again."
        );
        setLoading(false);
        return;
      }

      // Check if there's an existing FD investment with the same goal and interest rate
      const existingFD = investments.find(
        (inv) =>
          inv.investmentType === "Fixed Deposit" &&
          inv.goalId === selectedGoal &&
          parseFloat(inv.interestRate) === parseFloat(interestRate)
      );

      let transactionName;
      let startDate;

      if (existingFD) {
        // Update existing investment
        const updatedAmount =
          parseFloat(existingFD.amount) + parseFloat(amount);
        const updateData = {
          amount: updatedAmount,
          currentAmount: updatedAmount,
          description: `Fixed Deposit at ${interestRate}% maturing on ${formatDate(
            maturityDate
          )}`,
        };

        const response = await fetch(
          `${API_URL}/investment/${existingFD._id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        Alert.alert("Success", "Fixed deposit amount updated successfully");
        transactionName = `FD - ${formatDate(maturityDate)}`;
        startDate = new Date().toISOString();
      } else {
        // Create new FD investment object
        const newFD = {
          name: `FD - ${formatDate(maturityDate)}`,
          amount: parseFloat(amount),
          currentAmount: parseFloat(amount), // Initially same as amount
          interestRate: parseFloat(interestRate),
          investmentType: "Fixed Deposit",
          startDate: new Date().toISOString(),
          maturityDate: maturityDate.toISOString(),
          compoundingFrequency: "yearly", // Most FDs compound annually
          description: `Fixed Deposit at ${interestRate}% maturing on ${formatDate(
            maturityDate
          )}`,
          goalId: selectedGoal, // Add this
        };

        const response = await fetch(`${API_URL}/investment`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newFD),
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        Alert.alert("Success", "Fixed deposit added successfully");
        transactionName = newFD.name;
        startDate = newFD.startDate;
      }

      // Reset form
      setAmount("");
      setInterestRate("");
      setMaturityDate(new Date());
      setSelectedGoal(null); // Reset selected goal

      // Add this event dispatch
      EventRegister.emit("investmentAdded", {
        type: "Investment",
        subType: "FD",
        date: new Date().toISOString(),
        amount: parseFloat(amount),
      });

      // Also add a transaction for calendar color logic
      try {
        const userInfo = await AsyncStorage.getItem("userInfo");
        const parsedInfo = JSON.parse(userInfo);
        const username =
          parsedInfo?.user?.username || parsedInfo?.user?.userName;
        const transactionData = {
          name: transactionName,
          amount: parseFloat(amount),
          type: "Investment",
          subType: "FD",
          method: "Bank",
          date: startDate.split("T")[0],
        };
        await fetch(`${API_URL}/transactions/${username}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });
      } catch (err) {
        console.error("Error adding FD transaction for calendar:", err);
      }

      // Refresh investments list
      fetchInvestments();
    } catch (error) {
      console.error("Error adding investment:", error);
      Alert.alert("Error", "Failed to add investment. Please try again.");
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || maturityDate;
    setShowDatePicker(Platform.OS === "ios");
    setMaturityDate(currentDate);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Calculate current amount based on the principal, interest rate, and time passed
  const calculateCurrentAmount = (
    principal,
    interestRate,
    startDate,
    maturityDate
  ) => {
    // Convert strings to numbers if needed
    principal = parseFloat(principal);
    interestRate = parseFloat(interestRate);

    // Convert dates to Date objects if they're strings
    const startDateObj =
      typeof startDate === "string" ? new Date(startDate) : startDate;
    const maturityDateObj =
      typeof maturityDate === "string" ? new Date(maturityDate) : maturityDate;
    const currentDate = new Date();

    // Calculate total duration in years
    const totalDurationMs = maturityDateObj - startDateObj;
    const totalDurationYears = totalDurationMs / (1000 * 60 * 60 * 24 * 365);

    // Calculate elapsed duration in years
    const elapsedDurationMs = currentDate - startDateObj;
    const elapsedDurationYears =
      elapsedDurationMs / (1000 * 60 * 60 * 24 * 365);

    // Calculate current amount using compound interest formula
    // A = P(1 + r)^t where r is annual interest rate and t is time in years
    const annualRate = interestRate / 100;

    // If maturity date is in the past, return the full maturity amount
    if (currentDate > maturityDateObj) {
      return principal * Math.pow(1 + annualRate, totalDurationYears);
    }

    // If we haven't reached maturity, calculate based on elapsed time
    return principal * Math.pow(1 + annualRate, elapsedDurationYears);
  };

  // Delete investment
  const deleteInvestment = async (id) => {
    try {
      // Get user info from AsyncStorage
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "User not logged in. Please log in again.");
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

      // Confirmation dialog
      Alert.alert(
        "Delete Investment",
        "Are you sure you want to delete this investment?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                setLoading(true);

                const response = await fetch(`${API_URL}/investment/${id}`, {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                });

                if (!response.ok) {
                  throw new Error(`API Error: ${response.status}`);
                }

                // Update local state
                setInvestments(investments.filter((item) => item._id !== id));
                Alert.alert("Success", "Investment deleted successfully");
                setLoading(false);
              } catch (error) {
                console.error("Error deleting investment:", error);
                Alert.alert("Error", "Failed to delete investment");
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error preparing delete:", error);
      Alert.alert("Error", "An error occurred");
    }
  };

  const handleSubmit = async () => {
    // This function is currently unused in the provided code snippet for FDScreen
    // It seems to be a remnant or intended for future use.
    // Keeping it as is, but it doesn't directly affect the current display.
    try {
      const response = await fetch(`${API_URL}/investment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "Investment",
          subType: "FD",
          investmentType: "Fixed Deposit",
          amount: parseFloat(amount),
          date: new Date().toISOString(), // Use current date for startDate if not explicitly passed
          userName: "someUserName", // This userName would need to be dynamically obtained
          goalId: selectedGoal, // Add this
          // ...other fields
        }),
      });

      if (response.ok) {
        EventRegister.emit("investmentAdded", {
          type: "Investment",
          subType: "FD",
          date: new Date().toISOString().split("T")[0], // Use YYYY-MM-DD
          amount: parseFloat(amount),
        });
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error adding FD:", error);
    }
  };

  if (loading && investments.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="library-outline" size={60} color="#3498db" />
        </Animated.View>
        <Text style={styles.loadingText}>Loading FD investments...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Add a custom header */}
      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fixed Deposit</Text>
        <View style={styles.backButton} />
      </View> */}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add Fixed Deposit</Text>

            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter principal amount"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Interest Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={interestRate}
              onChangeText={setInterestRate}
              placeholder="Enter annual interest rate"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Maturity Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <Text style={styles.dateButtonText}>
                {formatDate(maturityDate)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={maturityDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Link to Goal</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedGoal}
                  onValueChange={(value) => setSelectedGoal(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a goal" value={null} />
                  {goals.map((goal) => (
                    <Picker.Item
                      key={goal._id}
                      label={
                        // Display description as Goal Name
                        goal.description && goal.description.trim() !== ""
                          ? goal.description
                          : goal.name === "Custom Goal"
                          ? goal.customName
                          : goal.name
                      }
                      value={goal._id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                (!amount || !interestRate || !selectedGoal) &&
                  styles.disabledButton,
              ]}
              onPress={addFD}
              disabled={loading || !amount || !interestRate || !selectedGoal}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Add Fixed Deposit</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Your Fixed Deposits</Text>

          {investments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No fixed deposits found</Text>
              <Text style={styles.emptySubtext}>
                Add your first FD using the form above
              </Text>
            </View>
          ) : (
            <FlatList
              data={investments}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                // Calculate current amount based on current app logic
                const currentAmount = item.currentAmount;

                // Calculate maturity amount
                const maturityAmount = calculateCurrentAmount(
                  item.amount,
                  item.interestRate,
                  item.startDate,
                  item.maturityDate
                );

                // Find the linked goal object
                const linkedGoal = goals.find((g) => g._id === item.goalId);
                const goalDisplayName = linkedGoal
                  ? linkedGoal.description &&
                    linkedGoal.description.trim() !== ""
                    ? linkedGoal.description
                    : linkedGoal.name === "Custom Goal"
                    ? linkedGoal.customName
                    : linkedGoal.name
                  : "Not Linked";

                return (
                  <View style={styles.fdCard}>
                    <View style={styles.fdHeader}>
                      <Text style={styles.fdAmount}>
                        ₹{parseFloat(item.amount).toLocaleString("en-IN")}
                      </Text>
                      <View style={styles.interestBadge}>
                        <Text style={styles.interestText}>
                          {item.interestRate}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fdDetails}>
                      <Text style={styles.detailLabel}>Current Value:</Text>
                      <Text style={styles.currentAmount}>
                        ₹{Math.round(currentAmount).toLocaleString("en-IN")}
                      </Text>
                    </View>

                    <View style={styles.fdDetails}>
                      <Text style={styles.detailLabel}>
                        Expected Maturity Value:
                      </Text>
                      <Text style={styles.maturityAmount}>
                        ₹{Math.round(maturityAmount).toLocaleString("en-IN")}
                      </Text>
                    </View>

                    <View style={styles.fdDetails}>
                      <Text style={styles.detailLabel}>Maturity Date:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(item.maturityDate).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </Text>
                    </View>

                    {/* --- MODIFICATION START --- */}
                    {/* This block displays the linked goal information if it exists */}
                    {item.goalId && (
                      <View style={styles.goalLink}>
                        <Text style={styles.goalLabel}>Linked Goal:</Text>
                        <Text style={styles.goalValue}>{goalDisplayName}</Text>
                      </View>
                    )}
                    {/* --- MODIFICATION END --- */}

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteInvestment(item._id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    marginBottom: 80,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#000000ff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#475569",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#f8fafc",
    color: "#1e293b",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#f8fafc",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#1e293b",
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#b2d1e8",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  fdCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  fdHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  fdAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  interestBadge: {
    backgroundColor: "#e1f5fe",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  interestText: {
    color: "#0288d1",
    fontWeight: "600",
    fontSize: 14,
  },
  fdDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 14,
  },
  detailValue: {
    color: "#1e293b",
    fontWeight: "500",
    fontSize: 14,
  },
  currentAmount: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 16,
  },
  maturityAmount: {
    color: "#16a34a",
    fontWeight: "700",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  emptyContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#475569",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  // --- ADDED STYLES START ---
  goalLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  goalLabel: {
    fontSize: 14,
    color: "#0369a1",
    fontWeight: "500",
    marginRight: 8,
  },
  goalValue: {
    fontSize: 14,
    color: "#0284c7",
    fontWeight: "600",
  },
  // --- ADDED STYLES END ---
});
