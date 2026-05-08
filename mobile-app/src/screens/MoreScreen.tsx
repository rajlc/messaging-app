import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius } from '../theme/theme';
import { Bot, ChevronRight, LogOut, Truck, User, Package, Wallet, MoreHorizontal, FileText } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MoreScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();
  const isRider = user?.role?.trim().toLowerCase() === 'rider';

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>More</Text>

        {user && (
          <View style={styles.userSection}>
            <View style={styles.userAvatar}>
              <Text style={styles.avatarText}>{user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{user.full_name || 'User'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        {(!isRider && navigation.canGoBack()) && (
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: Colors.primary + '10', marginHorizontal: Spacing.m, marginBottom: Spacing.m, borderRadius: Radius.m, borderBottomWidth: 0 }]}
            onPress={() => navigation.goBack()}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.primary }]}>
              <Truck size={24} color={Colors.white} />
            </View>
            <Text style={[styles.menuText, { color: Colors.primary }]}>Back to Admin Dashboard</Text>
            <ChevronRight size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          {!isRider && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('AIAgentSettings')}
              >
                <View style={styles.iconContainer}>
                  <Bot size={24} color={Colors.primary} />
                </View>
                <Text style={styles.menuText}>AI Agent Settings</Text>
                <ChevronRight size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('RiderTabs')}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Truck size={24} color="#2196F3" />
                </View>
                <Text style={styles.menuText}>My Delivery</Text>
                <ChevronRight size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('AdminDeliveryReport')}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#F0F4FF' }]}>
                  <FileText size={24} color={Colors.secondary} />
                </View>
                <Text style={styles.menuText}>Delivery Report</Text>
                <ChevronRight size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
              <User size={24} color="#9C27B0" />
            </View>
            <Text style={styles.menuText}>My Profile</Text>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={logout}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FFEEF0' }]}>
              <LogOut size={24} color={Colors.danger} />
            </View>
            <Text style={[styles.menuText, { color: Colors.danger }]}>Logout</Text>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.xl, paddingHorizontal: Spacing.m, paddingTop: 60 },
  section: { backgroundColor: Colors.white, borderRadius: Radius.m, paddingVertical: Spacing.s, marginHorizontal: Spacing.m },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.m, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconContainer: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.primaryLite, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.m },
  menuText: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.m,
    borderRadius: Radius.m,
    marginBottom: Spacing.xl,
    marginHorizontal: Spacing.m,
    gap: Spacing.m,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12
  },
  footerTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  footerTabText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
});
