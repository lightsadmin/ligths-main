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

const Investment = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* FD/RD Cards - InvestmentNavigation style */}
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
            <Ionicons
              name="chevron-forward"
              size={22}
              color="#94a3b8"
              style={{ marginLeft: 8 }}
            />
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
            <Ionicons
              name="chevron-forward"
              size={22}
              color="#94a3b8"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>

        {/* Info box - InvestmentNavigation style */}
        <View style={styles.infoBoxNav}>
          <View style={styles.infoBoxIconCircle}>
            <Ionicons name="information-circle" size={22} color="#64748b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBoxTitle}>
              Track and manage your fixed deposits and recurring deposits in one
              place.
            </Text>
            <Text style={styles.infoBoxSubtitle}>
              Calculate returns and monitor growth over time.
            </Text>
          </View>
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
};

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

export default Investment;

const styles = StyleSheet.create({
  infoBoxNav: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  infoBoxIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  infoBoxSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  fdRdCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  fdCardBg: {
    backgroundColor: "#e3eafd",
  },
  rdCardBg: {
    backgroundColor: "#e6f4ec",
  },
  fdRdIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  fdRdTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  fdRdSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 2,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
  },
  infoButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  banner: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    overflow: "hidden",
    padding: 20,
  },
  bannerContent: {
    flex: 3,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  bannerDescription: {
    fontSize: 14,
    color: "#E0F2FE",
    lineHeight: 20,
  },
  bannerIconContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  featuredSection: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 24,
    lineHeight: 20,
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 24,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    zIndex: 1,
  },
  activeTimelineDot: {
    backgroundColor: "#10B981",
  },
  currentTimelineDot: {
    backgroundColor: "#3B82F6",
  },
  timelineDotText: {
    color: "#64748B",
    fontWeight: "600",
  },
  timelineConnector: {
    position: "absolute",
    left: 16,
    top: 32,
    bottom: -24,
    width: 2,
    backgroundColor: "#E2E8F0",
  },
  lastConnector: {
    display: "none",
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  cardSection: {
    padding: 16,
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
  notifySection: {
    backgroundColor: "#EFF6FF",
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 16,
  },
  notifyText: {
    fontSize: 14,
    color: "#1E293B",
    textAlign: "center",
    marginVertical: 12,
    lineHeight: 20,
  },
  notifyButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  notifyButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
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
