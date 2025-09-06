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
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import TechnicalAnalysisService from "./services/technicalAnalysisService";
import RealStockDataService from "./services/realStockDataService";
import { API_BASE_URL, ENDPOINTS } from "./config/api";

// Enhanced Company Item Component with technical analysis
const CompanyItem = memo(({ item, onPress, onAnalyze }) => {
  // Add safety checks for item
  if (!item || typeof item !== "object") {
    return (
      <View style={styles.companyCard}>
        <Text style={styles.companyName}>Invalid item data</Text>
      </View>
    );
  }

  const handlePress = useCallback(() => {
    onPress(item.symbol || "unknown");
  }, [item.symbol, onPress]);

  const handleAnalyze = useCallback(() => {
    onAnalyze(item);
  }, [item, onAnalyze]);

  const isPositive = (item.change || 0) >= 0;

  return (
    <TouchableOpacity
      style={styles.companyCard}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.companyHeader}>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName} numberOfLines={2}>
            {(item.name || "Unknown Company").toString()}
          </Text>
          <Text style={styles.stockSymbol}>
            {(item.symbol || "N/A").toString()}
          </Text>
          <View style={styles.companyMeta}>
            <Text style={styles.stockType}>
              {(item.sector || "Unknown").toString()}
            </Text>
            {item.exchange && (
              <Text style={styles.exchangeInfo}>
                {(item.exchange || "N/A").toString()} •{" "}
                {(item.currency || "USD").toString()}
              </Text>
            )}
            {item.marketCap && (
              <Text style={styles.marketCapInfo}>
                Market Cap: {(item.marketCap || "N/A").toString()}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>
            {item.currency === "INR" ? "₹" : "$"}
            {(item.price || item.currentPrice || item.basePrice || 0).toFixed(
              2
            )}
          </Text>
          <View
            style={[
              styles.changeContainer,
              {
                backgroundColor:
                  (item.change || 0) >= 0 ? "#E8F5E8" : "#FFF2F2",
              },
            ]}
          >
            <Text
              style={[
                styles.changeText,
                { color: (item.change || 0) >= 0 ? "#10B981" : "#EF4444" },
              ]}
            >
              {(item.change || 0) >= 0 ? "+" : ""}
              {(item.change || 0).toFixed(2)} (
              {(item.changePercent || 0).toFixed(2)}%)
            </Text>
          </View>
          <Text style={styles.volumeText}>
            Vol: {((item.volume || 0) / 1000000).toFixed(1)}M
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={handleAnalyze}
          activeOpacity={0.7}
        >
          <Ionicons name="analytics" size={16} color="#007AFF" />
          <Text style={styles.analyzeButtonText}>Analyze</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.detailButton} onPress={handlePress}>
          <Text style={styles.detailButtonText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

CompanyItem.displayName = "CompanyItem";

const StocksScreen = () => {
  const navigation = useNavigation();
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [displayedCompanies, setDisplayedCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20; // Load 20 stocks at a time
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExchange, setSelectedExchange] = useState("NSE");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [analysisModal, setAnalysisModal] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analyzingStock, setAnalyzingStock] = useState(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  // Animation refs for loading states
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Real-time update timer
  const refreshTimer = useRef(null);

  // Exchange options based on selected tab
  const getExchangeOptions = () => {
    // Simplified - only show NSE stocks from CSV
    return [
      {
        key: "NSE",
        label: "NSE",
        fullName: "National Stock Exchange",
      },
    ];
  };

  useEffect(() => {
    fetchCompanies();
  }, [selectedExchange]);

  // Real-time data updates
  useEffect(() => {
    if (realTimeEnabled && companies.length > 0) {
      // Update every 30 seconds during market hours
      refreshTimer.current = setInterval(() => {
        console.log("🔄 Auto-refreshing stock data...");
        fetchCompanies(false); // Refresh without loading indicator
      }, 30000);
    }

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [realTimeEnabled, companies.length, fetchCompanies]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, companies]);

  // When tab changes, reset to first exchange of that tab
  useEffect(() => {
    const exchanges = getExchangeOptions();
    if (exchanges.length > 0) {
      setSelectedExchange(exchanges[0].key);
    }
  }, []); // Remove selectedTab dependency since we only have Indian stocks

  // Animation for loading icon
  useEffect(() => {
    if (loading) {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

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

        console.log("🔄 Fetching stock data from backend...");

        // If we're refreshing and already have data, use price update for real-time effect
        if (!showLoading && companies.length > 0) {
          const updatedStocks =
            RealStockDataService.updateStockPrices(companies);
          setCompanies(updatedStocks);
          setLastUpdated(new Date());
          console.log("📊 Updated prices for existing stocks");
          return;
        }

        // Fetch stocks from our backend CSV endpoint
        const exchangeFilter =
          selectedExchange === "ALL" ? null : selectedExchange;
        console.log(
          `🇮🇳 Loading ${
            selectedExchange === "ALL" ? "all Indian" : selectedExchange
          } stocks from backend...`
        );

        const response = await fetch(
          `${API_BASE_URL}${ENDPOINTS.STOCKS}?exchange=${
            exchangeFilter || "ALL"
          }`
        );

        if (!response.ok) {
          throw new Error(
            `Backend responded with ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();
        let stocksToUse = data.stocks || [];

        // If no data from backend, use fallback data
        if (!stocksToUse || stocksToUse.length === 0) {
          console.log("⚠️ No stock data from backend, using fallback data...");
          stocksToUse = RealStockDataService.getFallbackStockData();
        } else {
          const exchangeText =
            selectedExchange === "ALL"
              ? "NSE & BSE exchanges"
              : `${selectedExchange} exchange`;
          console.log(
            `✅ Retrieved ${stocksToUse.length} stocks from backend (${exchangeText})`
          );
        }

        // Filter stocks based on selected exchange if needed
        let filteredStocks = stocksToUse;
        if (selectedExchange !== "ALL") {
          filteredStocks = stocksToUse.filter(
            (stock) => stock.exchange === selectedExchange
          );
        }

        console.log(
          `📊 Loaded ${filteredStocks.length} stocks for ${selectedExchange}`
        );

        // Map backend fields to frontend expectations
        const mappedStocks = filteredStocks.map((stock) => ({
          ...stock,
          price: stock.currentPrice,
          change: stock.dayChange,
          changePercent: stock.dayChangePercent,
          currency: "INR", // Backend data is all Indian stocks
        }));

        setCompanies(mappedStocks);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error fetching stock companies:", error);

        // Show a user-friendly error message for backend failures
        Alert.alert(
          "Unable to Load Stock Data",
          "There was an issue fetching stock data from the server. This could be due to network connectivity or server issues. Please try again later.",
          [
            {
              text: "Retry",
              onPress: () => fetchCompanies(true),
            },
            {
              text: "OK",
              style: "cancel",
            },
          ]
        );

        // Set empty array instead of fallback data since we want real data only
        setCompanies([]);
        setLastUpdated(new Date());
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedExchange]
  );

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredCompanies(companies);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = companies.filter(
        (company) =>
          company.symbol.toLowerCase().includes(query) ||
          company.name.toLowerCase().includes(query) ||
          company.sector.toLowerCase().includes(query)
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

  // Technical Analysis Handler
  const handleAnalyzeStock = useCallback(async (stock) => {
    try {
      setAnalyzingStock(stock.symbol);

      console.log(`🔍 Analyzing ${stock.symbol}...`);

      // Try to get real historical data first
      let historicalData = await RealStockDataService.getHistoricalData(
        stock.symbol
      );

      // If no real data available, generate sample data
      if (!historicalData || historicalData.length === 0) {
        console.log(`📈 Generating sample data for ${stock.symbol}`);
        historicalData = RealStockDataService.generateHistoricalData(
          stock.symbol
        );
      }

      // Perform technical analysis
      const analysis = TechnicalAnalysisService.analyzeStock(
        historicalData,
        stock.symbol
      );

      if (analysis.success) {
        setCurrentAnalysis({
          stock: stock,
          analysis: analysis,
          historicalData: historicalData,
        });
        setAnalysisModal(true);
        console.log(
          `✅ Analysis complete for ${stock.symbol}: ${analysis.totalSignals} signals found`
        );
      } else {
        Alert.alert(
          "Analysis Error",
          analysis.error || "Failed to analyze stock"
        );
      }
    } catch (error) {
      console.error("Error analyzing stock:", error);
      Alert.alert("Error", "Failed to perform technical analysis");
    } finally {
      setAnalyzingStock(null);
    }
  }, []);

  // Memoized render function for FlatList
  const renderCompanyItem = useCallback(
    ({ item }) => (
      <CompanyItem
        item={item}
        onPress={(symbol) => navigateToDetail(symbol, item)}
        onAnalyze={handleAnalyzeStock}
      />
    ),
    [navigateToDetail, handleAnalyzeStock]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item) => item.symbol, []);

  // Memoized item layout
  const getItemLayout = useCallback(
    (data, index) => ({
      length: 120, // Increased height for new layout
      offset: 120 * index,
      index,
    }),
    []
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Ionicons name="trending-up" size={24} color="#007AFF" />
        <Text style={styles.headerTitle}>Real-Time Stocks & Analysis</Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.portfolioButton}
            onPress={() => navigation.navigate("StockPortfolioManager")}
          >
            <Ionicons name="briefcase" size={16} color="#007AFF" />
            <Text style={styles.portfolioButtonText}>Portfolio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.realTimeToggle,
              { backgroundColor: realTimeEnabled ? "#10B981" : "#8E8E93" },
            ]}
            onPress={() => setRealTimeEnabled(!realTimeEnabled)}
          >
            <Ionicons name="radio" size={12} color="#FFFFFF" />
            <Text style={styles.realTimeText}>LIVE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Simplified header - removed complex tabs */}

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
          placeholder="Search stocks, symbols, or sectors..."
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
          Showing {filteredCompanies.length} stocks
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

  // Technical Analysis Modal Component
  const renderAnalysisModal = () => {
    if (!currentAnalysis) return null;

    const { stock, analysis } = currentAnalysis;
    const signals = analysis.signals || [];

    return (
      <Modal
        visible={analysisModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAnalysisModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Ionicons name="analytics" size={24} color="#007AFF" />
              <Text style={styles.modalTitle}>Technical Analysis</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAnalysisModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Stock Info Header */}
            <View style={styles.stockInfoCard}>
              <Text style={styles.stockInfoName}>{stock.name}</Text>
              <Text style={styles.stockInfoSymbol}>{stock.symbol}</Text>
              <View style={styles.stockInfoPriceContainer}>
                <Text style={styles.stockInfoPrice}>
                  {stock.currency === "INR" ? "₹" : "$"}
                  {(
                    stock.price ||
                    stock.currentPrice ||
                    stock.basePrice ||
                    0
                  ).toFixed(2)}
                </Text>
                <View
                  style={[
                    styles.stockInfoChange,
                    {
                      backgroundColor:
                        (stock.change || 0) >= 0 ? "#E8F5E8" : "#FFF2F2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stockInfoChangeText,
                      {
                        color: (stock.change || 0) >= 0 ? "#10B981" : "#EF4444",
                      },
                    ]}
                  >
                    {(stock.change || 0) >= 0 ? "+" : ""}
                    {(stock.change || 0).toFixed(2)} (
                    {(stock.changePercent || 0).toFixed(2)}%)
                  </Text>
                </View>
              </View>
            </View>

            {/* Analysis Results */}
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSectionTitle}>
                Analysis Results ({signals.length} signals found)
              </Text>

              {signals.length === 0 ? (
                <View style={styles.noSignalsContainer}>
                  <Ionicons
                    name="information-circle"
                    size={48}
                    color="#8E8E93"
                  />
                  <Text style={styles.noSignalsText}>
                    No trading signals detected
                  </Text>
                  <Text style={styles.noSignalsSubtext}>
                    The current market conditions don't show any clear breakout
                    or breakdown patterns.
                  </Text>
                </View>
              ) : (
                signals.map((signal, index) => (
                  <View key={index} style={styles.signalCard}>
                    <View style={styles.signalHeader}>
                      <View
                        style={[
                          styles.signalBadge,
                          {
                            backgroundColor: signal.signal.includes("Breakout")
                              ? "#E8F5E8"
                              : "#FFF2F2",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.signalBadgeText,
                            {
                              color: signal.signal.includes("Breakout")
                                ? "#10B981"
                                : "#EF4444",
                            },
                          ]}
                        >
                          {signal.signal}
                        </Text>
                      </View>
                      <Text style={styles.signalDate}>{signal.date}</Text>
                    </View>

                    <View style={styles.signalMetrics}>
                      <View style={styles.signalMetric}>
                        <Text style={styles.signalMetricLabel}>Price</Text>
                        <Text style={styles.signalMetricValue}>
                          {stock.currency === "INR" ? "₹" : "$"}
                          {signal.close}
                        </Text>
                      </View>
                      <View style={styles.signalMetric}>
                        <Text style={styles.signalMetricLabel}>VWAP</Text>
                        <Text style={styles.signalMetricValue}>
                          {stock.currency === "INR" ? "₹" : "$"}
                          {signal.vwap}
                        </Text>
                      </View>
                      <View style={styles.signalMetric}>
                        <Text style={styles.signalMetricLabel}>RSI</Text>
                        <Text style={styles.signalMetricValue}>
                          {signal.rsi}
                        </Text>
                      </View>
                      <View style={styles.signalMetric}>
                        <Text style={styles.signalMetricLabel}>Change</Text>
                        <Text
                          style={[
                            styles.signalMetricValue,
                            {
                              color: signal.pctChange.includes("-")
                                ? "#EF4444"
                                : "#10B981",
                            },
                          ]}
                        >
                          {signal.pctChange}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.signalVolume}>
                      <Text style={styles.signalVolumeLabel}>
                        Volume Analysis
                      </Text>
                      <Text style={styles.signalVolumeText}>
                        Volume: {((signal.volume || 0) / 1000000).toFixed(1)}M
                        {signal.volChange !== "N/A"
                          ? ` (${signal.volChange})`
                          : ""}
                      </Text>
                      {signal.averageVolume !== "N/A" && (
                        <Text style={styles.signalVolumeText}>
                          Avg Volume:{" "}
                          {((signal.averageVolume || 0) / 1000000).toFixed(1)}M
                        </Text>
                      )}
                    </View>

                    {signal.nextTargets && signal.nextTargets.length > 0 && (
                      <View style={styles.signalTargets}>
                        <Text style={styles.signalTargetsLabel}>
                          Price Targets
                        </Text>
                        <View style={styles.signalTargetsRow}>
                          {signal.nextTargets.slice(0, 3).map((target, idx) => (
                            <View key={idx} style={styles.targetPill}>
                              <Text style={styles.targetText}>
                                {stock.currency === "INR" ? "₹" : "$"}
                                {(target || 0).toFixed(2)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <Ionicons name="warning" size={20} color="#FF9500" />
              <Text style={styles.disclaimerText}>
                This analysis is for educational purposes only and should not be
                considered as financial advice. Always do your own research
                before making investment decisions.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderEmpty = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={60} color="#9CA3AF" />
        <Text style={styles.emptyText}>
          {searchQuery ? "No stocks found" : "No stocks available"}
        </Text>
        <Text style={styles.emptySubtext}>
          {searchQuery
            ? `Try adjusting your search for "${searchQuery}"`
            : "Select a different exchange or check your internet connection"}
        </Text>
        {!searchQuery && (
          <TouchableOpacity style={styles.retryButton} onPress={fetchCompanies}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Animated Loading Component
  const AnimatedLoadingIcon = () => {
    return (
      <View style={styles.animatedLoadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563eb"
          style={styles.loadingSpinner}
        />
        <Text style={styles.loadingText}>Loading Indian stocks...</Text>
        <Text style={styles.loadingSubtext}>Fetching data from NSE & BSE</Text>
      </View>
    );
  };

  if (loading) {
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

      {/* Loading overlay for analysis */}
      {analyzingStock && (
        <View style={styles.analysisLoadingOverlay}>
          <View style={styles.analysisLoadingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.analysisLoadingText}>
              Analyzing {analyzingStock}...
            </Text>
            <Text style={styles.analysisLoadingSubtext}>
              Running technical analysis
            </Text>
          </View>
        </View>
      )}

      {/* Technical Analysis Modal */}
      {renderAnalysisModal()}
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
  loadingSpinner: {
    marginBottom: 20,
    transform: [{ scale: 1.5 }],
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
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  portfolioButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  portfolioButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 4,
  },
  realTimeToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  realTimeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
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
  statsText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 4,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  companyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  companyInfo: {
    flex: 1,
    marginRight: 12,
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
  marketCapInfo: {
    fontSize: 10,
    color: "#8E8E93",
    marginTop: 1,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  changeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  volumeText: {
    fontSize: 10,
    color: "#8E8E93",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  analyzeButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "500",
    color: "#007AFF",
  },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailButtonText: {
    marginRight: 4,
    fontSize: 12,
    fontWeight: "500",
    color: "#FFFFFF",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    marginLeft: 4,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  // Analysis Loading Overlay
  analysisLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  analysisLoadingCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 40,
  },
  analysisLoadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  analysisLoadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#8E8E93",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitle: {
    marginLeft: 8,
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stockInfoCard: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  stockInfoName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  stockInfoSymbol: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 8,
  },
  stockInfoPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockInfoPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1C1C1E",
    marginRight: 12,
  },
  stockInfoChange: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stockInfoChangeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  analysisSection: {
    marginBottom: 20,
  },
  analysisSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  noSignalsContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noSignalsText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#8E8E93",
    marginTop: 12,
    marginBottom: 8,
  },
  noSignalsSubtext: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
  },
  signalCard: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  signalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  signalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signalBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  signalDate: {
    fontSize: 12,
    color: "#8E8E93",
  },
  signalMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  signalMetric: {
    alignItems: "center",
  },
  signalMetricLabel: {
    fontSize: 10,
    color: "#8E8E93",
    marginBottom: 2,
  },
  signalMetricValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  signalVolume: {
    marginBottom: 12,
  },
  signalVolumeLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  signalVolumeText: {
    fontSize: 11,
    color: "#8E8E93",
  },
  signalTargets: {
    marginTop: 8,
  },
  signalTargetsLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  signalTargetsRow: {
    flexDirection: "row",
  },
  targetPill: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  targetText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  disclaimer: {
    flexDirection: "row",
    backgroundColor: "#FFF9E6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  disclaimerText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#8B5A00",
    lineHeight: 16,
    flex: 1,
  },
});

export default StocksScreen;
