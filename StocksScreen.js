import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from "react-native";

const StocksScreen = () => {
  const handlePress = () => {
    Linking.openURL("https://upstox.com/open-account/?f=5LBM8X").catch((err) =>
      console.error("Couldn't load page", err)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentCard}>
        <Text style={styles.title}>Stocks</Text>
        <Text style={styles.text}>
          Ready to take part in the growth of leading companies?
        </Text>
        <Text style={styles.text}>
          Open a demat account and start investing in the stock market today!
        </Text>

        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Buy Stocks</Text>
        </TouchableOpacity>

        {/* <Text style={styles.linkDescription}>
          Upstox is a popular Indian discount brokerage firm offering trading in
          stocks, mutual funds, and more. The link provided is a referral link
          (code: 5LBM8X).
        </Text> */}
      </View>

      <View style={styles.comingSoonContainer}>
        <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
        <Text style={styles.comingSoonText}>
          We're working on integrating direct stock investments within this app
          itself, for a seamless and integrated investment experience. Stay
          tuned for updates!
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5", // Consistent light background
    alignItems: "center",
    paddingVertical: 20,
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 25,
    marginHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
    width: "90%",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 15,
  },
  text: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#0F9D58", // Google Green for Stocks (distinct from MF blue)
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 25,
    shadowColor: "#0F9D58",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  linkDescription: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 10,
    fontStyle: "italic",
    lineHeight: 18,
  },
  comingSoonContainer: {
    padding: 25,
    backgroundColor: "#E8F5E9", // Light green for coming soon
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#A5D6A7", // Matching border color
    alignItems: "center",
    marginHorizontal: 20,
    width: "90%",
    shadowColor: "#A5D6A7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F9D58", // Match button color slightly
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 14,
    color: "#64748B", // Muted text
    textAlign: "center",
    lineHeight: 20,
  },
});

export default StocksScreen;
