import React, { useEffect, useState, useRef } from "react";
import {
  Image,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Logo = require("./assets/logo.png");
const Splash = require("./assets/splash.png");

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkStatusAndAnimate = async () => {
      try {
        const hasSeenOnboarding = await AsyncStorage.getItem(
          "hasSeenOnboarding"
        );
        const userInfo = await AsyncStorage.getItem("userInfo"); // Check if user is logged in

        if (userInfo) {
          // User is logged in, bypass onboarding and splash, go directly to MainApp
          setTimeout(() => {
            navigation.replace("MainApp", {
              screen: "Calendar",
              params: { screen: "CalendarMain" },
            });
          }, 1500); // Small delay for smooth transition
        } else if (hasSeenOnboarding === "true") {
          // Onboarding already seen, proceed with splash screen animations
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.delay(300),
            Animated.parallel([
              Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(buttonFade, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
            ]),
          ]).start();
        } else {
          // Onboarding not seen, navigate to OnboardingScreen
          // This should only happen if App.js didn't already route here,
          // but as a fallback, ensure we go to Onboarding.
          console.log(
            "SplashScreen: Onboarding not seen, navigating to Onboarding."
          );
          navigation.replace("Onboarding"); // Use replace to prevent going back to splash
        }
      } catch (error) {
        console.error("Error in SplashScreen useEffect:", error);
        // Fallback to Onboarding in case of error
        navigation.replace("Onboarding");
      }
    };

    checkStatusAndAnimate();
  }, []);

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      // Mark onboarding as seen when 'GET STARTED' is clicked
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      console.log("✅ Onboarding flag set to true.");
    } catch (e) {
      console.error("Error setting onboarding flag:", e);
    } finally {
      setTimeout(() => {
        navigation.navigate("Login"); // Navigate to Login after Get Started
        setLoading(false);
      }, 800);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <Animated.Image
          source={Logo}
          style={[styles.logo, { opacity: fadeAnim }]}
        />

        <Image source={Splash} style={styles.splash} />

        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [1, 0],
              }),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>
            <Text style={styles.firstLetter}>L</Text>earn,{" "}
            <Text style={styles.greenLetter}>I</Text>nvest &{"\n"}
            <Text style={styles.firstLetter}>G</Text>row{" "}
            <Text style={styles.redLetter}>T</Text>owards{" "}
            <Text style={styles.firstLetter}>H</Text>eavenly{" "}
            <Text style={styles.firstLetter}>S</Text>uccess
          </Text>

          <Text style={styles.description}>
            Take control of your financial future with our all-in-one personal
            finance management solution
          </Text>

          <Animated.View style={{ opacity: buttonFade }}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleGetStarted}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingButton}>
                  <Text style={styles.buttonText}>LOADING</Text>
                  <Feather
                    name="loader"
                    size={20}
                    color="#2563EB"
                    style={styles.spinnerIcon}
                  />
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>GET STARTED</Text>
                  <Feather name="arrow-right" size={20} color="#2563EB" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  logo: {
    position: "absolute",
    top: 40,
    width: width * 0.5,
    height: 80,
    resizeMode: "contain",
    zIndex: 2,
  },
  splash: {
    width: width * 0.9,
    height: height * 0.4,
    resizeMode: "contain",
    marginTop: -120,
  },
  contentContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  title: {
    fontWeight: "bold",
    fontSize: 24,
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  firstLetter: {
    color: "#2563EB",
  },
  greenLetter: {
    color: "#10B981",
  },
  redLetter: {
    color: "#EF4444",
  },
  button: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minWidth: width * 0.75,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginRight: 8,
  },
  spinnerIcon: {
    marginLeft: 8,
  },
});
