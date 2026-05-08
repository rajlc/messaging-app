import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform
} from 'react-native';
import { X, User, CheckCircle2 } from 'lucide-react-native';
import axios from 'axios';
import { Colors, Radius, Spacing } from '../theme/theme';
import { API_URL } from '../api/config';

interface Rider {
    id: string;
    full_name: string;
    email: string;
    is_delivery_person: boolean;
}

interface RiderAssignmentModalProps {
    visible: boolean;
    orderIds: string[];
    orderNumber?: string; // Still useful for single order display
    token: string | null;
    onClose: () => void;
    onAssigned: () => void;
}

export default function RiderAssignmentModal({ 
    visible, 
    orderIds, 
    orderNumber, 
    token,
    onClose, 
    onAssigned 
}: RiderAssignmentModalProps) {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            fetchRiders();
        }
    }, [visible]);

    const fetchRiders = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/users/staff`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            const deliveryPersons = data.filter((u: Rider) => u.is_delivery_person === true);
            setRiders(deliveryPersons);
        } catch (error) {
            console.error('Failed to fetch riders', error);
            Alert.alert('Error', 'Failed to fetch delivery staff');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (riderId: string) => {
        setAssigning(riderId);
        try {
            let successCount = 0;
            let failCount = 0;

            for (const id of orderIds) {
                try {
                    await axios.post(`${API_URL}/api/orders/${id}/assign-rider`, 
                        { riderId },
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    successCount++;
                } catch (err) {
                    failCount++;
                }
            }

            if (orderIds.length > 1) {
                Alert.alert('Bulk Assignment Complete', `✅ Success: ${successCount}\n❌ Failed: ${failCount}`);
            }

            onAssigned();
            onClose();
        } catch (error) {
            console.error('Failed to assign rider', error);
            Alert.alert('Error', 'Failed to assign rider. Please try again.');
        } finally {
            setAssigning(null);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Assign to Rider</Text>
                            <Text style={styles.subtitle}>Order #{orderNumber}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Body */}
                    <View style={styles.body}>
                        {loading ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="large" color={Colors.primary} />
                                <Text style={styles.loadingText}>Loading delivery persons...</Text>
                            </View>
                        ) : riders.length > 0 ? (
                            <ScrollView style={styles.riderList}>
                                {riders.map((rider) => (
                                    <TouchableOpacity
                                        key={rider.id}
                                        style={styles.riderItem}
                                        onPress={() => handleAssign(rider.id)}
                                        disabled={!!assigning}
                                    >
                                        <View style={styles.riderInfo}>
                                            <View style={styles.avatar}>
                                                <User size={20} color={Colors.primary} />
                                            </View>
                                            <View>
                                                <Text style={styles.riderName}>{rider.full_name}</Text>
                                                <Text style={styles.riderEmail}>{rider.email}</Text>
                                            </View>
                                        </View>
                                        {assigning === rider.id ? (
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                        ) : (
                                            <CheckCircle2 size={20} color={Colors.border} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.centerContainer}>
                                <View style={styles.emptyIconBox}>
                                    <User size={40} color={Colors.textSecondary} />
                                </View>
                                <Text style={styles.emptyTitle}>No Riders Found</Text>
                                <Text style={styles.emptyText}>Designate staff as "Delivery Person" in Settings to see them here.</Text>
                            </View>
                        )}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        height: '70%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    closeButton: {
        padding: 4,
    },
    body: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 10,
        color: Colors.textSecondary,
        fontSize: 14,
    },
    riderList: {
        padding: 16,
    },
    riderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: Radius.m,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    riderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    riderName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    riderEmail: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.textSecondary,
        fontSize: 14,
        paddingHorizontal: 20,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    cancelButton: {
        paddingVertical: 14,
        borderRadius: Radius.m,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
});
