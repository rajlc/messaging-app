import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import axios from 'axios';

interface User {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    role: 'admin' | 'editor' | 'user' | 'rider';
    status: 'pending' | 'active' | 'deactive';
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    loading: true,
    login: async () => { },
    logout: async () => { },
    isAuthenticated: false,
});

let isAlertShown = false;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        setToken(null);
        setUser(null);
    }, []);

    const login = useCallback(async (token: string, userData: User) => {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(userData));
        setToken(token);
        setUser(userData);
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const token = await SecureStore.getItemAsync('token');
                const storedUser = await SecureStore.getItemAsync('user');

                if (token && storedUser) {
                    setToken(token);
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                await SecureStore.deleteItemAsync('token');
                await SecureStore.deleteItemAsync('user');
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response && error.response.status === 401) {
                    console.log('Unauthorized request (401), logging out...');
                    if (!isAlertShown) {
                        isAlertShown = true;
                        Alert.alert(
                            'Session Expired',
                            'Your session has expired. Please log in again.',
                            [{ text: 'OK', onPress: () => { isAlertShown = false; } }],
                            { cancelable: false }
                        );
                    }
                    await logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [logout]);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
