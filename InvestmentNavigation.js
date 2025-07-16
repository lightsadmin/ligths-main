import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from "react-native";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons"; // Added MaterialCommunityIcons
import { useNavigation } from "@react-navigation/native";
import SavingsScreen from "./SavingsScreen";

const { width } = Dimensions.get("window");

const investmentOptions = [
  {
    id: "fd",
    title: "Fixed Deposit",
    description: "Track your FD investments and calculate returns",
    icon: "business",
    screen: "FDScreen",
    color: "#2563eb",
  },
  {
    id: "rd",
    title: "Recurring Deposit",
    description: "Manage your RD investments and monitor growth",
    icon: "trending-up",
    screen: "RDScreen",
    color: "#16a34a",
  },
  {
    id: "savings", // New Savings Option
    title: "Savings",
    description: "Track your savings and see simple returns",
    icon: "bank", // Using a bank icon for savings
    screen: "SavingsScreen", // Linked to the new SavingsScreen
    color: "#f59e0b", // A distinct color for savings
  },
];

// investmentTypes array is kept but not rendered
const investmentTypes = [
  {
    title: "Equity",
    description: "Stocks and equity mutual funds for long-term growth",
    color: "#3B82F6",
    icon: <FontAwesome5 name="chart-line" size={24} color="white" />,
  },
  {
    title: "Debt",
    description: "Bonds and fixed income for stability and regular income",
    color: "#10B981",
    icon: <FontAwesome5 name="money-bill-wave" size={24} color="white" />,
  },
  {
    title: "Gold",
    description: "Invest in digital or physical gold for wealth preservation",
    color: "#FBBF24",
    icon: <FontAwesome5 name="medal" size={24} color="white" />,
  },
  {
    title: "Real Estate",
    description:
      "Properties and REITs for rental income and capital appreciation",
    color: "#EF4444",
    icon: <FontAwesome5 name="home" size={24} color="white" />,
  },
  {
    title: "Fixed Deposit",
    description: "Secure, low-risk deposits with guaranteed returns",
    color: "#2563EB",
    icon: <Ionicons name="business" size={24} color="white" />,
  },
  {
    title: "Recurring Deposit",
    description:
      "Regular deposits with compound interest for disciplined saving",
    color: "#16A34A",
    icon: <Ionicons name="trending-up" size={24} color="white" />,
  },
  {
    title: "Savings", // New Savings Type
    description: "Track your liquid savings in bank accounts or cash",
    color: "#F59E0B",
    icon: <MaterialCommunityIcons name="bank" size={24} color="white" />, // Using bank icon
  },
];

export default function InvestmentNavigation() {
  const navigation = useNavigation();
  // Removed activeTab state

  const renderInvestmentCard = ({
    id,
    title,
    description,
    icon,
    screen,
    color,
  }) => (
    <TouchableOpacity
      key={id}
      style={[styles.investmentCard, { backgroundColor: color }]}
      onPress={() => navigation.navigate(screen)}
    >
      <View style={styles.cardIconContainer}>
        {id === "fd" && <Ionicons name={icon} size={28} color="white" />}
        {id === "rd" && <Ionicons name={icon} size={28} color="white" />}
        {id === "savings" && (
          <MaterialCommunityIcons name={icon} size={28} color="white" />
        )}{" "}
        {/* Use MaterialCommunityIcons for bank */}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="white" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Removed header as per image */}
        {/* Removed tabRow */}

        {/* Add New Investment Content - moved to the top */}
        <View style={styles.section}>
          {/* Removed "Add New Investment" title as per image */}
          {/* Removed infoCard as per image */}

          {/* Existing FD/RD Cards - and now Savings card */}
          <TouchableOpacity
            style={[styles.bankCard, styles.fdCardBg]}
            onPress={() => navigation.navigate("FDScreen")}
            activeOpacity={0.8}
          >
            <View
              style={[styles.bankIconCircle, { backgroundColor: "#2563eb20" }]}
            >
              <Ionicons name="business" size={28} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bankCardTitle}>Fixed Deposit</Text>
              <Text style={styles.bankCardDesc}>
                Track your FD investments and calculate returns
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bankCard, styles.rdCardBg]}
            onPress={() => navigation.navigate("RDScreen")}
            activeOpacity={0.8}
          >
            <View
              style={[styles.bankIconCircle, { backgroundColor: "#16a34a20" }]}
            >
              <Ionicons name="trending-up" size={28} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bankCardTitle}>Recurring Deposit</Text>
              <Text style={styles.bankCardDesc}>
                Manage your RD investments and monitor growth
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
          </TouchableOpacity>
          {/* New Savings Card - same design */}
          <TouchableOpacity
            style={[styles.bankCard, styles.savingsCardBg]}
            onPress={() => navigation.navigate("SavingsScreen")}
            activeOpacity={0.8}
          >
            <View
              style={[styles.bankIconCircle, { backgroundColor: "#f59e0b20" }]}
            >
              <MaterialCommunityIcons name="bank" size={28} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bankCardTitle}>Savings</Text>
              <Text style={styles.bankCardDesc}>
                Track your liquid savings and simple returns
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Removed "Your Investment Portfolio" section and "Investment Types" grid as per image */}

        {/* Investment Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Investment Tips</Text>
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <FontAwesome5 name="lightbulb" size={18} color="#F59E0B" />
              <Text style={styles.tipTitle}>Start Early</Text>
            </View>
            <Text style={styles.tipContent}>
              The power of compounding works best over long periods. Starting
              early, even with small amounts, can lead to significant growth.
            </Text>
          </View>
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <FontAwesome5 name="lightbulb" size={18} color="#F59E0B" />
              <Text style={styles.tipTitle}>Diversify Your Portfolio</Text>
            </View>
            <Text style={styles.tipContent}>
              Don't put all your eggs in one basket. Spread your investments
              across different asset classes to reduce risk.
            </Text>
          </View>
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <FontAwesome5 name="lightbulb" size={18} color="#F59E0B" />
              <Text style={styles.tipTitle}>Invest Regularly</Text>
            </View>
            <Text style={styles.tipContent}>
              Consistent investing through SIPs (Systematic Investment Plans)
              can help navigate market volatility through rupee-cost averaging.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollViewContent: {
    paddingBottom: 20, // Give some padding at the bottom for scroll
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 24,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#2563eb",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  activeTabButtonText: {
    color: "#2563eb",
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#DBEAFE",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderColor: "#93C5FD",
    borderWidth: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 8,
  },
  tipContent: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  investmentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIconContainer: {
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  typeCard: {
    width: (width - 48) / 2, // 16*2 padding + 16 gap
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: "space-between",
    minHeight: 160,
  },
  typeIcon: {
    marginBottom: 10,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  // Styles for the FD/RD/Savings cards within the "Add New Investment" section
  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    // Removed specific background here, now applying dynamically
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  // New styles for specific card backgrounds
  fdCardBg: {
    backgroundColor: "#e3eafd", // light blue
  },
  rdCardBg: {
    backgroundColor: "#e6f4ec", // light green
  },
  savingsCardBg: {
    backgroundColor: "#fffbe6", // very light yellow/orange
  },
  bankIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  bankCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  bankCardDesc: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  tipsSection: {
    padding: 16,
    marginBottom: 24,
  },
  tipCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
});
