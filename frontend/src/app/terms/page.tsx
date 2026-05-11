"use client";

import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
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
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                            <FileText size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Terms of Service</h1>
                        <p className="text-slate-500 mt-2 font-medium">Last updated: May 11, 2026</p>
                    </div>

                    <div className="p-8 prose prose-slate dark:prose-invert max-w-none">
                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">1. Acceptance of Terms</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                By accessing and using this application, you agree to be bound by these Terms of Service and all applicable laws and regulations.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">2. Use License</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Permission is granted to use this software for managing social media communications and business orders. You may not:
                            </p>
                            <ul className="list-disc ml-6 mt-4 text-slate-600 dark:text-slate-400 space-y-2">
                                <li>Modify or copy the source code without permission.</li>
                                <li>Use the service for any illegal or unauthorized purpose.</li>
                                <li>Attempt to decompile or reverse engineer any software contained in the app.</li>
                                <li>Remove any copyright or other proprietary notations.</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">3. AI Agent Usage</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Our AI Agent utilizes third-party AI models (OpenAI/Gemini). You are responsible for the instructions provided to the AI and the resulting communication with your customers. We are not liable for any incorrect information provided by the AI.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">4. Limitation of Liability</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                In no event shall we be liable for any damages (including, without limitation, damages for loss of data or profit) arising out of the use or inability to use the application.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">5. Revisions</h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                We may revise these terms of service at any time without notice. By using this application you are agreeing to be bound by the then current version of these terms of service.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
