import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Mail, Lock, AlertCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, Radius } from '../theme/theme';
import { API_URL } from '../api/config';

export default function LoginScreen() {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const trimmedEmail = email.trim();
            const trimmedPassword = password.trim();

            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            await login(data.access_token, data.user);
        } catch (err: any) {
            const errorMessage = err.message === 'Network request failed'
                ? 'Network Error: Ensure backend is running and you are on the same Wi-Fi as your PC.'
                : err.message || 'Something went wrong.';
            setError(errorMessage);
            Alert.alert('Login Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue</Text>
                </View>

                {error ? (
                    <View style={styles.errorContainer}>
                        <AlertCircle size={16} color={Colors.danger} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Mail size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor={Colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor={Colors.textSecondary}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.signupLink}
                        onPress={() => navigation.navigate('Signup')}
                    >
                        <Text style={styles.signupLinkText}>
                            Don't have an account? <Text style={styles.signupLinkHighlight}>Sign Up</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        padding: Spacing.m,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: Radius.l,
        padding: Spacing.xl,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    form: {
        gap: Spacing.m,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: Radius.m,
        paddingHorizontal: Spacing.m,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inputIcon: {
        marginRight: Spacing.s,
    },
    input: {
        flex: 1,
        height: 50,
        color: Colors.text,
        fontSize: 16,
    },
    button: {
        backgroundColor: Colors.primary,
        height: 55,
        borderRadius: Radius.m,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.m,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        padding: Spacing.m,
        borderRadius: Radius.m,
        marginBottom: Spacing.m,
        gap: Spacing.s,
    },
    errorText: {
        color: Colors.danger,
        fontSize: 14,
        flex: 1,
    },
    signupLink: {
        alignItems: 'center',
        marginTop: Spacing.m,
    },
    signupLinkText: {
        fontSize: 15,
        color: Colors.textSecondary,
    },
    signupLinkHighlight: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
});
