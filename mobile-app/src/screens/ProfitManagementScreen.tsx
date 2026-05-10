import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronLeft,
    TrendingUp,
    LayoutGrid,
    ChevronRight,
    Eye
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '../theme/theme';
import { API_URL } from '../api/config';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function ProfitManagementScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [campaigns, setCampaigns] = useState<any[]>([]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await axios.get(`${API_URL}/api/ads-management/campaigns`, { headers });
            if (res.data.success) setCampaigns(res.data.data);
        } catch (error) {
            console.error('Failed to fetch profit data:', error);
            Alert.alert('Error', 'Failed to load campaigns');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const renderCampaignItem = ({ item }: { item: any }) => {
        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => navigation.navigate('CampaignDetails', { campaignId: item.id, campaignName: item.name })}
            >
                <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                        <LayoutGrid size={20} color={Colors.secondary} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.campaignName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.dateText}>{item.start_date} {item.end_date ? `to ${item.end_date}` : '(Ongoing)'}</Text>
                    </View>
                    <View style={styles.actionContainer}>
                        <TouchableOpacity 
                            style={styles.viewButton}
                            onPress={() => navigation.navigate('CampaignDetails', { campaignId: item.id, campaignName: item.name })}
                        >
                            <Text style={styles.viewButtonText}>View</Text>
                            <ChevronRight size={16} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profit Management</Text>
                <View style={{ width: 24 }} />
            </View>



            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={campaigns}
                    renderItem={renderCampaignItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshing={isLoading}
                    onRefresh={fetchData}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No campaigns found</Text>
                        </View>
                    }
                />
            )}

            {/* Footer Navigation */}
            <View style={[styles.footerNav, { paddingBottom: insets.bottom > 0 ? insets.bottom : 15 }]}>
                <View style={[styles.footerTab, styles.activeFooterTab]}>
                    <TrendingUp size={20} color={Colors.secondary} />
                    <Text style={[styles.footerTabText, styles.activeFooterTabText]}>Campaign Profit</Text>
                </View>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.m,
        paddingVertical: Spacing.s,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        padding: Spacing.s,
        margin: Spacing.m,
        borderRadius: Radius.l,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: Radius.m,
        gap: 8,
    },
    activeTab: {
        backgroundColor: '#F0F4FF',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    activeTabText: {
        color: Colors.secondary,
    },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: Spacing.m, paddingBottom: 100 },
    // Footer Navigation Styles
    footerNav: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 10,
    },
    footerTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    activeFooterTab: {
        // Optional active style
    },
    footerTabText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    activeFooterTabText: {
        color: Colors.secondary,
    },

    card: {
        backgroundColor: Colors.white,
        borderRadius: Radius.l,
        padding: Spacing.m,
        marginBottom: Spacing.m,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F4FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    campaignName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 2,
    },
    dateText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    actionContainer: {
        marginLeft: 8,
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4,
    },
    viewButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.white,
    },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic' },
});
