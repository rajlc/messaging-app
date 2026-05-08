"use client";

import { useState, useEffect } from 'react';
import { X, Send, Zap } from 'lucide-react';

interface QuickReplyTemplate {
    id: string;
    title: string;
    message: string;
    created_at: string;
    updated_at: string;
}

interface QuickReplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (message: string) => void;
}

export default function QuickReplyModal({ isOpen, onClose, onSend }: QuickReplyModalProps) {
    const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<QuickReplyTemplate | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/templates/quick-reply`);
            const data = await response.json();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendTemplate = () => {
        if (selectedTemplate) {
            onSend(selectedTemplate.message);
            onClose();
            setSelectedTemplate(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <Zap className="text-indigo-600 dark:text-indigo-400" size={20} />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Reply Templates</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-slate-500 dark:text-slate-400">Loading templates...</div>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                            <p>No templates found.</p>
                            <p className="text-sm mt-2">Create templates in Settings → Quick Reply Templates</p>
                        </div>
                    ) : (
                        templates.map((template) => (
                            <div
                                key={template.id}
                                onClick={() => setSelectedTemplate(template)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedTemplate?.id === template.id
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-500'
                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-500'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className={`font-semibold ${selectedTemplate?.id === template.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>{template.title}</h4>
                                    {selectedTemplate?.id === template.id && (
                                        <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{template.message}</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-300 dark:border-slate-600 px-4 py-2 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSendTemplate}
                        disabled={!selectedTemplate}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <Send size={18} />
                        Send Message
                    </button>
                </div>
            </div>
        </div>
    );
}
