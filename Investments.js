import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const Investments = () => {
  const navigation = useNavigation();

  const investmentOptions = [
    {
      id: 'fd',
      title: 'Fixed Deposit',
      description: 'Track your FD investments and calculate returns',
      icon: 'business',
      screen: 'FDScreen',
      color: '#2563eb'
    },
    {
      id: 'rd',
      title: 'Recurring Deposit',
      description: 'Manage your RD investments and monitor growth',
      icon: 'trending-up',
      screen: 'RDScreen',
      color: '#16a34a'
    },
    {
      id: 'goals',
      title: 'Goal Calculator',
      description: 'Plan and track your financial goals effectively',
      icon: 'flag',
      screen: 'GoalCalculator',
      color: '#6366f1'
    }
  ];

  const renderInvestmentCard = ({ id, title, description, icon, screen, color }) => (
    <TouchableOpacity
      key={id}
      style={styles.card}
      onPress={() => navigation.navigate(screen)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Investments</Text>
      
      <View style={styles.content}>
        <View style={styles.cardsContainer}>
          {investmentOptions.map(option => renderInvestmentCard(option))}
        </View>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="information-circle" size={24} color="#64748b" />
          </View>
          <Text style={styles.infoText}>
            Track and manage your investments, set financial goals, and monitor your progress over time.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cardsContainer: {
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  infoIconContainer: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  }
});

export default Investments;