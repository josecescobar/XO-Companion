import { useState } from 'react';
import {
  View,
  Text,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateTraining } from '@/hooks/mutations/useCrudMutations';
import { useTheme } from '@/hooks/useTheme';

const TRAINING_TYPES = [
  { label: 'OSHA 10', value: 'OSHA_10' },
  { label: 'OSHA 30', value: 'OSHA_30' },
  { label: 'First Aid/CPR', value: 'FIRST_AID' },
  { label: 'Fall Protection', value: 'FALL_PROTECTION' },
  { label: 'Scaffolding', value: 'SCAFFOLDING' },
  { label: 'Confined Space', value: 'CONFINED_SPACE' },
  { label: 'Excavation', value: 'EXCAVATION' },
  { label: 'Electrical Safety', value: 'ELECTRICAL_SAFETY' },
  { label: 'Hazcom', value: 'HAZCOM' },
  { label: 'Silica', value: 'SILICA' },
  { label: 'Other', value: 'OTHER' },
] as const;

export default function AddTrainingScreen() {
  const router = useRouter();
  const createMutation = useCreateTraining();
  const { colors } = useTheme();

  const [employeeName, setEmployeeName] = useState('');
  const [trainingType, setTrainingType] = useState('OSHA_10');
  const [topic, setTopic] = useState('');
  const [trainer, setTrainer] = useState('');
  const [certificationId, setCertificationId] = useState('');
  const [completedDate, setCompletedDate] = useState(new Date());
  const [showCompletedPicker, setShowCompletedPicker] = useState(Platform.OS === 'ios');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showExpPicker, setShowExpPicker] = useState(false);

  const handleCreate = async () => {
    if (!employeeName.trim() || !topic.trim()) {
      Alert.alert('Required', 'Employee name and topic are required.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        employeeName: employeeName.trim(),
        trainingType,
        topic: topic.trim(),
        trainer: trainer.trim() || undefined,
        certificationId: certificationId.trim() || undefined,
        completedDate: format(completedDate, 'yyyy-MM-dd'),
        expirationDate: expirationDate ? format(expirationDate, 'yyyy-MM-dd') : undefined,
      });
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create training record.');
    }
  };

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Add Training Record' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Input
            label="Employee Name *"
            placeholder="e.g. Jane Doe"
            value={employeeName}
            onChangeText={setEmployeeName}
          />

          {/* Training Type */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Training Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {TRAINING_TYPES.map((tt) => (
                <Pressable
                  key={tt.value}
                  onPress={() => setTrainingType(tt.value)}
                  style={[
                    styles.chip,
                    trainingType === tt.value
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                  ]}
                >
                  <Text
                    style={[styles.chipText, { color: trainingType === tt.value ? '#fff' : colors.textSecondary }]}
                  >
                    {tt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Input label="Topic *" placeholder="e.g. OSHA 10-Hour Construction" value={topic} onChangeText={setTopic} />
          <Input label="Trainer" placeholder="e.g. Safety Solutions Inc" value={trainer} onChangeText={setTrainer} />
          <Input label="Certification ID" placeholder="e.g. FA-2025-789" value={certificationId} onChangeText={setCertificationId} />

          {/* Completed Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Completed Date</Text>
            {Platform.OS === 'android' && (
              <Pressable
                onPress={() => setShowCompletedPicker(true)}
                style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {format(completedDate, 'MMM d, yyyy')}
                </Text>
              </Pressable>
            )}
            {showCompletedPicker && (
              <DateTimePicker
                value={completedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_e, date) => {
                  if (Platform.OS === 'android') setShowCompletedPicker(false);
                  if (date) setCompletedDate(date);
                }}
              />
            )}
          </View>

          {/* Expiration Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Expiration Date</Text>
            <Pressable
              onPress={() => setShowExpPicker(true)}
              style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.dateText, { color: expirationDate ? colors.text : colors.textTertiary }]}>
                {expirationDate ? format(expirationDate, 'MMM d, yyyy') : 'Not set'}
              </Text>
            </Pressable>
            {showExpPicker && (
              <DateTimePicker
                value={expirationDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={completedDate}
                onChange={(_e, date) => {
                  setShowExpPicker(false);
                  if (date) setExpirationDate(date);
                }}
              />
            )}
          </View>

          <Button
            title="Save Training Record"
            onPress={handleCreate}
            loading={createMutation.isPending}
            disabled={createMutation.isPending || !employeeName.trim() || !topic.trim()}
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  field: { gap: 4 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '500' },
  dateButton: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  dateText: { fontSize: 16 },
});
