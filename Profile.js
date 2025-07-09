import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const API_URL = "https://ligths.onrender.com";

const ProfilePage = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editableProfile, setEditableProfile] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // 🌐 Fetch profile from backend
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!userInfo) {
        alert("User not logged in. Please log in again.");
        navigation.replace("Login"); // Redirect to login page
        return;
      }

      const parsedInfo = JSON.parse(userInfo);
      if (!parsedInfo?.user?.username && !parsedInfo?.user?.userName) {
        alert("Invalid user data. Please log in again.");
        navigation.replace("Login");
        return;
      }

      const username = parsedInfo.user.username || parsedInfo.user.userName;
      const apiUrl = `${API_URL}/profile/${username}`;

      console.log(`Fetching profile for: ${username}`);
      const response = await axios.get(apiUrl);
      setProfile(response.data);
      setEditableProfile(response.data); // Initialize editable profile
    } catch (err) {
      console.error("❌ Error fetching profile:", err);
      setError("Failed to load profile. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // 🔒 Sign-out function
  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem("userInfo");
      // Use navigation.reset to completely reset the navigation state
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
      // Don't show an alert here since we're navigating away
    } catch (err) {
      console.error("❌ Error signing out:", err);
      alert("Failed to sign out. Please try again.");
    }
  };

  // 📝 Handle profile update
  const handleUpdateProfile = async () => {
    try {
      setIsSaving(true);

      // Basic validation
      if (!editableProfile.firstName?.trim() || !editableProfile.lastName?.trim()) {
        Alert.alert("Error", "First name and last name are required.");
        setIsSaving(false);
        return;
      }

      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!userInfo) {
        Alert.alert("Error", "User not logged in. Please log in again.");
        setIsSaving(false);
        return;
      }

      const parsedInfo = JSON.parse(userInfo);
      const username = parsedInfo.user.username || parsedInfo.user.userName;

      // Call API to update profile
      const response = await axios.put(`${API_URL}/profile/${username}`, editableProfile);

      if (response.status === 200) {
        // Update local state
        setProfile(editableProfile);
        
        // Update AsyncStorage user data
        const updatedUserInfo = {
          ...parsedInfo,
          user: {
            ...parsedInfo.user,
            firstName: editableProfile.firstName,
            lastName: editableProfile.lastName,
            phoneNumber: editableProfile.phoneNumber,
            age: editableProfile.age,
            retirementAge: editableProfile.retirementAge,
            country: editableProfile.country,
          }
        };
        
        await AsyncStorage.setItem("userInfo", JSON.stringify(updatedUserInfo));
        
        setEditModalVisible(false);
        Alert.alert("Success", "Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Update Failed", 
        error.response?.data?.error || "Failed to update profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (!profile) return "U";
    const firstInitial = profile.firstName ? profile.firstName[0] : "";
    const lastInitial = profile.lastName ? profile.lastName[0] : "";
    return (firstInitial + lastInitial).toUpperCase();
  };

  // Group profile details into sections
  const personalDetails = [
    { icon: "person-outline", label: "First Name", value: profile.firstName },
    { icon: "person-outline", label: "Last Name", value: profile.lastName },
    { icon: "at-outline", label: "Username", value: profile.userName },
  ];

  const contactDetails = [
    { icon: "mail-outline", label: "Email", value: profile.email },
    { icon: "call-outline", label: "Phone Number", value: profile.phoneNumber },
    { icon: "globe-outline", label: "Country", value: profile.country },
  ];

  const financialDetails = [
    { icon: "calendar-outline", label: "Age", value: profile.age?.toString() },
    { icon: "time-outline", label: "Retirement Age", value: profile.retirementAge?.toString() },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={styles.userName}>{profile.firstName} {profile.lastName}</Text>
          <Text style={styles.userHandle}>@{profile.userName}</Text>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          
          <View style={styles.card}>
            {personalDetails.map((detail, index) => (
              <ProfileDetailItem 
                key={index} 
                icon={detail.icon} 
                label={detail.label} 
                value={detail.value} 
                isLast={index === personalDetails.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Contact Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call" size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.card}>
            {contactDetails.map((detail, index) => (
              <ProfileDetailItem 
                key={index} 
                icon={detail.icon} 
                label={detail.label} 
                value={detail.value} 
                isLast={index === contactDetails.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Financial Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet" size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Financial Information</Text>
          </View>
          
          <View style={styles.card}>
            {financialDetails.map((detail, index) => (
              <ProfileDetailItem 
                key={index} 
                icon={detail.icon} 
                label={detail.label} 
                value={detail.value} 
                isLast={index === financialDetails.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setEditModalVisible(true)}
            >
              <Ionicons name="create-outline" size={22} color="#1E293B" />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="key-outline" size={22} color="#1E293B" />
              <Text style={styles.actionButtonText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="notifications-outline" size={22} color="#1E293B" />
              <Text style={styles.actionButtonText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>LightsON v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your first name"
                  value={editableProfile.firstName}
                  onChangeText={(text) =>
                    setEditableProfile({ ...editableProfile, firstName: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your last name"
                  value={editableProfile.lastName}
                  onChangeText={(text) =>
                    setEditableProfile({ ...editableProfile, lastName: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your phone number"
                  keyboardType="phone-pad"
                  value={editableProfile.phoneNumber}
                  onChangeText={(text) =>
                    setEditableProfile({ ...editableProfile, phoneNumber: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Country</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your country"
                  value={editableProfile.country}
                  onChangeText={(text) =>
                    setEditableProfile({ ...editableProfile, country: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your age"
                  keyboardType="numeric"
                  value={editableProfile.age?.toString()}
                  onChangeText={(text) =>
                    setEditableProfile({ ...editableProfile, age: text ? parseInt(text) : "" })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Retirement Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your retirement age"
                  keyboardType="numeric"
                  value={editableProfile.retirementAge?.toString()}
                  onChangeText={(text) =>
                    setEditableProfile({ ...editableProfile, retirementAge: text ? parseInt(text) : "" })
                  }
                />
              </View>

              <View style={styles.readOnlyInputGroup}>
                <Text style={styles.inputLabel}>Email (read only)</Text>
                <View style={styles.readOnlyInput}>
                  <Text style={styles.readOnlyText}>{editableProfile.email}</Text>
                </View>
              </View>

              <View style={styles.readOnlyInputGroup}>
                <Text style={styles.inputLabel}>Username (read only)</Text>
                <View style={styles.readOnlyInput}>
                  <Text style={styles.readOnlyText}>{editableProfile.userName}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  // Reset to original values and close modal
                  setEditableProfile(profile);
                  setEditModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// 📌 Profile Detail Item Component
const ProfileDetailItem = ({ icon, label, value, isLast }) => (
  <>
    <View style={styles.detailItem}>
      <View style={styles.detailIconContainer}>
        <Ionicons name={icon} size={20} color="#64748B" />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || "N/A"}</Text>
      </View>
    </View>
    {!isLast && <View style={styles.divider} />}
  </>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  container: {
    padding: 16,
    backgroundColor: "#F8FAFC",
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2563EB",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
  },
  userHandle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 4,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1E293B",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 52,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  signOutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 24,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 16,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    paddingHorizontal: 24,
    paddingTop: 16,
    maxHeight: Platform.OS === "ios" ? 500 : 450,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  readOnlyInputGroup: {
    marginBottom: 16,
  },
  readOnlyInput: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: "#64748B",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default ProfilePage;