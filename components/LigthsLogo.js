import React from "react";
import { View, Text, StyleSheet } from "react-native";

const LigthsLogo = ({ size = 160, style }) => {
  const circleSize = size * 0.35;
  const fontSize = size * 0.22;

  return (
    <View style={[styles.logoContainer, style]}>
      {/* Blue circular background with book icon */}
      <View
        style={[
          styles.circleBackground,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
          },
        ]}
      >
        {/* Simplified book representation */}
        <View style={styles.bookContainer}>
          {/* Book spine */}
          <View style={styles.bookSpine} />
          {/* Left page with red elements */}
          <View style={styles.leftPage}>
            <View style={[styles.bear, { backgroundColor: "#E53E3E" }]} />
            <View style={[styles.chartLine, { backgroundColor: "#E53E3E" }]} />
          </View>
          {/* Right page with green elements */}
          <View style={styles.rightPage}>
            <View style={[styles.bull, { backgroundColor: "#38A169" }]} />
            <View style={[styles.chartLine, { backgroundColor: "#38A169" }]} />
          </View>
        </View>
      </View>

      {/* LIGTHS text */}
      <View style={styles.textContainer}>
        <Text style={[styles.ligthsText, { fontSize }]}>
          <Text style={styles.letterL}>L</Text>
          <Text style={styles.letterI}>I</Text>
          <Text style={styles.letterG}>G</Text>
          <Text style={styles.letterT}>T</Text>
          <Text style={styles.letterH}>H</Text>
          <Text style={styles.letterS}>S</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  circleBackground: {
    backgroundColor: "#4A9EFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  bookContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: "#333",
  },
  bookSpine: {
    width: 2,
    height: 20,
    backgroundColor: "#333",
    marginRight: 2,
  },
  leftPage: {
    width: 12,
    height: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 1,
  },
  rightPage: {
    width: 12,
    height: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 1,
  },
  bear: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  bull: {
    width: 6,
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  chartLine: {
    width: 8,
    height: 1,
  },
  textContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ligthsText: {
    fontWeight: "bold",
    letterSpacing: 1,
  },
  letterL: {
    color: "#000000",
  },
  letterI: {
    color: "#38A169", // Green like the candlestick
  },
  letterG: {
    color: "#000000",
  },
  letterT: {
    color: "#E53E3E", // Red
  },
  letterH: {
    color: "#000000",
  },
  letterS: {
    color: "#000000",
  },
});

export default LigthsLogo;
