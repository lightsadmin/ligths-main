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
        </View>

        {/* Notify Section */}
        <View style={styles.notifySection}>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/3592/3592189.png",
            }} // Placeholder image
            style={{ width: 80, height: 80, marginBottom: 12 }}
          />
          <Text style={styles.notifyText}>
            Set up notifications for your investments. Get alerts on maturity,
            interest payments, and more.
          </Text>
          <TouchableOpacity style={styles.notifyButton}>
            <Text style={styles.notifyButtonText}>Set up Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Financial Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Financial Tips for You</Text>
          <View style={styles.tipCard}>
            <Ionicons
              name="bulb-outline"
              size={24}
              color="#2563EB"
              style={styles.tipIcon}
            />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitleCard}>Diversify Your Portfolio</Text>
              <Text style={styles.tipDescription}>
                Don't put all your eggs in one basket. Spread your investments
                across different asset classes.
              </Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Ionicons
              name="cash-outline"
              size={24}
              color="#16A34A"
              style={styles.tipIcon}
            />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitleCard}>Start Early</Text>
              <Text style={styles.tipDescription}>
                The power of compounding works best over time. Start investing
                as early as possible.
              </Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Ionicons
              name="wallet-outline"
              size={24}
              color="#F59E0B"
              style={styles.tipIcon}
            />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitleCard}>Set Clear Goals</Text>
              <Text style={styles.tipDescription}>
                Define what you're saving for, whether it's a house, retirement,
                or education.
              </Text>
            </View>
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
    shadowOpacity: 0.1, // Reduced shadow for a softer look
    shadowRadius: 4,
    elevation: 3,
  },
  fdCardBg: {
    backgroundColor: "#E0F7FA", // Light blue, slightly different from the image but fits theme
  },
  rdCardBg: {
    backgroundColor: "#F3E5F5", // Light purple
  },
  savingsCardBg: {
    backgroundColor: "#FFFBEB", // Light yellow
  },
  fdRdIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF", // Icon circle background
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
  notifySection: {
    backgroundColor: "#EFF6FF", // Light blue background
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
  tipsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
    textAlign: "center",
  },
  tipCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitleCard: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
});

export default Investment;