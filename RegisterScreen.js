import React, { useState, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Modal
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get('window');

const COUNTRIES = [
  { label: "India", value: "India" },
  { label: "USA", value: "USA" },
  { label: "UK", value: "UK" },
  { label: "Canada", value: "Canada" },
  { label: "Australia", value: "Australia" },
  { label: "Germany", value: "Germany" },
  { label: "France", value: "France" },
  { label: "Japan", value: "Japan" },
  { label: "China", value: "China" },
  { label: "Singapore", value: "Singapore" },
];

export default function RegisterScreenView() {
  const navigation = useNavigation();
  const NGROK_URL = "https://ligths.onrender.com";

  const [isNextLoading, setIsNextLoading] = useState(false);
  const timeoutRefs = useRef({});
  const [fieldStates, setFieldStates] = useState({
    userName: "initial", // initial, checking, valid, invalid
    email: "initial"     // initial, checking, valid, invalid
  });

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    age: "",
    retirementAge: "",
    phoneNumber: "",
  });

  // Validation states
  const [inputValidation, setInputValidation] = useState({
    firstName: false,
    lastName: false,
    userName: false,
    email: false,
    password: false,
    confirmPassword: false,
    country: false,
    age: false,
    retirementAge: false,
    phoneNumber: false,
  });

  // UI state
  const [errorMessages, setErrorMessages] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Validation functions
  const validatePassword = (value) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return regex.test(value);
  };

  const validateName = (value) => /^[a-zA-Z]+$/.test(value);

  const validateField = async (name, value) => {
    // Your existing validation code
    let isValid = false;
    let errorMessage = "";

    switch (name) {
      case "firstName":
      case "lastName":
        if (!validateName(value)) {
          errorMessage = `Use only alphabets`;
        } else {
          isValid = true;
        }
        break;

        case "userName":
          if (value.trim().length > 2) {
            try {
              const response = await axios.post(`${NGROK_URL}/api/check-username`, { userName: value });
              isValid = !response.data.exists;
              
              if (response.data.exists) {
                errorMessage = "Username already exists";
                setFieldStates(prev => ({ ...prev, [name]: "invalid" }));
              } else {
                errorMessage = "✓ Username available!";
                setFieldStates(prev => ({ ...prev, [name]: "valid" }));
                
                // Clear success message after 2 seconds
                setTimeout(() => {
                  setErrorMessages(prev => {
                    if (prev[name] === "✓ Username available!") {
                      return { ...prev, [name]: "" };
                    }
                    return prev;
                  });
                }, 2000);
              }
            } catch (error) {
              console.error("Username validation error:", error);
              errorMessage = "Error checking username";
              setFieldStates(prev => ({ ...prev, [name]: "invalid" }));
            }
          } else if (value.trim()) {
            errorMessage = "Username must be at least 3 characters";
            setFieldStates(prev => ({ ...prev, [name]: "invalid" }));
          }
          break;

          case "email":
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(value)) {
              try {
                const response = await axios.post(`${NGROK_URL}/api/check-email`, { email: value });
                isValid = !response.data.exists;
                
                if (response.data.exists) {
                  errorMessage = "Email already exists";
                  setFieldStates(prev => ({ ...prev, [name]: "invalid" }));
                } else {
                  errorMessage = "✓ Email available!";
                  setFieldStates(prev => ({ ...prev, [name]: "valid" }));
                  
                  // Clear success message after 2 seconds
                  setTimeout(() => {
                    setErrorMessages(prev => {
                      if (prev[name] === "✓ Email available!") {
                        return { ...prev, [name]: "" };
                      }
                      return prev;
                    });
                  }, 2000);
                }
              } catch (error) {
                console.error("Email validation error:", error);
                errorMessage = "Error checking email";
                setFieldStates(prev => ({ ...prev, [name]: "invalid" }));
              }
            } else if (value.trim()) {
              errorMessage = "Please enter a valid email address";
              setFieldStates(prev => ({ ...prev, [name]: "invalid" }));
            }
            break;

      case "password":
        if (validatePassword(value)) {
          isValid = true;
        } else {
          errorMessage = "Password doesn't meet requirements";
        }
        break;

      case "confirmPassword":
        isValid = value === formData.password;
        errorMessage = isValid ? "" : "Passwords do not match";
        break;

      case "age":
        const ageValue = parseInt(value);
        if (!isNaN(ageValue) && ageValue >= 18 && ageValue <= 99) {
          isValid = true;
        } else {
          errorMessage = "Age must be between 18 and 99";
        }
        break;

      case "retirementAge":
        const retirementAgeValue = parseInt(value);
        const currentAge = parseInt(formData.age);
        if (!currentAge || isNaN(currentAge)) {
          errorMessage = "Please enter your current age first";
        } else if (!isNaN(retirementAgeValue) && retirementAgeValue > currentAge) {
          isValid = true;
        } else {
          errorMessage = "Retirement age must be greater than your current age";
        }
        break;

      case "phoneNumber":
        const phoneRegex = /^[0-9]{10}$/;
        isValid = phoneRegex.test(value);
        errorMessage = isValid ? "" : "Enter a valid 10-digit phone number";
        break;

      case "country":
        isValid = value.trim().length > 0;
        errorMessage = isValid ? "" : "Please select a country";
        break;

      default:
        isValid = value.trim().length > 0;
        break;
    }

    setInputValidation((prev) => ({ ...prev, [name]: isValid }));
    setErrorMessages((prev) => ({ ...prev, [name]: errorMessage }));

    return { isValid, errorMessage };
  };

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    
    if (name === "userName" || name === "email") {
      setErrorMessages(prev => ({ ...prev, [name]: "" }));
      
      if (!value.trim()) {
        setFieldStates(prev => ({ ...prev, [name]: "initial" }));
        return;
      }
      
      setFieldStates(prev => ({ ...prev, [name]: "checking" }));
      
      if (timeoutRefs.current[name]) {
        clearTimeout(timeoutRefs.current[name]);
      }
      
      timeoutRefs.current[name] = setTimeout(() => {
        validateField(name, value);
      }, 600); 
    } else {
      validateField(name, value);
    }
  };

  const checkStepValidation = async (step) => {
    let fieldsToCheck = [];
    
    switch(step) {
      case 1:
        fieldsToCheck = ['firstName', 'lastName', 'userName', 'email'];
        break;
      case 2:
        fieldsToCheck = ['password', 'confirmPassword'];
        break;
      case 3:
        fieldsToCheck = ['age', 'retirementAge', 'phoneNumber', 'country'];
        break;
    }
    
    const validationResults = await Promise.all(
      fieldsToCheck.map(async (field) => {
        const result = await validateField(field, formData[field]);
        return { field, ...result };
      })
    );
    
    return !validationResults.some(result => !result.isValid);
  };

  const handleNextStep = async () => {
    setIsNextLoading(true); // Start loading
    
    try {
      const isStepValid = await checkStepValidation(currentStep);
      
      if (isStepValid) {
        setCurrentStep(prev => prev + 1);
      } else {
        Alert.alert("Validation Error", "Please fix the errors before proceeding.");
      }
    } catch (error) {
      console.error("Validation error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsNextLoading(false); // End loading regardless of outcome
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    const isStepValid = await checkStepValidation(currentStep);
    
    if (!isStepValid) {
      Alert.alert("Validation Error", "Please fix all validation errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await axios.post(`${NGROK_URL}/api/register`, formData);

      if (response.status === 201) {
        Alert.alert(
          "Registration Successful", 
          "Your account has been created successfully!",
          [{ text: "Login Now", onPress: () => navigation.navigate("Login") }]
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Registration Failed", error.response?.data?.error || "An error occurred while registering your account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicators with better visual feedback
  const renderStepIndicators = () => {
    return (
      <View style={styles.stepsContainer}>
        {[1, 2, 3].map((step) => (
          <View key={step} style={styles.stepItem}>
            <View 
              style={[
                styles.stepCircle, 
                currentStep === step ? styles.activeStep : 
                  currentStep > step ? styles.completedStep : styles.inactiveStep
              ]}
            >
              {currentStep > step ? (
                <Feather name="check" size={14} color="#FFFFFF" />
              ) : (
                <Text style={[
                  styles.stepNumber,
                  currentStep === step ? styles.activeStepNumber : styles.inactiveStepNumber
                ]}>
                  {step}
                </Text>
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              currentStep === step ? styles.activeStepLabel : styles.inactiveStepLabel
            ]}>
              {step === 1 ? "Personal" : step === 2 ? "Security" : "Financial"}
            </Text>
          </View>
        ))}
        <View style={styles.connector}>
          <View style={[styles.connectorLine, currentStep > 1 ? styles.activeConnector : null]} />
          <View style={[styles.connectorLine, currentStep > 2 ? styles.activeConnector : null]} />
        </View>
      </View>
    );
  };

  // Custom country picker modal
  const renderCountryPicker = () => {
    return (
      <Modal
        visible={showCountryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.countryModalOverlay}>
          <View style={styles.countryModalContent}>
            <View style={styles.countryModalHeader}>
              <Text style={styles.countryModalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Feather name="x" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.countryList}>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.value}
                  style={styles.countryItem}
                  onPress={() => {
                    handleChange("country", country.value);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={[
                    styles.countryItemText,
                    formData.country === country.value && styles.selectedCountryText
                  ]}>
                    {country.label}
                  </Text>
                  {formData.country === country.value && (
                    <Feather name="check" size={18} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <Text style={styles.stepDescription}>Let's start with the basics</Text>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="user" size={18} color="#64748B" />
              </View>
              <TextInput
                placeholder="First Name"
                style={styles.input}
                onChangeText={(text) => handleChange("firstName", text)}
                value={formData.firstName}
                placeholderTextColor="#94A3B8"
              />
            </View>
            {errorMessages.firstName ? <Text style={styles.errorText}>{errorMessages.firstName}</Text> : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="user" size={18} color="#64748B" />
              </View>
              <TextInput
                placeholder="Last Name"
                style={styles.input}
                onChangeText={(text) => handleChange("lastName", text)}
                value={formData.lastName}
                placeholderTextColor="#94A3B8"
              />
            </View>
            {errorMessages.lastName ? <Text style={styles.errorText}>{errorMessages.lastName}</Text> : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="at-sign" size={18} color="#64748B" />
              </View>
              <TextInput
                placeholder="Username"
                style={styles.input}
                onChangeText={(text) => handleChange("userName", text)}
                value={formData.userName}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
            
            {fieldStates.userName === "checking" ? (
            <Text style={styles.checkingText}>Checking username...</Text>
          ) : errorMessages.userName ? (
            <Text 
              style={errorMessages.userName.startsWith("✓") ? styles.successText : styles.errorText}
            >
              {errorMessages.userName}
            </Text>
          ) : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="mail" size={18} color="#64748B" />
              </View>
              <TextInput
                placeholder="Email"
                style={styles.input}
                onChangeText={(text) => handleChange("email", text)}
                value={formData.email}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#94A3B8"
              />
            </View>
            {fieldStates.email === "checking" ? (
            <Text style={styles.checkingText}>Checking email...</Text>
          ) : errorMessages.email ? (
            <Text 
              style={errorMessages.email.startsWith("✓") ? styles.successText : styles.errorText}
            >
              {errorMessages.email}
            </Text>
          ) : null}
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Create a Strong Password</Text>
            <Text style={styles.stepDescription}>Secure your account with a strong password</Text>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="lock" size={18} color="#64748B" />
              </View>
              <TextInput
                placeholder="Password"
                secureTextEntry={!showPassword}
                style={styles.input}
                onChangeText={(text) => handleChange("password", text)}
                value={formData.password}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            {errorMessages.password ? <Text style={styles.errorText}>{errorMessages.password}</Text> : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="lock" size={18} color="#64748B" />
              </View>
              <TextInput
                placeholder="Confirm Password"
                secureTextEntry={!showPassword}
                style={styles.input}
                onChangeText={(text) => handleChange("confirmPassword", text)}
                value={formData.confirmPassword}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            {errorMessages.confirmPassword ? <Text style={styles.errorText}>{errorMessages.confirmPassword}</Text> : null}
            
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password must include:</Text>
              <View style={styles.requirementItem}>
                <MaterialIcons 
                  name={formData.password.length >= 8 ? "check-circle" : "cancel"} 
                  size={14} 
                  color={formData.password.length >= 8 ? "#10B981" : "#CBD5E1"} 
                />
                <Text style={styles.requirementText}>At least 8 characters</Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons 
                  name={/[A-Z]/.test(formData.password) ? "check-circle" : "cancel"} 
                  size={14} 
                  color={/[A-Z]/.test(formData.password) ? "#10B981" : "#CBD5E1"} 
                />
                <Text style={styles.requirementText}>At least one uppercase letter</Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons 
                  name={/[a-z]/.test(formData.password) ? "check-circle" : "cancel"} 
                  size={14} 
                  color={/[a-z]/.test(formData.password) ? "#10B981" : "#CBD5E1"} 
                />
                <Text style={styles.requirementText}>At least one lowercase letter</Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons 
                  name={/\d/.test(formData.password) ? "check-circle" : "cancel"} 
                  size={14} 
                  color={/\d/.test(formData.password) ? "#10B981" : "#CBD5E1"} 
                />
                <Text style={styles.requirementText}>At least one number</Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons 
                  name={/[!@#$%^&*]/.test(formData.password) ? "check-circle" : "cancel"} 
                  size={14} 
                  color={/[!@#$%^&*]/.test(formData.password) ? "#10B981" : "#CBD5E1"} 
                />
                <Text style={styles.requirementText}>At least one special character</Text>
              </View>
            </View>
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>Just a Few More Details</Text>
            <Text style={styles.stepDescription}>Help us personalize your experience</Text>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="calendar" size={18} color="#64748B" />
              </View>
              <TextInput
                placeholder="Current Age"
                style={styles.input}
                onChangeText={(text) => handleChange("age", text)}
                value={formData.age}
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
              />
            </View>
            {errorMessages.age ? <Text style={styles.errorText}>{errorMessages.age}</Text> : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <MaterialIcons name="emoji-nature" size={18} color="#64748B" />
              </View>
              <TextInput
                placeholder="Retirement Age"
                style={styles.input}
                onChangeText={(text) => handleChange("retirementAge", text)}
                value={formData.retirementAge}
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
              />
            </View>
            {errorMessages.retirementAge ? <Text style={styles.errorText}>{errorMessages.retirementAge}</Text> : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="phone" size={18} color="#64748B" />
              </View>
              <TextInput
                placeholder="Phone Number"
                style={styles.input}
                onChangeText={(text) => handleChange("phoneNumber", text)}
                value={formData.phoneNumber}
                keyboardType="phone-pad"
                placeholderTextColor="#94A3B8"
              />
            </View>
            {errorMessages.phoneNumber ? <Text style={styles.errorText}>{errorMessages.phoneNumber}</Text> : null}

            <TouchableOpacity 
              style={styles.countryPickerButton}
              onPress={() => setShowCountryPicker(true)}
            >
              <View style={styles.inputIconContainer}>
                <Feather name="globe" size={18} color="#64748B" />
              </View>
              <Text style={[
                styles.countryPickerText, 
                !formData.country && styles.countryPickerPlaceholder
              ]}>
                {formData.country || "Select Country"}
              </Text>
              <Feather name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>
            {errorMessages.country ? <Text style={styles.errorText}>{errorMessages.country}</Text> : null}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          contentContainerStyle={styles.container} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image source={require("./assets/logo.png")} style={styles.logo} />
          
          {/* New step indicators component */}
          {renderStepIndicators()}
          
          <View style={styles.formContainer}>
            {renderStep()}
          </View>
          
          <View style={styles.navigationButtonsContainer}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.backButton} onPress={handlePrevStep}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < totalSteps ? (
  <TouchableOpacity 
    style={[
      styles.nextButton, 
      currentStep > 1 && styles.buttonWithMargin,
      isNextLoading && styles.loadingButton // Optional: Add a subtle style change for loading state
    ]} 
    onPress={handleNextStep}
    disabled={isNextLoading} // Disable button while loading
  >
    {isNextLoading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={[styles.nextButtonText, styles.loadingButtonText]}>
          Validating...
        </Text>
      </View>
    ) : (
      <Text style={styles.nextButtonText}>Continue</Text>
    )}
    </TouchableOpacity>
    ) : (
      <TouchableOpacity 
        style={[styles.submitButton, styles.buttonWithMargin]} 
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Creating...</Text>
          </View>
        ) : (
          <Text style={styles.submitButtonText}>Create Account</Text>
        )}
      </TouchableOpacity>
    )}
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
                Log In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Custom country picker modal */}
      {renderCountryPicker()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flexGrow: 1,
    padding: 24,
  },
  logo: {
    width: width * 0.4,
    height: 80,
    resizeMode: "contain",
    alignSelf: "center",
    marginVertical: 20,
  },
  // New step indicators styles
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingHorizontal: 10,
    position: "relative",
  },
  stepItem: {
    alignItems: "center",
    width: 80,
    zIndex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  activeStep: {
    backgroundColor: "#2563EB",
  },
  completedStep: {
    backgroundColor: "#10B981",
  },
  inactiveStep: {
    backgroundColor: "#E2E8F0",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "bold",
  },
  activeStepNumber: {
    color: "#FFFFFF",
  },
  inactiveStepNumber: {
    color: "#64748B",
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  activeStepLabel: {
    color: "#2563EB",
  },
  inactiveStepLabel: {
    color: "#64748B",
  },
  connector: {
    position: "absolute",
    top: 16,
    left: 60,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 0,
  },
  connectorLine: {
    height: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
  },
  activeConnector: {
    backgroundColor: "#10B981",
  },
  formContainer: {
    width: "100%",
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 56,
    marginBottom: 16,
  },
  inputIconContainer: {
    padding: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    height: "100%",
  },
  eyeIcon: {
    padding: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: -8,
    marginLeft: 16,
    marginBottom: 16,
  },
  // New country picker styles
  countryPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 56,
    marginBottom: 16,
    paddingRight: 16,
  },
  countryPickerText: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
  },
  countryPickerPlaceholder: {
    color: "#94A3B8",
  },
  countryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  countryModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.7,
  },
  countryModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  countryModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  countryList: {
    padding: 16,
  },
  countryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  countryItemText: {
    fontSize: 16,
    color: "#1E293B",
  },
  selectedCountryText: {
    color: "#2563EB",
    fontWeight: "500",
  },
  passwordRequirements: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
  },
  navigationButtonsContainer: {
    marginTop: 24,
    flexDirection: "row",
  },
  backButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonWithMargin: {
    marginLeft: 12,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: 24,
    marginBottom: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 15,
    color: "#64748B",
  },
  loginLink: {
    color: "#2563EB",
    fontWeight: "600",
  },
  loadingButton: {
    opacity: 0.9,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingButtonText: {
    marginLeft: 8,
  },
  checkingText: {
    color: "#2563EB",
    fontSize: 14,
    marginTop: -8,
    marginLeft: 16,
    marginBottom: 16,
  },
  successText: {
    color: "#10B981", 
    fontSize: 14,
    marginTop: -8,
    marginLeft: 16,
    marginBottom: 16,
    fontWeight: "500",
  },
});