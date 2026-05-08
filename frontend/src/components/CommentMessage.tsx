"use client";

import { MessageCircle, Reply, MessageSquare, EyeOff, ShoppingCart } from 'lucide-react';

interface PostComment {
    id: string;
    comment_id: string;
    post_id: string;
    post_message?: string;
    customer_id: string;
    customer_name: string;
    comment_text: string;
    platform: string;
    is_hidden: boolean;
    is_replied: boolean;
    created_at: string;
}

interface CommentMessageProps {
    comment: PostComment;
    onReplyPublic: () => void;
    onReplyPrivate: () => void;
    onHide: () => void;
    onCreateOrder: () => void;
}

export default function CommentMessage({
    comment,
    onReplyPublic,
    onReplyPrivate,
    onHide,
    onCreateOrder
}: CommentMessageProps) {
    return (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 mb-4">
            {/* Comment Badge */}
            <div className="flex items-center gap-2 mb-2">
                <MessageCircle size={16} className="text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">
                    Comment on Post
                </span>
                {comment.is_hidden && (
                    <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">
                        Hidden
                    </span>
                )}
                {comment.is_replied && (
                    <span className="text-xs px-2 py-0.5 bg-green-900/30 border border-green-700 rounded text-green-400">
                        Replied
                    </span>
                )}
            </div>

            {/* Post Info */}
            {comment.post_message && (
                <div className="text-xs text-slate-400 mb-2 italic">
                    "{comment.post_message.substring(0, 60)}..."
                </div>
            )}

            {/* Comment Text */}
            <div className="bg-slate-900/50 rounded p-3 mb-3">
                <p className="text-sm text-white">{comment.comment_text}</p>
                <div className="text-xs text-slate-500 mt-2">
                    {new Date(comment.created_at).toLocaleString()}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={onReplyPublic}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-semibold transition-colors"
                >
                    <Reply size={14} />
                    Reply Publicly
                </button>

                <button
                    onClick={onReplyPrivate}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold transition-colors"
                >
                    <MessageSquare size={14} />
                    Reply Privately
                </button>

                <button
                    onClick={onHide}
                    disabled={comment.is_hidden}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-semibold transition-colors"
                >
                    <EyeOff size={14} />
                    {comment.is_hidden ? 'Hidden' : 'Hide Comment'}
                </button>

                <button
                    onClick={onCreateOrder}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-xs font-semibold transition-colors"
                >
                    <ShoppingCart size={14} />
                    Create Order
                </button>
            </div>
        </div>
    );
}
