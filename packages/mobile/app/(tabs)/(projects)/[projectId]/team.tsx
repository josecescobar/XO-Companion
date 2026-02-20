import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useProject } from '@/hooks/queries/useProjects';
import { useOrgUsers } from '@/hooks/queries/useUsers';
import { useAddMember, useRemoveMember } from '@/hooks/mutations/useCrudMutations';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';
import { Ionicons } from '@expo/vector-icons';

const ASSIGNABLE_ROLES = [
  { label: 'Project Manager', value: 'PROJECT_MANAGER' },
  { label: 'Superintendent', value: 'SUPERINTENDENT' },
  { label: 'Foreman', value: 'FOREMAN' },
  { label: 'Field Worker', value: 'FIELD_WORKER' },
  { label: 'Safety Officer', value: 'SAFETY_OFFICER' },
  { label: 'Owner Rep', value: 'OWNER_REP' },
];

function formatRole(role: string): string {
  return role.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

export default function TeamScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { data: project, isLoading, error, refetch, isRefetching } = useProject(projectId);
  const { data: orgUsers } = useOrgUsers();
  const addMember = useAddMember();
  const removeMember = useRemoveMember();
  const currentUser = useAuthStore((s) => s.user);
  const { colors } = useTheme();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('FIELD_WORKER');

  if (isLoading) return <LoadingState message="Loading team..." />;
  if (error || !project) return <ErrorState message="Failed to load project" onRetry={refetch} />;

  const memberIds = new Set(project.members.map((m) => m.userId));
  const availableUsers = (orgUsers ?? []).filter((u) => !memberIds.has(u.id) && u.isActive);

  const canManage = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PROJECT_MANAGER';

  const handleAdd = () => {
    if (!selectedUserId) return;
    addMember.mutate(
      { projectId, userId: selectedUserId, role: selectedRole },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setSelectedUserId(null);
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  const handleRemove = (userId: string, name: string) => {
    Alert.alert('Remove Member', `Remove ${name} from this project?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMember.mutate({ projectId, userId }),
      },
    ]);
  };

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Team' }} />
      <FlatList
        data={project.members}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <View style={[styles.memberRow, { backgroundColor: colors.surface }, shadows.md]}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {item.user.firstName?.charAt(0) ?? ''}{item.user.lastName?.charAt(0) ?? ''}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: colors.text }]}>
                {item.user.firstName} {item.user.lastName}
              </Text>
              <Text style={[styles.memberEmail, { color: colors.textTertiary }]}>{item.user.email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.roleText, { color: colors.primary }]}>{formatRole(item.role)}</Text>
              </View>
            </View>
            {canManage && item.userId !== currentUser?.id && (
              <Pressable
                onPress={() => handleRemove(item.userId, `${item.user.firstName} ${item.user.lastName}`)}
                style={styles.removeBtn}
              >
                <Ionicons name="close-circle-outline" size={22} color={colors.error} />
              </Pressable>
            )}
          </View>
        )}
        ListHeaderComponent={
          canManage ? (
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.addButtonText}>+ Add Member</Text>
            </Pressable>
          ) : null
        }
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      />

      {/* Add Member Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Team Member</Text>
            <Pressable onPress={() => setShowAddModal(false)}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Cancel</Text>
            </Pressable>
          </View>

          {/* Role selection */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Role</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleRow}>
            {ASSIGNABLE_ROLES.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setSelectedRole(r.value)}
                style={[
                  styles.roleChip,
                  selectedRole === r.value
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    { color: selectedRole === r.value ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* User selection */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
            Select User ({availableUsers.length} available)
          </Text>
          <FlatList
            data={availableUsers}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedUserId(item.id)}
                style={[
                  styles.userOption,
                  {
                    backgroundColor: selectedUserId === item.id ? colors.primaryLight : colors.surface,
                    ...(selectedUserId === item.id ? { borderColor: colors.primary, borderWidth: 1 } : {}),
                  },
                  selectedUserId !== item.id ? shadows.md : {},
                ]}
              >
                <Text style={[styles.userName, { color: colors.text }]}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
                <Text style={[styles.userRole, { color: colors.textTertiary }]}>{formatRole(item.role)}</Text>
              </Pressable>
            )}
            contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                All org members are already on this project.
              </Text>
            }
          />

          <Button
            title="Add to Project"
            onPress={handleAdd}
            loading={addMember.isPending}
            disabled={!selectedUserId || addMember.isPending}
            size="lg"
          />
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    minHeight: 48,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 16, fontWeight: '700' },
  memberEmail: { fontSize: 12, marginTop: 2 },
  roleBadge: { borderRadius: 14, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  roleText: { fontSize: 11, fontWeight: '700' },
  removeBtn: { padding: 8, minHeight: 44, justifyContent: 'center' },
  addButton: { borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 12, minHeight: 48 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalContainer: { flex: 1, padding: 20, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  roleRow: { gap: 8, paddingBottom: 4 },
  roleChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  roleChipText: { fontSize: 13, fontWeight: '600' },
  userOption: { borderRadius: 12, padding: 12 },
  userName: { fontSize: 15, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 2 },
  userRole: { fontSize: 11, marginTop: 2 },
  emptyText: { textAlign: 'center', padding: 20, fontSize: 14 },
});
