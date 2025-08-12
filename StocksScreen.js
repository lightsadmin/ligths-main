import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getStockCompanies } from "./services/finnhubService";
import { API_BASE_URL, ENDPOINTS } from "./config/api";

const StocksScreen = () => {
  const navigation = useNavigation();
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExchange, setSelectedExchange] = useState("INDIA"); // Changed default to INDIA
  const [lastUpdated, setLastUpdated] = useState(null);

  // Animated values for loading icon
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Exchange options - India first as main focus
  const exchangeOptions = [
    { key: "INDIA", label: "�� India", fullName: "NSE & BSE" },
    { key: "NSE", label: "🇮🇳 NSE", fullName: "National Stock Exchange" },
    { key: "BSE", label: "🇮🇳 BSE", fullName: "Bombay Stock Exchange" },
    { key: "US", label: "�� USA", fullName: "US Exchanges" },
    { key: "UK", label: "🇬🇧 UK", fullName: "London Stock Exchange" },
    { key: "HONG_KONG", label: "🇭🇰 HK", fullName: "Hong Kong Exchange" },
    { key: "CANADA", label: "🇨🇦 CA", fullName: "Toronto Exchange" },
    { key: "JAPAN", label: "🇯🇵 JP", fullName: "Tokyo Exchange" },
  ];

  useEffect(() => {
    fetchCompanies();
  }, [selectedExchange]);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, companies]);

  // Animation for loading icon
  useEffect(() => {
    if (loading) {
      // Start rotation animation
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      // Start pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

      rotateAnimation.start();
      pulseAnimation.start();

      return () => {
        rotateAnimation.stop();
        pulseAnimation.stop();
      };
    } else {
      // Reset animations when loading stops
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [loading, rotateAnim, pulseAnim]);

  const fetchCompanies = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      console.log("🔍 Fetching companies for exchange:", selectedExchange);
      const data = await getStockCompanies("", 1, 1000, selectedExchange);
      console.log(
        "📊 Received data:",
        data ? `${data.companies?.length} companies` : "no data"
      );

      setCompanies(data.companies || []);
      setLastUpdated(new Date());

      // If Indian stocks return no data, suggest US as alternative
      if (
        (selectedExchange === "INDIA" ||
          selectedExchange === "NSE" ||
          selectedExchange === "BSE") &&
        (!data.companies || data.companies.length === 0)
      ) {
        Alert.alert(
          "Indian Stocks Unavailable",
          "Indian stock data is currently not available with this API key. Would you like to view US stocks instead?",
          [
            { text: "Stay with India", style: "cancel" },
            {
              text: "Switch to US",
              onPress: () => setSelectedExchange("US"),
              style: "default",
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error fetching stock companies:", error);
      Alert.alert(
        "Error",
        "Failed to fetch stock companies. Please check your internet connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredCompanies(companies);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = companies.filter(
        (company) =>
          company.symbol.toLowerCase().includes(query) ||
          company.name.toLowerCase().includes(query)
      );
      setFilteredCompanies(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanies(false);
  };

  const navigateToDetail = (symbol) => {
    navigation.navigate("StockDetail", { symbol });
  };

  const renderCompanyItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.companyCard}
        onPress={() => navigateToDetail(item.symbol)}
        activeOpacity={0.7}
      >
        <View style={styles.companyHeader}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.stockSymbol}>{item.symbol}</Text>
            <View style={styles.companyMeta}>
              <Text style={styles.stockType}>{item.type}</Text>
              {item.exchange && (
                <Text style={styles.exchangeInfo}>
                  {item.exchange} • {item.currency || "USD"}
                </Text>
              )}
              {item.country && (
                <Text style={styles.countryInfo}>{item.country}</Text>
              )}
            </View>
          </View>
          <View style={styles.actionContainer}>
            <Ionicons name="chevron-forward" size={20} color="#0F9D58" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Ionicons name="business" size={28} color="#0F9D58" />
        <Text style={styles.headerTitle}>Stock Markets</Text>
      </View>

      {/* Exchange Selection */}
      <View style={styles.exchangeContainer}>
        <Text style={styles.sectionLabel}>Select Market:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.exchangeScroll}
        >
          {exchangeOptions.map((exchange) => (
            <TouchableOpacity
              key={exchange.key}
              style={[
                styles.exchangeButton,
                selectedExchange === exchange.key &&
                  styles.selectedExchangeButton,
              ]}
              onPress={() => setSelectedExchange(exchange.key)}
            >
              <Text
                style={[
                  styles.exchangeButtonText,
                  selectedExchange === exchange.key &&
                    styles.selectedExchangeButtonText,
                ]}
              >
                {exchange.label}
              </Text>
              <Text
                style={[
                  styles.exchangeSubtext,
                  selectedExchange === exchange.key &&
                    styles.selectedExchangeSubtext,
                ]}
              >
                {exchange.fullName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#6B7280"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search companies..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        {loading && companies.length > 0 && (
          <View style={styles.inlineLoadingContainer}>
            <ActivityIndicator size="small" color="#0F9D58" />
            <Text style={styles.inlineLoadingText}>Updating...</Text>
          </View>
        )}
        <Text style={styles.statsText}>
          Showing {filteredCompanies.length} companies
          {searchQuery ? ` for "${searchQuery}"` : ""}
        </Text>
        {lastUpdated && (
          <Text style={styles.lastUpdated}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => {
    const isIndianExchange = ["INDIA", "NSE", "BSE"].includes(selectedExchange);

    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name={isIndianExchange ? "flag-outline" : "business-outline"}
          size={60}
          color="#9CA3AF"
        />
        <Text style={styles.emptyText}>
          {searchQuery
            ? "No companies found"
            : isIndianExchange
            ? "Indian Stocks Unavailable"
            : "No companies available"}
        </Text>
        <Text style={styles.emptySubtext}>
          {searchQuery
            ? `Try adjusting your search for "${searchQuery}"`
            : isIndianExchange
            ? "Indian stock data is currently not available with this API key. Try switching to US stocks for now."
            : "Please check your internet connection"}
        </Text>
        {!searchQuery && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() =>
              isIndianExchange ? setSelectedExchange("US") : fetchCompanies()
            }
          >
            <Text style={styles.retryText}>
              {isIndianExchange ? "Switch to US Stocks" : "Retry"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Animated Loading Component
  const AnimatedLoadingIcon = () => {
    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <View style={styles.animatedLoadingContainer}>
        <Animated.View
          style={[
            styles.loadingIconContainer,
            {
              transform: [{ scale: pulseAnim }, { rotate: rotate }],
            },
          ]}
        >
          <Ionicons name="business" size={40} color="#0F9D58" />
        </Animated.View>
        <Animated.View
          style={[
            styles.loadingRing,
            {
              transform: [{ rotate: rotate }],
            },
          ]}
        />
        <Text style={styles.loadingText}>
          Loading {selectedExchange === "INDIA" ? "Indian" : selectedExchange}{" "}
          stocks...
        </Text>
        <Text style={styles.loadingSubtext}>
          {selectedExchange === "INDIA"
            ? "Fetching companies from NSE & BSE"
            : `Connecting to ${
                exchangeOptions.find((ex) => ex.key === selectedExchange)
                  ?.fullName || selectedExchange
              }`}
        </Text>
      </View>
    );
  };

  if (loading && companies.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <AnimatedLoadingIcon />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredCompanies}
        renderItem={renderCompanyItem}
        keyExtractor={(item) => item.symbol}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0F9D58"]}
            tintColor="#0F9D58"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  listContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  animatedLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F9D58",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
  },
  loadingRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#E5F7EC",
    borderTopColor: "#0F9D58",
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 32,
    fontSize: 18,
    fontWeight: "600",
    color: "#0F9D58",
    textAlign: "center",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  clearButton: {
    padding: 4,
  },
  statsContainer: {
    alignItems: "center",
  },
  inlineLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#E5F7EC",
    borderRadius: 20,
  },
  inlineLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#0F9D58",
    fontWeight: "600",
  },
  statsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 14,
    color: "#6B7280",
  },
  companyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: "#0F9D58",
  },
  companyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  stockSymbol: {
    fontSize: 14,
    color: "#0F9D58",
    fontWeight: "600",
    marginBottom: 2,
  },
  stockType: {
    fontSize: 12,
    color: "#6B7280",
  },
  companyMeta: {
    marginTop: 4,
  },
  exchangeInfo: {
    fontSize: 11,
    color: "#0F9D58",
    fontWeight: "500",
    marginTop: 2,
  },
  countryInfo: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 1,
  },
  // Exchange Selection Styles
  exchangeContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  exchangeScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  exchangeButton: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: "center",
  },
  selectedExchangeButton: {
    backgroundColor: "#0F9D58",
    borderColor: "#0F9D58",
  },
  exchangeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  selectedExchangeButtonText: {
    color: "#FFFFFF",
  },
  exchangeSubtext: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },
  selectedExchangeSubtext: {
    color: "#E5F7EC",
  },
  actionContainer: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#0F9D58",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default StocksScreen;
