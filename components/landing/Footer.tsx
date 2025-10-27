import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const footerLinks = {
  students: [
    { label: 'Browse Companies', href: '#' },
    { label: 'Search Internships', href: '#' },
    { label: 'Career Resources', href: '#' },
    { label: 'Success Stories', href: '#' },
  ],
  companies: [
    { label: 'Post Internships', href: '#' },
    { label: 'Find Talent', href: '#' },
    { label: 'Pricing', href: '#' },
    { label: 'Enterprise', href: '#' },
  ],
  company: [
    { label: 'About Us', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

export default function Footer() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.mainContent}>
          {/* Brand Section */}
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="business" size={24} color="#F56E0F" />
              <Text style={styles.logoText}>InternConnect</Text>
            </View>
            
            <Text style={styles.brandDescription}>
              Connecting students with their dream internship opportunities since 2024.
            </Text>
            
            <View style={styles.contactInfo}>
              <TouchableOpacity style={styles.contactItem}>
                <Ionicons name="mail" size={16} color="#878787" />
                <Text style={styles.contactText}>hello@internconnect.com</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.contactItem}>
                <Ionicons name="call" size={16} color="#878787" />
                <Text style={styles.contactText}>+1 (234) 567-890</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Links Sections */}
          <View style={styles.linksContainer}>
            <View style={styles.linksSection}>
              <Text style={styles.linksTitle}>For Students</Text>
              <View style={styles.linksList}>
                {footerLinks.students.map((link, index) => (
                  <TouchableOpacity key={index} style={styles.linkItem}>
                    <Text style={styles.linkText}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.linksSection}>
              <Text style={styles.linksTitle}>For Companies</Text>
              <View style={styles.linksList}>
                {footerLinks.companies.map((link, index) => (
                  <TouchableOpacity key={index} style={styles.linkItem}>
                    <Text style={styles.linkText}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.linksSection}>
              <Text style={styles.linksTitle}>Company</Text>
              <View style={styles.linksList}>
                {footerLinks.company.map((link, index) => (
                  <TouchableOpacity key={index} style={styles.linkItem}>
                    <Text style={styles.linkText}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.copyright}>
            © 2025 InternConnect. All rights reserved.
          </Text>
          
          <View style={styles.socialLinks}>
            <TouchableOpacity style={styles.socialLink}>
              <Ionicons name="logo-twitter" size={20} color="#878787" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.socialLink}>
              <Ionicons name="logo-linkedin" size={20} color="#878787" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.socialLink}>
              <Ionicons name="logo-facebook" size={20} color="#878787" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.socialLink}>
              <Ionicons name="logo-instagram" size={20} color="#878787" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1B1B1E',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2E',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 48,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  mainContent: {
    flexDirection: width > 768 ? 'row' : 'column',
    marginBottom: 32,
    gap: 48,
  },
  brandSection: {
    flex: 1,
    maxWidth: width > 768 ? 300 : '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  brandDescription: {
    fontSize: 14,
    color: '#878787',
    lineHeight: 20,
    marginBottom: 24,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#878787',
  },
  linksContainer: {
    flex: 2,
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 32,
  },
  linksSection: {
    flex: 1,
  },
  linksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 16,
  },
  linksList: {
    gap: 12,
  },
  linkItem: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
    color: '#878787',
  },
  bottomSection: {
    flexDirection: width > 768 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2E',
    gap: 16,
  },
  copyright: {
    fontSize: 14,
    color: '#878787',
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  socialLink: {
    padding: 8,
  },
});
