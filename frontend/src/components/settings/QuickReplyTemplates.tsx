"use client";

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface QuickReplyTemplate {
    id: string;
    title: string;
    message: string;
    created_at: string;
    updated_at: string;
}

export default function QuickReplyTemplates() {
    const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({ title: '', message: '' });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

    useEffect(() => {
        loadTemplates();
    }, []);

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

    const handleCreate = () => {
        setIsCreating(true);
        setFormData({ title: '', message: '' });
    };

    const handleEdit = (template: QuickReplyTemplate) => {
        setEditingId(template.id);
        setFormData({ title: template.title, message: template.message });
    };

    const handleSave = async () => {
        try {
            if (isCreating) {
                await fetch(`${apiUrl}/api/templates/quick-reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            } else if (editingId) {
                await fetch(`${apiUrl}/api/templates/quick-reply/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            }
            await loadTemplates();
            handleCancel();
        } catch (error) {
            console.error('Failed to save template:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await fetch(`${apiUrl}/api/templates/quick-reply/${id}`, {
                method: 'DELETE'
            });
            await loadTemplates();
        } catch (error) {
            console.error('Failed to delete template:', error);
        }
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingId(null);
        setFormData({ title: '', message: '' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading templates...</div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto transition-colors">
            <div className="mb-8">
                <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Quick Reply Templates</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Create message templates for quick responses to common customer inquiries.
                </p>
            </div>

            <button
                onClick={handleCreate}
                className="mb-8 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
                <Plus size={18} />
                Add Template
            </button>

            {/* Create/Edit Form */}
            {(isCreating || editingId) && (
                <div className="mb-8 p-8 bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-200 dark:border-slate-700/50 shadow-xl">
                    <h4 className="text-lg font-black mb-6 text-slate-900 dark:text-white">
                        {isCreating ? 'Create New Template' : 'Edit Template'}
                    </h4>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                                Template Title
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Thank You"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                                Message Content
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="e.g., Thank you for contacting us! We appreciate your interest."
                                rows={4}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none leading-relaxed font-medium transition-all"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleSave}
                                disabled={!formData.title || !formData.message}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <Save size={18} />
                                Save Template
                            </button>
                            <button
                                onClick={handleCancel}
                                className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Templates List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.length === 0 ? (
                    <div className="col-span-full p-12 text-center text-slate-400 bg-white dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-gray-200 dark:border-slate-700">
                        <p className="font-medium italic">No templates yet. Click "Add Template" to create one.</p>
                    </div>
                ) : (
                    templates.map((template) => (
                        <div
                            key={template.id}
                            className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-black text-lg text-slate-900 dark:text-white leading-tight">{template.title}</h4>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed font-medium italic">"{template.message}"</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
