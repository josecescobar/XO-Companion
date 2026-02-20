import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ title, count, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { colors } = useTheme();

  return (
    <View style={[styles.container, shadows.sm, { backgroundColor: colors.surface }]}>
      <Pressable onPress={() => setOpen(!open)} style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {count !== undefined && (
            <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>{count}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {open && <View style={[styles.content, { borderTopColor: colors.border }]}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 14, marginBottom: 14, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, minHeight: 52 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  countBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 12, fontWeight: '700' },
  content: { borderTopWidth: 1, padding: 16 },
});
