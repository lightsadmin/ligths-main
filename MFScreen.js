import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MFScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="rocket-outline" size={60} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>Get Ready for Liftoff!</Text>

        <Text style={styles.subtitle}>
          Direct Mutual Fund investments are preparing to launch right here in
          the app. We're putting the final touches on a powerful new way for you
          to invest.
        </Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar} />
        </View>
        <Text style={styles.progressText}>Status: In Progress</Text>

        <Text style={styles.footerText}>Stay Tuned!</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC", // A clean, very light gray background
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 30,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#3B82F6", // A vibrant blue
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  progressContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#E5E7EB", // Light gray for the track
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    width: "40%", // Represents the progress
    height: "100%",
    backgroundColor: "#3B82F6", // Blue progress
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
    fontStyle: "italic",
  },
  footerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9CA3AF",
    position: "absolute",
    bottom: -60, // Adjust position to be at the very bottom
  },
});

export default MFScreen;
