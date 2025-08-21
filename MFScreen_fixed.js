import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  SectionList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { buildURL, ENDPOINTS } from "./config/api";
import { EventRegister } from "react-native-event-listeners";

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const MFScreen = () => {
  const [allCompanies, setAllCompanies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const navigation = useNavigation();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  /**
   * Fetches user's mutual fund investments from the server.
   */
  const fetchInvestments = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        console.log("ℹ️ No user info found - setting empty investments");
        setInvestments([]);
        return;
      }

      const userInfo = JSON.parse(userInfoString);
      const token = userInfo?.token;

      if (!token) {
        console.log("ℹ️ No token found - setting empty investments");
        setInvestments([]);
        return;
      }

      console.log(
        "🔍 Fetching investments with token:",
        token.substring(0, 20) + "..."
      );

      const response = await fetch(buildURL(ENDPOINTS.INVESTMENTS), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Investment API response status:", response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log("🔑 Token expired or invalid - clearing user session");
          await AsyncStorage.removeItem("userInfo");
          setInvestments([]);
          return;
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        "📊 Received investments data:",
        data.length,
        "total investments"
      );

      const mfInvestments = data.filter(
        (item) => item.investmentType === "Mutual Fund"
      );
      console.log("💰 Found MF investments:", mfInvestments.length);
      setInvestments(mfInvestments);
    } catch (error) {
      console.error("Error fetching investments:", error);
      setInvestments([]);
    }
  };

  /**
   * Fetches mutual fund data from /mutualfunds/companies endpoint which returns
   * properly validated, deduplicated, and alphabetically sorted funds grouped by company.
   */
  const fetchCompanies = async () => {
    try {
      if (!refreshing && (!allCompanies || allCompanies.length === 0)) {
        setLoading(true);
      }

      const timestamp = new Date().getTime();
      const url = buildURL(ENDPOINTS.MUTUAL_FUNDS_COMPANIES, {
        t: timestamp,
      });

      console.log("💰 Fetching validated mutual fund companies from URL:", url);

      const response = await fetch(url, {
        timeout: 120000,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        console.error(
          "❌ Companies API Error:",
          response.status,
          response.statusText
        );
        throw new Error(`Server error: ${response.status}`);
      }

      const companiesData = await response.json();
      console.log(
        "📊 Companies API Response received:",
        Array.isArray(companiesData)
          ? `${companiesData.length} companies with validated funds`
          : typeof companiesData
      );

      if (Array.isArray(companiesData)) {
        console.log(
          `📊 Processing ${companiesData.length} validated companies`
        );

        const transformedData = companiesData
          .filter((company) => {
            const isValid =
              company &&
              company.schemes &&
              Array.isArray(company.schemes) &&
              company.schemes.length > 0 &&
              company.companyName &&
              typeof company.companyName === "string" &&
              company.companyName.trim().length > 0;

            if (!isValid) {
              console.warn("⚠️ Filtering out invalid company:", company);
            }

            return isValid;
          })
          .map((company) => {
            const companyInvestments = investments.filter((investment) =>
              company.schemes.some(
                (scheme) =>
                  investment &&
                  investment.name &&
                  scheme &&
                  scheme.schemeName &&
                  (investment.name === scheme.schemeName ||
                    investment.description?.includes(scheme.schemeCode))
              )
            );

            return {
              companyName: company.companyName || "Unknown Company",
              data: (company.schemes || []).filter(
                (scheme) =>
                  scheme &&
                  scheme.schemeCode &&
                  scheme.schemeName &&
                  scheme.schemeName !== "-"
              ),
              investments: companyInvestments || [],
              lastUpdated: company.lastUpdated || new Date().toISOString(),
            };
          })
          .filter((company) => company.data && company.data.length > 0)
          .sort((a, b) => a.companyName.localeCompare(b.companyName));

        const totalSchemesInGroups = transformedData.reduce(
          (total, company) => total + (company.data?.length || 0),
          0
        );

        console.log(
          `✅ Successfully processed ${transformedData.length} companies with ${totalSchemesInGroups} total schemes`
        );

        setAllCompanies(transformedData);
        const validCompanies = transformedData.filter(
          (company) =>
            company &&
            company.data &&
            Array.isArray(company.data) &&
            company.data.length > 0
        );
        setCompanies(validCompanies);
      } else {
        console.warn(
          "⚠️ Expected companies array but received:",
          typeof companiesData
        );
        setAllCompanies([]);
        setCompanies([]);
      }
    } catch (error) {
      console.error("❌ Error fetching companies:", error);
      setAllCompanies([]);
      setCompanies([]);
      Alert.alert(
        "Connection Error",
        `Failed to load mutual funds: ${error.message}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterCompanies = useCallback(
    (searchQuery) => {
      try {
        if (!Array.isArray(allCompanies)) {
          console.warn("allCompanies is not an array:", allCompanies);
          setCompanies([]);
          return;
        }

        let filteredCompanies = [];

        if (!searchQuery || !searchQuery.trim()) {
          filteredCompanies = allCompanies
            .filter(
              (company) =>
                company &&
                company.data &&
                Array.isArray(company.data) &&
                company.data.length > 0
            )
            .map((company, companyIndex) => ({
              ...company,
              sectionKey: `company-${companyIndex}-${company.companyName.replace(
                /\s+/g,
                "-"
              )}`,
              data: company.data.map((item, itemIndex) => ({
                ...item,
                itemKey: `${company.companyName}-${item.schemeCode}-${itemIndex}`,
              })),
            }));
        } else {
          filteredCompanies = allCompanies
            .filter(
              (company) =>
                company &&
                company.companyName &&
                company.data &&
                Array.isArray(company.data) &&
                company.data.length > 0 &&
                company.companyName
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())
            )
            .map((company, companyIndex) => ({
              ...company,
              sectionKey: `search-${companyIndex}-${company.companyName.replace(
                /\s+/g,
                "-"
              )}`,
              data: company.data.map((item, itemIndex) => ({
                ...item,
                itemKey: `${company.companyName}-${item.schemeCode}-${itemIndex}`,
              })),
            }));
        }

        const validFilteredCompanies = filteredCompanies.filter(
          (company) =>
            company &&
            company.data &&
            Array.isArray(company.data) &&
            company.data.length > 0 &&
            company.sectionKey
        );

        console.log(
          `🔍 Filtered to ${validFilteredCompanies.length} companies`
        );
        setCompanies(validFilteredCompanies);
      } catch (error) {
        console.error("Error in filterCompanies:", error);
        setCompanies([]);
      }
    },
    [allCompanies, investments]
  );

  const debouncedFilterCompanies = useCallback(
    debounce((searchQuery) => {
      setIsSearching(true);
      filterCompanies(searchQuery);
      setIsSearching(false);
    }, 300),
    [filterCompanies]
  );

  useEffect(() => {
    try {
      console.log(
        `🔍 Filtering companies with search: "${searchText}", allCompanies: ${allCompanies.length}`
      );
      debouncedFilterCompanies(searchText);
    } catch (error) {
      console.error("Error in filterCompanies:", error);
      setCompanies([]);
      setIsSearching(false);
    }
  }, [searchText, debouncedFilterCompanies, investments]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCompanies(), fetchInvestments()]);
    };
    loadData();

    const listener = EventRegister.addEventListener("investmentAdded", () => {
      fetchInvestments();
    });

    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [loading]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchCompanies(), fetchInvestments()]).finally(() => {
      setRefreshing(false);
    });
  };

  const handleFundPress = (fund) => {
    navigation.navigate("MFCalculator", { fund });
  };

  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setIsSearching(false);
    setTimeout(() => {
      filterCompanies("");
    }, 0);
  }, [filterCompanies]);

  const renderSectionHeader = useCallback(({ section }) => {
    if (!section) {
      return null;
    }

    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionHeaderText}>
            {section?.companyName || "Unknown Company"}
          </Text>
          {section?.investments && section.investments.length > 0 && (
            <View style={styles.investmentBadge}>
              <Text style={styles.investmentBadgeText}>
                {section.investments.length} Investment
                {section.investments.length > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.sectionHeaderDate}>
          Live:{" "}
          {section?.lastUpdated
            ? new Date(section.lastUpdated).toLocaleDateString()
            : "N/A"}
        </Text>
      </View>
    );
  }, []);

  const renderFundItem = useCallback(
    ({ item, section }) => {
      if (!item) {
        return null;
      }

      const fundInvestment = section?.investments?.find(
        (investment) =>
          investment.name === item.schemeName ||
          investment.description?.includes(item.schemeCode)
      );

      return (
        <TouchableOpacity
          style={[
            styles.fundCard,
            fundInvestment && styles.fundCardWithInvestment,
          ]}
          onPress={() => handleFundPress(item)}
        >
          <View style={styles.fundMainContent}>
            <View style={styles.companySection}>
              <View style={styles.fundNameRow}>
                <Text style={styles.fundName} numberOfLines={3}>
                  {item?.schemeName || "Fund Name Not Available"}
                </Text>
                {fundInvestment && (
                  <View style={styles.investmentIndicator}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#059669"
                    />
                  </View>
                )}
              </View>
              <Text style={styles.schemeCode}>
                Code: {item?.schemeCode || "N/A"}
              </Text>
            </View>
            <View style={styles.navSection}>
              <Text style={styles.navValue}>
                ₹{(parseFloat(item?.nav) || 0).toFixed(2)}
              </Text>
              <View style={styles.navDate}>
                <Text style={styles.navDateText}>
                  {item?.lastUpdated
                    ? new Date(item.lastUpdated).toLocaleDateString()
                    : "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleFundPress]
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Ionicons name="sad-outline" size={60} color="#9CA3AF" />
        <Text style={styles.emptyText}>
          {searchText
            ? "No companies found for your search."
            : "Could not load mutual funds."}
        </Text>
      </View>
    ),
    [searchText]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Ionicons name="logo-react" size={60} color="#3B82F6" />
          </Animated.View>
          <Text style={styles.loadingText}>Loading mutual funds...</Text>
          <Text style={styles.loadingSubtext}>This may take a moment</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Mutual Funds</Text>
            <Text style={styles.subtitle}>
              Grouped by Company ({companies.length} companies,{" "}
              {companies.reduce(
                (total, company) => total + (company.data?.length || 0),
                0
              )}{" "}
              funds)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by company name..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9CA3AF"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <SectionList
        sections={Array.isArray(companies) ? companies : []}
        keyExtractor={(item, index) => {
          if (!item) return `empty-item-${index}`;
          return (
            item.itemKey || `fallback-${item.schemeCode || "unknown"}-${index}`
          );
        }}
        renderItem={renderFundItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3B82F6"]}
            tintColor={"#3B82F6"}
          />
        }
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        updateCellsBatchingPeriod={100}
        getItemLayout={null}
        onEndReachedThreshold={0.8}
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
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
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
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    paddingVertical: 12,
    color: "#1E293B",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7F8FC",
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  investmentBadge: {
    backgroundColor: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 10,
  },
  investmentBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  sectionHeaderDate: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  fundCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 80,
  },
  fundCardWithInvestment: {
    borderLeftWidth: 4,
    borderLeftColor: "#059669",
    backgroundColor: "#F8FFF8",
  },
  fundMainContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  companySection: {
    flex: 1,
    marginRight: 15,
  },
  fundNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fundName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
    lineHeight: 18,
    marginBottom: 2,
  },
  investmentIndicator: {
    marginLeft: 8,
  },
  schemeCode: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  navSection: {
    alignItems: "flex-end",
  },
  navValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
  },
  navDate: {
    marginTop: 4,
  },
  navDateText: {
    fontSize: 10,
    color: "#64748B",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
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
  },
});

export default MFScreen;
