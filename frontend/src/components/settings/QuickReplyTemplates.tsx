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
        <div className="flex-1 overflow-y-auto">
            <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Quick Reply Templates</h3>
                <p className="text-sm text-slate-400">
                    Create message templates for quick responses to common customer inquiries.
                </p>
            </div>

            <button
                onClick={handleCreate}
                className="mb-6 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
                <Plus size={18} />
                Add Template
            </button>

            {/* Create/Edit Form */}
            {(isCreating || editingId) && (
                <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h4 className="font-semibold mb-4">
                        {isCreating ? 'Create New Template' : 'Edit Template'}
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Title
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Thank You"
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Message
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="e.g., Thank you for contacting us! We appreciate your interest."
                                rows={4}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={!formData.title || !formData.message}
                                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Save size={18} />
                                Save
                            </button>
                            <button
                                onClick={handleCancel}
                                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Templates List */}
            <div className="space-y-4">
                {templates.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-800 rounded-lg border border-slate-700">
                        <p>No templates yet. Click "Add Template" to create one.</p>
                    </div>
                ) : (
                    templates.map((template) => (
                        <div
                            key={template.id}
                            className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-lg">{template.title}</h4>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 whitespace-pre-wrap">{template.message}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
