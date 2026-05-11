import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme/theme';

// Screens
import AuthNavigator from './AuthNavigator';
import TabNavigator, { RiderTabNavigator } from './TabNavigator';
import AIAgentSettingsScreen from '../screens/AIAgentSettingsScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import OrderViewScreen from '../screens/OrderViewScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import MyDeliveryScreen from '../screens/MyDeliveryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminDeliveryReportNavigator from './AdminDeliveryReportNavigator';
import AdminRiderDetailScreen from '../screens/AdminRiderDetailScreen';
import CampaignDetailsScreen from '../screens/CampaignDetailsScreen';
import AdsManagementScreen from '../screens/AdsManagementScreen';
import ProfitManagementScreen from '../screens/ProfitManagementScreen';
import { startCallAssistant } from '../services/CallAssistantService';
import { useEffect } from 'react';


const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const { user, loading } = useAuth();
    const isRider = user?.role?.toLowerCase() === 'rider';
    const isAdminOrEditor = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'editor';

    useEffect(() => {
        if (user && isAdminOrEditor) {
            startCallAssistant();
        }
    }, [user, isAdminOrEditor]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                <>
                    <Stack.Screen name="MainApp" component={TabNavigator} />
                    {!isRider && (
                        <>
                            <Stack.Screen name="AIAgentSettings" component={AIAgentSettingsScreen} />
                            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
                            <Stack.Screen name="OrderView" component={OrderViewScreen} />
                            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
                            <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
                            <Stack.Screen name="AdminDeliveryReport" component={AdminDeliveryReportNavigator} />
                            <Stack.Screen name="AdminRiderDetail" component={AdminRiderDetailScreen} />
                            <Stack.Screen name="AdsManagement" component={AdsManagementScreen} />
                            <Stack.Screen name="ProfitManagement" component={ProfitManagementScreen} />
                            <Stack.Screen name="CampaignDetails" component={CampaignDetailsScreen} />

                        </>
                    )}
                    <Stack.Screen name="MyDelivery" component={MyDeliveryScreen} />
                    <Stack.Screen name="RiderTabs" component={RiderTabNavigator} />
                    <Stack.Screen name="Profile" component={ProfileScreen} />
                </>
            ) : (
                <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
});
