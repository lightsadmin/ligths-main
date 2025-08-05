import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { API_BASE_URL, ENDPOINTS } from "./config/api";

const { width, height } = Dimensions.get("window");

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [securityPin, setSecurityPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateInputs = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!securityPin.trim()) {
      setError("Security PIN is required");
      return false;
    }
    if (securityPin.length < 4) {
      setError("Security PIN must be at least 4 characters");
      return false;
    }
    if (!newPassword.trim()) {
      setError("New password is required");
      return false;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    setError("");

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      const endpoint = `${API_BASE_URL}${ENDPOINTS.FORGOT_PASSWORD}`;
      console.log("🔗 Forgot Password URL:", endpoint);
      console.log("📦 Sending data:", {
        email: email.trim(),
        securityPin: securityPin.trim(),
        newPassword: newPassword.trim(),
      });

      const response = await axios.post(endpoint, {
        email: email.trim(),
        securityPin: securityPin.trim(),
        newPassword: newPassword.trim(),
      });

      Alert.alert("Success! 🎉", response.data.message, [
        {
          text: "Login Now",
          onPress: () => navigation.navigate("Login"),
        },
      ]);
    } catch (err) {
      console.error(
        "❌ Forgot Password Error:",
        err.response?.data || err.message
      );
      setError(
        err.response?.data?.error ||
          "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
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
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Feather name="arrow-left" size={24} color="#2563EB" />
              </TouchableOpacity>

              <View style={styles.iconContainer}>
                <Feather name="lock" size={32} color="#2563EB" />
              </View>

              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email, security PIN, and new password
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Feather
                  name="mail"
                  size={20}
                  color="#64748B"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Email"
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError("");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>

              {/* Security PIN Input */}
              <View style={styles.inputContainer}>
                <Feather
                  name="shield"
                  size={20}
                  color="#64748B"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Security PIN"
                  style={styles.input}
                  secureTextEntry={!showPin}
                  placeholderTextColor="#94A3B8"
                  value={securityPin}
                  onChangeText={(text) => {
                    setSecurityPin(text);
                    setError("");
                  }}
                  maxLength={10}
                />
                <TouchableOpacity
                  onPress={() => setShowPin(!showPin)}
                  style={styles.eyeIcon}
                >
                  <Feather
                    name={showPin ? "eye-off" : "eye"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* New Password Input */}
              <View style={styles.inputContainer}>
                <Feather
                  name="key"
                  size={20}
                  color="#64748B"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="New Password"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#94A3B8"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    setError("");
                  }}
                  autoCapitalize="none"
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

              {/* Confirm New Password Input */}
              <View style={styles.inputContainer}>
                <Feather
                  name="key"
                  size={20}
                  color="#64748B"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Confirm New Password"
                  style={styles.input}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor="#94A3B8"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError("");
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Feather
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Reset Button */}
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  (!email ||
                    !securityPin ||
                    !newPassword ||
                    !confirmPassword ||
                    loading) &&
                    styles.resetButtonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={
                  !email ||
                  !securityPin ||
                  !newPassword ||
                  !confirmPassword ||
                  loading
                }
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.resetButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>

              {/* Info Text */}
              <View style={styles.infoContainer}>
                <Feather name="info" size={16} color="#64748B" />
                <Text style={styles.infoText}>
                  Use the security PIN you set during registration
                </Text>
              </View>
            </View>
          </View>
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
    marginTop: height * 0.06,
    marginBottom: height * 0.04,
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 10,
    padding: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EBF2FF",
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
    paddingHorizontal: 20,
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
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  resetButton: {
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
    marginBottom: 20,
  },
  resetButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    color: "#64748B",
    fontSize: 14,
    marginLeft: 8,
    textAlign: "center",
  },
});
