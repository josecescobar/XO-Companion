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
import { useCreateProject } from '@/hooks/mutations/useCrudMutations';
import { useTheme } from '@/hooks/useTheme';

const CONTRACT_TYPES = ['FIXED_PRICE', 'TIME_AND_MATERIALS', 'COST_PLUS', 'UNIT_PRICE', 'GMP'] as const;

export default function CreateProjectScreen() {
  const router = useRouter();
  const createMutation = useCreateProject();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('WV');
  const [clientName, setClientName] = useState('');
  const [contractType, setContractType] = useState<string>('FIXED_PRICE');
  const [contractValue, setContractValue] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(Platform.OS === 'ios');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Project name is required.');
      return;
    }

    try {
      const project = await createMutation.mutateAsync({
        name: name.trim(),
        code: code.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        clientName: clientName.trim() || undefined,
        contractType: contractType || undefined,
        contractValue: contractValue ? parseFloat(contractValue) : undefined,
        startDate: format(startDate, 'yyyy-MM-dd'),
        estimatedEndDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      });
      router.replace(`/(tabs)/(projects)/${project.id}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create project.');
    }
  };

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'New Project' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Input
            label="Project Name *"
            placeholder="e.g. Riverside Medical Center"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="Project Code"
            placeholder="e.g. REC-2026-001"
            value={code}
            onChangeText={setCode}
          />
          <Input
            label="Client Name"
            placeholder="e.g. Riverside Health Group"
            value={clientName}
            onChangeText={setClientName}
          />

          {/* Contract Type */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Contract Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {CONTRACT_TYPES.map((ct) => (
                <Pressable
                  key={ct}
                  onPress={() => setContractType(ct)}
                  style={[
                    styles.chip,
                    contractType === ct
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: contractType === ct ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {ct.replace(/_/g, ' ')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Input
            label="Contract Value ($)"
            placeholder="e.g. 750000"
            value={contractValue}
            onChangeText={setContractValue}
            keyboardType="numeric"
          />

          {/* Address */}
          <Input label="Address" placeholder="123 Main St" value={address} onChangeText={setAddress} />
          <View style={styles.row}>
            <View style={{ flex: 2 }}>
              <Input label="City" placeholder="Martinsburg" value={city} onChangeText={setCity} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="State" placeholder="WV" value={state} onChangeText={setState} />
            </View>
          </View>

          {/* Start Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Start Date</Text>
            {Platform.OS === 'android' && (
              <Pressable
                onPress={() => setShowStartPicker(true)}
                style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {format(startDate, 'MMM d, yyyy')}
                </Text>
              </Pressable>
            )}
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, date) => {
                  if (Platform.OS === 'android') setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}
          </View>

          {/* End Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Estimated End Date</Text>
            <Pressable
              onPress={() => setShowEndPicker(true)}
              style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.dateText, { color: endDate ? colors.text : colors.textTertiary }]}>
                {endDate ? format(endDate, 'MMM d, yyyy') : 'Not set'}
              </Text>
            </Pressable>
            {showEndPicker && (
              <DateTimePicker
                value={endDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={startDate}
                onChange={(_e, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}
          </View>

          <Button
            title="Create Project"
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
  label: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '500' },
  dateButton: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  dateText: { fontSize: 16 },
});
