import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { ProjectSummary } from '@/api/endpoints/projects';

interface ProjectCardProps {
  project: ProjectSummary;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.name, { color: colors.text }]}>{project.name}</Text>
          <Text style={[styles.code, { color: colors.textSecondary }]}>{project.code}</Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: project.isActive ? colors.successLight : colors.border },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: project.isActive ? colors.success : colors.textSecondary },
            ]}
          >
            {project.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {(project.city || project.state) && (
        <Text style={[styles.location, { color: colors.textSecondary }]}>
          {[project.city, project.state].filter(Boolean).join(', ')}
        </Text>
      )}

      <View style={styles.stats}>
        <Text style={[styles.stat, { color: colors.textSecondary }]}>{project._count?.members ?? project.members.length} members</Text>
        <Text style={[styles.stat, { color: colors.textSecondary }]}>{project._count?.dailyLogs ?? 0} logs</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
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
  name: { fontSize: 18, fontWeight: '700' },
  code: { fontSize: 14, marginTop: 2 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  location: { fontSize: 14, marginTop: 8 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { fontSize: 14 },
});
