import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { buildURL, ENDPOINTS } from "./config/api";

const MFScreen = () => {
  const [mutualFunds, setMutualFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filteredFunds, setFilteredFunds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigation = useNavigation();

  // Animation reference for the loading icon
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Test server connectivity
  const testServerConnection = async () => {
    try {
      console.log("🧪 Testing server connection...");
      const testUrl = buildURL(ENDPOINTS.MUTUAL_FUNDS, { page: 1, limit: 1 });
      console.log("🧪 Testing URL:", testUrl);

      const response = await fetch(testUrl, { timeout: 10000 });
      console.log("🧪 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Server response:", data);

        const sampleFund = data.funds?.[0];
        Alert.alert(
          "Server Data Test",
          `✅ Server is online!\n\nSample Fund:\nCode: ${sampleFund?.schemeCode}\nName: "${sampleFund?.schemeName}"\nNAV: ${sampleFund?.nav}\nDate: ${sampleFund?.navDate}\n\nTotal Funds: ${data.totalFunds}`
        );
      } else {
        console.log("❌ Server test failed:", response.status);
        Alert.alert(
          "Server Status",
          `❌ Server responded with status: ${response.status}`
        );
      }
    } catch (error) {
      console.error("❌ Server connection test failed:", error);
      Alert.alert(
        "Server Status",
        `❌ Cannot connect to server: ${error.message}`
      );
    }
  };

  const fetchMutualFunds = async (pageNum = 1, search = "") => {
    try {
      setLoading(pageNum === 1);
      const url = buildURL(ENDPOINTS.MUTUAL_FUNDS, {
        page: pageNum,
        limit: 20,
        search: search,
      });

      console.log("🔗 Fetching from URL:", url); // Debug log

      // Show alert for first load to inform user about cold start
      if (pageNum === 1) {
        setTimeout(() => {
          if (loading) {
            Alert.alert(
              "Loading...",
              "Server is waking up (Render free tier). This may take 30-60 seconds for the first request.",
              [{ text: "OK" }]
            );
          }
        }, 3000);
      }

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        // Increase timeout for Render cold start
        timeout: 60000, // 60 second timeout for cold starts
      });

      console.log("📡 Response status:", response.status); // Debug log

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Received data:", data.funds?.length || 0, "funds"); // Debug log
        console.log(
          "📊 Sample fund data:",
          JSON.stringify(data.funds?.[0], null, 2)
        ); // Debug first fund

        if (pageNum === 1) {
          setMutualFunds(data.funds);
        } else {
          setMutualFunds((prev) => [...prev, ...data.funds]);
        }
        setTotalPages(data.totalPages);
        setPage(pageNum);
      } else {
        const errorText = await response.text();
        console.error("❌ Server error:", response.status, errorText);
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("❌ Error fetching mutual funds:", error);
      Alert.alert(
        "Connection Error",
        `Failed to load mutual funds: ${
          error.message
        }\n\nTrying to connect to: ${buildURL(ENDPOINTS.MUTUAL_FUNDS)}`
      );

      // Try with mock data if server fails
      setMutualFunds([
        {
          schemeCode: "DEMO001",
          schemeName: "Demo Mutual Fund - Growth",
          nav: "25.50",
          date: "01-Aug-2025",
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log("🔗 Current API Base URL:", buildURL(""));
    fetchMutualFunds();
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

  useEffect(() => {
    if (searchText.trim() === "") {
      setFilteredFunds(mutualFunds);
    } else {
      const filtered = mutualFunds.filter((fund) =>
        fund.schemeName.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredFunds(filtered);
    }
  }, [searchText, mutualFunds]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchMutualFunds(1, searchText);
  };

  const loadMoreFunds = () => {
    if (page < totalPages && !loading) {
      fetchMutualFunds(page + 1, searchText);
    }
  };

  const handleFundPress = (fund) => {
    // Navigate to calculation page with fund data
    navigation.navigate("MFCalculator", {
      fund: fund,
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const renderFundItem = ({ item }) => {
    console.log("🔍 Rendering fund item:", {
      schemeCode: item.schemeCode,
      schemeName: item.schemeName,
      nav: item.nav,
      navDate: item.navDate,
    }); // Debug log

    // Extract company name (use backend companyName if available, else extract from schemeName)
    const getCompanyName = (item) => {
      console.log("🏢 Processing fund:", {
        companyName: item.companyName,
        schemeName: item.schemeName,
        schemeCode: item.schemeCode,
      }); // Debug log

      // If backend provides companyName, use it
      if (item.companyName && item.companyName.trim() !== "") {
        return item.companyName.trim();
      }

      const schemeName = item.schemeName;

      if (!schemeName || schemeName === "-" || schemeName.trim() === "") {
        // Generate a meaningful name based on scheme code
        return `Mutual Fund ${item.schemeCode}`;
      }

      // Try to extract company name before first " - "
      const parts = schemeName.split(" - ");
      if (parts.length > 1) {
        return parts[0].trim();
      }

      // If no " - " found, take first few words or limit to 40 chars
      const words = schemeName.split(" ");
      if (words.length > 4) {
        return words.slice(0, 4).join(" ");
      }

      return schemeName.length > 40
        ? schemeName.substring(0, 40) + "..."
        : schemeName;
    };

    const companyName = getCompanyName(item);

    return (
      <TouchableOpacity
        style={styles.fundCard}
        onPress={() => handleFundPress(item)}
      >
        <View style={styles.fundMainContent}>
          {/* Company Name */}
          <View style={styles.companySection}>
            <Text style={styles.companyName} numberOfLines={2}>
              {companyName}
            </Text>
            <Text style={styles.fundType} numberOfLines={1}>
              {item.schemeName && item.schemeName !== "-"
                ? item.schemeName
                    .replace(companyName, "")
                    .replace(/^[\s\-]+/, "")
                : `Scheme Code: ${item.schemeCode}`}
            </Text>
          </View>

          {/* NAV Section */}
          <View style={styles.navSection}>
            <Text style={styles.navLabel}>NAV</Text>
            <Text style={styles.navValue}>
              ₹
              {typeof item.nav === "number"
                ? item.nav.toFixed(2)
                : (parseFloat(item.nav) || 0).toFixed(2)}
            </Text>
            <View style={styles.navDate}>
              <Text style={styles.navDateText}>
                {item.navDate ||
                  item.date ||
                  new Date(item.lastUpdated || Date.now()).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.fundActions}>
          <View style={styles.schemeInfo}>
            <Text style={styles.schemeCode}>Code: {item.schemeCode}</Text>
          </View>
          <View style={styles.sipAction}>
            <Text style={styles.sipText}>Start SIP</Text>
            <Ionicons name="chevron-forward" size={18} color="#3B82F6" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={60} color="#9CA3AF" />
      <Text style={styles.emptyText}>
        {searchText
          ? "No funds found matching your search"
          : "No mutual funds available"}
      </Text>
    </View>
  );

  if (loading && mutualFunds.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Ionicons name="trending-up" size={60} color="#3B82F6" />
          </Animated.View>
          <Text style={styles.loadingText}>Loading mutual funds...</Text>
          <Text style={styles.loadingSubtext}>
            First load may take 30-60 seconds (server starting up)
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Mutual Funds</Text>
            <Text style={styles.subtitle}>
              Explore and invest in mutual funds
            </Text>
          </View>
          <TouchableOpacity
            style={styles.testButton}
            onPress={testServerConnection}
          >
            <Ionicons name="wifi-outline" size={16} color="#3B82F6" />
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search mutual funds..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9CA3AF"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredFunds}
        renderItem={renderFundItem}
        keyExtractor={(item) => item.schemeCode}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreFunds}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() =>
          loading && mutualFunds.length > 0 ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF4FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  testButtonText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#1E293B",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  fundCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  fundMainContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  companySection: {
    flex: 1,
    marginRight: 15,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
    lineHeight: 24,
  },
  fundType: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  navSection: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  navLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 2,
    fontWeight: "500",
  },
  navValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#059669",
    marginBottom: 2,
  },
  navDate: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  navDateText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  fundActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  schemeInfo: {
    flex: 1,
  },
  schemeCode: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  sipAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF4FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sipText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "600",
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "600",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },
});

export default MFScreen;
