import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  count,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View className="mb-3 rounded-xl border border-field-border bg-field-card">
      <Pressable
        onPress={() => setOpen(!open)}
        className="flex-row items-center justify-between p-4"
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-field-base font-semibold text-field-text">
            {title}
          </Text>
          {count !== undefined && (
            <View className="rounded-full bg-brand-100 px-2 py-0.5">
              <Text className="text-xs font-medium text-brand-500">{count}</Text>
            </View>
          )}
        </View>
        <Text className="text-field-muted">{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && <View className="border-t border-field-border px-4 pb-4 pt-3">{children}</View>}
    </View>
  );
}
