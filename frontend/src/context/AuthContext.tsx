"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    role: 'admin' | 'editor' | 'user' | 'rider';
    status: 'pending' | 'active' | 'deactive';
    platforms?: string[];
    accounts?: string[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: () => { },
    logout: () => { },
    isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    // Ideally verify token with backend here
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // Status polling to detect deactivated users
    useEffect(() => {
        if (!user) return;

        const checkStatus = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/users/check-active-status`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });

                if (res.status === 401) {
                    logout();
                    return;
                }

                if (res.ok) {
                    const data = await res.json();
                    if (!data.isActive) {
                        // User has been deactivated, force logout
                        logout();
                    }
                }
            } catch (error) {
                // Silently fail - don't logout on network errors
            }
        };

        // Check immediately on mount, then every 30 seconds
        checkStatus();
        const interval = setInterval(checkStatus, 30000);

        return () => clearInterval(interval);
    }, [user]);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        router.push('/');
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
