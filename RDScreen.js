import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { EventRegister } from "react-native-event-listeners";

const API_URL = "https://ligths-backend.onrender.com";

export default function RDScreen({ navigation }) {
  const [investments, setInvestments] = useState([]);
  const [monthlyDeposit, setMonthlyDeposit] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goals, setGoals] = useState([]);
  // const [linkedGoal, setLinkedGoal] = useState(null); // This state isn't directly used for display

  useEffect(() => {
    fetchInvestments();
    fetchGoals();
  }, []);

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
      // Filter RD investments
      const rdInvestments = data.filter(
        (item) => item.investmentType === "Recurring Deposit"
      );
      setInvestments(rdInvestments);
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
        console.log("Fetched goals:", goalsData);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const addRD = async () => {
    if (!monthlyDeposit || !interestRate || !duration) {
      Alert.alert("Error", "Please enter all required fields");
      return;
    }

    // --- Goal Link Validation ---
    if (selectedGoal) {
      const goal = goals.find((g) => g._id === selectedGoal);
      if (goal) {
        // Cross-check investment type
        if (goal.investmentType !== "SIP/MF" && goal.investmentType !== "RD") {
          Alert.alert(
            "Validation Error",
            `This goal is set for '${goal.investmentType}' investments. Please choose a goal linked to 'SIP/MF' or 'RD' or update your goal.`
          );
          return;
        }
        // Cross-check interest rate
        if (
          parseFloat(interestRate) < parseFloat(goal.returnRate) * 0.8 ||
          parseFloat(interestRate) > parseFloat(goal.returnRate) * 1.2
        ) {
          // 20% tolerance
          Alert.alert(
            "Validation Warning",
            `The linked goal expects an approximate return rate of ${goal.returnRate}%, but your RD interest rate is ${interestRate}%. This might affect goal calculations.`
          );
          // You could make this a blocking error if desired: return;
        }
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

      // Calculate maturity date (current date + duration in months)
      const maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + parseInt(duration));
      const startDate = new Date(); // Define startDate here

      // Calculate expected maturity amount
      const expectedMaturityAmount = calculateMaturityAmount(
        monthlyDeposit,
        interestRate,
        duration
      );

      // Create new RD investment object
      const newRD = {
        name: `RD - ₹${monthlyDeposit}/month for ${duration} months`, // This name is for the backend
        amount: parseFloat(monthlyDeposit) * parseInt(duration), // Total amount to be deposited
        currentAmount: parseFloat(monthlyDeposit), // Currently deposited (first month)
        interestRate: parseFloat(interestRate),
        goalId: selectedGoal, // Add the selected goal ID
        investmentType: "Recurring Deposit",
        startDate: startDate.toISOString(), // Use defined startDate
        maturityDate: maturityDate.toISOString(),
        compoundingFrequency: "quarterly", // Most RDs compound quarterly
        description: `₹${monthlyDeposit} monthly for ${duration} months at ${interestRate}% (Maturity: ₹${Math.round(
          expectedMaturityAmount
        ).toLocaleString("en-IN")})`,
      };

      // Add custom fields for RD
      newRD.monthlyDeposit = parseFloat(monthlyDeposit);
      newRD.duration = parseInt(duration);
      newRD.expectedMaturityAmount = expectedMaturityAmount;

      const response = await fetch(`${API_URL}/investment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRD),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // Reset form including goal selection
      setMonthlyDeposit("");
      setInterestRate("");
      setDuration("");
      setSelectedGoal(null);

      Alert.alert("Success", "Recurring deposit added successfully");

      // Emit the event for calendar update
      EventRegister.emit("investmentAdded", {
        type: "Investment",
        subType: "RD",
        date: startDate.toISOString().split("T")[0], // Use YYYY-MM-DD format for calendar
        amount: parseFloat(monthlyDeposit),
      });

      // Also add a transaction for calendar color logic
      try {
        const userInfo = await AsyncStorage.getItem("userInfo");
        const parsedInfo = JSON.parse(userInfo);
        const username =
          parsedInfo?.user?.username || parsedInfo?.user?.userName;
        const transactionData = {
          name: newRD.name,
          amount: parseFloat(monthlyDeposit),
          type: "Investment",
          subType: "RD",
          method: "Bank",
          date: startDate.toISOString().split("T")[0],
        };
        await fetch(`${API_URL}/transactions/${username}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });
      } catch (err) {
        console.error("Error adding RD transaction for calendar:", err);
      }

      // Refresh investments list
      fetchInvestments();
    } catch (error) {
      console.error("Error adding investment:", error);
      Alert.alert("Error", "Failed to add investment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate maturity amount for RD
  const calculateMaturityAmount = (deposit, rate, months) => {
    const monthlyDeposit = parseFloat(deposit);
    const annualRate = parseFloat(rate) / 100;
    const quarterlyRate = annualRate / 4; // Most RDs compound quarterly
    const totalMonths = parseInt(months);

    // RD formula: M = P × [((1 + r/4)^(4n) - 1) / (r/4)] × (1 + r/4)^(1/3)
    // Where P = monthly deposit, r = annual rate, n = years
    const years = totalMonths / 12;
    const quarters = totalMonths / 3; // Number of quarters

    if (quarterlyRate === 0) {
      // If no interest, just return total deposits
      return monthlyDeposit * totalMonths;
    }

    // Calculate maturity using quarterly compounding
    const factor = Math.pow(1 + quarterlyRate, quarters) - 1;
    const maturityAmount = monthlyDeposit * 3 * (factor / quarterlyRate);

    return maturityAmount;
  };

  // Calculate current value of RD
  const calculateCurrentValue = (deposit, rate, startDate, duration) => {
    const monthlyDeposit = parseFloat(deposit);
    const annualRate = parseFloat(rate) / 100;
    const quarterlyRate = annualRate / 4;
    const totalMonths = parseInt(duration);

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
    const depositsCompleted = Math.min(elapsedMonths, totalMonths);
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
        "Are you sure you want to delete this recurring deposit?",
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

  if (loading && investments.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading investments...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Add a custom header
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recurring Deposit</Text>
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
            <Text style={styles.sectionTitle}>Add Recurring Deposit</Text>

            <Text style={styles.inputLabel}>Monthly Deposit (₹)</Text>
            <TextInput
              style={styles.input}
              value={monthlyDeposit}
              onChangeText={setMonthlyDeposit}
              placeholder="Enter monthly deposit amount"
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

            <Text style={styles.inputLabel}>Duration (months)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="Enter duration in months"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />

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
                (!monthlyDeposit ||
                  !interestRate ||
                  !duration ||
                  !selectedGoal) &&
                  styles.disabledButton,
              ]}
              onPress={addRD}
              disabled={
                loading ||
                !monthlyDeposit ||
                !interestRate ||
                !duration ||
                !selectedGoal
              }
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Add Recurring Deposit</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Your Recurring Deposits</Text>

          {investments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No recurring deposits found</Text>
              <Text style={styles.emptySubtext}>
                Add your first RD using the form above
              </Text>
            </View>
          ) : (
            <FlatList
              data={investments}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                // Get the monthly deposit, duration from item properties or from description
                const monthlyDeposit = item.monthlyDeposit || item.amount;
                const duration = item.duration || 12; // Default to 12 if not specified

                // Calculate maturity amount
                const maturityAmount = calculateMaturityAmount(
                  monthlyDeposit,
                  item.interestRate,
                  duration
                );

                // Calculate current value
                const currentValue = calculateCurrentValue(
                  monthlyDeposit,
                  item.interestRate,
                  item.startDate,
                  duration
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
                  <View style={styles.rdCard}>
                    <View style={styles.rdHeader}>
                      <Text style={styles.depositAmount}>
                        ₹{parseFloat(monthlyDeposit).toLocaleString("en-IN")}
                        /month
                      </Text>
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>
                          {duration} months
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rdDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Interest Rate:</Text>
                        <Text style={styles.detailValue}>
                          {item.interestRate}%
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Current Value:</Text>
                        <Text style={styles.currentValue}>
                          ₹{Math.round(currentValue).toLocaleString("en-IN")}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          Total Investment:
                        </Text>
                        <Text style={styles.detailValue}>
                          ₹{(monthlyDeposit * duration).toLocaleString("en-IN")}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Maturity Value:</Text>
                        <Text style={styles.maturityValue}>
                          ₹{Math.round(maturityAmount).toLocaleString("en-IN")}
                        </Text>
                      </View>

                      {/* Progress indicator for deposits completed */}
                      {(() => {
                        const start = new Date(item.startDate);
                        const now = new Date();
                        const elapsedMonths = Math.max(
                          1,
                          (now.getFullYear() - start.getFullYear()) * 12 +
                            (now.getMonth() - start.getMonth()) +
                            1
                        );
                        const depositsCompleted = Math.min(
                          elapsedMonths,
                          duration
                        );
                        const progressPercentage =
                          (depositsCompleted / duration) * 100;

                        return (
                          <View style={styles.progressSection}>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Progress:</Text>
                              <Text style={styles.progressText}>
                                {depositsCompleted}/{duration} deposits
                              </Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                              <View
                                style={[
                                  styles.progressBar,
                                  { width: `${progressPercentage}%` },
                                ]}
                              />
                            </View>
                          </View>
                        );
                      })()}
                    </View>

                    {item.goalId && ( // Only display if goalId exists
                      <View style={styles.goalLink}>
                        <Text style={styles.goalLabel}>Linked Goal:</Text>
                        <Text style={styles.goalValue}>{goalDisplayName}</Text>
                      </View>
                    )}

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
    color: "#1e293b",
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
  addButton: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#86efac",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  rdCard: {
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
  rdHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  depositAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  durationBadge: {
    backgroundColor: "#e8f5e9",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  durationText: {
    color: "#16a34a",
    fontWeight: "600",
    fontSize: 14,
  },
  rdDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  detailRow: {
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
  currentValue: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 16,
  },
  maturityValue: {
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
    fontWeight: "500",
    fontSize: 14,
    marginLeft: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#475569",
  },
  pickerContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
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
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  progressText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 3,
  },
});
