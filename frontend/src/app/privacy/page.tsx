"use client";

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <Link 
                    href="/login" 
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-8"
                >
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                            <Shield size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Privacy Policy</h1>
                        <p className="text-slate-500 mt-2 font-medium">Last updated: May 11, 2026</p>
                    </div>

                    <div className="p-8 prose prose-slate dark:prose-invert max-w-none">
                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">1. Information We Collect</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                We collect information you provide directly to us when you create an account, connect your social media pages, or use our services. This includes:
                            </p>
                            <ul className="list-disc ml-6 mt-4 text-slate-600 dark:text-slate-400 space-y-2">
                                <li>Account credentials (email, name)</li>
                                <li>Social media access tokens and page identifiers</li>
                                <li>Messages and communication data from connected platforms</li>
                                <li>Technical data (IP address, browser type)</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">2. How We Use Information</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                We use the collected information to:
                            </p>
                            <ul className="list-disc ml-6 mt-4 text-slate-600 dark:text-slate-400 space-y-2">
                                <li>Provide and maintain our messaging and order management services.</li>
                                <li>Automate responses via AI agents as configured by you.</li>
                                <li>Analyze app performance and improve user experience.</li>
                                <li>Ensure the security of your account and data.</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">3. Data Sharing and Social Media APIs</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Our application integrates with third-party platforms including Facebook and TikTok. By connecting these accounts, you agree to their respective privacy policies. We do not sell your personal data to third parties.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">4. Data Retention</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                We retain your information for as long as your account is active or as needed to provide you services. You can disconnect your social media pages or delete your account at any time.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">5. Contact Us</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                If you have any questions about this Privacy Policy, please contact us at support@example.com.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
