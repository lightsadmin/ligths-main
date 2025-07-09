import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 80; // Adjust this based on your actual tab bar height

const Simulator = () => {
  return (
    <View style={styles.rootContainer}>
      <SafeAreaView style={styles.safeContainer}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.iconContainer}>
              <Ionicons name="trending-up" size={60} color="#2563EB" />
            </View>
            
            <Text style={styles.title}>Stock Simulator</Text>
            
            <Text style={styles.comingSoon}>Coming Soon</Text>
            
            <Text style={styles.description}>
              We're building a powerful tool to help you visualize investment 
              scenarios and explore potential returns without risking real money.
            </Text>
            
            <View style={styles.featuresContainer}>
              <FeatureItem 
                icon="pie-chart-outline" 
                title="Portfolio Simulation" 
                description="Simulate different portfolio allocations"
              />
              
              <FeatureItem 
                icon="stats-chart-outline" 
                title="Historical Performance" 
                description="See how investments would have performed"
              />
              
              <FeatureItem 
                icon="options-outline" 
                title="Risk Analysis" 
                description="Understand potential risks and rewards"
              />
            </View>
          </View>
          {/* Add this spacer view to ensure content doesn't get hidden */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const FeatureItem = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Ionicons name={icon} size={24} color="#2563EB" />
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

export default Simulator;

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    minHeight: height - (Platform.OS === 'ios' ? 150 : 100), // Adjust based on platform
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
    shadowColor: '#64748B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 20,
    color: '#2563EB',
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
  bottomSpacer: {
    height: TAB_BAR_HEIGHT + (Platform.OS === 'ios' ? 20 : 10),
  }
});