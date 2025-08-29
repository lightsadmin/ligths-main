import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Helper functions for formatting
const formatCurrency = (value, currency = "USD") => {
  if (value === null || value === undefined) return "N/A";
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${value.toFixed(2)}`;
};

const formatPercentage = (value) => {
  if (value === null || value === undefined) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

// Debounce function implementation
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const StockSearchScreen = () => {
  const navigation = useNavigation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState("US");

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      setCurrentPage(1);
      fetchCompanies(searchTerm, 1, true);
    }, 300),
    [selectedExchange]
  );

  useEffect(() => {
    fetchCompanies("", 1, true);
  }, [selectedExchange]);

  useEffect(() => {
    if (searchText.trim() === "") {
      setCurrentPage(1);
      fetchCompanies("", 1, true);
    } else {
      debouncedSearch(searchText);
    }
  }, [searchText, debouncedSearch]);

  const fetchCompanies = async (
    search = "",
    page = 1,
    resetList = false,
    showLoading = true
  ) => {
    try {
      if (showLoading && resetList) {
        setLoading(true);
      } else if (!resetList) {
        setLoadingMore(true);
      }

      const response = await getStockCompanies(
        search,
        page,
        50,
        selectedExchange
      );

      if (resetList) {
        setCompanies(response.companies);
      } else {
        setCompanies((prev) => [...prev, ...response.companies]);
      }

      setCurrentPage(response.currentPage);
      setTotalPages(response.totalPages);
      setTotalCompanies(response.totalCompanies);
      setHasNext(response.hasNext);
    } catch (error) {
      console.error("Error fetching companies:", error);
      Alert.alert(
        "Error",
        "Failed to fetch stock companies. Please check your internet connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchCompanies(searchText, 1, true, false);
  };

  const loadMore = () => {
    if (!loadingMore && hasNext) {
      const nextPage = currentPage + 1;
      fetchCompanies(searchText, nextPage, false, false);
    }
  };

  const navigateToDetail = async (company) => {
    try {
      // Show loading for this specific stock
      Alert.alert("Loading", "Fetching stock details...");

      const stockData = await getStockQuoteFromBackend(company.symbol);
      navigation.navigate("StockDetail", {
        symbol: company.symbol,
        stockData: stockData,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to fetch stock details. Please try again.");
    }
  };

  const renderCompanyItem = ({ item }) => (
    <TouchableOpacity
      style={styles.companyCard}
      onPress={() => navigateToDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.companyHeader}>
        <View style={styles.companyInfo}>
          <Text style={styles.companySymbol}>{item.symbol}</Text>
          <Text style={styles.companyName} numberOfLines={2}>
            {item.description || item.displaySymbol || "N/A"}
          </Text>
          <Text style={styles.companyType}>
            {item.type || "Stock"} • {selectedExchange} Exchange
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0F9D58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Stock Companies</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#6B7280"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search companies or symbols..."
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchText("")}
          >
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.exchangeSelector}>
        <Text style={styles.selectorLabel}>Exchange:</Text>
        <View style={styles.exchangeButtons}>
          {["US", "TO", "L"].map((exchange) => (
            <TouchableOpacity
              key={exchange}
              style={[
                styles.exchangeButton,
                selectedExchange === exchange && styles.selectedExchangeButton,
              ]}
              onPress={() => setSelectedExchange(exchange)}
            >
              <Text
                style={[
                  styles.exchangeButtonText,
                  selectedExchange === exchange &&
                    styles.selectedExchangeButtonText,
                ]}
              >
                {exchange === "US"
                  ? "USA"
                  : exchange === "TO"
                  ? "Toronto"
                  : "London"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {totalCompanies.toLocaleString()} companies • Page {currentPage} of{" "}
          {totalPages}
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0F9D58" />
        <Text style={styles.loadingMoreText}>Loading more companies...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={60} color="#9CA3AF" />
      <Text style={styles.emptyText}>
        {searchText ? "No companies found" : "No companies available"}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchText
          ? `Try searching for "${searchText.toUpperCase()}" or similar terms`
          : "Please try refreshing the list"}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => fetchCompanies(searchText, 1, true)}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && companies.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F9D58" />
          <Text style={styles.loadingText}>Loading stock companies...</Text>
          <Text style={styles.loadingSubtext}>
            Fetching data from {selectedExchange} exchange
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={companies}
        renderItem={renderCompanyItem}
        keyExtractor={(item, index) => `${item.symbol}-${index}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0F9D58"]}
            tintColor="#0F9D58"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#9CA3AF",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  clearButton: {
    marginLeft: 8,
  },
  exchangeSelector: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  exchangeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  exchangeButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedExchangeButton: {
    backgroundColor: "#0F9D58",
    borderColor: "#0F9D58",
  },
  exchangeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  selectedExchangeButtonText: {
    color: "#FFFFFF",
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  companyInfo: {
    flex: 1,
  },
  companySymbol: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F9D58",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
    lineHeight: 18,
  },
  companyType: {
    fontSize: 12,
    color: "#6B7280",
  },
  arrowContainer: {
    marginLeft: 12,
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6B7280",
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
    color: "#6B7280",
    marginTop: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
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

export default StockSearchScreen;
