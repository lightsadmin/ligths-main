import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  SectionList, // Switched from FlatList to SectionList for grouped data
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventRegister } from "react-native-event-listeners";
import debounce from "lodash.debounce";

const MFScreen = () => {
  // State is now 'companies' to reflect the new data structure
  const [allCompanies, setAllCompanies] = useState([]); // Store all companies
  const [companies, setCompanies] = useState([]); // Filtered companies for display
  const [investments, setInvestments] = useState([]); // Store user's MF investments
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false); // Add searching state
  const navigation = useNavigation();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  /**
   * Fetches user's mutual fund investments from the server.
   */
  const fetchInvestments = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        setInvestments([]);
        return;
      }

      const userInfo = JSON.parse(userInfoString);
      const token = userInfo?.token;

      if (!token) {
        setInvestments([]);
        return;
      }

      const response = await fetch(buildURL(ENDPOINTS.INVESTMENTS), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const mfInvestments = data.filter(
        (item) => item.investmentType === "Mutual Fund"
      );
      setInvestments(mfInvestments);
    } catch (error) {
      console.error("Error fetching investments:", error);
      setInvestments([]);
    }
  };

  /**
   * Fetches mutual fund data directly from /mutualfunds endpoint with high limit,
   * then groups by company in frontend to ensure all 17,000 funds are displayed.
   */
  const fetchCompanies = async () => {
    try {
      // Set loading to true only for the initial fetch
      if (!refreshing && (!allCompanies || allCompanies.length === 0)) {
        setLoading(true);
      }

      // Use the regular '/mutualfunds' endpoint with high limit to get ALL funds
      const timestamp = new Date().getTime();
      const url = buildURL(ENDPOINTS.MUTUAL_FUNDS, {
        limit: 25000, // Set high limit to get all 17,000+ funds
        page: 1,
        t: timestamp,
      });

      console.log("💰 Fetching ALL mutual funds from URL:", url);

      const response = await fetch(url, {
        timeout: 120000, // Increase timeout for large dataset
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        console.error("❌ MF API Error:", response.status, response.statusText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        "📊 MF API Response received:",
        data.funds
          ? `${data.funds.length} total funds from ${data.totalFunds} in database`
          : typeof data
      );

      // Group funds by company in frontend
      if (data.funds && Array.isArray(data.funds)) {
        const groupedByCompany = {};

        data.funds.forEach((fund) => {
          if (fund.schemeName) {
            // Extract proper company name by finding common prefixes or use regex patterns
            let companyName = "Other";

            // Better company name extraction logic
            const schemeName = fund.schemeName.trim();

            // Common patterns for extracting company names
            if (schemeName.includes("Aditya Birla Sun Life")) {
              companyName = "Aditya Birla Sun Life";
            } else if (schemeName.includes("ICICI Prudential")) {
              companyName = "ICICI Prudential";
            } else if (
              schemeName.includes("SBI ") ||
              schemeName.startsWith("SBI ")
            ) {
              companyName = "SBI Mutual Fund";
            } else if (
              schemeName.includes("HDFC ") ||
              schemeName.startsWith("HDFC ")
            ) {
              companyName = "HDFC Mutual Fund";
            } else if (
              schemeName.includes("Axis ") ||
              schemeName.startsWith("Axis ")
            ) {
              companyName = "Axis Mutual Fund";
            } else if (
              schemeName.includes("Kotak ") ||
              schemeName.startsWith("Kotak ")
            ) {
              companyName = "Kotak Mahindra";
            } else if (schemeName.includes("Franklin Templeton")) {
              companyName = "Franklin Templeton";
            } else if (
              schemeName.includes("DSP ") ||
              schemeName.startsWith("DSP ")
            ) {
              companyName = "DSP Mutual Fund";
            } else if (schemeName.includes("Nippon India")) {
              companyName = "Nippon India";
            } else if (
              schemeName.includes("UTI ") ||
              schemeName.startsWith("UTI ")
            ) {
              companyName = "UTI Mutual Fund";
            } else if (
              schemeName.includes("360 ONE") ||
              schemeName.startsWith("360 ONE")
            ) {
              companyName = "360 ONE";
            } else {
              // Fallback: take first 2-3 words as company name
              const words = schemeName.split(" ");
              if (words.length >= 2) {
                companyName = words.slice(0, 2).join(" ");
              } else {
                companyName = words[0] || "Unknown";
              }
            }

            if (!groupedByCompany[companyName]) {
              groupedByCompany[companyName] = {
                companyName: companyName,
                schemes: [],
                lastUpdated: fund.lastUpdated,
              };
            }

            groupedByCompany[companyName].schemes.push({
              schemeCode: fund.schemeCode || "",
              schemeName: fund.schemeName || "Unknown Fund",
              nav: fund.nav || 0,
              lastUpdated: fund.lastUpdated || new Date().toISOString(),
            });

            // Update lastUpdated to the most recent
            if (
              new Date(fund.lastUpdated) >
              new Date(groupedByCompany[companyName].lastUpdated)
            ) {
              groupedByCompany[companyName].lastUpdated = fund.lastUpdated;
            }
          }
        });

        // Convert to array and filter valid companies
        const transformedData = Object.values(groupedByCompany)
          .filter((company) => {
            return (
              company &&
              company.schemes &&
              Array.isArray(company.schemes) &&
              company.schemes.length > 0 &&
              company.companyName &&
              typeof company.companyName === "string" &&
              !company.companyName.toLowerCase().includes("unknown")
            );
          })
          .map((company) => {
            // Find investments for this company's schemes
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
                (scheme) => scheme && scheme.schemeCode && scheme.schemeName
              ),
              investments: companyInvestments || [],
              lastUpdated: company.lastUpdated || new Date().toISOString(),
            };
          })
          .filter((company) => company.data.length > 0) // Only include companies with valid funds
          .sort((a, b) => a.companyName.localeCompare(b.companyName)); // Sort alphabetically

        console.log(
          `✅ Grouped ${data.funds.length} funds into ${transformedData.length} companies`
        );

        setAllCompanies(transformedData);
        // Show all companies - no limit, but ensure they're valid
        const validCompanies = transformedData.filter(
          (company) =>
            company &&
            company.data &&
            Array.isArray(company.data) &&
            company.data.length > 0
        );
        setCompanies(validCompanies);
      } else {
        console.warn("⚠️ Expected funds array but received:", typeof data);
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

  // Client-side search function
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
          // Show all companies when no search, with investments included
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
              // Add stable section key
              sectionKey: `company-${companyIndex}-${company.companyName.replace(
                /\s+/g,
                "-"
              )}`,
              data: company.data.map((item, itemIndex) => ({
                ...item,
                // Add stable item key
                itemKey: `${company.companyName}-${item.schemeCode}-${itemIndex}`,
              })),
              investments: Array.isArray(investments)
                ? investments.filter((investment) =>
                    company.data.some(
                      (scheme) =>
                        investment &&
                        investment.name &&
                        scheme &&
                        scheme.schemeName &&
                        (investment.name === scheme.schemeName ||
                          investment.description?.includes(scheme.schemeCode))
                    )
                  )
                : [],
            }));
        } else {
          // Filter companies based on search query, and include investments
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
              // Add stable section key
              sectionKey: `search-${companyIndex}-${company.companyName.replace(
                /\s+/g,
                "-"
              )}`,
              data: company.data.map((item, itemIndex) => ({
                ...item,
                // Add stable item key
                itemKey: `${company.companyName}-${item.schemeCode}-${itemIndex}`,
              })),
              investments: Array.isArray(investments)
                ? investments.filter((investment) =>
                    company.data.some(
                      (scheme) =>
                        investment &&
                        investment.name &&
                        scheme &&
                        scheme.schemeName &&
                        (investment.name === scheme.schemeName ||
                          investment.description?.includes(scheme.schemeCode))
                    )
                  )
                : [],
            }));
        }

        // Ensure we have valid data before setting
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
        setCompanies([]); // Fallback to empty array
      }
    },
    [allCompanies, investments]
  );

  // Debounced search function
  const debouncedFilterCompanies = useCallback(
    debounce((searchQuery) => {
      setIsSearching(true);
      filterCompanies(searchQuery);
      setIsSearching(false);
    }, 300),
    [filterCompanies]
  );

  // Handle search text change and investment updates
  useEffect(() => {
    try {
      console.log(
        `🔍 Filtering companies with search: "${searchText}", allCompanies: ${allCompanies.length}`
      );
      debouncedFilterCompanies(searchText);
    } catch (error) {
      console.error("Error in filterCompanies:", error);
      setCompanies([]); // Fallback to empty array
      setIsSearching(false);
    }
  }, [searchText, debouncedFilterCompanies, investments]);

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCompanies(), fetchInvestments()]);
    };
    loadData();

    // Listen for investment additions
    const listener = EventRegister.addEventListener("investmentAdded", () => {
      fetchInvestments();
    });

    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []);

  // Animation for loading icon
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

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setIsSearching(false);
    // Force immediate refresh of companies
    setTimeout(() => {
      filterCompanies("");
    }, 0);
  }, [filterCompanies]);

  // Debug function to trigger NAV update
  const triggerNAVUpdate = async () => {
    try {
      Alert.alert(
        "Update NAV Data",
        "This will fetch fresh mutual fund data from AMFI. This may take a few minutes.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Update",
            onPress: async () => {
              setLoading(true);
              try {
                const response = await fetch(buildURL(ENDPOINTS.UPDATE_NAV), {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                });

                const result = await response.json();
                console.log("NAV Update result:", result);

                Alert.alert(
                  "Success",
                  `NAV data updated! Total funds: ${result.totalFunds}`
                );

                // Refresh the data
                await fetchCompanies();
              } catch (error) {
                console.error("NAV update error:", error);
                Alert.alert(
                  "Error",
                  `Failed to update NAV data: ${error.message}`
                );
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error triggering NAV update:", error);
    }
  };

  // Debug function to test local AMFI parsing
  const testLocalParsing = async () => {
    try {
      Alert.alert(
        "Test Local Parsing",
        "This will fetch AMFI data locally and count funds without touching the database.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Test",
            onPress: async () => {
              setLoading(true);
              try {
                const response = await fetch(
                  "https://www.amfiindia.com/spages/NAVAll.txt"
                );
                const text = await response.text();
                console.log(`📊 AMFI response size: ${text.length} characters`);

                const lines = text.split("\n");
                console.log(`📊 Total lines: ${lines.length}`);

                let validLines = 0;
                let invalidLines = 0;

                for (const line of lines) {
                  if (
                    line.trim() === "" ||
                    line.includes("Scheme Code") ||
                    line.includes("ISIN") ||
                    line.includes("Open Ended") ||
                    line.includes("Mutual Fund") ||
                    line.startsWith("Close")
                  ) {
                    continue;
                  }

                  const parts = line.split(";");
                  if (parts.length >= 6) {
                    const schemeCode = parts[0].trim();
                    const schemeName = parts[3].trim();
                    const navString = parts[4].trim();
                    const nav = parseFloat(navString);

                    if (schemeCode && schemeName && !isNaN(nav) && nav > 0) {
                      validLines++;
                    } else {
                      invalidLines++;
                    }
                  } else {
                    invalidLines++;
                  }
                }

                console.log(
                  `📊 Parsing results: Valid: ${validLines}, Invalid: ${invalidLines}`
                );

                Alert.alert(
                  "Local Parsing Results",
                  `Total lines: ${lines.length}\nValid funds: ${validLines}\nInvalid lines: ${invalidLines}\n\nThis should be ~14,000 valid funds!`
                );
              } catch (error) {
                console.error("Local parsing error:", error);
                Alert.alert("Error", `Local parsing failed: ${error.message}`);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error testing local parsing:", error);
    }
  };

  // Debug function to get MF stats
  const getMFStats = async () => {
    try {
      const response = await fetch(buildURL(ENDPOINTS.MF_STATS));
      const stats = await response.json();
      console.log("MF Stats:", stats);

      Alert.alert(
        "Database Statistics",
        `Total funds: ${stats.totalFunds}\nLast updated: ${
          stats.lastUpdated
            ? new Date(stats.lastUpdated).toLocaleString()
            : "Never"
        }`
      );
    } catch (error) {
      console.error("Error getting MF stats:", error);
      Alert.alert("Error", "Failed to get statistics");
    }
  };

  // --- Render Functions for SectionList (Memoized for performance) ---

  const renderSectionHeader = useCallback(({ section }) => {
    // Safety check for section
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
      // Safety check for item
      if (!item) {
        return null;
      }

      // Check if this fund has an investment (for badge indicator only)
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
          <Text style={styles.loadingText}>
            Loading all mutual funds and grouping by company...
          </Text>
          <Text style={styles.loadingSubtext}>
            This may take a moment for 17,000+ funds
          </Text>
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
              All Companies ({companies.length} companies,{" "}
              {companies.reduce(
                (total, company) => total + company.data.length,
                0
              )}{" "}
              funds)
            </Text>
          </View>
          <View style={styles.debugButtons}>
            <TouchableOpacity style={styles.debugButton} onPress={getMFStats}>
              <Ionicons name="stats-chart" size={16} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={testLocalParsing}
            >
              <Ionicons name="bug" size={16} color="#DC2626" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={triggerNAVUpdate}
            >
              <Ionicons name="refresh" size={16} color="#059669" />
            </TouchableOpacity>
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
          // Use stable keys that don't change between renders
          return (
            item.itemKey || `fallback-${item.schemeCode || "unknown"}-${index}`
          );
        }}
        renderItem={renderFundItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        stickySectionHeadersEnabled={false} // Disable sticky headers to reduce complexity
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3B82F6"]}
            tintColor={"#3B82F6"}
          />
        }
        // Performance optimizations for large datasets
        removeClippedSubviews={true}
        initialNumToRender={10} // Reduced from 20
        maxToRenderPerBatch={5} // Reduced from 10
        windowSize={5} // Reduced from 10
        updateCellsBatchingPeriod={100} // Add batching delay
        getItemLayout={null} // Let React Native handle it for SectionList
        onEndReachedThreshold={0.8} // Add threshold for better performance
      />
    </SafeAreaView>
  );
};

// --- Styles (Updated for SectionList) ---
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
  debugButtons: {
    flexDirection: "row",
    gap: 8,
  },
  debugButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
