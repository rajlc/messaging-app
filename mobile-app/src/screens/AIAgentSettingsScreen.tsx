import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Switch,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../theme/theme';
import { supabase } from '../api/supabase';
import { ArrowLeft, Save, Shield, Bot, Globe, Edit2, X, Check } from 'lucide-react-native';

interface Page {
    id: string;
    page_name: string;
    page_id: string;
    platform: string;
    is_active: boolean;
    is_ai_enabled: boolean;
    custom_prompt: string;
}

export default function AIAgentSettingsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();

    // Global Settings
    const [isGlobalEnabled, setIsGlobalEnabled] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [loadingGlobal, setLoadingGlobal] = useState(false);

    // Pages
    const [pages, setPages] = useState<Page[]>([]);
    const [loadingPages, setLoadingPages] = useState(true);

    // Edit Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [editAiEnabled, setEditAiEnabled] = useState(false);
    const [savingPage, setSavingPage] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchPages();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase.from('settings').select('*');
            if (error) throw error;

            const settingsMap = (data || []).reduce((acc: any, curr: any) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});

            setIsGlobalEnabled(settingsMap.is_ai_global_enabled === 'true');
            setApiKey(settingsMap.openai_api_key || '');
        } catch (error) {
            console.error('Error fetching settings:', error);
            Alert.alert('Error', 'Failed to load settings');
        }
    };

    const fetchPages = async () => {
        setLoadingPages(true);
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPages(data || []);
        } catch (error) {
            console.error('Failed to fetch pages:', error);
        } finally {
            setLoadingPages(false);
        }
    };

    const saveGlobalSettings = async () => {
        setLoadingGlobal(true);
        try {
            const updates = [
                { key: 'is_ai_global_enabled', value: String(isGlobalEnabled) },
                { key: 'openai_api_key', value: apiKey }
            ];

            const { error } = await supabase.from('settings').upsert(updates);

            if (error) throw error;
            Alert.alert('Success', 'Global settings saved');
        } catch (error) {
            console.error('Error saving settings:', error);
            Alert.alert('Error', 'Failed to save settings');
        } finally {
            setLoadingGlobal(false);
        }
    };

    const openEditModal = (page: Page) => {
        setEditingPage(page);
        setEditPrompt(page.custom_prompt || '');
        setEditAiEnabled(page.is_ai_enabled || false);
        setModalVisible(true);
    };

    const savePageSettings = async () => {
        if (!editingPage) return;
        setSavingPage(true);
        try {
            const { error } = await supabase
                .from('pages')
                .update({
                    is_ai_enabled: editAiEnabled,
                    custom_prompt: editPrompt
                })
                .eq('id', editingPage.id);

            if (error) throw error;

            // Update local state
            setPages(pages.map(p =>
                p.id === editingPage.id
                    ? { ...p, is_ai_enabled: editAiEnabled, custom_prompt: editPrompt }
                    : p
            ));

            setModalVisible(false);
            setEditingPage(null);
        } catch (error) {
            console.error('Error updating page:', error);
            Alert.alert('Error', 'Failed to update page');
        } finally {
            setSavingPage(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI Agent Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Global Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Global Configuration</Text>

                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Enable AI Agent</Text>
                                <Text style={styles.subLabel}>Master switch for all auto-replies</Text>
                            </View>
                            <Switch
                                value={isGlobalEnabled}
                                onValueChange={setIsGlobalEnabled}
                                trackColor={{ false: '#767577', true: Colors.primaryLite }}
                                thumbColor={isGlobalEnabled ? Colors.primary : '#f4f3f4'}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>OpenAI API Key</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    value={apiKey}
                                    onChangeText={setApiKey}
                                    placeholder="sk-..."
                                    secureTextEntry
                                    style={styles.input}
                                    placeholderTextColor={Colors.textSecondary}
                                />
                                <Shield size={16} color={Colors.textSecondary} style={styles.inputIcon} />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={saveGlobalSettings}
                            disabled={loadingGlobal}
                        >
                            {loadingGlobal ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <>
                                    <Save size={18} color={Colors.white} />
                                    <Text style={styles.saveButtonText}>Save Configuration</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Pages Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Connected Pages</Text>

                    {loadingPages ? (
                        <ActivityIndicator size="large" color={Colors.primary} />
                    ) : pages.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No pages connected</Text>
                        </View>
                    ) : (
                        pages.map(page => (
                            <View key={page.id} style={styles.pageCard}>
                                <View style={styles.pageHeader}>
                                    <View>
                                        <Text style={styles.pageName}>{page.page_name}</Text>
                                        <View style={styles.statusRow}>
                                            <View style={[styles.badge, { backgroundColor: page.is_ai_enabled ? '#E8F5E9' : '#FFEBEE' }]}>
                                                <Text style={[styles.badgeText, { color: page.is_ai_enabled ? 'green' : 'red' }]}>
                                                    {page.is_ai_enabled ? 'AI Active' : 'AI Paused'}
                                                </Text>
                                            </View>
                                            <Text style={styles.platformText}>{page.platform}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={() => openEditModal(page)}
                                    >
                                        <Edit2 size={20} color={Colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.promptPreview}>
                                    <Text style={styles.promptLabel}>SYSTEM PROMPT:</Text>
                                    <Text style={styles.promptText} numberOfLines={2}>
                                        {page.custom_prompt || "Using default system prompt..."}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Page Settings</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>{editingPage?.page_name}</Text>

                        <View style={styles.modalBody}>
                            <View style={[styles.row, { marginBottom: 20 }]}>
                                <Text style={styles.label}>Enable AI for Page</Text>
                                <Switch
                                    value={editAiEnabled}
                                    onValueChange={setEditAiEnabled}
                                    trackColor={{ false: '#767577', true: Colors.primaryLite }}
                                    thumbColor={editAiEnabled ? Colors.primary : '#f4f3f4'}
                                />
                            </View>

                            <Text style={[styles.label, { marginBottom: 8 }]}>Custom System Prompt</Text>
                            <TextInput
                                value={editPrompt}
                                onChangeText={setEditPrompt}
                                multiline
                                numberOfLines={6}
                                style={styles.textArea}
                                placeholder="Enter system instructions for AI..."
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonSave}
                                onPress={savePageSettings}
                                disabled={savingPage}
                            >
                                {savingPage ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text style={styles.modalButtonSaveText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.m,
        paddingBottom: Spacing.m,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    content: {
        padding: Spacing.m,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.s,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: Radius.m,
        padding: Spacing.m,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
    },
    subLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.m,
    },
    inputGroup: {
        marginBottom: Spacing.m,
    },
    inputWrapper: {
        marginTop: 8,
        position: 'relative',
    },
    input: {
        backgroundColor: Colors.background,
        borderRadius: Radius.s,
        padding: Spacing.s,
        paddingLeft: 36,
        borderWidth: 1,
        borderColor: Colors.border,
        color: Colors.text,
    },
    inputIcon: {
        position: 'absolute',
        left: 10,
        top: 12,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.m,
        borderRadius: Radius.s,
        gap: 8,
    },
    saveButtonText: {
        color: Colors.white,
        fontWeight: 'bold',
    },
    pageCard: {
        backgroundColor: Colors.white,
        borderRadius: Radius.m,
        padding: Spacing.m,
        marginBottom: Spacing.s,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.s,
    },
    pageName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    platformText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    editButton: {
        padding: 4,
    },
    promptPreview: {
        backgroundColor: Colors.background,
        padding: Spacing.s,
        borderRadius: Radius.s,
    },
    promptLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    promptText: {
        fontSize: 12,
        color: Colors.text,
        fontStyle: 'italic',
    },
    emptyContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.textSecondary,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: Radius.l,
        borderTopRightRadius: Radius.l,
        padding: Spacing.m,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.s,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    modalSubtitle: {
        fontSize: 14,
        color: Colors.primary,
        marginBottom: Spacing.l,
    },
    modalBody: {
        marginBottom: Spacing.l,
    },
    textArea: {
        backgroundColor: Colors.background,
        borderRadius: Radius.s,
        padding: Spacing.m,
        borderWidth: 1,
        borderColor: Colors.border,
        color: Colors.text,
        height: 150,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: Spacing.m,
    },
    modalButtonCancel: {
        flex: 1,
        padding: Spacing.m,
        borderRadius: Radius.s,
        backgroundColor: Colors.background,
        alignItems: 'center',
    },
    modalButtonCancelText: {
        color: Colors.text,
        fontWeight: 'bold',
    },
    modalButtonSave: {
        flex: 1,
        padding: Spacing.m,
        borderRadius: Radius.s,
        backgroundColor: Colors.primary,
        alignItems: 'center',
    },
    modalButtonSaveText: {
        color: Colors.white,
        fontWeight: 'bold',
    },
});
