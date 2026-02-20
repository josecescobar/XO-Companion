import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Switch, Alert, StyleSheet } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EnumPicker } from '@/components/ui/EnumPicker';
import { useTheme } from '@/hooks/useTheme';
import { useEntryMutation } from '@/hooks/mutations/useEntryMutation';
import type { EntityType } from '@/api/endpoints/daily-logs';

// Enum option definitions
const WEATHER_CONDITIONS = [
  { label: 'Clear', value: 'CLEAR' }, { label: 'Partly Cloudy', value: 'PARTLY_CLOUDY' },
  { label: 'Overcast', value: 'OVERCAST' }, { label: 'Rain', value: 'RAIN' },
  { label: 'Heavy Rain', value: 'HEAVY_RAIN' }, { label: 'Snow', value: 'SNOW' },
  { label: 'Sleet', value: 'SLEET' }, { label: 'Fog', value: 'FOG' },
  { label: 'Wind', value: 'WIND' }, { label: 'Thunderstorm', value: 'THUNDERSTORM' },
  { label: 'Extreme Heat', value: 'EXTREME_HEAT' }, { label: 'Extreme Cold', value: 'EXTREME_COLD' },
];

const EQUIPMENT_CONDITIONS = [
  { label: 'Operational', value: 'OPERATIONAL' }, { label: 'Needs Maintenance', value: 'NEEDS_MAINTENANCE' },
  { label: 'Down for Repair', value: 'DOWN_FOR_REPAIR' }, { label: 'Idle', value: 'IDLE' },
];

const MATERIAL_CONDITIONS = [
  { label: 'Good', value: 'GOOD' }, { label: 'Damaged', value: 'DAMAGED' },
  { label: 'Partial Delivery', value: 'PARTIAL_DELIVERY' }, { label: 'Rejected', value: 'REJECTED' },
];

const DELAY_CAUSES = [
  { label: 'Weather', value: 'WEATHER' }, { label: 'Material Shortage', value: 'MATERIAL_SHORTAGE' },
  { label: 'Equipment Failure', value: 'EQUIPMENT_FAILURE' }, { label: 'Labor Shortage', value: 'LABOR_SHORTAGE' },
  { label: 'Design Change', value: 'DESIGN_CHANGE' }, { label: 'Owner Directed', value: 'OWNER_DIRECTED' },
  { label: 'Permit Issue', value: 'PERMIT_ISSUE' }, { label: 'Inspection Hold', value: 'INSPECTION_HOLD' },
  { label: 'Utility Conflict', value: 'UTILITY_CONFLICT' }, { label: 'Subcontractor', value: 'SUBCONTRACTOR' },
  { label: 'Safety Stop', value: 'SAFETY_STOP' }, { label: 'Other', value: 'OTHER' },
];

// Field definitions per entity type
interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'enum' | 'multiEnum' | 'boolean' | 'tags';
  required?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

const FIELD_DEFS: Record<string, FieldDef[]> = {
  workforce: [
    { key: 'trade', label: 'Trade', type: 'text', required: true, placeholder: 'e.g. Electrician' },
    { key: 'company', label: 'Company', type: 'text', required: true, placeholder: 'Company name' },
    { key: 'workerCount', label: 'Worker Count', type: 'number', required: true },
    { key: 'hoursWorked', label: 'Hours Worked', type: 'number', required: true },
    { key: 'overtimeHours', label: 'Overtime Hours', type: 'number' },
    { key: 'foreman', label: 'Foreman', type: 'text', placeholder: 'Foreman name' },
  ],
  equipment: [
    { key: 'equipmentType', label: 'Equipment Type', type: 'text', required: true, placeholder: 'e.g. Excavator' },
    { key: 'operatingHours', label: 'Operating Hours', type: 'number', required: true },
    { key: 'idleHours', label: 'Idle Hours', type: 'number' },
    { key: 'condition', label: 'Condition', type: 'enum', required: true, options: EQUIPMENT_CONDITIONS },
    { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Optional notes' },
  ],
  workCompleted: [
    { key: 'location', label: 'Location', type: 'text', required: true, placeholder: 'e.g. Building A, 2nd Floor' },
    { key: 'description', label: 'Description', type: 'text', required: true, placeholder: 'Work description' },
    { key: 'percentComplete', label: 'Percent Complete', type: 'number' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. sq ft, linear ft' },
    { key: 'csiCode', label: 'CSI Code', type: 'text', placeholder: 'Optional CSI code' },
  ],
  materials: [
    { key: 'material', label: 'Material', type: 'text', required: true, placeholder: 'e.g. Concrete, Rebar' },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    { key: 'unit', label: 'Unit', type: 'text', required: true, placeholder: 'e.g. cu yd, tons' },
    { key: 'supplier', label: 'Supplier', type: 'text', placeholder: 'Supplier name' },
    { key: 'ticketNumber', label: 'Ticket Number', type: 'text', placeholder: 'Delivery ticket #' },
    { key: 'condition', label: 'Condition', type: 'enum', options: MATERIAL_CONDITIONS },
  ],
  delays: [
    { key: 'cause', label: 'Cause', type: 'enum', required: true, options: DELAY_CAUSES },
    { key: 'description', label: 'Description', type: 'text', required: true, placeholder: 'Delay description' },
    { key: 'durationMinutes', label: 'Duration (minutes)', type: 'number', required: true },
    { key: 'impactedTrades', label: 'Impacted Trades', type: 'tags', placeholder: 'e.g. Plumber, Electrician' },
  ],
  weather: [
    { key: 'conditions', label: 'Conditions', type: 'multiEnum', required: true, options: WEATHER_CONDITIONS },
    { key: 'tempHigh', label: 'High Temp (\u00b0F)', type: 'number' },
    { key: 'tempLow', label: 'Low Temp (\u00b0F)', type: 'number' },
    { key: 'windSpeed', label: 'Wind Speed (mph)', type: 'number' },
    { key: 'humidity', label: 'Humidity (%)', type: 'number' },
    { key: 'delayMinutes', label: 'Weather Delay (min)', type: 'number' },
  ],
  safety: [
    { key: 'toolboxTalks', label: 'Toolbox Talks', type: 'tags', placeholder: 'Topics discussed' },
    { key: 'incidents', label: 'Incidents', type: 'tags', placeholder: 'Incident descriptions' },
    { key: 'oshaRecordable', label: 'OSHA Recordable', type: 'boolean' },
    { key: 'nearMisses', label: 'Near Misses', type: 'number' },
    { key: 'firstAidCases', label: 'First Aid Cases', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Safety notes' },
  ],
};

interface EntryEditModalProps {
  visible: boolean;
  entityType: EntityType;
  entry?: Record<string, unknown> | null; // null = creating new
  projectId: string;
  logId: string;
  onClose: () => void;
}

export function EntryEditModal({ visible, entityType, entry, projectId, logId, onClose }: EntryEditModalProps) {
  const { colors } = useTheme();
  const fields = FIELD_DEFS[entityType] ?? [];
  const isNew = !entry;
  const isSingleton = entityType === 'weather' || entityType === 'safety';

  const createMutation = useEntryMutation(entityType, isNew ? (isSingleton ? 'upsert' : 'create') : (isSingleton ? 'upsert' : 'update'));
  const deleteMutation = useEntryMutation(entityType, 'delete');

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [pickerField, setPickerField] = useState<FieldDef | null>(null);

  useEffect(() => {
    if (visible) {
      const initial: Record<string, unknown> = {};
      fields.forEach((f) => {
        if (entry && entry[f.key] !== undefined) {
          initial[f.key] = entry[f.key];
        } else if (f.type === 'boolean') {
          initial[f.key] = false;
        } else if (f.type === 'tags' || f.type === 'multiEnum') {
          initial[f.key] = [];
        } else {
          initial[f.key] = '';
        }
      });
      setFormData(initial);
    }
  }, [visible, entry]);

  const setField = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    // Validate required fields
    for (const f of fields) {
      if (f.required) {
        const val = formData[f.key];
        if (val === '' || val === undefined || val === null || (Array.isArray(val) && val.length === 0)) {
          Alert.alert('Missing Field', `${f.label} is required.`);
          return;
        }
      }
    }

    // Build the body - convert number strings to actual numbers
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const val = formData[f.key];
      if (f.type === 'number' && val !== '' && val !== undefined) {
        body[f.key] = Number(val);
      } else if (val !== '' && val !== undefined) {
        body[f.key] = val;
      }
    }

    try {
      await createMutation.mutateAsync({
        projectId,
        logId,
        entryId: entry?.id as string | undefined,
        body,
      });
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({
              projectId,
              logId,
              entryId: entry?.id as string,
            });
            onClose();
          } catch {
            Alert.alert('Error', 'Failed to delete. Please try again.');
          }
        },
      },
    ]);
  };

  const formatEntityTitle = (type: string) => {
    return type.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, (c) => c.toUpperCase());
  };

  const renderField = (field: FieldDef) => {
    const value = formData[field.key];

    switch (field.type) {
      case 'text':
        return (
          <View key={field.key} style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {field.label}{field.required ? ' *' : ''}
            </Text>
            <Input
              value={String(value ?? '')}
              onChangeText={(v) => setField(field.key, v)}
              placeholder={field.placeholder}
            />
          </View>
        );

      case 'number':
        return (
          <View key={field.key} style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {field.label}{field.required ? ' *' : ''}
            </Text>
            <Input
              value={String(value ?? '')}
              onChangeText={(v) => setField(field.key, v)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        );

      case 'enum':
        return (
          <View key={field.key} style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {field.label}{field.required ? ' *' : ''}
            </Text>
            <Pressable
              onPress={() => setPickerField(field)}
              style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.pickerText, { color: value ? colors.text : colors.textTertiary }]}>
                {value ? field.options?.find((o) => o.value === value)?.label ?? String(value) : 'Select...'}
              </Text>
            </Pressable>
          </View>
        );

      case 'multiEnum':
        return (
          <View key={field.key} style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {field.label}{field.required ? ' *' : ''}
            </Text>
            <Pressable
              onPress={() => setPickerField(field)}
              style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.pickerText, { color: (value as string[])?.length ? colors.text : colors.textTertiary }]}>
                {(value as string[])?.length
                  ? (value as string[]).map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(', ')
                  : 'Select...'}
              </Text>
            </Pressable>
          </View>
        );

      case 'boolean':
        return (
          <View key={field.key} style={[styles.fieldGroup, styles.switchRow]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{field.label}</Text>
            <Switch
              value={Boolean(value)}
              onValueChange={(v) => setField(field.key, v)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        );

      case 'tags':
        return (
          <View key={field.key} style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{field.label}</Text>
            <Input
              value={Array.isArray(value) ? (value as string[]).join(', ') : String(value ?? '')}
              onChangeText={(v) => setField(field.key, v.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder={field.placeholder ?? 'Comma-separated values'}
            />
          </View>
        );

      default:
        return null;
    }
  };

  const isSaving = createMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                {isNew ? 'Add' : 'Edit'} {formatEntityTitle(entityType)}
              </Text>
              <Pressable onPress={onClose}>
                <Text style={[styles.closeBtn, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              {fields.map(renderField)}
              <View style={styles.actions}>
                <Button
                  title={isNew ? 'Add Entry' : 'Save Changes'}
                  onPress={handleSave}
                  loading={createMutation.isPending}
                  disabled={isSaving}
                />
                {!isNew && !isSingleton && (
                  <Pressable
                    onPress={handleDelete}
                    disabled={isSaving}
                    style={[styles.deleteBtn, { borderColor: colors.error }]}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.error }]}>Delete Entry</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {pickerField && (
        <EnumPicker
          visible={!!pickerField}
          title={pickerField.label}
          options={pickerField.options ?? []}
          selected={formData[pickerField.key] as string | string[]}
          onSelect={(val) => setField(pickerField.key, val)}
          onClose={() => setPickerField(null)}
          multiSelect={pickerField.type === 'multiEnum'}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800' },
  closeBtn: { fontSize: 16, fontWeight: '600' },
  form: { flexGrow: 0 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 },
  pickerButton: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, minHeight: 48, justifyContent: 'center' },
  pickerText: { fontSize: 16 },
  actions: { gap: 12, marginTop: 8, marginBottom: 16 },
  deleteBtn: { borderRadius: 10, borderWidth: 1, paddingVertical: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  deleteBtnText: { fontSize: 16, fontWeight: '700' },
});
