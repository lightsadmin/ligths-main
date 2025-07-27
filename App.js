import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";

enableScreens();

import "react-native-gesture-handler";

import React, { useEffect, useState } from "react"; // Add useState and useEffect
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
  ActivityIndicator, // Import ActivityIndicator for loading state
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage

// Screens
import SplashScreen from "./SplashScreen";
import LoginScreenView from "./LoginScreenView";
import RegisterScreenView from "./RegisterScreen";
import CalendarMain from "./calendarmain";
import DateExpenses from "./dateExpenses";
import FireNumber from "./FireNumber";
import Profile from "./Profile";
import Income from "./Income";
import Expenses from "./Expenses";
import Investment from "./Investment";
import FDScreen from "./FDScreen";
import RDScreen from "./RDScreen";
import GoalCalculator from "./GoalCalculator";
import InvestmentNavigation from "./InvestmentNavigation";
import MFScreen from "./MFScreen";
import StocksScreen from "./StocksScreen";
import SavingsScreen from "./SavingsScreen";
import OnboardingScreen from "./onboardingScreen"; // Import your OnboardingScreen

const Tab = createBottomTabNavigator();
const MainStack = createStackNavigator();
const AuthStack = createStackNavigator();
const CalendarStack = createStackNavigator();

// Tab bar icon selector
const getTabBarIcon = (route, color, size) => {
  switch (route.name) {
    case "Calendar":
      return <Ionicons name="home" size={size} color={color} />;
    case "FireNumber":
      return (
        <MaterialCommunityIcons
          name="calculator-variant"
          size={size}
          color={color}
        />
      );
    case "Calculator":
      return (
        <MaterialCommunityIcons
          name="bullseye-arrow"
          size={size}
          color={color}
        />
      );
    case "Profile":
      return <Ionicons name="person" size={size} color={color} />;
    default:
      return null;
  }
};

// Custom header with title and optional back button
const headerOptions = (title, showBackButton = true) => ({
  title: title,
  headerTitleAlign: "center",
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  headerStyle: {
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    height: 60,
  },
  headerShadowVisible: false,
  headerLeft: showBackButton ? undefined : () => null,
});

// Calendar Stack Navigator
const CalendarStackNavigator = () => (
  <CalendarStack.Navigator>
    <CalendarStack.Screen
      name="CalendarMain"
      component={CalendarMain}
      options={{ headerShown: false }}
    />
    <CalendarStack.Screen
      name="DateExpenses"
      component={DateExpenses}
      options={headerOptions("Daily Transactions")}
    />
    <CalendarStack.Screen
      name="Income"
      component={Income}
      options={headerOptions("Add Income")}
    />
    <CalendarStack.Screen
      name="Expenses"
      component={Expenses}
      options={headerOptions("Add Expense")}
    />
    <CalendarStack.Screen
      name="Investment"
      component={Investment}
      options={headerOptions("Add Investment")}
    />
    <CalendarStack.Screen
      name="AddInvestment"
      component={InvestmentNavigation}
    />
    <CalendarStack.Screen name="FDScreen" component={FDScreen} />
    <CalendarStack.Screen name="RDScreen" component={RDScreen} />
    <CalendarStack.Screen name="MFScreen" component={MFScreen} />
    <CalendarStack.Screen name="StocksScreen" component={StocksScreen} />
    <CalendarStack.Screen name="SavingsScreen" component={SavingsScreen} />
  </CalendarStack.Navigator>
);

// Auth Stack Navigator
const AuthNavigator = () => (
  <AuthStack.Navigator>
    {/* OnboardingScreen added here, it will be the first screen in AuthStack by default */}
    <AuthStack.Screen
      name="Onboarding"
      component={OnboardingScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen
      name="SplashScreen"
      component={SplashScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen
      name="Login"
      component={LoginScreenView}
      options={headerOptions("Login", false)}
    />
    <AuthStack.Screen
      name="SignUp"
      component={RegisterScreenView}
      options={headerOptions("Sign Up")}
    />
  </AuthStack.Navigator>
);

// Main Tab Navigator
const MainApp = () => {
  return (
    <Tab.Navigator
      initialRouteName="Calendar"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => getTabBarIcon(route, color, size),
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Calendar"
        component={CalendarStackNavigator}
        options={{
          title: "LigthsON",
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            navigation.navigate("Calendar", { screen: "CalendarMain" });
          },
        })}
      />
      <Tab.Screen
        name="FireNumber"
        component={FireNumber}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            navigation.navigate("FireNumber");
          },
        })}
      />
      <Tab.Screen
        name="Calculator"
        component={GoalCalculator}
        options={{
          title: "Calculator",
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            navigation.navigate("Calculator");
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            navigation.navigate("Profile");
          },
        })}
      />
    </Tab.Navigator>
  );
};

// Root App Component
const App = () => {
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Check if the user has seen onboarding before
        const hasSeenOnboarding = await AsyncStorage.getItem(
          "hasSeenOnboarding"
        );
        // Check if there's existing user info (meaning they've logged in before)
        const userInfo = await AsyncStorage.getItem("userInfo");

        if (userInfo) {
          // If user info exists, they've logged in before, bypass onboarding to MainApp
          setInitialRoute("MainApp");
          console.log("App.js: Existing user, navigating to MainApp.");
        } else if (hasSeenOnboarding === "true") {
          // If onboarding has been seen but no user info, go to Login/SplashScreen
          setInitialRoute("Auth");
          console.log(
            "App.js: Onboarding seen, no user info, navigating to Auth (Login/Splash)."
          );
        } else {
          // First time opening app, or new install, show onboarding
          setInitialRoute("Auth");
          console.log(
            "App.js: First time or new install, navigating to Auth (Onboarding)."
          );
        }
      } catch (e) {
        console.error("Failed to check onboarding status or user info:", e);
        // Fallback in case of error, go to Auth
        setInitialRoute("Auth");
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  if (isLoading) {
    // Show a blank loading screen while checking AsyncStorage
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "#64748B" }}>Loading app...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <MainStack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRoute}
        >
          <MainStack.Screen name="Auth" component={AuthNavigator} />
          <MainStack.Screen
            name="MainApp"
            component={MainApp}
            options={{ gestureEnabled: false }}
          />
        </MainStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

// Styles
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 10,
    elevation: 10,
    height: Platform.OS === "ios" ? 85 : 70,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    paddingTop: 10,
    position: "absolute",
    borderTopWidth: 0,
  },
  tabBarLabel: {
    fontWeight: "500",
    fontSize: 12,
    marginBottom: 5,
  },
  tabBarItem: {
    height: Platform.OS === "ios" ? 50 : 45,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});

export default App;
