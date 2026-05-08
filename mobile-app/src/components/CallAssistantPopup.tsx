import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    PanResponder
} from 'react-native';
import { Colors, Radius, Spacing } from '../theme/theme';
import { Phone, User, Package, X, ChevronRight } from 'lucide-react-native';
import * as NavigationService from '../navigation/NavigationService';

const { width } = Dimensions.get('window');

interface CallAssistantPopupProps {
    visible: boolean;
    phoneNumber: string;
    customerName?: string;
    lastOrderInfo?: string;
    onDismiss: () => void;
}

export default function CallAssistantPopup({
    visible,
    phoneNumber,
    customerName,
    lastOrderInfo,
    onDismiss
}: CallAssistantPopupProps) {
    const [translateX] = useState(new Animated.Value(0));
    const [translateY] = useState(new Animated.Value(-250));
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (visible) {
            setIsRendered(true);
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 40,
                friction: 7
            }).start();
        } else {
            Animated.timing(translateY, {
                toValue: -250,
                duration: 300,
                useNativeDriver: true
            }).start(() => setIsRendered(false));
        }
    }, [visible]);

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
            translateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
            if (Math.abs(gestureState.dx) > width * 0.4) {
                // Dismiss if swiped far enough
                Animated.timing(translateX, {
                    toValue: gestureState.dx > 0 ? width : -width,
                    duration: 200,
                    useNativeDriver: true
                }).start(onDismiss);
            } else {
                // Snap back
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true
                }).start();
            }
        }
    });

    if (!isRendered && !visible) return null;

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                styles.container,
                {
                    transform: [
                        { translateY },
                        { translateX }
                    ],
                    opacity: translateX.interpolate({
                        inputRange: [-width * 0.5, 0, width * 0.5],
                        outputRange: [0, 1, 0]
                    })
                }
            ]}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.appBadge}>
                        <Phone size={12} color={Colors.white} />
                        <Text style={styles.appBadgeText}>Sales Assistant</Text>
                    </View>
                    <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
                        <X size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.body}>
                    <Text style={styles.phoneNumber}>{phoneNumber}</Text>
                    <View style={styles.customerInfo}>
                        <User size={16} color={Colors.primary} />
                        <Text style={styles.customerName}>
                            {customerName || 'New Customer'}
                        </Text>
                    </View>
                    {lastOrderInfo && (
                        <View style={styles.orderInfo}>
                            <Package size={14} color={Colors.textSecondary} />
                            <Text style={styles.lastOrderText}>{lastOrderInfo}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.primaryButton}
                        onPress={() => {
                            NavigationService.navigate('CreateOrder', {
                                phone: phoneNumber,
                                customerName: customerName || ''
                            });
                            onDismiss();
                        }}
                    >
                        <Text style={styles.primaryButtonText}>Create Order</Text>
                        <ChevronRight size={16} color={Colors.white} />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: Spacing.m,
        right: Spacing.m,
        zIndex: 9999,
        elevation: 10,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: Radius.xl,
        padding: Spacing.m,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.s
    },
    appBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6
    },
    appBadgeText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    closeButton: {
        padding: 4
    },
    body: {
        marginVertical: Spacing.s
    },
    phoneNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        letterSpacing: 1
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4
    },
    customerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text
    },
    orderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        backgroundColor: '#F1F5F9',
        padding: 8,
        borderRadius: Radius.s
    },
    lastOrderText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500'
    },
    footer: {
        marginTop: Spacing.m
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: Radius.m,
        gap: 8
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: 'bold'
    }
});
