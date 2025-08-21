import React, { useState, useEffect, useRef, useCallback, memo } from "react";
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

// Memoized Company Item Component for better performance
const CompanyItem = memo(({ item, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(item.symbol);
  }, [item.symbol, onPress]);

  return (
    <TouchableOpacity
      style={styles.companyCard}
      onPress={handlePress}
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
          <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

CompanyItem.displayName = "CompanyItem";

const StocksScreen = () => {
  const navigation = useNavigation();
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("INDIA"); // Main tab: INDIA or OTHER
  const [selectedExchange, setSelectedExchange] = useState("NSE"); // Sub-exchange for India
  const [lastUpdated, setLastUpdated] = useState(null);

  // Animated values for loading icon
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Main tabs - simplified
  const mainTabs = [
    { key: "INDIA", label: "India" },
    { key: "OTHER", label: "Global" },
  ];

  // Exchange options based on selected tab
  const getExchangeOptions = () => {
    if (selectedTab === "INDIA") {
      return [
        { key: "NSE", label: "NSE", fullName: "National Stock Exchange" },
        { key: "BSE", label: "BSE", fullName: "Bombay Stock Exchange" },
      ];
    } else {
      // For "Other" tab, return empty array to hide exchange selection
      return [];
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [selectedTab, selectedExchange]);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, companies]);

  // When tab changes, reset to first exchange of that tab (only for India)
  useEffect(() => {
    const exchanges = getExchangeOptions();
    if (exchanges.length > 0) {
      setSelectedExchange(exchanges[0].key);
    } else {
      // For "Other" tab, set a default value that won't be used
      setSelectedExchange("ALL");
    }
  }, [selectedTab]);

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

  const fetchCompanies = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        // Determine the exchange parameter for the API
        let exchangeParam = selectedExchange;
        if (selectedTab === "INDIA") {
          // For India tab, pass either NSE or BSE
          exchangeParam = selectedExchange;
        } else {
          // For Other tab, fetch all world stocks by using a global parameter
          exchangeParam = "ALL"; // This will fetch stocks from all exchanges
        }

        console.log("🔍 Fetching companies for exchange:", exchangeParam);
        const data = await getStockCompanies("", 1, 10000, exchangeParam);

        setCompanies(data.companies || []);
        setLastUpdated(new Date());
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
    },
    [selectedTab, selectedExchange]
  );

  const handleSearch = useCallback(() => {
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
  }, [searchQuery, companies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompanies(false);
  }, [fetchCompanies]);

  const navigateToDetail = useCallback(
    (symbol, company) => {
      navigation.navigate("StockDetail", {
        symbol,
        company,
        exchange: selectedExchange,
      });
    },
    [navigation, selectedExchange]
  );

  // Memoized render function for FlatList
  const renderCompanyItem = useCallback(
    ({ item }) => (
      <CompanyItem
        item={item}
        onPress={(symbol) => navigateToDetail(symbol, item)}
      />
    ),
    [navigateToDetail]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item) => item.symbol, []);

  // Memoized item layout
  const getItemLayout = useCallback(
    (data, index) => ({
      length: 80,
      offset: 80 * index,
      index,
    }),
    []
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Ionicons name="trending-up" size={24} color="#007AFF" />
        <Text style={styles.headerTitle}>Stocks</Text>
      </View>

      {/* Main Tabs - India vs Global */}
      <View style={styles.mainTabsContainer}>
        <View style={styles.mainTabsRow}>
          {mainTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.mainTabButton,
                selectedTab === tab.key && styles.selectedMainTabButton,
              ]}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Text
                style={[
                  styles.mainTabText,
                  selectedTab === tab.key && styles.selectedMainTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sub-Exchange Selection - Only show for India tab */}
      {selectedTab === "INDIA" && (
        <View style={styles.exchangeContainer}>
          <Text style={styles.sectionLabel}>Select Exchange:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.exchangeScroll}
          >
            {getExchangeOptions().map((exchange) => (
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
      )}

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
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {/* Stock chart bars */}
          <View style={styles.stockBarsContainer}>
            <Animated.View
              style={[
                styles.stockBar,
                styles.bar1,
                { transform: [{ scaleY: pulseAnim }] },
              ]}
            />
            <Animated.View
              style={[
                styles.stockBar,
                styles.bar2,
                { transform: [{ scaleY: pulseAnim }] },
              ]}
            />
            <Animated.View
              style={[
                styles.stockBar,
                styles.bar3,
                { transform: [{ scaleY: pulseAnim }] },
              ]}
            />
            <Animated.View
              style={[
                styles.stockBar,
                styles.bar4,
                { transform: [{ scaleY: pulseAnim }] },
              ]}
            />
            <Animated.View
              style={[
                styles.stockBar,
                styles.bar5,
                { transform: [{ scaleY: pulseAnim }] },
              ]}
            />
          </View>
          {/* Growth arrow */}
          <Ionicons
            name="trending-up"
            size={24}
            color="#007AFF"
            style={styles.growthArrow}
          />
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
          Loading {selectedTab === "INDIA" ? "Indian" : "Global"} stocks...
        </Text>
        <Text style={styles.loadingSubtext}>
          {selectedTab === "INDIA"
            ? "Fetching companies from NSE & BSE"
            : "Connecting to global markets"}
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
        keyExtractor={keyExtractor}
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
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
        updateCellsBatchingPeriod={50}
        legacyImplementation={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
  },
  loadingIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  stockBarsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: 40,
    height: 30,
    position: "absolute",
  },
  stockBar: {
    width: 4,
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  bar1: {
    height: 10,
  },
  bar2: {
    height: 16,
  },
  bar3: {
    height: 12,
  },
  bar4: {
    height: 20,
  },
  bar5: {
    height: 24,
  },
  growthArrow: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  loadingRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#F0F0F0",
    borderTopColor: "#007AFF",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007AFF",
    textAlign: "center",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1C1C1E",
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1C1C1E",
  },
  clearButton: {
    padding: 4,
  },
  statsContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  inlineLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#E3F2FD",
    borderRadius: 15,
  },
  inlineLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  lastUpdated: {
    fontSize: 12,
    color: "#8E8E93",
  },
  companyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
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
    color: "#1C1C1E",
    marginBottom: 4,
  },
  stockSymbol: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 2,
  },
  stockType: {
    fontSize: 12,
    color: "#8E8E93",
  },
  companyMeta: {
    marginTop: 4,
  },
  exchangeInfo: {
    fontSize: 11,
    color: "#007AFF",
    fontWeight: "400",
    marginTop: 2,
  },
  countryInfo: {
    fontSize: 10,
    color: "#C7C7CC",
    marginTop: 1,
  },
  // Exchange Selection Styles
  exchangeContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
    marginBottom: 8,
  },
  exchangeScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  exchangeButton: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    minWidth: 100,
    alignItems: "center",
  },
  selectedExchangeButton: {
    backgroundColor: "#007AFF",
  },
  exchangeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1C1E",
    textAlign: "center",
  },
  selectedExchangeButtonText: {
    color: "#FFFFFF",
  },
  exchangeSubtext: {
    fontSize: 10,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 2,
  },
  selectedExchangeSubtext: {
    color: "#E3F2FD",
  },
  mainTabsContainer: {
    paddingBottom: 16,
  },
  mainTabsRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  mainTabButton: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: "center",
  },
  selectedMainTabButton: {
    backgroundColor: "#007AFF",
  },
  mainTabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  selectedMainTabText: {
    color: "#FFFFFF",
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
    fontWeight: "500",
    color: "#1C1C1E",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default StocksScreen;
