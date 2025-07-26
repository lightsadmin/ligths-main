import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";

const { width } = Dimensions.get("window");

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
    description: "Physical gold, gold ETFs and sovereign gold bonds",
    color: "#F59E0B",
    icon: <FontAwesome5 name="coins" size={24} color="white" />,
  },
  {
    title: "Real Estate",
    description: "Property and REITs for asset appreciation",
    color: "#8B5CF6",
    icon: <FontAwesome5 name="building" size={24} color="white" />,
  },
];

const Investment = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* FD/RD Cards */}
        <View style={{ padding: 16, paddingTop: 32 }}>
          <TouchableOpacity
            style={[styles.fdRdCard, styles.fdCardBg]}
            onPress={() => navigation.navigate("FDScreen")}
            activeOpacity={0.9}
          >
            <View style={styles.fdRdIconCircle}>
              <Ionicons name="business" size={28} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fdRdTitle}>Fixed Deposit</Text>
              <Text style={styles.fdRdSubtitle}>
                Track your FD investments and calculate returns
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fdRdCard, styles.rdCardBg]}
            onPress={() => navigation.navigate("RDScreen")}
            activeOpacity={0.9}
          >
            <View style={styles.fdRdIconCircle}>
              <Ionicons name="trending-up" size={28} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fdRdTitle}>Recurring Deposit</Text>
              <Text style={styles.fdRdSubtitle}>
                Manage your RD investments and monitor growth
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fdRdCard, styles.savingsCardBg]}
            onPress={() => navigation.navigate("SavingsScreen")}
            activeOpacity={0.9}
          >
            <View style={styles.fdRdIconCircle}>
              <MaterialCommunityIcons name="bank" size={28} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fdRdTitle}>Savings</Text>
              <Text style={styles.fdRdSubtitle}>
                Track your savings and see simple returns
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748B" />
          </TouchableOpacity>

          {/* Added Mutual Funds Card */}
          <TouchableOpacity
            style={[styles.fdRdCard, styles.mfCardBg]}
            onPress={() => navigation.navigate("MFScreen")}
            activeOpacity={0.9}
          >
            <View style={styles.fdRdIconCircle}>
              <Ionicons name="podium" size={28} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fdRdTitle}>Mutual Funds</Text>
              <Text style={styles.fdRdSubtitle}>
                Diversify your portfolio with various mutual funds
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748B" />
          </TouchableOpacity>

          {/* Added Stocks Card */}
          <TouchableOpacity
            style={[styles.fdRdCard, styles.stocksCardBg]}
            onPress={() => navigation.navigate("StocksScreen")}
            activeOpacity={0.9}
          >
            <View style={styles.fdRdIconCircle}>
              <Ionicons name="analytics" size={28} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fdRdTitle}>Stocks</Text>
              <Text style={styles.fdRdSubtitle}>
                Invest in company shares and grow your wealth
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Featured Investment Types */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Featured Investment Types</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardContainer}
          >
            {investmentTypes.map((item, index) => (
              <TouchableOpacity key={index} style={styles.card}>
                <View
                  style={[
                    styles.cardIconContainer,
                    { backgroundColor: item.color },
                  ]}
                >
                  {item.icon}
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Investment Tips Section */}
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
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  fdRdCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fdCardBg: {
    backgroundColor: "#E0F7FA",
  },
  rdCardBg: {
    backgroundColor: "#F3E5F5",
  },
  savingsCardBg: {
    backgroundColor: "#FFFBEB",
  },
  mfCardBg: {
    backgroundColor: "#fee2e2", // Light red
  },
  stocksCardBg: {
    backgroundColor: "#ede9fe", // Light purple
  },
  fdRdIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  fdRdTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  fdRdSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  cardSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  cardContainer: {
    paddingVertical: 8,
    paddingBottom: 16,
  },
  card: {
    width: width * 0.75,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
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
});

export default Investment;
