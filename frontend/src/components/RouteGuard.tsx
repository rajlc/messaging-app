"use client";

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

const publicRoutes = ['/login', '/signup'];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated && !publicRoutes.includes(pathname)) {
                router.push('/login');
            } else if (isAuthenticated && publicRoutes.includes(pathname)) {
                router.push('/');
            }
        }
    }, [isAuthenticated, loading, pathname, router]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    // Prevent flash of protected content
    if (!isAuthenticated && !publicRoutes.includes(pathname)) {
        return null;
    }

    return <>{children}</>;
}
