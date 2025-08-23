import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Swiper from "react-native-swiper";

const { width, height } = Dimensions.get("window");

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef(null);

  const slides = [
    {
      title: "LIGHTSON helps to categorize :",
      subtitle: [
        "- Income vs Expenses",
        "- Goal Tracking",
        "- Investment Portfolio Value",
      ],
      image: require("./assets/calander.jpg"),
    },
    {
      title: "Your Financial Life. All in One Screen.",
      subtitle: [
        "Mandatory – Rent, loans, school fees",
        "Essential – Groceries, utilities",
        "Discretionary – Shopping, travel, dining",
      ],
      image: require("./assets/expense.jpg"),
    },
    {
      title: "Manage all your Income",
      subtitle: [
        " Income via Salary",
        " Investment Portfolio Value",
        " To keep track of your Financial Life",
      ],
      image: require("./assets/income.jpg"),
    },
    {
      title: "F.I.R.E Number",
      subtitle:
        "- Based on your income, your F.I.R.E. number is calculated and helps you attain it before retirement.",
      image: require("./assets/fire.jpg"),
    },
  ];

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      swiperRef.current.scrollBy(1);
    } else {
      // Mark onboarding as completed
      try {
        await AsyncStorage.setItem("hasSeenOnboarding", "true");
        console.log("✅ Onboarding completed, flag set to true");
      } catch (error) {
        console.error("❌ Error setting onboarding flag:", error);
      }

      // After the last onboarding slide, navigate to SplashScreen
      navigation.replace("SplashScreen");
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("./assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination={true}
        dotStyle={styles.dot}
        activeDotStyle={styles.activeDot}
        paginationStyle={styles.pagination}
        onIndexChanged={(index) => setCurrentIndex(index)}
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.image}>
              <ImageBackground
                source={slide.image}
                style={styles.image}
                resizeMode="contain"
              >
                <View style={styles.imageOverlay} />
              </ImageBackground>
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>{slide.title}</Text>

              {Array.isArray(slide.subtitle) ? (
                <View style={styles.subtitleContainer}>
                  {slide.subtitle.map((line, idx) => (
                    <Text key={idx} style={styles.subtitle}>
                      • {line}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
              )}

              <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>{"Next"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </Swiper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: "center",
    marginTop: 20,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  image: {
    width: "100%",

    aspectRatio: 1,
    justifyContent: "center",
    paddingBottom: 45,
  },
  content: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 30,
    gap: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    textAlign: "left",
  },
  subtitleContainer: {
    width: "100%",
    gap: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 25,
    marginTop: 10,
    alignSelf: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ccc",
    marginHorizontal: 3,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#000",
    marginHorizontal: 3,
  },
  pagination: {
    bottom: 25,
  },
});

export default OnboardingScreen;
