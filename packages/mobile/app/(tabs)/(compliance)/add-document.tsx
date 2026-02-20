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
import { useCreateDocument } from '@/hooks/mutations/useCrudMutations';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';

const DOCUMENT_TYPES = [
  { label: 'Contractor License', value: 'CONTRACTOR_LICENSE' },
  { label: 'General Liability', value: 'GENERAL_LIABILITY' },
  { label: "Workers' Comp", value: 'WORKERS_COMP' },
  { label: 'Auto Insurance', value: 'AUTO_INSURANCE' },
  { label: 'Umbrella Policy', value: 'UMBRELLA_POLICY' },
  { label: 'Bond', value: 'BOND' },
  { label: 'Business License', value: 'BUSINESS_LICENSE' },
  { label: 'Other', value: 'OTHER' },
] as const;

export default function AddDocumentScreen() {
  const router = useRouter();
  const createMutation = useCreateDocument();
  const { colors } = useTheme();

  const [documentType, setDocumentType] = useState('CONTRACTOR_LICENSE');
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [stateField, setStateField] = useState('WV');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showExpPicker, setShowExpPicker] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Document name is required.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        documentType,
        name: name.trim(),
        licenseNumber: licenseNumber.trim() || undefined,
        issuingAuthority: issuingAuthority.trim() || undefined,
        state: stateField.trim() || undefined,
        expirationDate: expirationDate ? format(expirationDate, 'yyyy-MM-dd') : undefined,
      });
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create document.');
    }
  };

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Add Document' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Document Type */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Document Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {DOCUMENT_TYPES.map((dt) => (
                <Pressable
                  key={dt.value}
                  onPress={() => setDocumentType(dt.value)}
                  style={[
                    styles.chip,
                    documentType === dt.value
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                  ]}
                >
                  <Text
                    style={[styles.chipText, { color: documentType === dt.value ? '#fff' : colors.textSecondary }]}
                  >
                    {dt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Input label="Document Name *" placeholder="e.g. WV Contractor License" value={name} onChangeText={setName} />
          <Input label="License / Policy Number" placeholder="e.g. WV-2026-1234" value={licenseNumber} onChangeText={setLicenseNumber} />
          <Input label="Issuing Authority" placeholder="e.g. WV Division of Labor" value={issuingAuthority} onChangeText={setIssuingAuthority} />
          <Input label="State" placeholder="WV" value={stateField} onChangeText={setStateField} />

          {/* Expiration Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Expiration Date</Text>
            <Pressable
              onPress={() => setShowExpPicker(true)}
              style={[styles.dateButton, { backgroundColor: colors.surface }, shadows.sm]}
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
                onChange={(_e, date) => {
                  setShowExpPicker(false);
                  if (date) setExpirationDate(date);
                }}
              />
            )}
          </View>

          <Button
            title="Add Document"
            onPress={handleCreate}
            loading={createMutation.isPending}
            disabled={createMutation.isPending || !name.trim()}
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
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  chipRow: { gap: 8, paddingVertical: 4, flexWrap: 'nowrap' },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  dateButton: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48 },
  dateText: { fontSize: 16 },
});
