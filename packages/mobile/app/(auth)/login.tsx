import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLogin } from '@/hooks/mutations/useLogin';
import { useTheme } from '@/hooks/useTheme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate: login, isPending, error } = useLogin();
  const { colors } = useTheme();

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) return;
    login({ email: email.trim(), password });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>XO Companion</Text>
          <Text style={styles.subtitle}>Construction operations assistant</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@company.com"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
          </View>

          {error && (
            <Text style={[styles.error, { color: colors.error }]}>
              Invalid email or password. Please try again.
            </Text>
          )}

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }, isPending && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1B4B',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#C4B5FD',
    marginTop: 8,
    fontWeight: '500',
  },
  form: {
    gap: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C4B5FD',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#312E81',
    borderWidth: 1.5,
    borderColor: '#4338CA',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 52,
  },
  error: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
});
