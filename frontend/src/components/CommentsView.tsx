"use client";

import { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Reply, EyeOff, Shield, RefreshCw, CheckCircle2, 
  Clock, Search, ExternalLink, CornerDownRight, User, MessageCircle, AlertCircle 
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

type PostComment = {
  id: string;
  comment_id: string;
  post_id: string;
  post_message?: string;
  customer_id: string;
  customer_name: string;
  comment_text: string;
  platform: string;
  page_id?: string;
  is_hidden: boolean;
  is_replied: boolean;
  customer_profile_pic?: string;
  created_at: string;
};

type Page = {
  id: string;
  page_id: string;
  page_name: string;
  platform: string;
};

export default function CommentsView() {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('all');
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'unreplied' | 'replied'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyMode, setReplyMode] = useState<'public' | 'private'>('public');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // Fetch connected pages
  const fetchPages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pages`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPages(data);
      }
    } catch (err) {
      console.error('Failed to fetch pages:', err);
    }
  };

  // Fetch comments
  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/comments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setComments(data);
        if (data.length > 0 && !selectedCommentId) {
          setSelectedCommentId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
    fetchComments();

    // Listen for real-time new comments via Socket.io
    const socket: Socket = io(API_URL);
    socket.on('new-comment', (data: { comment: PostComment }) => {
      if (data?.comment) {
        setComments(prev => [data.comment, ...prev.filter(c => c.id !== data.comment.id)]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const selectedComment = comments.find(c => c.id === selectedCommentId);

  // Filter logic
  const filteredComments = comments.filter(c => {
    // Exclude comments where the customer is the Page itself
    const isPageSelfComment = c.page_id && (c.customer_id === c.page_id || pages.some(p => p.page_id === c.customer_id));
    if (isPageSelfComment) return false;

    // Page Filter
    const matchesPage = selectedPageId === 'all' ? true : c.page_id === selectedPageId;

    // Tab Filter
    const matchesTab = 
      filterTab === 'all' ? true :
      filterTab === 'unreplied' ? !c.is_replied :
      c.is_replied;

    // Search Filter
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch = !query || 
      c.customer_name?.toLowerCase().includes(query) ||
      c.comment_text?.toLowerCase().includes(query) ||
      c.post_id?.includes(query);

    return matchesPage && matchesTab && matchesSearch;
  });

  // Handle Reply submission
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComment || !replyText.trim()) return;

    setIsSubmitting(true);
    setActionSuccess('');
    setActionError('');

    const endpoint = replyMode === 'public'
      ? `${API_URL}/api/comments/${selectedComment.id}/reply`
      : `${API_URL}/api/comments/${selectedComment.id}/reply-private`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: replyText.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(replyMode === 'public' ? 'Public reply posted on Facebook!' : 'Private message sent to customer!');
        setReplyText('');
        // Update comment locally as replied
        setComments(prev => prev.map(c => c.id === selectedComment.id ? { ...c, is_replied: true } : c));
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        setActionError(data.message || data.error || 'Failed to send reply');
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Error communicating with server');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Hide comment
  const handleHideComment = async () => {
    if (!selectedComment) return;
    if (!confirm('Hide this comment on Facebook?')) return;

    try {
      const res = await fetch(`${API_URL}/api/comments/${selectedComment.id}/hide`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setComments(prev => prev.map(c => c.id === selectedComment.id ? { ...c, is_hidden: true } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans text-slate-900 dark:text-white">
      {/* ─── LEFT COLUMN: Comments & Post List ─────────────────────────────────── */}
      <div className="w-80 min-w-[320px] max-w-[320px] h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/60 flex flex-col flex-shrink-0 z-10">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">Facebook Comments</h2>
              <p className="text-[10px] font-semibold text-slate-400">{filteredComments.length} Comments Displayed</p>
            </div>
          </div>
          <button 
            onClick={fetchComments} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh comments"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Page Filter Dropdown */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Filter by Facebook Page
          </label>
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Facebook Pages</option>
            {pages.map(page => (
              <option key={page.id} value={page.page_id}>
                {page.page_name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Tabs */}
        <div className="p-2 border-b border-slate-100 dark:border-slate-700/50 flex gap-1 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-md transition-all ${
              filterTab === 'all' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({comments.length})
          </button>
          <button
            onClick={() => setFilterTab('unreplied')}
            className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-md transition-all ${
              filterTab === 'unreplied' 
                ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Unreplied ({comments.filter(c => !c.is_replied).length})
          </button>
          <button
            onClick={() => setFilterTab('replied')}
            className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-md transition-all ${
              filterTab === 'replied' 
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Replied ({comments.filter(c => c.is_replied).length})
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-700/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Search comments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 pl-8 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/40">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-indigo-500" /> Loading comments...
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No comments found
            </div>
          ) : (
            filteredComments.map(comment => {
              const isSelected = comment.id === selectedCommentId;
              return (
                <div
                  key={comment.id}
                  onClick={() => setSelectedCommentId(comment.id)}
                  className={`p-3 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                    isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                      {comment.customer_profile_pic ? (
                        <img src={comment.customer_profile_pic} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-500">
                          {comment.customer_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-bold text-xs truncate text-slate-900 dark:text-white">
                          {comment.customer_name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">
                          {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-snug mb-1.5">
                        "{comment.comment_text}"
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 truncate max-w-[120px]">
                          Post: {comment.post_id ? comment.post_id.slice(-8) : 'Page Post'}
                        </span>
                        {comment.is_replied ? (
                          <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Replied
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── CENTER COLUMN: Selected Comment Thread & Facebook Post Context ──── */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 relative">
        {selectedComment ? (
          <>
            {/* Thread Header */}
            <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/60 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold overflow-hidden shadow-sm">
                  {selectedComment.customer_profile_pic ? (
                    <img src={selectedComment.customer_profile_pic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedComment.customer_name?.charAt(0).toUpperCase() || '?'
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedComment.customer_name}
                    {selectedComment.is_replied && (
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        ✓ Replied
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Facebook Comment ID: {selectedComment.comment_id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleHideComment}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <EyeOff size={14} /> Hide Comment
                </button>
                <a
                  href={`https://facebook.com/${selectedComment.post_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ExternalLink size={14} /> View Post on FB
                </a>
              </div>
            </div>

            {/* Thread Body & Post Info */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Facebook Post Banner */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold flex-shrink-0">
                  <MessageCircle size={22} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Facebook Post Context</h4>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Post ID: <span className="font-mono text-indigo-500">{selectedComment.post_id}</span>
                  </p>
                  {selectedComment.post_message && (
                    <p className="text-xs text-slate-500 font-medium italic mt-1">
                      "{selectedComment.post_message}"
                    </p>
                  )}
                </div>
              </div>

              {/* Customer Comment Bubble */}
              <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 overflow-hidden">
                  {selectedComment.customer_profile_pic ? (
                    <img src={selectedComment.customer_profile_pic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedComment.customer_name?.charAt(0).toUpperCase() || '?'
                  )}
                </div>
                <div className="max-w-2xl bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{selectedComment.customer_name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(selectedComment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                    {selectedComment.comment_text}
                  </p>
                </div>
              </div>

              {/* Replied status notice */}
              {selectedComment.is_replied && (
                <div className="ml-12 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={16} /> A reply has already been sent to this comment on Facebook.
                </div>
              )}
            </div>

            {/* Reply Input Bar at Bottom */}
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700/60 flex-shrink-0 shadow-lg">
              
              {/* Action feedback message */}
              {actionSuccess && (
                <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 size={16} /> {actionSuccess}
                </div>
              )}
              {actionError && (
                <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-800 flex items-center gap-2">
                  <AlertCircle size={16} /> {actionError}
                </div>
              )}

              <form onSubmit={handleSendReply} className="space-y-3">
                {/* Mode switch: Public Facebook Comment vs Private DM */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyMode('public')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        replyMode === 'public'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Reply size={14} /> Public Comment Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyMode('private')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        replyMode === 'private'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <MessageCircle size={14} /> Private Messenger DM
                    </button>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400">
                    Posting as: <span className="text-indigo-500 font-extrabold">Facebook Page</span>
                  </span>
                </div>

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      replyMode === 'public'
                        ? `Write a public reply to ${selectedComment.customer_name}...`
                        : `Write a private Messenger DM to ${selectedComment.customer_name}...`
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting || !replyText.trim()}
                    className="absolute right-3 bottom-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    {replyMode === 'public' ? 'Post Comment Reply' : 'Send Private DM'}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Select a Comment</h3>
            <p className="text-xs font-medium max-w-sm">
              Choose a comment from the list on the left to view post details, reply publicly on Facebook, or send a private DM.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
