import { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useProject } from '@/hooks/queries/useProjects';
import { askXO } from '@/api/endpoints/askxo';
import { useTheme } from '@/hooks/useTheme';
import type { AskXOSource } from '@/api/endpoints/askxo';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AskXOSource[];
  timestamp: Date;
}

const EXAMPLE_PROMPTS = [
  'What work was completed last week?',
  'What did we decide about the foundation?',
  'What does the spec say about concrete strength?',
  'Are there any open RFIs?',
  'Summarize today\'s safety incidents',
];

function formatSourceType(type: string): string {
  switch (type) {
    case 'DAILY_LOG_SUMMARY':
      return 'Daily Log';
    case 'VOICE_TRANSCRIPT':
      return 'Voice Note';
    case 'DOCUMENT':
      return 'Document';
    default:
      return type;
  }
}

export default function AskXOScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(
    new Set(),
  );

  const handleSend = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const response = await askXO(projectId, question, history);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.answer,
          sources: response.sources,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            "Sorry, I couldn't process that question. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setExpandedSources(new Set());
  };

  const toggleSources = (messageId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userMessageRow}>
          <View
            style={[
              styles.userBubble,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.userBubbleText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    const sourcesExpanded = expandedSources.has(item.id);

    return (
      <View style={styles.assistantMessageRow}>
        <View
          style={[
            styles.assistantBubble,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.assistantText, { color: colors.text }]}>
            {item.content}
          </Text>

          {item.sources && item.sources.length > 0 && (
            <View style={styles.sourcesSection}>
              <Pressable
                onPress={() => toggleSources(item.id)}
                style={styles.sourcesToggle}
              >
                <Text
                  style={[styles.sourcesToggleText, { color: colors.primary }]}
                >
                  {sourcesExpanded
                    ? 'Hide sources'
                    : `${item.sources.length} sources`}
                </Text>
              </Pressable>
              {sourcesExpanded &&
                item.sources.map((source, idx) => (
                  <View
                    key={`${item.id}-source-${idx}`}
                    style={[
                      styles.sourceCard,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <View style={styles.sourceHeader}>
                      <Text
                        style={[
                          styles.sourceType,
                          { color: colors.primary },
                        ]}
                      >
                        {formatSourceType(source.sourceType)}
                      </Text>
                      {source.sourceDate && (
                        <Text
                          style={[
                            styles.sourceDate,
                            { color: colors.textTertiary },
                          ]}
                        >
                          {new Date(source.sourceDate).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.sourceContent,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={3}
                    >
                      {source.content}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: 'Ask XO',
          headerRight: () =>
            messages.length > 0 ? (
              <Pressable onPress={handleClear} style={styles.clearButton}>
                <Text style={[styles.clearText, { color: colors.error }]}>
                  Clear
                </Text>
              </Pressable>
            ) : null,
        }}
      />

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🤖</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Ask XO
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {project
              ? `Search documents, logs, and history for ${project.name}`
              : 'Ask about this project'}
          </Text>

          <View style={styles.examplePrompts}>
            {EXAMPLE_PROMPTS.map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => handleSend(prompt)}
                style={[
                  styles.exampleChip,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.exampleText, { color: colors.primary }]}
                >
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[styles.typingText, { color: colors.textSecondary }]}
                >
                  XO is thinking...
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Input Area */}
      <View
        style={[
          styles.inputArea,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Ask about this project..."
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          editable={!loading}
          onSubmitEditing={() => handleSend()}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                input.trim() && !loading ? colors.primary : colors.border,
            },
          ]}
        >
          <Text style={styles.sendButtonText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  clearButton: { marginRight: 8 },
  clearText: { fontSize: 15, fontWeight: '500' },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', marginBottom: 32 },
  examplePrompts: { gap: 10, width: '100%' },
  exampleChip: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  exampleText: { fontSize: 15, fontWeight: '500' },
  // Messages
  messageList: { padding: 16, paddingBottom: 8 },
  userMessageRow: { alignItems: 'flex-end', marginBottom: 12 },
  userBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  userBubbleText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  assistantMessageRow: { alignItems: 'flex-start', marginBottom: 12 },
  assistantBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '90%',
  },
  assistantText: { fontSize: 15, lineHeight: 22 },
  // Sources
  sourcesSection: { marginTop: 10 },
  sourcesToggle: { paddingVertical: 4 },
  sourcesToggleText: { fontSize: 13, fontWeight: '600' },
  sourceCard: {
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sourceType: { fontSize: 12, fontWeight: '600' },
  sourceDate: { fontSize: 12 },
  sourceContent: { fontSize: 13, lineHeight: 18 },
  // Typing indicator
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  typingText: { fontSize: 14 },
  // Input area
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
