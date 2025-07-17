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

// Predefined goals to be added to the list
const predefinedGoals = [
  { _id: 'goal_education', name: 'B Education' },
  { _id: 'goal_marriage', name: 'B Marriage' },
  { _id: 'goal_dream_house', name: 'Dream House' },
  { _id: 'goal_wealth_creation', name: 'Wealth Creation' },
];

export default function RDScreen({ navigation }) {
  const [investments, setInvestments] = useState([]);
  const [monthlyDeposit, setMonthlyDeposit] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goals, setGoals] = useState(predefinedGoals); // Initialize with predefined goals

  useEffect(() => {
    fetchInvestments();
    fetchGoals();
  }, []);

  const fetchInvestments = async () => {
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
      const response = await fetch(`${API_URL}/investments`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const rdInvestments = data.filter((item) => item.investmentType === "Recurring Deposit");
      setInvestments(rdInvestments);
    } catch (error) {
      console.error("Error fetching investments:", error);
      Alert.alert("Error", "Failed to fetch investments.");
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
        // Combine predefined goals with user-created goals
        setGoals([...predefinedGoals, ...userGoals]);
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

      const maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + parseInt(duration));
      const startDate = new Date();

      // Find the goal name to add to the description
      const linkedGoal = goals.find(g => g._id === selectedGoal);
      const goalName = linkedGoal ? (linkedGoal.name === "Custom Goal" ? linkedGoal.customName : linkedGoal.name) : '';

      const newRD = {
        name: `RD - ${monthlyDeposit}/month for ${duration} months`,
        amount: parseFloat(monthlyDeposit),
        currentAmount: parseFloat(monthlyDeposit),
        interestRate: parseFloat(interestRate),
        goalId: selectedGoal,
        investmentType: "Recurring Deposit",
        startDate: startDate.toISOString(),
        maturityDate: maturityDate.toISOString(),
        compoundingFrequency: "quarterly",
        description: `₹${monthlyDeposit} monthly for ${duration} months at ${interestRate}%${goalName ? ` for ${goalName}` : ''}`,
        monthlyDeposit: parseFloat(monthlyDeposit),
        duration: parseInt(duration),
      };

      const response = await fetch(`${API_URL}/investment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(newRD),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      setMonthlyDeposit("");
      setInterestRate("");
      setDuration("");
      setSelectedGoal(null);
      Alert.alert("Success", "Recurring deposit added successfully");
      EventRegister.emit("investmentAdded", { type: "Investment", subType: "RD", date: startDate.toISOString().split("T")[0], amount: parseFloat(monthlyDeposit) });
      
      try {
        const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;
        const transactionData = { name: newRD.name, amount: parseFloat(monthlyDeposit), type: "Investment", subType: "RD", method: "Bank", date: startDate.toISOString().split("T")[0] };
        await fetch(`${API_URL}/transactions/${username}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(transactionData) });
      } catch (err) {
        console.error("Error adding RD transaction for calendar:", err);
      }
      fetchInvestments();
    } catch (error) {
      console.error("Error adding investment:", error);
      Alert.alert("Error", "Failed to add investment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateMaturityAmount = (deposit, rate, months) => {
    const d = parseFloat(deposit), r = parseFloat(rate) / 100 / 12, n = parseInt(months);
    return d * ((Math.pow(1 + r, n) - 1) / r);
  };

  const calculateCurrentValue = (deposit, rate, startDate, duration) => {
    const d = parseFloat(deposit), r = parseFloat(rate) / 100 / 12, totalMonths = parseInt(duration);
    const start = new Date(startDate), now = new Date();
    const elapsedMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const n = Math.min(Math.max(elapsedMonths, 1), totalMonths);
    return d * ((Math.pow(1 + r, n) - 1) / r);
  };

  const deleteInvestment = async (id) => {
    Alert.alert("Delete Investment", "Are you sure you want to delete this recurring deposit?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
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
          if (!response.ok) throw new Error(`API Error: ${response.status}`);
          setInvestments(investments.filter((item) => item._id !== id));
          Alert.alert("Success", "Investment deleted successfully");
        } catch (error) {
          console.error("Error deleting investment:", error);
          Alert.alert("Error", "Failed to delete investment");
        } finally {
          setLoading(false);
        }
      }},
    ]);
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add Recurring Deposit</Text>
            <Text style={styles.inputLabel}>Monthly Deposit (₹)</Text>
            <TextInput style={styles.input} value={monthlyDeposit} onChangeText={setMonthlyDeposit} placeholder="Enter monthly deposit amount" keyboardType="numeric" placeholderTextColor="#94a3b8" />
            <Text style={styles.inputLabel}>Interest Rate (%)</Text>
            <TextInput style={styles.input} value={interestRate} onChangeText={setInterestRate} placeholder="Enter annual interest rate" keyboardType="numeric" placeholderTextColor="#94a3b8" />
            <Text style={styles.inputLabel}>Duration (months)</Text>
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="Enter duration in months" keyboardType="numeric" placeholderTextColor="#94a3b8" />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Link to Goal (Optional)</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={selectedGoal} onValueChange={(value) => setSelectedGoal(value)} style={styles.picker}>
                  <Picker.Item label="Select a goal..." value={null} />
                  {goals.map((goal) => <Picker.Item key={goal._id} label={goal.name === "Custom Goal" ? goal.customName : goal.name} value={goal._id} />)}
                </Picker>
              </View>
            </View>
            <TouchableOpacity style={[styles.addButton, (!monthlyDeposit || !interestRate || !duration) && styles.disabledButton]} onPress={addRD} disabled={loading || !monthlyDeposit || !interestRate || !duration}>
              {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.addButtonText}>Add Recurring Deposit</Text>}
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>Your Recurring Deposits</Text>
          {investments.length === 0 ? (
            <View style={styles.emptyContainer}><Ionicons name="wallet-outline" size={64} color="#cbd5e1" /><Text style={styles.emptyText}>No recurring deposits found</Text><Text style={styles.emptySubtext}>Add your first RD using the form above</Text></View>
          ) : (
            <FlatList
              data={investments}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const monthlyDeposit = item.monthlyDeposit || item.amount;
                const duration = item.duration || 12;
                const maturityAmount = calculateMaturityAmount(monthlyDeposit, item.interestRate, duration);
                const currentValue = calculateCurrentValue(monthlyDeposit, item.interestRate, item.startDate, duration);
                const linkedGoal = goals.find(g => g._id === item.goalId);
                return (
                  <View style={styles.rdCard}>
                    <View style={styles.rdHeader}><Text style={styles.depositAmount}>₹{parseFloat(monthlyDeposit).toLocaleString("en-IN")}/month</Text><View style={styles.durationBadge}><Text style={styles.durationText}>{duration} months</Text></View></View>
                    <View style={styles.rdDetails}>
                      <View style={styles.detailRow}><Text style={styles.detailLabel}>Interest Rate:</Text><Text style={styles.detailValue}>{item.interestRate}%</Text></View>
                      <View style={styles.detailRow}><Text style={styles.detailLabel}>Current Value:</Text><Text style={styles.currentValue}>₹{Math.round(currentValue).toLocaleString("en-IN")}</Text></View>
                      <View style={styles.detailRow}><Text style={styles.detailLabel}>Total Investment:</Text><Text style={styles.detailValue}>₹{(monthlyDeposit * duration).toLocaleString("en-IN")}</Text></View>
                      <View style={styles.detailRow}><Text style={styles.detailLabel}>Maturity Value:</Text><Text style={styles.maturityValue}>₹{Math.round(maturityAmount).toLocaleString("en-IN")}</Text></View>
                    </View>
                    {linkedGoal && (
                      <View style={styles.goalLink}>
                        <Ionicons name="flag-outline" size={16} color="#059669" />
                        <Text style={styles.goalText}>
                          {linkedGoal.name === "Custom Goal" ? linkedGoal.customName : linkedGoal.name}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteInvestment(item._id)}><Ionicons name="trash-outline" size={20} color="#FFFFFF" /><Text style={styles.deleteButtonText}>Delete</Text></TouchableOpacity>
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
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16, color: "#1e293b" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#475569" },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, backgroundColor: "#f8fafc", color: "#1e293b" },
  addButton: { backgroundColor: "#16a34a", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  disabledButton: { backgroundColor: "#86efac" },
  addButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  rdCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginVertical: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  rdHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  depositAmount: { fontSize: 20, fontWeight: "bold", color: "#1e293b" },
  durationBadge: { backgroundColor: "#e8f5e9", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  durationText: { color: "#16a34a", fontWeight: "600", fontSize: 14 },
  rdDetails: { borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 12 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  detailLabel: { color: "#64748b", fontSize: 14 },
  detailValue: { color: "#1e293b", fontWeight: "500", fontSize: 14 },
  currentValue: { color: "#2563eb", fontWeight: "600", fontSize: 16 },
  maturityValue: { color: "#16a34a", fontWeight: "700", fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#64748b" },
  emptyContainer: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  emptyText: { marginTop: 16, fontSize: 18, fontWeight: "600", color: "#1e293b" },
  emptySubtext: { marginTop: 8, fontSize: 14, color: "#64748b", textAlign: "center" },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#ef4444", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, marginTop: 16 },
  deleteButtonText: { color: "#FFFFFF", fontWeight: "500", fontSize: 14, marginLeft: 8 },
  inputGroup: { marginBottom: 16 },
  pickerContainer: { backgroundColor: "#f8fafc", borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 16, overflow: "hidden" },
  picker: { height: 50 },
  goalLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginTop: 12 },
  goalText: { marginLeft: 8, fontSize: 14, color: '#166534', fontWeight: '600' },
});
