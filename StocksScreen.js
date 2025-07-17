import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";

const StocksScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Stocks Screen</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  text: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1E293B",
  },
});

export default StocksScreen;
