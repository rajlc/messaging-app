'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function FacebookCallbackContent() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            setStatus('error');
            setErrorMsg(searchParams.get('error_description') || 'Facebook authentication failed');
            return;
        }

        if (!code) {
            setStatus('error');
            setErrorMsg('No authorization code received from Facebook');
            return;
        }

        const exchangeCode = async () => {
            try {
                const redirectUri = `${window.location.origin}/auth/facebook/callback`;
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/facebook/exchange-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ code, redirectUri })
                });

                const data = await response.json();

                if (data.success && data.pages) {
                    setStatus('success');
                    // Send retrieved pages back to the parent window
                    if (window.opener) {
                        window.opener.postMessage({ type: 'FB_PAGES_RECEIVED', pages: data.pages }, '*');
                        setTimeout(() => {
                            window.close();
                        }, 1500);
                    } else {
                        setErrorMsg('Parent window not found. Please try again.');
                        setStatus('error');
                    }
                } else {
                    throw new Error(data.error || 'Failed to exchange authentication code');
                }
            } catch (err: any) {
                console.error(err);
                setStatus('error');
                setErrorMsg(err.message || 'An error occurred during authentication');
            }
        };

        exchangeCode();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full text-center space-y-6">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
                        <h2 className="text-xl font-semibold">Connecting to Facebook...</h2>
                        <p className="text-slate-400 text-sm">Please wait while we retrieve your pages list.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-emerald-400">Successfully Connected!</h2>
                        <p className="text-slate-400 text-sm">This window will close automatically.</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4 bg-rose-950/20 border border-rose-500/30 p-6 rounded-2xl">
                        <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-rose-400">Authentication Error</h2>
                        <p className="text-slate-300 text-sm">{errorMsg}</p>
                        <button
                            onClick={() => window.close()}
                            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition"
                        >
                            Close Window
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function FacebookCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            </div>
        }>
            <FacebookCallbackContent />
        </Suspense>
    );
}
