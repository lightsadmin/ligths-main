import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  SafeAreaView,
  Dimensions,
  StatusBar , 
  Platform
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
const { width } = Dimensions.get('window');

const PremiumSubscription = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // Default to yearly for better value
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Premium Experience</Text>
            <Text style={styles.headerSubtitle}>Unlock all features for a complete financial journey</Text>
          </View>
        </View>


        <View
  style={[
    styles.banner,
    {backgroundColor: '#3B82F6'} // Use the first color from your gradient
  ]}
>
  <View style={styles.bannerContent}>
    <Text style={styles.bannerTitle}>LIGTHS PREMIUM</Text>
    <Text style={styles.bannerSubtitle}>Your personalized financial companion</Text>
  </View>
  <MaterialCommunityIcons name="crown" size={36} color="#FEF3C7" />
</View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          
          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  {feature.icon}
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          
          <View style={styles.planSelector}>
            <TouchableOpacity 
              style={[
                styles.planOption, 
                selectedPlan === 'monthly' && styles.selectedPlan
              ]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <Text style={[styles.planTitle, selectedPlan === 'monthly' && styles.selectedPlanText]}>Monthly</Text>
              <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.selectedPlanText]}>₹499</Text>
              <Text style={[styles.planPeriod, selectedPlan === 'monthly' && styles.selectedPlanText]}>per month</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.planOption, 
                selectedPlan === 'yearly' && styles.selectedPlan,
                styles.recommendedPlan
              ]}
              onPress={() => setSelectedPlan('yearly')}
            >
              {selectedPlan === 'yearly' && (
                <View style={styles.savingBadge}>
                  <Text style={styles.savingText}>Save 33%</Text>
                </View>
              )}
              <Text style={[styles.planTitle, selectedPlan === 'yearly' && styles.selectedPlanText]}>Yearly</Text>
              <Text style={[styles.planPrice, selectedPlan === 'yearly' && styles.selectedPlanText]}>₹3999</Text>
              <Text style={[styles.planPeriod, selectedPlan === 'yearly' && styles.selectedPlanText]}>per year</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.planComparison}>
            <View style={styles.comparisonItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.comparisonText}>7-day free trial</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.comparisonText}>Cancel anytime</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.comparisonText}>All features included</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.subscribeButton}
          onPress={() => navigation.navigate('Payment')}
        >
          <Text style={styles.subscribeButtonText}>
            Start 7-Day Free Trial
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy. Your subscription will automatically renew unless canceled at least 24 hours before the end of the current period.
        </Text>
        
        <TouchableOpacity style={styles.restoreButton}>
          <Text style={styles.restoreButtonText}>Restore Purchase</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Feature data
const features = [
  {
    title: 'Advanced Analytics',
    description: 'Detailed insights into your spending patterns and financial health',
    icon: <MaterialCommunityIcons name="chart-line" size={24} color="#3B82F6" />
  },
  {
    title: 'Wealth Projection',
    description: 'Simulate your financial future with powerful projection tools',
    icon: <FontAwesome5 name="money-bill-wave" size={20} color="#3B82F6" />
  },
  {
    title: 'Portfolio Optimization',
    description: 'AI-driven suggestions to optimize your investment portfolio',
    icon: <MaterialCommunityIcons name="finance" size={24} color="#3B82F6" />
  },
  {
    title: 'Custom Categories',
    description: 'Create unlimited custom categories for better expense tracking',
    icon: <MaterialCommunityIcons name="tag-multiple" size={24} color="#3B82F6" />
  },
  {
    title: 'Cloud Sync',
    description: 'Securely sync your data across all your devices',
    icon: <MaterialCommunityIcons name="cloud-sync" size={24} color="#3B82F6" />
  }
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#DBEAFE',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  planSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  planOption: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    position: 'relative',
  },
  selectedPlan: {
    backgroundColor: '#3B82F6',
  },
  recommendedPlan: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  savingBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  planPeriod: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  selectedPlanText: {
    color: '#FFFFFF',
  },
  planComparison: {
    marginTop: 8,
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparisonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748B',
  },
  subscribeButton: {
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    textAlign: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
  },
  restoreButton: {
    alignItems: 'center',
    marginBottom: 32,
  },
  restoreButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  }
});

export default PremiumSubscription;