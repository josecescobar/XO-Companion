import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateDailyLog } from '@/hooks/mutations/useCreateDailyLog';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';

export default function CreateDailyLogScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const createMutation = useCreateDailyLog();
  const { colors } = useTheme();

  const [logDate, setLogDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');

  const handleCreate = async () => {
    try {
      const newLog = await createMutation.mutateAsync({
        projectId,
        logDate: format(logDate, 'yyyy-MM-dd'),
        notes: notes.trim() || undefined,
      });
      router.replace(
        `/(tabs)/(projects)/${projectId}/daily-logs/${newLog.id}`,
      );
    } catch {
      Alert.alert('Error', 'Failed to create daily log. Please try again.');
    }
  };

  const onDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setLogDate(selectedDate);
    }
  };

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'New Daily Log' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Date field */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Log Date</Text>
            {Platform.OS === 'android' && (
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.dateButton, shadows.sm, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {format(logDate, 'EEEE, MMM d, yyyy')}
                </Text>
              </Pressable>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={logDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Notes field */}
          <View style={styles.field}>
            <Input
              label="Notes (optional)"
              placeholder="Add any notes for this daily log..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={styles.notesInput}
              textAlignVertical="top"
            />
          </View>

          {/* Create button */}
          <Button
            title="Create Daily Log"
            onPress={handleCreate}
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24 },
  field: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  dateButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center' as const,
  },
  dateText: { fontSize: 16 },
  notesInput: { minHeight: 100 },
});
