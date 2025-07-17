import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from "react-native";

const MFScreen = () => {
  const handlePress = () => {
    Linking.openURL("https://www.assetplus.in/mfd/ARN-249206").catch((err) =>
      console.error("Couldn't load page", err)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentCard}>
        <Text style={styles.title}>Mutual Funds</Text>
        <Text style={styles.text}>
          Ready to take control of your investments?
        </Text>
        <Text style={styles.text}>
          Click the button below to explore mutual funds and start your
          investment journey!
        </Text>

        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Invest MF</Text>
        </TouchableOpacity>

        {/* <Text style={styles.linkDescription}>
          AssetPlus is a platform that allows you to invest in a wide range of
          mutual funds. Their ARN (AMFI Registration Number) - 249206 -
          identifies them as a registered Mutual Fund Distributor in India.
        </Text> */}
      </View>

      <View style={styles.comingSoonContainer}>
        <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
        <Text style={styles.comingSoonText}>
          We're working on integrating direct mutual fund investments within
          this app itself, for a seamless and integrated investment experience.
          Stay tuned for updates!
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5", // A slightly darker light background
    alignItems: "center",
    paddingVertical: 20, // Add vertical padding
  },
  contentCard: {
    backgroundColor: "#FFFFFF", // White card background
    borderRadius: 15,
    padding: 25,
    marginHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20, // Space between card and coming soon
    width: "90%", // Occupy more width
  },
  title: {
    fontSize: 26, // Slightly smaller title in card
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
    backgroundColor: "#3B82F6", // Primary blue for MF
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12, // More rounded button
    marginTop: 25,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17, // Slightly smaller font
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
    padding: 25, // More padding
    backgroundColor: "#E6EEFF", // Lighter blue for coming soon section
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#A7C7ED", // A matching border color
    alignItems: "center",
    marginHorizontal: 20,
    width: "90%",
    shadowColor: "#A7C7ED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3B82F6", // Match button color slightly
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 14,
    color: "#64748B", // Muted text
    textAlign: "center",
    lineHeight: 20,
  },
});

export default MFScreen;
