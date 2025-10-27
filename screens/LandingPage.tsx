import React from 'react';
import { ScrollView, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Header from '../components/landing/Header';
import HeroSection from '../components/landing/HeroSection';
import MapSection from '../components/landing/MapSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import CompaniesSection from '../components/landing/CompaniesSection';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/landing/Footer';

const { width, height } = Dimensions.get('window');

interface LandingPageProps {
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToDashboard?: (user: any, userType?: string) => void;
}

export default function LandingPage({ 
  onNavigateToLogin, 
  onNavigateToRegister, 
  onNavigateToDashboard 
}: LandingPageProps) {
  return (
    <>
      <StatusBar style="light" backgroundColor="#151419" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Header 
          onNavigateToLogin={onNavigateToLogin}
          onNavigateToRegister={onNavigateToRegister}
        />
        <HeroSection 
          onNavigateToRegister={onNavigateToRegister}
          onNavigateToLogin={onNavigateToLogin}
        />
        <CompaniesSection />
        <MapSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection 
          onNavigateToRegister={onNavigateToRegister}
          onNavigateToLogin={onNavigateToLogin}
        />
        <Footer />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151419',
  },
});
