import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateCommunication } from '@/hooks/mutations/useCommunicationMutations';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';
import type { CommunicationType, CommunicationUrgency } from '@/api/endpoints/communications';

const TYPES: { key: CommunicationType; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
  { key: 'EMAIL', icon: 'mail-outline', label: 'Email' },
  { key: 'TEXT', icon: 'chatbubble-outline', label: 'Text' },
  { key: 'CALL', icon: 'call-outline', label: 'Call' },
  { key: 'RFI', icon: 'help-circle-outline', label: 'RFI' },
  { key: 'CHANGE_ORDER', icon: 'swap-horizontal-outline', label: 'Change Order' },
];

const URGENCY_OPTIONS: { key: CommunicationUrgency; label: string }[] = [
  { key: 'LOW', label: 'Low' },
  { key: 'NORMAL', label: 'Normal' },
  { key: 'HIGH', label: 'High' },
];

export default function NewCommunicationScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const createMutation = useCreateCommunication(projectId);

  const [type, setType] = useState<CommunicationType>('EMAIL');
  const [recipient, setRecipient] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [urgency, setUrgency] = useState<CommunicationUrgency>('NORMAL');
  const [context, setContext] = useState('');

  const showEmailField = ['EMAIL', 'RFI', 'CHANGE_ORDER'].includes(type);
  const showPhoneField = ['TEXT', 'CALL'].includes(type);

  const handleSubmit = () => {
    if (!recipient.trim() || !subject.trim()) {
      Alert.alert('Missing Fields', 'Recipient and subject are required.');
      return;
    }

    createMutation.mutate(
      {
        type,
        recipient: recipient.trim(),
        recipientEmail: recipientEmail.trim() || undefined,
        recipientPhone: recipientPhone.trim() || undefined,
        subject: subject.trim(),
        urgency,
        context: context.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          router.replace(`/(tabs)/(projects)/${projectId}/communications/${data.id}` as any);
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'New Communication' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Type Picker */}
        <Text style={[styles.label, { color: colors.text }]}>Type</Text>
        <View style={styles.chipRow}>
          {TYPES.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setType(t.key)}
              style={[
                styles.chip,
                type === t.key
                  ? { backgroundColor: colors.primary }
                  : [shadows.sm, { backgroundColor: colors.surface }],
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={t.icon} size={16} color={type === t.key ? '#fff' : colors.text} />
                <Text style={{ color: type === t.key ? '#fff' : colors.text, fontSize: 13, fontWeight: '600' }}>
                  {t.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Recipient */}
        <Text style={[styles.label, { color: colors.text }]}>Recipient *</Text>
        <Input placeholder="Who is this for?" value={recipient} onChangeText={setRecipient} />

        {showEmailField && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <Input placeholder="Email address" value={recipientEmail} onChangeText={setRecipientEmail} keyboardType="email-address" />
          </>
        )}

        {showPhoneField && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
            <Input placeholder="Phone number" value={recipientPhone} onChangeText={setRecipientPhone} keyboardType="phone-pad" />
          </>
        )}

        {/* Subject */}
        <Text style={[styles.label, { color: colors.text }]}>Subject *</Text>
        <Input placeholder="What's this about?" value={subject} onChangeText={setSubject} />

        {/* Urgency */}
        <Text style={[styles.label, { color: colors.text }]}>Urgency</Text>
        <View style={styles.chipRow}>
          {URGENCY_OPTIONS.map((u) => (
            <Pressable
              key={u.key}
              onPress={() => setUrgency(u.key)}
              style={[
                styles.chip,
                urgency === u.key
                  ? { backgroundColor: colors.primary }
                  : [shadows.sm, { backgroundColor: colors.surface }],
              ]}
            >
              <Text style={{ color: urgency === u.key ? '#fff' : colors.text, fontSize: 13 }}>
                {u.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Context */}
        <Text style={[styles.label, { color: colors.text }]}>Context</Text>
        <Input
          placeholder="What's this about? (helps the AI draft better)"
          value={context}
          onChangeText={setContext}
          multiline
          numberOfLines={4}
          style={{ minHeight: 80 }}
        />

        <View style={{ height: 16 }} />
        <Button title="Draft with AI" onPress={handleSubmit} loading={createMutation.isPending} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center' as const },
});
