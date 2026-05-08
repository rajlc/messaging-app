"use client";

import { useState } from 'react';
import { X, Send } from 'lucide-react';

interface CommentReplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (message: string, replyType: 'public' | 'private') => void;
    commentText: string;
}

export default function CommentReplyModal({
    isOpen,
    onClose,
    onSend,
    commentText
}: CommentReplyModalProps) {
    const [replyType, setReplyType] = useState<'public' | 'private'>('public');
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSend = () => {
        if (!message.trim()) return;
        onSend(message, replyType);
        setMessage('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-gray-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reply to Comment</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Original Comment */}
                <div className="bg-gray-100 dark:bg-slate-900 rounded-lg p-3 mb-4 border border-gray-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Original Comment:</p>
                    <p className="text-sm text-slate-800 dark:text-white">{commentText}</p>
                </div>

                {/* Reply Type Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Reply Type
                    </label>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setReplyType('public')}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${replyType === 'public'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                : 'bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            Public Reply
                        </button>
                        <button
                            onClick={() => setReplyType('private')}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${replyType === 'private'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            Private Message
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {replyType === 'public'
                            ? '✓ Will appear as a reply on the Facebook post'
                            : '✓ Will send a private DM to the commenter'}
                    </p>
                </div>

                {/* Message Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Your Reply
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your reply..."
                        className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        rows={4}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!message.trim()}
                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <Send size={18} />
                        Send Reply
                    </button>
                </div>
            </div>
        </div>
    );
}
