import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
}

export default function Header({ onNavigateToLogin, onNavigateToRegister }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const isTabletOrDesktop = screenWidth > 768;

  return (
    <View style={styles.header}>
      <StatusBar barStyle="light-content" backgroundColor="#151419" />
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Ionicons name="business" size={32} color="#F56E0F" />
          <Text style={styles.logoText}>InternshipGo</Text>
        </View>

        {/* Desktop Navigation */}
        {isTabletOrDesktop && (
          <View style={styles.desktopNav}>
            <TouchableOpacity style={styles.navItem}>
              <Text style={styles.navText}>Features</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
              <Text style={styles.navText}>Find Companies</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
              <Text style={styles.navText}>How It Works</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
              <Text style={styles.navText}>Companies</Text>
            </TouchableOpacity>
          </View>
        )}

        {isTabletOrDesktop && (
          <View style={styles.authButtons}>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={onNavigateToLogin}
            >
              <Text style={styles.loginText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.signupButton}
              onPress={onNavigateToRegister}
            >
              <Text style={styles.signupText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mobile Menu Button */}
        {!isTabletOrDesktop && (
          <TouchableOpacity 
            style={styles.mobileMenuButton}
            onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Ionicons 
              name={mobileMenuOpen ? "close" : "menu"} 
              size={24} 
              color="#FBFBFB" 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Mobile Menu */}
      {!isTabletOrDesktop && mobileMenuOpen && (
        <View style={styles.mobileMenu}>
          <TouchableOpacity style={styles.mobileNavItem}>
            <Text style={styles.mobileNavText}>Features</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mobileNavItem}>
            <Text style={styles.mobileNavText}>Find Companies</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mobileNavItem}>
            <Text style={styles.mobileNavText}>How It Works</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mobileNavItem}>
            <Text style={styles.mobileNavText}>Companies</Text>
          </TouchableOpacity>
          <View style={styles.mobileAuthButtons}>
            <TouchableOpacity 
              style={styles.mobileLoginButton}
              onPress={onNavigateToLogin}
            >
              <Text style={styles.mobileLoginText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.mobileSignupButton}
              onPress={onNavigateToRegister}
            >
              <Text style={styles.mobileSignupText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(21, 20, 25, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#1B1B1E',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 64,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  navItem: {
    paddingVertical: 8,
  },
  navText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#878787',
  },
  authButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  loginButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FBFBFB',
  },
  signupButton: {
    backgroundColor: '#F56E0F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  signupText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FBFBFB',
  },
  mobileMenuButton: {
    padding: 8,
  },
  mobileMenu: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#151419',
    borderTopWidth: 1,
    borderTopColor: '#1B1B1E',
  },
  mobileNavItem: {
    paddingVertical: 12,
  },
  mobileNavText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#878787',
  },
  mobileAuthButtons: {
    flexDirection: 'column',
    gap: 8,
    paddingTop: 16,
  },
  mobileLoginButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1B1B1E',
    borderRadius: 6,
  },
  mobileLoginText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FBFBFB',
    textAlign: 'center',
  },
  mobileSignupButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F56E0F',
    borderRadius: 6,
  },
  mobileSignupText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FBFBFB',
    textAlign: 'center',
  },
});
