import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLogin } from '@/hooks/mutations/useLogin';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate: login, isPending, error } = useLogin();

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) return;
    login({ email: email.trim(), password });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
        {/* Header */}
        <View className="mb-12 items-center">
          <Text className="text-field-2xl font-bold text-white">
            XO Companion
          </Text>
          <Text className="mt-2 text-field-base text-brand-300">
            Construction operations assistant
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <View>
            <Text className="mb-1 text-field-sm font-medium text-brand-200">
              Email
            </Text>
            <TextInput
              className="rounded-lg border border-brand-700 bg-brand-800 px-4 py-3 text-field-base text-white"
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
            <Text className="mb-1 text-field-sm font-medium text-brand-200">
              Password
            </Text>
            <TextInput
              className="rounded-lg border border-brand-700 bg-brand-800 px-4 py-3 text-field-base text-white"
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
            <Text className="text-field-sm text-safety-red">
              Invalid email or password. Please try again.
            </Text>
          )}

          <Pressable
            className="mt-4 items-center rounded-lg bg-brand-500 py-4"
            onPress={handleLogin}
            disabled={isPending}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            {isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-field-lg font-bold text-white">
                Sign In
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
