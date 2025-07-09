
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Dimensions, 
  ScrollView
} from "react-native";
import { FontAwesome, Feather } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';


// Required for Expo auth session
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreenView({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");



  // Replace your current Google auth request with this corrected version
const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  // Keep client IDs
  expoClientId: '127526920655-8uujrvt9ul3jnl36kadgurpegd1lj74p.apps.googleusercontent.com',
  iosClientId: '127526920655-vasj6bu62742mgdihjv9b2ospqtn89b5.apps.googleusercontent.com',
  androidClientId: '127526920655-kljosph2pjt31blojea2egji9shlm8vc.apps.googleusercontent.com',
  // webClientId: '127526920655-2olu84ptdkitf8mdkntclmfgu0gbofb7.apps.googleusercontent.com',
  webClientId: '127526920655-8uujrvt9ul3jnl36kadgurpegd1lj74p.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

  // Fix how you handle success response
useEffect(() => {
  console.log("FULL Auth response type:", response?.type);
  console.log("FULL Auth response:", JSON.stringify(response, null, 2));
  
  if (response?.type === 'success') {
    // Check which token is available
    const token = response.authentication?.accessToken || response.params?.access_token || response.params?.id_token;
    
    if (token) {
      console.log("Auth success with token:", token.substring(0, 10) + "...");
      handleGoogleSignIn(token);
    } else {
      console.error("Auth success but no token found");
      setError("Authentication succeeded but no token was received");
    }
  } else if (response?.type === 'error') {
    console.error("Auth error code:", response.error?.code);
    console.error("Auth error message:", response.error?.message);
    console.error("Auth error details:", JSON.stringify(response.error, null, 2));
    setError("Google auth error: " + (response.error?.message || "Unknown error"));
  } else if (response?.type === 'dismiss') {
    console.log("User dismissed the auth flow");
    setError("Authentication was cancelled.");
  }
}, [response]);

  // Check if user is already logged in
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userInfo = await AsyncStorage.getItem("userInfo");
        if (userInfo) {
          console.log("✅ User already logged in:", JSON.parse(userInfo));
          navigation.navigate("MainApp", {
            screen: "Calendar",
            params: { screen: "CalendarMain" },
          });
        }
      } catch (error) {
        console.error("Error checking login status:", error);
      }
    };
    checkLoginStatus();
  }, []);

  // Handle Google sign-in with both access_token and id_token support
const handleGoogleSignIn = async (token) => {
  setError("");
  setGoogleLoading(true);
  
  try {
    let userInfo;
    
    // If the token looks like a JWT (id_token), decode it
    if (token.split('.').length === 3) {
      try {
        // Simple JWT decoding
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        userInfo = JSON.parse(jsonPayload);
        console.log("Decoded JWT token:", userInfo);
      } catch (e) {
        console.error("Failed to decode JWT:", e);
        // Fall back to API request if decoding fails
      }
    }
    
    // If we don't have userInfo from JWT, fetch it from Google API
    if (!userInfo) {
      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!userInfoResponse.ok) {
        throw new Error(`Google API error: ${await userInfoResponse.text()}`);
      }
      
      userInfo = await userInfoResponse.json();
      console.log("Google user info from API:", userInfo);
    }
    
    // Proceed with your existing backend call
    const response = await axios.post(
      "https://ligths.onrender.com/api/google-auth",
      {
        googleId: userInfo.sub || userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      }
    );
    
    if (response.data) {
      console.log("✅ Google Login Successful:", response.data);
      
      // Store user info in AsyncStorage
      await AsyncStorage.setItem("userInfo", JSON.stringify(response.data));
      
      Alert.alert("Login Success", "Redirecting to home...");
      navigation.navigate("MainApp", {
        screen: "Calendar",
        params: { screen: "CalendarMain" },
      });
    }
  } catch (error) {
    console.error("Google sign-in error:", error);
    setError("Failed to sign in with Google: " + error.message);
  } finally {
    setGoogleLoading(false);
  }
};

  // Handle regular login
  const handleLogin = async () => {
    // Validate inputs
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "https://ligths.onrender.com/api/login",
        {
          userName: username,
          password: password,
        }
      );

      if (response.data) {
        console.log("✅ Login Successful:", response.data);

        // Store user info in AsyncStorage
        await AsyncStorage.setItem("userInfo", JSON.stringify(response.data));

        Alert.alert("Login Success", "Redirecting to CalendarMain...");
        navigation.navigate("MainApp", {
          screen: "Calendar",
          params: { screen: "CalendarMain" },
        });
      }
    } catch (err) {
      console.error("❌ Login Error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Clear local storage
      await AsyncStorage.removeItem("userInfo");
      console.log("🚪 User logged out successfully!");
      Alert.alert("Logged Out", "You have been logged out successfully.");
      navigation.navigate("Login");
    } catch (err) {
      console.error("❌ Error during logout:", err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
      <ScrollView 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.headerContainer}>
              <Image source={require("./assets/logo.png")} style={styles.logo} />
              <Text style={styles.title}>Welcome back!</Text>
              <Text style={styles.subtitle}>
                Log in to your Ligths<Text style={styles.brandHighlight}>ON</Text> account
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Feather name="user" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  placeholder="Username"
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Feather name="lock" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity style={styles.forgotPasswordContainer}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Log In</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={styles.googleButton}
              onPress={() => {
                console.log("Starting Google Auth...");
                // Try this simplified approach which often works better
                promptAsync();
              }}
              disabled={googleLoading || !request}
            >
              {googleLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.googleButtonContent}>
                  <View style={styles.googleIconContainer}>
                    <FontAwesome name="google" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.signupText}>
                Don't have an account?{" "}
                <Text
                  style={styles.signupLink}
                  onPress={() => navigation.navigate("SignUp")}
                >
                  Sign Up
                </Text>
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
   scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: "center",
    marginTop: height * 0.08,
    marginBottom: height * 0.04,
  },
  logo: {
    width: width * 0.5,
    height: 100,
    resizeMode: "contain",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 8,
    textAlign: "center",
  },
  brandHighlight: {
    fontWeight: "700",
    color: "#2563EB",
  },
  formContainer: {
    width: "100%",
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 16,
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    height: "100%",
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPassword: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#2563EB",
    width: "100%",
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginBottom: 8,
    marginTop: -8,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    paddingHorizontal: 16,
    color: "#64748B",
    fontWeight: "500",
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: "#DB4437",
    width: "100%",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 36,
    alignItems: "center",
  },
  signupText: {
    fontSize: 15,
    color: "#64748B",
  },
  signupLink: {
    color: "#2563EB",
    fontWeight: "600",
  },
});