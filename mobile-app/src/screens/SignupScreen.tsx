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
    Alert,
    ScrollView
} from 'react-native';
import { Mail, Lock, User, Phone, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Radius } from '../theme/theme';

import { API_URL } from '../api/config';

export default function SignupScreen() {
    const navigation = useNavigation<any>();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async () => {
        if (!fullName || !email || !phone || !password) {
            setError('Please fill in all fields');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: fullName.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    password: password.trim()
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Signup failed');
            }

            Alert.alert(
                'Registration Successful',
                'Your account has been created. Please wait for an admin to approve your account before signing in.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        } catch (err: any) {
            const errorMessage = err.message === 'Network request failed'
                ? 'Network Error: Ensure backend is running and you are on the same Wi-Fi as your PC.'
                : err.message || 'Something went wrong.';
            setError(errorMessage);
            Alert.alert('Signup Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={Colors.text} />
                </TouchableOpacity>

                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Sign up to get started</Text>
                    </View>

                    {error ? (
                        <View style={styles.errorContainer}>
                            <AlertCircle size={16} color={Colors.danger} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Full Name"
                                value={fullName}
                                onChangeText={setFullName}
                                placeholderTextColor={Colors.textSecondary}
                            />
                        </View>

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
                            <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
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
                            onPress={handleSignup}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <Text style={styles.buttonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginLink}
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={styles.loginLinkText}>
                                Already have an account? <Text style={styles.loginLinkHighlight}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: Spacing.m,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 1,
        padding: Spacing.s,
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
        marginTop: 40,
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
    loginLink: {
        alignItems: 'center',
        marginTop: Spacing.m,
    },
    loginLinkText: {
        fontSize: 15,
        color: Colors.textSecondary,
    },
    loginLinkHighlight: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
});
