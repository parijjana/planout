'use client';

import { useState, useEffect } from 'react';
import ApiKeyInstructionsModal from './ApiKeyInstructionsModal';
import ReviewSuggestionsModal from './ReviewSuggestionsModal';

interface CreatePlanModalProps {
    onClose: () => void;
    onCreated: (id: string) => void;
    onOpenSettings: (draft?: { title: string; desc: string; color: string; deadline: string }) => void;
    existingColors?: string[];
    initialData?: {
        title: string;
        desc: string;
        color: string;
        deadline: string;
    } | null;
}

const PALETTE = [
    '#ef4444', // Red 500
    '#f97316', // Orange 500
    '#f59e0b', // Amber 500
    '#84cc16', // Lime 500
    '#10b981', // Emerald 500
    '#06b6d4', // Cyan 500
    '#3b82f6', // Blue 500 (Default)
    '#6366f1', // Indigo 500
    '#8b5cf6', // Violet 500
    '#d946ef', // Fuchsia 500
    '#f43f5e', // Rose 500
    '#64748b', // Slate 500
];

export default function CreatePlanModal({ onClose, onCreated, onOpenSettings, existingColors = [], initialData }: CreatePlanModalProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [desc, setDesc] = useState(initialData?.desc || '');
    const [color, setColor] = useState(initialData?.color || '#3b82f6');
    const [deadline, setDeadline] = useState(initialData?.deadline || '');
    const [loading, setLoading] = useState(false);

    // AI Integration State
    const [aiConfigured, setAiConfigured] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [tempPlanId, setTempPlanId] = useState<string | null>(null);

    useEffect(() => {
        // Only randomize color if no initial data provided
        if (!initialData) {
            const available = PALETTE.filter(c => !existingColors.includes(c));
            const finalPool = available.length > 0 ? available : PALETTE;
            const randomColor = finalPool[Math.floor(Math.random() * finalPool.length)];
            setColor(randomColor);
        }

        // Check AI Status (Backend + LocalStorage)
        const localKey = localStorage.getItem('gemini_api_key');

        fetch('http://localhost:8000/config/ai-status')
            .then(res => res.json())
            .then(data => {
                // Configured if backend has key OR frontend has key
                setAiConfigured(data.configured || !!localKey);
            })
            .catch(err => {
                console.error("AI Status Check Failed", err);
                if (localKey) setAiConfigured(true);
            });
    }, []);

    const handleCreate = async (withAI = false) => {
        console.log('[CreatePlanModal] handleCreate called. withAI:', withAI, 'aiConfigured:', aiConfigured);

        // 1. Check AI Configuration FIRST (Priority: Redirect to Settings)
        if (withAI && !aiConfigured) {
            console.log('[CreatePlanModal] Redirecting to settings via onOpenSettings');
            // Save whatever we have (even if empty) to draft
            onOpenSettings({ title, desc, color, deadline });
            return;
        }

        // 2. Validation (Block actual plan creation if title is missing)
        if (!title) {
            alert("Please enter a plan title.");
            return;
        }

        setLoading(true);
        // ... (rest of function unmodified logic start)
        try {
            // 1. Create Plan
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/plans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title, description: desc, color,
                    deadline: deadline ? new Date(deadline).toISOString() : null
                })
            });

            if (res.ok) {
                const data = await res.json();
                const planId = data.id;
                setTempPlanId(planId);

                if (withAI) {
                    // 2. Fetch Suggestions
                    const apiKey = localStorage.getItem('gemini_api_key') || '';
                    const aiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/plans/${planId}/suggest`, {
                        method: 'POST',
                        headers: {
                            'x-gemini-api-key': apiKey
                        }
                    });
                    if (aiRes.ok) {
                        const suggestions = await aiRes.json();
                        if (suggestions && suggestions.length > 0) {
                            setSuggestions(suggestions);
                            setShowReview(true);
                        } else {
                            alert("AI could not generate specific tasks. Plan created successfully.");
                            onCreated(planId);
                        }
                    } else {
                        const err = await aiRes.text();
                        try {
                            const errJson = JSON.parse(err);
                            alert(`AI Request Failed: ${errJson.detail || err}`);
                        } catch {
                            alert(`AI Request Failed: ${err}`);
                        }
                    }
                } else {
                    onCreated(planId);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // ... (handleConfirmTasks, handleCancelReview unmodified)
    const handleConfirmTasks = async (finalTasks: any[], finalDeadline: string | null) => {
        if (!tempPlanId) return;
        setLoading(true);
        try {
            await fetch(`http://localhost:8000/plans/${tempPlanId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deadline: finalDeadline })
            });

            await fetch(`http://localhost:8000/plans/${tempPlanId}/chunks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalTasks.map(s => ({
                    title: s.title || 'Untitled Task',
                    description: s.description || '',
                    estimated_hours: s.estimated_hours || 1,
                    duration_minutes: s.duration_minutes || 30,
                    frequency: s.frequency || 'Daily',
                    deadline: s.deadline || null,
                    status: 'TODO'
                })))
            });
            onCreated(tempPlanId);
        } catch (e) {
            console.error(e);
            onCreated(tempPlanId);
        } finally {
            setLoading(false);
            setShowReview(false);
        }
    };

    const handleCancelReview = () => {
        if (tempPlanId) onCreated(tempPlanId);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 300
        }}>
            <div className="card" style={{ width: '500px' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Start a New Plan</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="label">Plan Title</label>
                        <input
                            className="input-field"
                            placeholder="e.g. Learn Guitar"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="label">Description / Goal</label>
                        <textarea
                            className="input-field"
                            placeholder="Describe your goal..."
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            style={{ minHeight: '100px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label className="label" style={{ marginBottom: 0 }}>Color Identifier</label>
                            <input
                                type="color"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                style={{ background: 'transparent', border: 'none', width: '40px', height: '40px', cursor: 'pointer' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label">Target End Date</label>
                            <input
                                type="date"
                                className="input-field"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--secondary)', color: 'var(--foreground)' }} onClick={onClose}>Cancel</button>
                    <button className="btn" onClick={() => handleCreate(false)} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Manual Plan'}
                    </button>
                    <button className="btn"
                        onClick={() => handleCreate(true)}
                        disabled={loading}
                        style={{ background: 'var(--accent)', border: 'none', color: 'var(--background)', fontWeight: 'bold' }}
                    >
                        {loading ? 'Thinking...' : (aiConfigured ? '✨ Ask AI' : '⚠️ Add API Key')}
                    </button>
                </div>
            </div>

            {showReview && (
                <ReviewSuggestionsModal
                    suggestions={suggestions}
                    planDeadline={deadline}
                    onConfirm={handleConfirmTasks}
                    onCancel={handleCancelReview}
                />
            )}
        </div>
    );
}
