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

      const response = await fetch(buildURL("/investments"), {
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
   * Fetches mutual fund data, now grouped by company, from the server.
   */
  const fetchCompanies = async () => {
    try {
      // Set loading to true only for the initial fetch
      if (!refreshing && (!allCompanies || allCompanies.length === 0)) {
        setLoading(true);
      }

      // Use the new '/mutualfunds/companies' endpoint with timestamp for fresh data
      const timestamp = new Date().getTime();
      const url = buildURL(ENDPOINTS.MUTUAL_FUNDS_COMPANIES, { t: timestamp });

      const response = await fetch(url, {
        timeout: 60000,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      // Ensure data is an array before setting it
      if (Array.isArray(data)) {
        // Group schemes by actual company name (extract base company name)
        const companyGroups = {};

        data.forEach((company) => {
          if (
            company.schemes &&
            company.schemes.length > 0 &&
            company.companyName
          ) {
            // Extract base company name (first word or two)
            let baseCompanyName = company.companyName.trim();

            // Skip if company name is too generic or empty
            if (
              !baseCompanyName ||
              baseCompanyName.length < 3 ||
              baseCompanyName.toLowerCase().includes("unknown") ||
              baseCompanyName.toLowerCase().includes("unclaimed")
            ) {
              return;
            }

            // Common company name patterns to extract
            if (baseCompanyName.includes("ICICI"))
              baseCompanyName = "ICICI Prudential";
            else if (baseCompanyName.includes("HDFC")) baseCompanyName = "HDFC";
            else if (baseCompanyName.includes("SBI")) baseCompanyName = "SBI";
            else if (baseCompanyName.includes("AXIS")) baseCompanyName = "Axis";
            else if (baseCompanyName.includes("TATA")) baseCompanyName = "TATA";
            else if (baseCompanyName.includes("Aditya Birla"))
              baseCompanyName = "Aditya Birla Sun Life";
            else if (baseCompanyName.includes("Kotak"))
              baseCompanyName = "Kotak";
            else if (baseCompanyName.includes("UTI")) baseCompanyName = "UTI";
            else if (baseCompanyName.includes("Nippon"))
              baseCompanyName = "Nippon India";
            else if (baseCompanyName.includes("DSP")) baseCompanyName = "DSP";
            else if (baseCompanyName.includes("Franklin"))
              baseCompanyName = "Franklin Templeton";
            else if (baseCompanyName.includes("Mirae"))
              baseCompanyName = "Mirae Asset";
            else if (baseCompanyName.includes("Motilal"))
              baseCompanyName = "Motilal Oswal";
            else if (
              baseCompanyName.includes("Quant") ||
              baseCompanyName.includes("quant")
            )
              baseCompanyName = "Quant";
            else if (baseCompanyName.includes("WhiteOak"))
              baseCompanyName = "WhiteOak Capital";
            else {
              // Extract first 2-3 words as company name
              const words = baseCompanyName.split(" ");
              baseCompanyName = words
                .slice(0, Math.min(3, words.length))
                .join(" ");
            }

            if (!companyGroups[baseCompanyName]) {
              companyGroups[baseCompanyName] = {
                companyName: baseCompanyName,
                lastUpdated: company.lastUpdated,
                schemes: [],
              };
            }

            // Add all schemes from this company to the group
            const validSchemes = company.schemes.filter(
              (scheme) =>
                scheme &&
                scheme.schemeName &&
                scheme.schemeCode &&
                scheme.nav &&
                !scheme.schemeName.toLowerCase().includes("unknown") &&
                parseFloat(scheme.nav) > 0
            );

            if (validSchemes.length > 0) {
              companyGroups[baseCompanyName].schemes.push(...validSchemes);
            }

            // Update lastUpdated to the most recent
            if (
              new Date(company.lastUpdated) >
              new Date(companyGroups[baseCompanyName].lastUpdated)
            ) {
              companyGroups[baseCompanyName].lastUpdated = company.lastUpdated;
            }
          }
        });

        // Convert to array and transform for SectionList
        const transformedData = Object.values(companyGroups)
          .map((company) => {
            // Find investments for this company's schemes
            const companyInvestments = investments.filter((investment) =>
              company.schemes.some(
                (scheme) =>
                  investment.name &&
                  scheme.schemeName &&
                  (investment.name === scheme.schemeName ||
                    investment.description?.includes(scheme.schemeCode))
              )
            );

            return {
              ...company,
              data: company.schemes || [],
              investments: companyInvestments || [],
            };
          })
          .filter((company) => {
            // Filter out companies with no valid schemes or unknown funds
            return (
              company.data &&
              company.data.length > 0 &&
              company.companyName !== "Unknown Company" &&
              !company.companyName.toLowerCase().includes("unknown")
            );
          });

        setAllCompanies(transformedData);
        // Initially show first 20 companies
        setCompanies(transformedData.slice(0, 20));
      } else {
        console.warn("⚠️ Expected array but received:", typeof data);
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
      if (!searchQuery || !searchQuery.trim()) {
        // Show first 20 companies when no search, but ensure investments are included
        const companiesWithInvestments = allCompanies.map((company) => ({
          ...company,
          investments: investments.filter((investment) =>
            company.data.some(
              (scheme) =>
                investment.name &&
                scheme.schemeName &&
                (investment.name === scheme.schemeName ||
                  investment.description?.includes(scheme.schemeCode))
            )
          ),
        }));
        setCompanies(companiesWithInvestments.slice(0, 20));
      } else {
        // Filter companies based on search query, and include investments
        const filtered = allCompanies
          .filter((company) =>
            company.companyName
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          )
          .map((company) => ({
            ...company,
            investments: investments.filter((investment) =>
              company.data.some(
                (scheme) =>
                  investment.name &&
                  scheme.schemeName &&
                  (investment.name === scheme.schemeName ||
                    investment.description?.includes(scheme.schemeCode))
              )
            ),
          }));
        setCompanies(filtered);
      }
    },
    [allCompanies, investments]
  );

  // Handle search text change and investment updates
  useEffect(() => {
    filterCompanies(searchText);
  }, [searchText, filterCompanies, investments]);

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

  // --- Render Functions for SectionList ---

  const renderSectionHeader = ({ section }) => (
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

  const renderFundItem = ({ item, section }) => {
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
              <Text style={styles.fundName} numberOfLines={2}>
                {item?.schemeName
                  ? (() => {
                      let cleanName = item.schemeName
                        .replace(
                          new RegExp(section?.companyName || "", "gi"),
                          ""
                        )
                        .replace(/^[\s\-]+/, "")
                        .replace(/DIRECT PLAN|REGULAR PLAN|GROWTH|IDCW/gi, "")
                        .replace(/\s+/g, " ")
                        .trim();

                      return cleanName || "Fund Name Not Available";
                    })()
                  : "Fund Name Not Available"}
              </Text>
              {fundInvestment && (
                <View style={styles.investmentIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
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
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="sad-outline" size={60} color="#9CA3AF" />
      <Text style={styles.emptyText}>
        {searchText
          ? "No companies found for your search."
          : "Could not load mutual funds."}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Ionicons name="logo-react" size={60} color="#3B82F6" />
          </Animated.View>
          <Text style={styles.loadingText}>Fetching Fresh Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mutual Funds</Text>
        <Text style={styles.subtitle}>Grouped by Company</Text>
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
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <SectionList
        sections={Array.isArray(companies) ? companies : []}
        keyExtractor={(item, index) =>
          item?.schemeCode + index || `item-${index}`
        }
        renderItem={renderFundItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        stickySectionHeadersEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3B82F6"]}
            tintColor={"#3B82F6"}
          />
        }
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
    padding: 15,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
