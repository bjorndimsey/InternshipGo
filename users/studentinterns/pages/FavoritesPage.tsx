import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface FavoriteCompany {
  id: string;
  name: string;
  profilePicture?: string;
  industry: string;
  location: string;
  moaStatus: 'active' | 'expired' | 'pending';
  moaExpiryDate?: string;
  availableSlots: number;
  totalSlots: number;
  description: string;
  website: string;
  rating: number;
  addedDate: string;
}

export default function FavoritesPage() {
  const [favoriteCompanies, setFavoriteCompanies] = useState<FavoriteCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavoriteCompanies();
  }, []);

  const fetchFavoriteCompanies = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockFavorites: FavoriteCompany[] = [
        {
          id: '1',
          name: 'DataFlow Inc',
          industry: 'Data Analytics',
          location: 'New York, NY',
          moaStatus: 'active',
          moaExpiryDate: '2024-11-15',
          availableSlots: 3,
          totalSlots: 8,
          description: 'Data analytics company focused on business intelligence and machine learning.',
          website: 'www.dataflow.com',
          rating: 4.6,
          addedDate: '2024-01-15',
        },
        {
          id: '2',
          name: 'InnovateLab',
          industry: 'Research & Development',
          location: 'Seattle, WA',
          moaStatus: 'active',
          moaExpiryDate: '2025-06-30',
          availableSlots: 7,
          totalSlots: 12,
          description: 'Innovation lab focused on emerging technologies and research.',
          website: 'www.innovatelab.com',
          rating: 4.9,
          addedDate: '2024-01-12',
        },
        {
          id: '3',
          name: 'TechStart Solutions',
          industry: 'Technology',
          location: 'Austin, TX',
          moaStatus: 'active',
          moaExpiryDate: '2024-10-20',
          availableSlots: 2,
          totalSlots: 5,
          description: 'Startup focused on mobile app development and cloud solutions.',
          website: 'www.techstart.com',
          rating: 4.7,
          addedDate: '2024-01-10',
        },
      ];
      
      setFavoriteCompanies(mockFavorites);
    } catch (error) {
      console.error('Error fetching favorite companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (company: FavoriteCompany) => {
    Alert.alert(
      'Company Details',
      `Name: ${company.name}\nIndustry: ${company.industry}\nLocation: ${company.location}\nMOA Status: ${company.moaStatus}\nAvailable Slots: ${company.availableSlots}/${company.totalSlots}\nDescription: ${company.description}\nWebsite: ${company.website}\nRating: ${company.rating}/5\nAdded: ${company.addedDate}`,
      [{ text: 'OK' }]
    );
  };

  const handleRemoveFavorite = (companyId: string) => {
    Alert.alert(
      'Remove from Favorites',
      'Are you sure you want to remove this company from your favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setFavoriteCompanies(favoriteCompanies.filter(company => company.id !== companyId));
            Alert.alert('Removed', 'Company removed from favorites');
          },
        },
      ]
    );
  };

  const handleApply = (company: FavoriteCompany) => {
    Alert.alert(
      'Apply to Internship',
      `Apply to ${company.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Apply', 
          onPress: () => {
            Alert.alert('Success', `Application submitted to ${company.name}!`);
          }
        },
      ]
    );
  };

  const getMOAStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'expired': return '#ea4335';
      case 'pending': return '#fbbc04';
      default: return '#666';
    }
  };

  const getMOAStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const FavoriteCompanyCard = ({ company }: { company: FavoriteCompany }) => (
    <View style={styles.companyCard}>
      <View style={styles.companyHeader}>
        <View style={styles.profileContainer}>
          {company.profilePicture ? (
            <Image source={{ uri: company.profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileText}>{company.name.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyIndustry}>{company.industry}</Text>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color="#fbbc04" />
            <Text style={styles.ratingText}>{company.rating}</Text>
          </View>
        </View>
        <View style={styles.favoriteIndicator}>
          <MaterialIcons name="favorite" size={24} color="#ea4335" />
        </View>
      </View>

      <View style={styles.companyDetails}>
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.locationText}>{company.location}</Text>
        </View>
        
        <View style={styles.slotsContainer}>
          <View style={styles.slotInfo}>
            <Text style={styles.slotLabel}>Available Slots</Text>
            <Text style={styles.slotValue}>{company.availableSlots}/{company.totalSlots}</Text>
          </View>
          <View style={styles.slotBar}>
            <View 
              style={[
                styles.slotFill, 
                { 
                  width: `${(company.availableSlots / company.totalSlots) * 100}%`,
                  backgroundColor: company.availableSlots > 0 ? '#34a853' : '#ea4335'
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.moaContainer}>
          <Text style={styles.moaLabel}>MOA Status:</Text>
          <View style={[styles.moaBadge, { backgroundColor: getMOAStatusColor(company.moaStatus) }]}>
            <Text style={styles.moaText}>{getMOAStatusText(company.moaStatus)}</Text>
          </View>
          {company.moaExpiryDate && (
            <Text style={styles.moaDate}>Expires: {company.moaExpiryDate}</Text>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {company.description}
        </Text>

        <Text style={styles.addedDate}>
          Added to favorites: {company.addedDate}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => handleViewDetails(company)}
        >
          <MaterialIcons name="visibility" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.unfavoriteButton]} 
          onPress={() => handleRemoveFavorite(company.id)}
        >
          <MaterialIcons name="favorite-border" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Unfavorite</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            styles.applyButton,
            company.availableSlots === 0 && styles.disabledButton
          ]} 
          onPress={() => handleApply(company)}
          disabled={company.availableSlots === 0}
        >
          <MaterialIcons name="send" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>
            {company.availableSlots === 0 ? 'Full' : 'Apply'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <Text style={styles.headerSubtitle}>
          Your saved companies and internship opportunities
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <MaterialIcons name="favorite" size={32} color="#ea4335" />
          <Text style={styles.statNumber}>{favoriteCompanies.length}</Text>
          <Text style={styles.statLabel}>Favorite Companies</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="work" size={32} color="#34a853" />
          <Text style={styles.statNumber}>
            {favoriteCompanies.reduce((sum, company) => sum + company.availableSlots, 0)}
          </Text>
          <Text style={styles.statLabel}>Available Slots</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="star" size={32} color="#fbbc04" />
          <Text style={styles.statNumber}>
            {(favoriteCompanies.reduce((sum, company) => sum + company.rating, 0) / favoriteCompanies.length).toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
      </View>

      {/* Favorites List */}
      <View style={styles.favoritesSection}>
        {favoriteCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="favorite-border" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No favorites yet</Text>
            <Text style={styles.emptyStateText}>
              Start adding companies to your favorites to see them here
            </Text>
          </View>
        ) : (
          favoriteCompanies.map((company) => (
            <FavoriteCompanyCard key={company.id} company={company} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  favoritesSection: {
    padding: 20,
  },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  companyHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  profileContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  companyIndustry: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  favoriteIndicator: {
    padding: 8,
  },
  companyDetails: {
    marginBottom: 15,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  slotsContainer: {
    marginBottom: 10,
  },
  slotInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  slotLabel: {
    fontSize: 14,
    color: '#666',
  },
  slotValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  slotBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  slotFill: {
    height: '100%',
    borderRadius: 3,
  },
  moaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  moaLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  moaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  moaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  moaDate: {
    fontSize: 12,
    color: '#999',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  addedDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#4285f4',
  },
  unfavoriteButton: {
    backgroundColor: '#ea4335',
  },
  applyButton: {
    backgroundColor: '#34a853',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
});
