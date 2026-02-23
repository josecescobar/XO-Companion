import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { register } from '@/api/endpoints/auth';
import { useTheme } from '@/hooks/useTheme';

export default function RegisterScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { mutate: submitRegister, isPending, error } = useMutation({
        mutationFn: () =>
            register({
                email: email.trim(),
                password,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                role: 'FIELD_WORKER',
            }),
        onSuccess: () => {
            Alert.alert('Account Created', 'You can now sign in with your credentials.', [
                { text: 'OK', onPress: () => router.replace('/(auth)/login') },
            ]);
        },
    });

    const handleRegister = () => {
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) return;
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters.');
            return;
        }
        submitRegister();
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.inner}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join your construction team</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.nameRow}>
                        <View style={styles.nameField}>
                            <Text style={styles.label}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="First"
                                placeholderTextColor="#64748b"
                                value={firstName}
                                onChangeText={setFirstName}
                                autoCapitalize="words"
                                returnKeyType="next"
                            />
                        </View>
                        <View style={styles.nameField}>
                            <Text style={styles.label}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Last"
                                placeholderTextColor="#64748b"
                                value={lastName}
                                onChangeText={setLastName}
                                autoCapitalize="words"
                                returnKeyType="next"
                            />
                        </View>
                    </View>

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
                            placeholder="Minimum 8 characters"
                            placeholderTextColor="#64748b"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            returnKeyType="next"
                        />
                    </View>

                    <View>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Re-enter password"
                            placeholderTextColor="#64748b"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            returnKeyType="go"
                            onSubmitEditing={handleRegister}
                        />
                    </View>

                    {error && (
                        <Text style={[styles.error, { color: colors.error }]}>
                            Registration failed. The email may already be in use.
                        </Text>
                    )}

                    <Pressable
                        style={[styles.button, { backgroundColor: colors.primary }, isPending && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Create Account</Text>
                        )}
                    </Pressable>

                    <Pressable onPress={() => router.replace('/(auth)/login')}>
                        <Text style={styles.link}>
                            Already have an account? <Text style={styles.linkBold}>Sign In</Text>
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1E1B4B',
    },
    inner: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
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
    nameRow: {
        flexDirection: 'row',
        gap: 12,
    },
    nameField: {
        flex: 1,
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
    link: {
        color: '#C4B5FD',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 8,
    },
    linkBold: {
        fontWeight: '700',
        color: '#ffffff',
    },
});
