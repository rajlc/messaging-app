import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface User {
    id: string;
    email: string;
    full_name?: string;
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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

    const login = async (token: string, userData: User) => {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(userData));
        setToken(token);
        setUser(userData);
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
