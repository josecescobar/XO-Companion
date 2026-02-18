import { View, Text, Alert, StyleSheet, Pressable } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/mutations/useLogout';

function formatRole(role: string): string {
  return role.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

export default function AccountScreen() {
  const user = useAuthStore((s) => s.user);
  const { mutate: logout, isPending } = useLogout();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.charAt(0) ?? '?'}{user?.lastName?.charAt(0) ?? ''}
          </Text>
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{formatRole(user.role)}</Text>
          </View>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoValue}>{user?.id?.slice(0, 8)}...</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Organization</Text>
          <Text style={styles.infoValue}>{user?.organizationId?.slice(0, 8)}...</Text>
        </View>
      </View>

      <View style={styles.spacer} />

      <Pressable
        style={[styles.logoutButton, isPending && styles.disabled]}
        onPress={handleLogout}
        disabled={isPending}
      >
        <Text style={styles.logoutText}>{isPending ? 'Logging out...' : 'Log Out'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#2563eb' },
  name: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  email: { fontSize: 16, color: '#64748b', marginTop: 4 },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roleText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 16, color: '#64748b' },
  infoValue: { fontSize: 14, color: '#0f172a', fontFamily: 'Courier' },
  spacer: { flex: 1 },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  disabled: { opacity: 0.5 },
  logoutText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
});
