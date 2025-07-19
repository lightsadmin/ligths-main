import React, { useEffect, useState } from "react";
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
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goals, setGoals] = useState([]); // Initialize with empty array

  useEffect(() => {
    fetchInvestments();
    fetchGoals();
  }, []);

  const fetchInvestments = async () => {
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
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const fdInvestments = data.filter(
        (item) => item.investmentType === "Fixed Deposit"
      );
      setInvestments(fdInvestments);
    } catch (error) {
      console.error("Error fetching investments:", error);
      Alert.alert("Error", "Failed to fetch investments. Please try again.");
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
        const userGoals = await response.json();
        // Set goals with only the fetched user goals
        setGoals(userGoals);
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
    try {
      setLoading(true);
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "User not logged in.");
        setLoading(false);
        return;
      }
      const parsedInfo = JSON.parse(userInfoString);
      const token = parsedInfo.token;
      if (!token) {
        Alert.alert("Error", "Authentication token not found.");
        setLoading(false);
        return;
      }

      // Find the goal name to add to the description
      const linkedGoal = goals.find((g) => g._id === selectedGoal);
      const goalName = linkedGoal
        ? linkedGoal.name === "Custom Goal"
          ? linkedGoal.customName
          : linkedGoal.name
        : "";

      const newFD = {
        name: `FD - ${formatDate(maturityDate)}`,
        amount: parseFloat(amount),
        currentAmount: parseFloat(amount),
        interestRate: parseFloat(interestRate),
        investmentType: "Fixed Deposit",
        startDate: new Date().toISOString(),
        maturityDate: maturityDate.toISOString(),
        compoundingFrequency: "yearly",
        description: `Fixed Deposit at ${interestRate}% maturing on ${formatDate(
          maturityDate
        )}${goalName ? ` for ${goalName}` : ""}`,
        goalId: selectedGoal,
      };

      const response = await fetch(`${API_URL}/investment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newFD),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      setAmount("");
      setInterestRate("");
      setMaturityDate(new Date());
      setSelectedGoal(null);
      Alert.alert("Success", "Fixed deposit added successfully");
      EventRegister.emit("investmentAdded", {
        type: "Investment",
        subType: "FD",
        date: newFD.startDate,
        amount: parseFloat(amount),
      });

      try {
        const username =
          parsedInfo?.user?.username || parsedInfo?.user?.userName;
        const transactionData = {
          name: newFD.name,
          amount: parseFloat(amount),
          type: "Investment",
          subType: "FD",
          method: "Bank",
          date: newFD.startDate.split("T")[0],
        };
        await fetch(`${API_URL}/transactions/${username}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });
      } catch (err) {
        console.error("Error adding FD transaction for calendar:", err);
      }
      fetchInvestments();
    } catch (error) {
      console.error("Error adding investment:", error);
      Alert.alert("Error", "Failed to add investment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || maturityDate;
    setShowDatePicker(Platform.OS === "ios");
    setMaturityDate(currentDate);
  };

  const formatDate = (date) =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const calculateCurrentAmount = (
    principal,
    interestRate,
    startDate,
    maturityDate
  ) => {
    const p = parseFloat(principal),
      r = parseFloat(interestRate) / 100;
    const start = new Date(startDate),
      maturity = new Date(maturityDate),
      now = new Date();
    const totalDurationYears = (maturity - start) / (1000 * 60 * 60 * 24 * 365);
    const elapsedDurationYears = (now - start) / (1000 * 60 * 60 * 24 * 365);
    if (now > maturity) return p * Math.pow(1 + r, totalDurationYears);
    return p * Math.pow(1 + r, elapsedDurationYears);
  };

  const deleteInvestment = async (id) => {
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
              const userInfoString = await AsyncStorage.getItem("userInfo");
              const parsedInfo = JSON.parse(userInfoString);
              const token = parsedInfo.token;
              if (!token) {
                Alert.alert("Error", "Authentication token not found.");
                setLoading(false);
                return;
              }
              const response = await fetch(`${API_URL}/investment/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!response.ok)
                throw new Error(`API Error: ${response.status}`);
              setInvestments(investments.filter((item) => item._id !== id));
              Alert.alert("Success", "Investment deleted successfully");
            } catch (error) {
              console.error("Error deleting investment:", error);
              Alert.alert("Error", "Failed to delete investment");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && investments.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading investments...</Text>
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
              <Text style={styles.inputLabel}>Link to Goal (Optional)</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedGoal}
                  onValueChange={(value) => setSelectedGoal(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a goal..." value={null} />
                  {goals.map((goal) => (
                    <Picker.Item
                      key={goal._id}
                      label={
                        goal.name === "Custom Goal"
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
                (!amount || !interestRate) && styles.disabledButton,
              ]}
              onPress={addFD}
              disabled={loading || !amount || !interestRate}
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
                const currentAmount = item.currentAmount;
                const maturityAmount = calculateCurrentAmount(
                  item.amount,
                  item.interestRate,
                  item.startDate,
                  item.maturityDate
                );
                const linkedGoal = goals.find((g) => g._id === item.goalId);
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
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </Text>
                    </View>
                    {linkedGoal && (
                      <View style={styles.goalLink}>
                        <Ionicons
                          name="flag-outline"
                          size={16}
                          color="#475569"
                        />
                        <Text style={styles.goalText}>
                          {linkedGoal.name === "Custom Goal"
                            ? linkedGoal.customName
                            : linkedGoal.name}
                        </Text>
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
  container: { flex: 1, backgroundColor: "#f8fafc", marginBottom: 80 },
  keyboardAvoidContainer: { flex: 1 },
  scrollContent: { padding: 16 },
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
  dateButtonText: { fontSize: 16, color: "#1e293b", marginLeft: 8 },
  addButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: { backgroundColor: "#b2d1e8" },
  addButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
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
  fdAmount: { fontSize: 20, fontWeight: "bold", color: "#1e293b" },
  interestBadge: {
    backgroundColor: "#e1f5fe",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  interestText: { color: "#0288d1", fontWeight: "600", fontSize: 14 },
  fdDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailLabel: { color: "#64748b", fontSize: 14 },
  detailValue: { color: "#1e293b", fontWeight: "500", fontSize: 14 },
  currentAmount: { color: "#2563eb", fontWeight: "600", fontSize: 16 },
  maturityAmount: { color: "#16a34a", fontWeight: "700", fontSize: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#64748b" },
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
  inputGroup: { marginBottom: 16 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
  },
  picker: { height: 50, width: "100%" },
  goalLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  goalText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
});
