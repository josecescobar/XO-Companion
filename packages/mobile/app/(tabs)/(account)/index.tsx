import { View, Text, Alert, StyleSheet, Pressable } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/mutations/useLogout';
import { useTheme } from '@/hooks/useTheme';

function formatRole(role: string): string {
  return role.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

const APPEARANCE_OPTIONS = [
  { label: 'Light', value: 'light' as const },
  { label: 'Dark', value: 'dark' as const },
  { label: 'System', value: 'system' as const },
];

export default function AccountScreen() {
  const user = useAuthStore((s) => s.user);
  const { mutate: logout, isPending } = useLogout();
  const { mode, colors, setMode } = useTheme();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {user?.firstName?.charAt(0) ?? '?'}{user?.lastName?.charAt(0) ?? ''}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{user?.firstName} {user?.lastName}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        {user?.role && (
          <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>{formatRole(user.role)}</Text>
          </View>
        )}
      </View>

      {/* Info Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>User ID</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{user?.id?.slice(0, 8)}...</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Organization</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{user?.organizationId?.slice(0, 8)}...</Text>
        </View>
      </View>

      {/* Appearance Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.appearanceTitle, { color: colors.text }]}>Appearance</Text>
        <View style={styles.appearanceRow}>
          {APPEARANCE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setMode(option.value)}
              style={[
                styles.appearanceOption,
                {
                  backgroundColor: mode === option.value ? colors.primary : colors.surfaceSecondary,
                  borderColor: mode === option.value ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.appearanceOptionText,
                  {
                    color: mode === option.value ? '#ffffff' : colors.textSecondary,
                    fontWeight: mode === option.value ? '600' : '500',
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.spacer} />

      <Pressable
        style={[styles.logoutButton, { backgroundColor: colors.error }, isPending && styles.disabled]}
        onPress={handleLogout}
        disabled={isPending}
      >
        <Text style={styles.logoutText}>{isPending ? 'Logging out...' : 'Log Out'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700' },
  email: { fontSize: 16, marginTop: 4 },
  roleBadge: {
    marginTop: 8,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roleText: { fontSize: 13, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 16 },
  infoValue: { fontSize: 14, fontFamily: 'Courier' },
  appearanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  appearanceRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  appearanceOption: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  appearanceOptionText: {
    fontSize: 14,
  },
  spacer: { flex: 1 },
  logoutButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  disabled: { opacity: 0.5 },
  logoutText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
});
