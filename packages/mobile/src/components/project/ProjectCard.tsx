import { Pressable, View, Text } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { ProjectSummary } from '@/api/endpoints/projects';

interface ProjectCardProps {
  project: ProjectSummary;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  return (
    <Pressable onPress={onPress}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-field-lg font-bold text-field-text">
              {project.name}
            </Text>
            <Text className="mt-0.5 text-field-sm text-field-muted">
              {project.code}
            </Text>
          </View>
          <Badge
            label={project.isActive ? 'Active' : 'Inactive'}
            variant={project.isActive ? 'success' : 'default'}
          />
        </View>

        {(project.city || project.state) && (
          <Text className="mt-2 text-field-sm text-field-muted">
            {[project.city, project.state].filter(Boolean).join(', ')}
          </Text>
        )}

        <View className="mt-3 flex-row gap-4">
          <Text className="text-field-sm text-field-muted">
            {project._count.members} members
          </Text>
          <Text className="text-field-sm text-field-muted">
            {project._count.dailyLogs} logs
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}
