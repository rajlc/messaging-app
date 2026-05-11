import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    SafeAreaView
} from 'react-native';
import { Colors, Spacing, Radius } from '../theme/theme';
import { User, Mail, Phone, Lock, Save, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/config';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Switch } from 'react-native';
import { PhoneCall, Settings } from 'lucide-react-native';

export default function ProfileScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { user, token, login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: user?.full_name || '',
        phone: user?.phone || '',
        password: '',
        confirmPassword: ''
    });
    const [isCallAssistantEnabled, setIsCallAssistantEnabled] = useState(false);

    const isAdminOrEditor = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'editor';

    useEffect(() => {
        if (isAdminOrEditor) {
            loadCallAssistantSetting();
        }
    }, [isAdminOrEditor]);

const loadCallAssistantSetting = async () => {
    try {
        const value = await AsyncStorage.getItem('call_assistant_enabled');
        if (value !== null) {
            setIsCallAssistantEnabled(JSON.parse(value));
        }
    } catch (error) {
        console.error('Failed to load call assistant setting', error);
    }
};

const toggleCallAssistant = async (value: boolean) => {
    try {
        setIsCallAssistantEnabled(value);
        await AsyncStorage.setItem('call_assistant_enabled', JSON.stringify(value));
        if (value) {
            // We'll trigger permission requests later when we implement the native side
            Alert.alert('Call Assistant', 'This feature will show a popup when you receive or make calls to help you create orders quickly.');
        }
    } catch (error) {
        console.error('Failed to save call assistant setting', error);
    }
};

const handleSave = async () => {
    if (!formData.fullName) {
        Alert.alert('Error', 'Full Name is required');
        return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
    }

    try {
        setLoading(true);
        const res = await axios.put(`${API_URL}/api/users/profile`, {
            fullName: formData.fullName,
            phone: formData.phone,
            ...(formData.password ? { password: formData.password } : {})
        }, {
            headers: { Authorization: `Bearer ${token || ''}` }
        });

        if (res.data && user && token) {
            // Update local auth context
            login(token, { ...user, full_name: formData.fullName, phone: formData.phone });
            Alert.alert('Success', 'Profile updated successfully');
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        }
    } catch (error: any) {
        console.error('Update profile failed', error);
        Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
        setLoading(false);
    }
};

return (
    <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Profile</Text>
            <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileHeader}>
                <View style={styles.avatarCircle}>
                    <User size={40} color={Colors.white} />
                </View>
                <Text style={styles.userName}>{user?.full_name}</Text>
                <Text style={styles.userRole}>{user?.role?.toUpperCase()}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={styles.inputWrapper}>
                        <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.fullName}
                            onChangeText={text => setFormData({ ...formData, fullName: text })}
                            placeholder="Enter full name"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.inputWrapper}>
                        <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.phone}
                            onChangeText={text => setFormData({ ...formData, phone: text })}
                            placeholder="Enter phone number"
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={[styles.inputWrapper, styles.disabledInput]}>
                        <Mail size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: Colors.textSecondary }]}
                            value={user?.email}
                            editable={false}
                        />
                    </View>
                    <Text style={styles.helperText}>Email cannot be changed</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Security</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.inputWrapper}>
                        <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.password}
                            onChangeText={text => setFormData({ ...formData, password: text })}
                            placeholder="Leave blank to keep current"
                            secureTextEntry
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <View style={styles.inputWrapper}>
                        <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.confirmPassword}
                            onChangeText={text => setFormData({ ...formData, confirmPassword: text })}
                            placeholder="Confirm new password"
                            secureTextEntry
                        />
                    </View>
                </View>
            </View>

            {isAdminOrEditor && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Settings</Text>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.settingIcon, { backgroundColor: Colors.primary + '15' }]}>
                                <PhoneCall size={20} color={Colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Call Assistant</Text>
                                <Text style={styles.settingDescription}>Show popup during calls to create orders</Text>
                            </View>
                        </View>
                        <Switch
                            trackColor={{ false: '#CBD5E1', true: Colors.primary + '40' }}
                            thumbColor={isCallAssistantEnabled ? Colors.primary : '#F1F5F9'}
                            onValueChange={toggleCallAssistant}
                            value={isCallAssistantEnabled}
                        />
                    </View>
                </View>
            )}

            <TouchableOpacity
                style={[styles.saveButton, loading && styles.disabledButton]}
                onPress={handleSave}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                    <>
                        <Save size={20} color={Colors.white} />
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    </SafeAreaView>
);
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.m,
        paddingBottom: Spacing.m,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
    backButton: { padding: 8 },
    scrollContent: { padding: Spacing.m },
    profileHeader: { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.m },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.s,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4
    },
    userName: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
    userRole: { fontSize: 14, color: Colors.primary, fontWeight: '600', marginTop: 4 },
    section: { marginBottom: Spacing.xl },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.m },
    inputGroup: { marginBottom: Spacing.m },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.m,
        paddingHorizontal: Spacing.m
    },
    inputIcon: { marginRight: Spacing.s },
    input: { flex: 1, height: 48, fontSize: 16, color: Colors.text },
    disabledInput: { backgroundColor: '#F8FAFC' },
    helperText: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
    saveButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: Radius.m,
        gap: 8,
        elevation: 2,
        marginBottom: Spacing.xl
    },
    disabledButton: { opacity: 0.7 },
    saveButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        padding: Spacing.m,
        borderRadius: Radius.m,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.text
    },
    settingDescription: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2
    }
});
