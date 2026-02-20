import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';
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
        shadows.md,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
      <View style={styles.cardContent}>
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
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    marginBottom: 14,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 18,
  },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700' },
  code: { fontSize: 14, marginTop: 2, fontWeight: '500' },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  location: { fontSize: 14, marginTop: 8, fontWeight: '500' },
  stats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { fontSize: 14, fontWeight: '500' },
});
