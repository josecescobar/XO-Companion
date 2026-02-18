import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { ProjectSummary } from '@/api/endpoints/projects';

interface ProjectCardProps {
  project: ProjectSummary;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>{project.name}</Text>
          <Text style={styles.code}>{project.code}</Text>
        </View>
        <View style={[styles.badge, project.isActive ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={[styles.badgeText, project.isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {project.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {(project.city || project.state) && (
        <Text style={styles.location}>
          {[project.city, project.state].filter(Boolean).join(', ')}
        </Text>
      )}

      <View style={styles.stats}>
        <Text style={styles.stat}>{project._count.members} members</Text>
        <Text style={styles.stat}>{project._count.dailyLogs} logs</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  code: { fontSize: 14, color: '#64748b', marginTop: 2 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#e2e8f0' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextActive: { color: '#16a34a' },
  badgeTextInactive: { color: '#64748b' },
  location: { fontSize: 14, color: '#64748b', marginTop: 8 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { fontSize: 14, color: '#64748b' },
});
