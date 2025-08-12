import React, { useEffect, useState, useRef } from "react";
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
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { EventRegister } from "react-native-event-listeners";
import DateTimePicker from "@react-native-community/datetimepicker";

const API_URL = "https://ligths-backend.onrender.com";

export default function SavingsScreen({ navigation }) {
  const [savings, setSavings] = useState([]);
  const [initialDeposit, setInitialDeposit] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [maturityDate, setMaturityDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation reference for the loading icon
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    fetchSavings();
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

  const fetchSavings = async () => {
    try {
      setLoading(true);
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
      const savingsInvestments = data.filter(
        (item) => item.investmentType === "Savings"
      );
      setSavings(savingsInvestments);
    } catch (error) {
      console.error("Error fetching savings:", error);
      Alert.alert("Error", "Failed to fetch savings. Please try again.");
    } finally {
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

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || maturityDate;
    setShowDatePicker(Platform.OS === "ios");
    setMaturityDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const hideDatepicker = () => {
    setShowDatePicker(false);
  };

  const addSavings = async () => {
    if (!initialDeposit || !maturityDate) {
      Alert.alert(
        "Missing Information",
        "Please enter initial deposit and select a maturity date."
      );
      return;
    }

    try {
      setLoading(true);
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "User not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      const parsedInfo = JSON.parse(userInfoString);
      const token = parsedInfo.token;
      const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;

      if (!token || !username) {
        Alert.alert(
          "Error",
          "Authentication token or username not found. Please log in again."
        );
        setLoading(false);
        return;
      }

      // Check if there's an existing Savings investment with the same goal and interest rate
      const existingSavings = savings.find(
        (inv) =>
          inv.investmentType === "Savings" &&
          inv.goalId === selectedGoal &&
          parseFloat(inv.interestRate) === parseFloat(interestRate)
      );

      let transactionName;

      if (existingSavings) {
        // Update existing investment
        const updatedAmount =
          parseFloat(existingSavings.amount) + parseFloat(initialDeposit);
        const updatedCurrentAmount =
          parseFloat(existingSavings.currentAmount) +
          parseFloat(initialDeposit);

        const updateData = {
          amount: updatedAmount,
          currentAmount: updatedCurrentAmount,
          description: `Savings account for ₹${updatedAmount} maturing on ${maturityDate.toLocaleDateString(
            "en-GB"
          )}`,
        };

        const response = await fetch(
          `${API_URL}/investment/${existingSavings._id}`,
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
          const errorData = await response.json();
          throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        Alert.alert("Success", "Savings amount updated successfully!");
        transactionName = `Savings account for ₹${updatedAmount} maturing on ${maturityDate.toLocaleDateString(
          "en-GB"
        )}`;
      } else {
        const newSavings = {
          amount: parseFloat(initialDeposit),
          currentAmount: parseFloat(initialDeposit),
          investmentType: "Savings",
          startDate: new Date().toISOString(),
          interestRate: parseFloat(interestRate),
          maturityDate: maturityDate.toISOString(),
          description: `Savings account for ₹${initialDeposit} maturing on ${maturityDate.toLocaleDateString(
            "en-GB"
          )}`,
          goalId: selectedGoal,
        };

        const response = await fetch(`${API_URL}/investment`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newSavings),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        Alert.alert("Success", "Savings added successfully!");
        transactionName = newSavings.description;
      }

      setInitialDeposit(""); // Reset
      setInterestRate("0");
      setMaturityDate(new Date());
      setSelectedGoal(null);

      EventRegister.emit("investmentAdded", {
        type: "Investment",
        subType: "Savings",
        name: "New Savings",
        date: new Date().toISOString().split("T")[0],
        amount: parseFloat(initialDeposit),
        interestRate: parseFloat(interestRate),
        investmentType: "Savings",
      });

      // Also add a transaction for calendar color logic, similar to RDScreen
      try {
        const userInfo = await AsyncStorage.getItem("userInfo");
        const parsedInfo = JSON.parse(userInfo);
        const username =
          parsedInfo?.user?.username || parsedInfo?.user?.userName;
        const transactionData = {
          name: transactionName, // Use the transaction name variable
          amount: parseFloat(initialDeposit),
          type: "Investment",
          subType: "Savings",
          method: "Bank", // Assuming bank transfer for initial deposit
          date: new Date().toISOString().split("T")[0],
        };
        await fetch(`${API_URL}/transactions/${username}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });
      } catch (err) {
        console.error("Error adding Savings transaction for calendar:", err);
      }

      fetchSavings();
    } catch (error) {
      console.error("Error adding savings:", error);
      Alert.alert("Error", `Failed to add savings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvestment = async (id) => {
    Alert.alert(
      "Delete Savings",
      "Are you sure you want to delete this savings entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const userInfoString = await AsyncStorage.getItem("userInfo");
              if (!userInfoString) {
                Alert.alert(
                  "Error",
                  "User not logged in. Please log in again."
                );
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

              const response = await fetch(`${API_URL}/investment/${id}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                  errorData.error || `API Error: ${response.status}`
                );
              }

              setSavings(savings.filter((item) => item._id !== id));
              Alert.alert("Success", "Savings entry deleted successfully.");
            } catch (error) {
              console.error("Error deleting savings:", error);
              Alert.alert(
                "Error",
                `Failed to delete savings: ${error.message}`
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Calculate maturity amount for a single lump sum deposit (Savings/Fixed Deposit)
  const calculateMaturityAmount = (
    initialDeposit,
    annualRate,
    startDate,
    maturityDate
  ) => {
    const P = parseFloat(initialDeposit);
    const r = parseFloat(annualRate) / 100; // Annual rate as decimal
    const start = new Date(startDate);
    const maturity = new Date(maturityDate);

    // Calculate time in years
    const diffTime = Math.abs(maturity.getTime() - start.getTime());
    const t = diffTime / (1000 * 60 * 60 * 24 * 365.25); // Time in years, considering leap years

    const n = 12; // Monthly compounding for consistency with RD, or adjust as needed (e.g., 1 for annual)

    // A = P * (1 + r/n)^(nt)
    return P * Math.pow(1 + r / n, n * t);
  };

  // Calculate current value for a single lump sum deposit (Savings/Fixed Deposit)
  const calculateCurrentValue = (initialDeposit, annualRate, startDate) => {
    const P = parseFloat(initialDeposit);
    const r = parseFloat(annualRate) / 100; // Annual rate as decimal
    const start = new Date(startDate);
    const now = new Date();

    // Calculate elapsed time in years
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const t = diffTime / (1000 * 60 * 60 * 24 * 365.25);

    const n = 12; // Monthly compounding

    // A = P * (1 + r/n)^(nt)
    return P * Math.pow(1 + r / n, n * t);
  };

  if (loading && savings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="wallet-outline" size={60} color="#f59e0b" />
        </Animated.View>
        <Text style={styles.loadingText}>Loading savings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add New Savings</Text>

            <Text style={styles.inputLabel}>Initial Deposit (₹)</Text>
            <TextInput
              style={styles.input}
              value={initialDeposit}
              onChangeText={setInitialDeposit}
              placeholder="Enter initial deposit amount"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Interest Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={interestRate}
              onChangeText={setInterestRate}
              placeholder="E.g., 0"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Maturity Date</Text>
            <TouchableOpacity
              onPress={showDatepicker}
              style={styles.datePickerButton}
            >
              <Text style={styles.datePickerButtonText}>
                {maturityDate
                  ? maturityDate.toLocaleDateString("en-GB")
                  : "Select Maturity Date"}
              </Text>
              <Ionicons name="calendar-outline" size={24} color="#64748b" />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={maturityDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
            {Platform.OS === "ios" && showDatePicker && (
              <TouchableOpacity
                onPress={hideDatepicker}
                style={styles.closePickerButton}
              >
                <Text style={styles.closePickerButtonText}>Done</Text>
              </TouchableOpacity>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Link to Goal (Optional)</Text>
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
                        // Display description (Goal Name)
                        goal.description && goal.description.trim() !== ""
                          ? `${goal.description} (${
                              goal.name === "Custom Goal"
                                ? goal.customName
                                : goal.name
                            })`
                          : goal.name === "Custom Goal"
                          ? goal.customName
                          : goal.name // Fallback if no description
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
                (!initialDeposit || !maturityDate) && styles.disabledButton,
              ]}
              onPress={addSavings}
              disabled={loading || !initialDeposit || !maturityDate}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Add Savings</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Your Savings Accounts</Text>

          {savings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="piggy-bank-outline"
                size={64}
                color="#cbd5e1"
              />
              <Text style={styles.emptyText}>No savings accounts found</Text>
              <Text style={styles.emptySubtext}>
                Add your savings details using the form above
              </Text>
            </View>
          ) : (
            <FlatList
              data={savings}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const initialDeposit = item.amount;
                const interestRate = item.interestRate;
                const startDate = item.startDate;
                const maturityDate = item.maturityDate;

                const maturityAmount = calculateMaturityAmount(
                  initialDeposit,
                  interestRate,
                  startDate,
                  maturityDate
                );
                const currentValue = calculateCurrentValue(
                  initialDeposit,
                  interestRate,
                  startDate
                );

                // Find the linked goal object
                const linkedGoal = goals.find((g) => g._id === item.goalId);
                const goalDisplayName = linkedGoal
                  ? linkedGoal.description &&
                    linkedGoal.description.trim() !== ""
                    ? `${linkedGoal.description} (${
                        linkedGoal.name === "Custom Goal"
                          ? linkedGoal.customName
                          : linkedGoal.name
                      })`
                    : linkedGoal.name === "Custom Goal"
                    ? linkedGoal.customName
                    : linkedGoal.name
                  : "Not Linked"; // Changed to "Not Linked"

                return (
                  <View style={styles.savingsCard}>
                    <View style={styles.savingsHeader}>
                      {/* Changed to display initial amount */}
                      <Text style={styles.savingsName}>
                        ₹{parseFloat(item.amount).toLocaleString("en-IN")}
                      </Text>
                      <View style={styles.rateBadge}>
                        <Text style={styles.rateText}>
                          {item.interestRate || 0}% Interest
                        </Text>
                      </View>
                    </View>

                    <View style={styles.savingsDetails}>
                      {/* Changed to display interest rate instead of initial deposit */}
                      {/* <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Interest Rate:</Text>
                        <Text style={styles.detailValue}>
                          {item.interestRate || 0}%
                        </Text>
                      </View> */}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Current Value:</Text>
                        <Text style={styles.currentValue}>
                          ₹{Math.round(currentValue).toLocaleString("en-IN")}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Maturity Value:</Text>
                        <Text style={styles.maturityValueText}>
                          ₹{Math.round(maturityAmount).toLocaleString("en-IN")}
                        </Text>
                      </View>
                    </View>
                    {item.maturityDate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Maturity Date:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(item.maturityDate).toLocaleDateString(
                            "en-GB"
                          )}
                        </Text>
                      </View>
                    )}
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
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#f8fafc",
  },
  datePickerButtonText: {
    fontSize: 16,
    color: "#1e293b",
  },
  closePickerButton: {
    marginTop: 10,
    backgroundColor: "#f59e0b",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: "center",
  },
  closePickerButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#fcd34d",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  savingsCard: {
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
  savingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  savingsName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  rateBadge: {
    backgroundColor: "#fffbeb",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  rateText: {
    color: "#d97706",
    fontWeight: "600",
    fontSize: 14,
  },
  savingsDetails: {
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
  maturityValueText: {
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
    backgroundColor: "#fffbeb", // Light orange for Savings goals
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  goalLabel: {
    fontSize: 14,
    color: "#b45309", // Darker orange
    fontWeight: "500",
    marginRight: 8,
  },
  goalValue: {
    fontSize: 14,
    color: "#d97706", // Medium orange
    fontWeight: "600",
  },
});
