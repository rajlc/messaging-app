import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FileText, ShoppingBag, ChevronLeft } from 'lucide-react-native';
import { Colors } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity, View, Text } from 'react-native';

// Screens
import AdminDeliveryReportScreen from '../screens/AdminDeliveryReportScreen';
import AdminDeliveryOrdersScreen from '../screens/AdminDeliveryOrdersScreen';

const Tab = createBottomTabNavigator();

export default function AdminDeliveryReportNavigator({ navigation }: any) {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: Colors.white,
                    borderTopWidth: 1,
                    borderTopColor: Colors.border,
                    height: 75 + (insets.bottom > 0 ? insets.bottom - 10 : 0),
                    paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 18,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                    marginBottom: 4,
                },
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'Report') return <FileText size={size} color={color} />;
                    if (route.name === 'Orders') return <ShoppingBag size={size} color={color} />;
                    return null;
                },
            })}
        >
            <Tab.Screen name="Report" component={AdminDeliveryReportScreen} />
            <Tab.Screen name="Orders" component={AdminDeliveryOrdersScreen} />
        </Tab.Navigator>
    );
}
