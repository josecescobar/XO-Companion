import { useState } from 'react';
import {
  View,
  Text,
  Platform,
  Alert,
  Switch,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateIncident } from '@/hooks/mutations/useCrudMutations';
import { useProjects } from '@/hooks/queries/useProjects';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';
import { MediaAttachmentBar } from '@/components/media/MediaAttachmentBar';
import { MediaPreviewModal } from '@/components/media/MediaPreviewModal';
import { uploadMedia } from '@/api/endpoints/media';
import type { MediaAsset } from '@/hooks/useMediaCapture';
import { Pressable } from 'react-native';

export default function CreateIncidentScreen() {
  const router = useRouter();
  const createMutation = useCreateIncident();
  const { data: projects } = useProjects();
  const { colors } = useTheme();

  const [employeeName, setEmployeeName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [natureOfInjury, setNatureOfInjury] = useState('');
  const [isRecordable, setIsRecordable] = useState(false);
  const [daysAway, setDaysAway] = useState('0');
  const [daysRestricted, setDaysRestricted] = useState('0');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [incidentDate, setIncidentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [mediaAttachments, setMediaAttachments] = useState<MediaAsset[]>([]);
  const [previewIndex, setPreviewIndex] = useState(-1);

  const [uploadingMedia, setUploadingMedia] = useState(false);

  const handleCreate = async () => {
    if (!employeeName.trim() || !description.trim()) {
      Alert.alert('Required', 'Employee name and description are required.');
      return;
    }

    try {
      const incident = await createMutation.mutateAsync({
        employeeName: employeeName.trim(),
        description: description.trim(),
        incidentDate: format(incidentDate, 'yyyy-MM-dd'),
        projectId: selectedProjectId ?? undefined,
        location: location.trim() || undefined,
        bodyPartAffected: bodyPart.trim() || undefined,
        natureOfInjury: natureOfInjury.trim() || undefined,
        isRecordable,
        daysAwayFromWork: parseInt(daysAway) || 0,
        daysRestrictedDuty: parseInt(daysRestricted) || 0,
        correctiveActions: correctiveActions.trim() || undefined,
      });

      // Upload attached media if project is selected
      if (mediaAttachments.length > 0 && selectedProjectId) {
        setUploadingMedia(true);
        for (const asset of mediaAttachments) {
          try {
            await uploadMedia(selectedProjectId, {
              uri: asset.uri,
              type: asset.type === 'photo' ? 'image/jpeg' : 'video/mp4',
              name: asset.fileName,
            }, {
              type: asset.type === 'photo' ? 'PHOTO' : 'VIDEO',
              incidentId: incident.id,
            });
          } catch { /* continue uploading remaining */ }
        }
        setUploadingMedia(false);
      }

      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to report incident.');
    }
  };

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Report Incident' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Input
            label="Employee Name *"
            placeholder="e.g. John Smith"
            value={employeeName}
            onChangeText={setEmployeeName}
          />

          {/* Incident Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Incident Date</Text>
            {Platform.OS === 'android' && (
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.dateButton, { backgroundColor: colors.surface }, shadows.sm]}
              >
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {format(incidentDate, 'MMM d, yyyy')}
                </Text>
              </Pressable>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={incidentDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_e, date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) setIncidentDate(date);
                }}
              />
            )}
          </View>

          {/* Project selector */}
          {projects && projects.length > 0 && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Project (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Pressable
                  onPress={() => setSelectedProjectId(null)}
                  style={[
                    styles.chip,
                    !selectedProjectId
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                  ]}
                >
                  <Text style={[styles.chipText, { color: !selectedProjectId ? '#fff' : colors.textSecondary }]}>
                    None
                  </Text>
                </Pressable>
                {projects.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelectedProjectId(p.id)}
                    style={[
                      styles.chip,
                      selectedProjectId === p.id
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[styles.chipText, { color: selectedProjectId === p.id ? '#fff' : colors.textSecondary }]}
                    >
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Input label="Location" placeholder="e.g. 2nd floor, south wing" value={location} onChangeText={setLocation} />

          <Input
            label="Description *"
            placeholder="Describe what happened..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ minHeight: 100 }}
          />

          {/* Photo/Video Evidence */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Photo/Video Evidence</Text>
            <MediaAttachmentBar
              attachments={mediaAttachments}
              onAdd={(asset) => setMediaAttachments((prev) => [...prev, asset])}
              onRemove={(i) => setMediaAttachments((prev) => prev.filter((_, idx) => idx !== i))}
              onPreview={(i) => setPreviewIndex(i)}
            />
          </View>

          <Input label="Body Part Affected" placeholder="e.g. Left hand" value={bodyPart} onChangeText={setBodyPart} />
          <Input label="Nature of Injury" placeholder="e.g. Laceration" value={natureOfInjury} onChangeText={setNatureOfInjury} />

          {/* OSHA Recordable */}
          <View style={[styles.switchRow, { backgroundColor: colors.surface }, shadows.md]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>OSHA Recordable</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                Required if death, days away, restricted duty, transfer, or medical treatment beyond first aid
              </Text>
            </View>
            <Switch
              value={isRecordable}
              onValueChange={setIsRecordable}
              trackColor={{ true: colors.primary }}
            />
          </View>

          {isRecordable && (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Days Away From Work"
                  value={daysAway}
                  onChangeText={setDaysAway}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Days Restricted Duty"
                  value={daysRestricted}
                  onChangeText={setDaysRestricted}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          <Input
            label="Corrective Actions"
            placeholder="Actions taken to prevent recurrence..."
            value={correctiveActions}
            onChangeText={setCorrectiveActions}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80 }}
          />

          <Button
            title={uploadingMedia ? 'Uploading media...' : 'Submit Incident Report'}
            onPress={handleCreate}
            loading={createMutation.isPending || uploadingMedia}
            disabled={createMutation.isPending || uploadingMedia || !employeeName.trim() || !description.trim()}
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <MediaPreviewModal
        visible={previewIndex >= 0}
        items={mediaAttachments}
        initialIndex={Math.max(0, previewIndex)}
        onClose={() => setPreviewIndex(-1)}
        onDelete={(i) => {
          setMediaAttachments((prev) => prev.filter((_, idx) => idx !== i));
          if (mediaAttachments.length <= 1) setPreviewIndex(-1);
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  field: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  dateButton: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48 },
  dateText: { fontSize: 16 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
  },
  switchLabel: { fontSize: 16, fontWeight: '700' },
  switchSub: { fontSize: 12, marginTop: 4 },
});
