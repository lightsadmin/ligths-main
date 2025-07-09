import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const InvestmentNavigation = () => {
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
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Investments</Text>
      </View>
      
      <View style={styles.content}>
        {investmentOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={styles.card}
            onPress={() => navigation.navigate(option.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${option.color}20` }]}>
              <Ionicons name={option.icon} size={28} color={option.color} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
          </TouchableOpacity>
        ))}
        
        <View style={styles.infoContainer}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="information-circle" size={24} color="#64748b" />
          </View>
          <Text style={styles.infoText}>
            Track and manage your fixed deposits and recurring deposits in one place. 
            Calculate returns and monitor growth over time.
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
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

export default InvestmentNavigation;