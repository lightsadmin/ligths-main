import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
// Add these imports with your other screen imports

enableScreens();

import 'react-native-gesture-handler';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, Text, Platform, TouchableOpacity} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';


// Screens
import SplashScreen from './SplashScreen';
import LoginScreenView from './LoginScreenView';
import RegisterScreenView from './RegisterScreen';
import CalendarMain from './calendarmain';
import DateExpenses from './dateExpenses';
import FireNumber from './FireNumber';
import Simulator from './Simulator';
import Profile from './Profile';
import Income from './Income';
import Expenses from './Expenses';
import Investment from './Investment';
import Investments from './Investments';
import FDScreen from './FDScreen';
import RDScreen from './RDScreen';
import GoalCalculator from './GoalCalculator';

const Tab = createBottomTabNavigator();
const MainStack = createStackNavigator();
const AuthStack = createStackNavigator();
const CalendarStack = createStackNavigator();
const InvestmentStack = createStackNavigator();

// Tab bar icon selector
const getTabBarIcon = (route, color, size) => {
  switch (route.name) {
    case 'Calendar':
      return <Ionicons name="home" size={size} color={color} />;
    case 'FireNumber':
      return <MaterialCommunityIcons name="calculator-variant" size={size} color={color} />;
    case 'Simulator':
      return <MaterialIcons name="trending-up" size={size} color={color} />;
    case 'MyInvestments':
      return <MaterialCommunityIcons name="cash" size={size} color={color} />;
    case 'Profile':
      return <Ionicons name="person" size={size} color={color} />;
    default:
      return null;
  }
};

// Custom header with title and optional back button
const headerOptions = (title, showBackButton = true) => ({
  title: title,
  headerTitleAlign: 'center',
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  headerStyle: {
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    height: 60
  },
  headerShadowVisible: false,
  headerLeft: showBackButton ? undefined : () => null, // Remove back button when showBackButton is false
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
      options={headerOptions('Daily Transactions')}
    />
    <CalendarStack.Screen
      name="Income"
      component={Income}
      options={headerOptions('Add Income')}
    />
    <CalendarStack.Screen
      name="Expenses"
      component={Expenses}
      options={headerOptions('Add Expense')}
    />
    <CalendarStack.Screen
      name="Investment"
      component={Investment}
      options={headerOptions('Add Investment')}
    />
  </CalendarStack.Navigator>
);

// Auth Stack Navigator
const AuthNavigator = () => (
  <AuthStack.Navigator>
    <AuthStack.Screen 
      name="SplashScreen" 
      component={SplashScreen} 
      options={{ headerShown: false }}
    />
    <AuthStack.Screen 
      name="Login" 
      component={LoginScreenView} 
      options={headerOptions('Login', false)} // No back button on login
    />
    <AuthStack.Screen 
      name="SignUp" 
      component={RegisterScreenView} 
      options={headerOptions('Sign Up')}
    />
  </AuthStack.Navigator>
);

const InvestmentStackNavigator = () => (
  <InvestmentStack.Navigator>
    <InvestmentStack.Screen
      name="InvestmentMain"
      component={Investments}
      options={{ headerShown: false }}
    />
    <InvestmentStack.Screen
      name="FDScreen"
      component={FDScreen}
      options={{ headerShown: false }}
    />
    <InvestmentStack.Screen
      name="RDScreen"
      component={RDScreen}
      options={{ headerShown: false }}
    />
    <InvestmentStack.Screen
      name="GoalCalculator"
      component={GoalCalculator}
      options={{ headerShown: false }}
    />
  </InvestmentStack.Navigator>
);

// Main Tab Navigator
const MainApp = () => {
  return (
    <Tab.Navigator
      initialRouteName="Calendar"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => getTabBarIcon(route, color, size),
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      })}
    >
      <Tab.Screen
        name="Calendar"
        component={CalendarStackNavigator}
        options={{
          title: 'LigthsON',
        }}
      />
      <Tab.Screen
        name="FireNumber"
        component={FireNumber}
      />
      <Tab.Screen
        name="Simulator"
        component={Simulator}
      />
       <Tab.Screen
        name="MyInvestments"
        component={InvestmentStackNavigator}
        options={{
          title: 'Investments'
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
      />
    </Tab.Navigator>
  );
};

// Root App
const App = () => {
  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        <MainStack.Screen 
          name="Auth" 
          component={AuthNavigator} 
        />
        <MainStack.Screen 
          name="MainApp" 
          component={MainApp} 
          options={{ gestureEnabled: false }} // Prevent swiping back to Auth stack
        />
      </MainStack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
};

// Styles
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 10,
    elevation: 10,
    height: Platform.OS === 'ios' ? 85 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    position: 'absolute',
    borderTopWidth: 0, 
  },
  tabBarLabel: {
    fontWeight: '500',
    fontSize: 12,
    marginBottom: 5,
  },
  tabBarItem: {
    height: Platform.OS === 'ios' ? 50 : 45, // Consistent height for items
  },
});

export default App;