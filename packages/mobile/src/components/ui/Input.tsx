import { View, Text, TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View>
      {label && (
        <Text className="mb-1 text-field-sm font-medium text-field-muted">
          {label}
        </Text>
      )}
      <TextInput
        className={`rounded-lg border px-4 py-3 text-field-base text-field-text ${
          error ? 'border-safety-red' : 'border-field-border'
        } bg-field-card`}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error && (
        <Text className="mt-1 text-field-sm text-safety-red">{error}</Text>
      )}
    </View>
  );
}
