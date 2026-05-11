import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Home, MessageCircle, ShoppingBag, MoreHorizontal, Truck, Wallet, FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

// Screens
import HomeScreen from '../screens/HomeScreen';
import MessagesNavigator from './MessagesNavigator';
import OrdersScreen from '../screens/OrdersScreen';
import MoreScreen from '../screens/MoreScreen';
import MyDeliveryScreen from '../screens/MyDeliveryScreen';
import { startCallAssistant, stopCallAssistant, setCallListener } from '../services/CallAssistantService';
import CallAssistantPopup from '../components/CallAssistantPopup';

const Tab = createBottomTabNavigator();

const commonScreenOptions = (insets: any) => ({
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
});

export function RiderTabNavigator() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const isRider = user?.role?.toLowerCase() === 'rider';

    return (
        <Tab.Navigator
            initialRouteName="My Delivery"
            screenOptions={(props: any) => {
                const route = props.route;
                const routeName = getFocusedRouteNameFromRoute(route);
                const isNestedHidden = routeName && ['ChatDetail', 'CreateOrder', 'OrderDetails'].includes(routeName);
                const isParamHidden = (route.params as any)?.hideTabBar === true;
                const isTabBarHidden = isNestedHidden || isParamHidden;
                
                const options = commonScreenOptions(insets);
                
                return {
                    ...options,
                    tabBarStyle: isTabBarHidden ? { display: 'none' } : options.tabBarStyle,
                    tabBarIcon: ({ color, size }: any) => {
                        if (route.name === 'My Delivery') return <ShoppingBag size={size} color={color} />;
                        if (route.name === 'Settlement') return <Wallet size={size} color={color} />;
                        if (route.name === 'Report') return <FileText size={size} color={color} />;
                        if (route.name === 'More') return <MoreHorizontal size={size} color={color} />;
                        return null;
                    },
                };
            }}
        >
            <Tab.Screen name="My Delivery" component={MyDeliveryScreen} initialParams={{ activeTab: 'orders' }} />
            <Tab.Screen name="Settlement" component={MyDeliveryScreen} initialParams={{ activeTab: 'settlement' }} />
            <Tab.Screen name="Report" component={MyDeliveryScreen} initialParams={{ activeTab: 'report' }} />
            {isRider && <Tab.Screen name="More" component={MoreScreen} />}
        </Tab.Navigator>
    );
}

export default function TabNavigator() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const isRider = user?.role?.toLowerCase() === 'rider';
    const isAdminOrEditor = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'editor';

    const [popupData, setPopupData] = useState<any>(null);

    useEffect(() => {
        if (isAdminOrEditor) {
            if (typeof startCallAssistant === 'function') {
                startCallAssistant();
            }
            if (typeof setCallListener === 'function') {
                setCallListener((data) => {
                    setPopupData(data);
                });
            }
        } else {
            if (typeof stopCallAssistant === 'function') {
                stopCallAssistant();
            }
            if (typeof setCallListener === 'function') {
                setCallListener(() => {});
            }
        }
        
        return () => {
            if (typeof stopCallAssistant === 'function') {
                stopCallAssistant();
            }
            if (typeof setCallListener === 'function') {
                setCallListener(() => {});
            }
        };
    }, [isAdminOrEditor]);

    const renderPopup = () => {
        if (!popupData) return null;
        return (
            <CallAssistantPopup
                visible={!!popupData}
                phoneNumber={popupData?.phoneNumber || ''}
                customerName={popupData?.customerName}
                lastOrderInfo={popupData?.lastOrderInfo}
                onDismiss={() => setPopupData(null)}
            />
        );
    };

    if (isRider) {
        return (
            <>
                <RiderTabNavigator />
                {renderPopup()}
            </>
        );
    }

    return (
        <>
            <Tab.Navigator
                initialRouteName="Home"
                screenOptions={(props: any) => {
                    const route = props.route;
                    const routeName = getFocusedRouteNameFromRoute(route);
                    const isNestedHidden = routeName && ['ChatDetail', 'CreateOrder', 'OrderDetails'].includes(routeName);
                    const isParamHidden = (route.params as any)?.hideTabBar === true;
                    const isTabBarHidden = isNestedHidden || isParamHidden;
                    
                    const options = commonScreenOptions(insets);
                    
                    return {
                        ...options,
                        tabBarStyle: isTabBarHidden ? { display: 'none' } : options.tabBarStyle,
                        tabBarIcon: ({ color, size }: any) => {
                            if (route.name === 'Home') return <Home size={size} color={color} />;
                            if (route.name === 'Messages') return <MessageCircle size={size} color={color} />;
                            if (route.name === 'Orders') return <ShoppingBag size={size} color={color} />;
                            if (route.name === 'More') return <MoreHorizontal size={size} color={color} />;
                            return null;
                        },
                    };
                }}
            >

                <Tab.Screen name="Home" component={HomeScreen} />
                <Tab.Screen name="Messages" component={MessagesNavigator} />
                <Tab.Screen name="Orders" component={OrdersScreen} />
                <Tab.Screen name="More" component={MoreScreen} />
            </Tab.Navigator>
            {renderPopup()}
        </>
    );
}
