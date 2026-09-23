"use client";

import React, { useState, useEffect } from 'react';
import {
    Lightbulb,
    Plus,
    FolderPlus,
    CheckCircle2,
    Clock,
    Trash2,
    Calendar,
    ArrowRight,
    Sparkles,
    Tag,
    MoreVertical,
    Send
} from 'lucide-react';

interface IdeaItem {
    id: string;
    title: string;
    description?: string;
    status: 'idea' | 'in_progress' | 'completed';
    created_at: string;
    completed_at?: string;
}

interface ProjectVault {
    id: string;
    name: string;
    description?: string;
    color?: string;
    created_at: string;
    ideas: IdeaItem[];
}

export function PlanIdeaTab() {
    const [projects, setProjects] = useState<ProjectVault[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Modals
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [projectDesc, setProjectDesc] = useState('');

    const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
    const [targetProjectId, setTargetProjectId] = useState<string>('');
    const [ideaTitle, setIdeaTitle] = useState('');
    const [ideaDesc, setIdeaDesc] = useState('');

    // Promote to Routine Modal
    const [promoteIdea, setPromoteIdea] = useState<IdeaItem | null>(null);
    const [promoteDate, setPromoteDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [promoteTimeBlock, setPromoteTimeBlock] = useState('11:30 AM - 1:00 PM');
    const [promotedSuccess, setPromotedSuccess] = useState(false);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ideas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProjects(data || []);
                if (data && data.length > 0 && !selectedProjectId) {
                    setSelectedProjectId(data[0].id);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectName.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ideas/project`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: projectName, description: projectDesc })
            });
            if (res.ok) {
                setIsProjectModalOpen(false);
                setProjectName('');
                setProjectDesc('');
                fetchProjects();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (!confirm('Are you sure you want to delete this project and all its ideas?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ideas/project/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchProjects();
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddIdea = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ideaTitle.trim() || !targetProjectId) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ideas/item`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ projectId: targetProjectId, title: ideaTitle, description: ideaDesc })
            });
            if (res.ok) {
                setIsIdeaModalOpen(false);
                setIdeaTitle('');
                setIdeaDesc('');
                fetchProjects();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleStatusChange = async (projectId: string, ideaId: string, status: 'idea' | 'in_progress' | 'completed') => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ideas/item/${projectId}/${ideaId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            fetchProjects();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteIdea = async (projectId: string, ideaId: string) => {
        if (!confirm('Delete this idea?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ideas/item/${projectId}/${ideaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchProjects();
        } catch (e) {
            console.error(e);
        }
    };

    const handlePromoteToRoutine = async () => {
        if (!promoteIdea) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ideas/promote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ideaTitle: promoteIdea.title,
                    dateStr: promoteDate,
                    timeBlock: promoteTimeBlock,
                })
            });
            if (res.ok) {
                setPromotedSuccess(true);
                setTimeout(() => {
                    setPromotedSuccess(false);
                    setPromoteIdea(null);
                }, 2000);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <Lightbulb className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            Creative Growth Vault
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Plan / Idea Vault
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Create focused projects (e.g. Daraz Products, FB Ad Hooks, TikTok Concepts). Capture ideas anytime, track status, and promote winners directly into your daily routine.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsProjectModalOpen(true)}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <FolderPlus className="w-4 h-4" />
                        New Project
                    </button>
                    <button
                        onClick={() => {
                            setTargetProjectId(activeProject?.id || '');
                            setIsIdeaModalOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Add Idea
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Left Column: Projects List */}
                <div className="space-y-3 md:col-span-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block px-1">
                        Projects ({projects.length})
                    </span>

                    <div className="space-y-2">
                        {projects.map(p => {
                            const isSelected = p.id === activeProject?.id;
                            const completedCount = p.ideas.filter(i => i.status === 'completed').length;

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedProjectId(p.id)}
                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                        isSelected
                                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-xs'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                    }`}
                                >
                                    <div>
                                        <h4 className={`text-xs font-bold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {p.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                            <span>{p.ideas.length} ideas</span>
                                            {completedCount > 0 && (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    • {completedCount} done
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteProject(p.id);
                                        }}
                                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                                        title="Delete Project"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Column: Ideas in Active Project */}
                <div className="md:col-span-3 space-y-4">
                    {activeProject && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {activeProject.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {activeProject.description || 'Project idea repository'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setTargetProjectId(activeProject.id);
                                        setIsIdeaModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add to this project
                                </button>
                            </div>

                            {/* Ideas Cards */}
                            {activeProject.ideas.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-xs">
                                    No ideas added to this project yet. Click "Add to this project" to capture your first concept!
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeProject.ideas.map(idea => (
                                        <div
                                            key={idea.id}
                                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {idea.title}
                                                    </h4>
                                                    {/* Status Badge */}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                        idea.status === 'completed'
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                                            : idea.status === 'in_progress'
                                                            ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                                            : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                                    }`}>
                                                        {idea.status === 'completed' ? '✅ Completed' : idea.status === 'in_progress' ? '🚀 In Progress' : '💡 Idea'}
                                                    </span>
                                                </div>
                                                {idea.description && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                                        {idea.description}
                                                    </p>
                                                )}
                                                <div className="text-[11px] text-slate-400 pt-0.5">
                                                    Added {idea.created_at.split('T')[0]}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Status Selector */}
                                                <select
                                                    value={idea.status}
                                                    onChange={(e) => handleStatusChange(activeProject.id, idea.id, e.target.value as any)}
                                                    className="bg-white dark:bg-slate-800 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                                                >
                                                    <option value="idea">💡 Idea</option>
                                                    <option value="in_progress">🚀 In Progress</option>
                                                    <option value="completed">✅ Completed</option>
                                                </select>

                                                {/* Promote to Routine Button */}
                                                <button
                                                    onClick={() => setPromoteIdea(idea)}
                                                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                                    title="Promote to Daily Routine"
                                                >
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    Promote to Routine
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteIdea(activeProject.id, idea.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Project Modal */}
            {isProjectModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                            Create New Project
                        </h3>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Project Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 🛒 Daraz Winter Flash Sale"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    required
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                                <textarea
                                    placeholder="What is this project focused on?"
                                    value={projectDesc}
                                    onChange={(e) => setProjectDesc(e.target.value)}
                                    rows={2}
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsProjectModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
                                >
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Idea Modal */}
            {isIdeaModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                            Add Idea to Project
                        </h3>
                        <form onSubmit={handleAddIdea} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Project</label>
                                <select
                                    value={targetProjectId}
                                    onChange={(e) => setTargetProjectId(e.target.value)}
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Idea Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Create Flexi-combo bundle for kitchen organizer"
                                    value={ideaTitle}
                                    onChange={(e) => setIdeaTitle(e.target.value)}
                                    required
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Details / Notes</label>
                                <textarea
                                    placeholder="Add specifics, target pricing, creative angles..."
                                    value={ideaDesc}
                                    onChange={(e) => setIdeaDesc(e.target.value)}
                                    rows={3}
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsIdeaModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
                                >
                                    Save Idea
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Promote Idea to Routine Modal */}
            {promoteIdea && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            Promote Idea to Daily Routine
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                            Turn <strong>"{promoteIdea.title}"</strong> into a concrete scheduled work task:
                        </p>

                        {promotedSuccess ? (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                Added to your Daily Routine for {promoteDate}!
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Date</label>
                                    <input
                                        type="date"
                                        value={promoteDate}
                                        onChange={(e) => setPromoteDate(e.target.value)}
                                        className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Time Block (Work Hours)</label>
                                    <select
                                        value={promoteTimeBlock}
                                        onChange={(e) => setPromoteTimeBlock(e.target.value)}
                                        className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    >
                                        <option value="9:00 AM - 11:00 AM">9:00 AM - 11:00 AM (Order Processing & Dispatch)</option>
                                        <option value="11:00 AM - 1:00 PM">11:00 AM - 1:00 PM (High-Impact Growth Sprint)</option>
                                        <option value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM (Creative & Content Sprint)</option>
                                        <option value="4:00 PM - 6:00 PM">4:00 PM - 6:00 PM (Logistics & Customer Care)</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setPromoteIdea(null)}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePromoteToRoutine}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
                                    >
                                        Add to Routine
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
