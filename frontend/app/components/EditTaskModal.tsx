'use client';

import { useState, useEffect } from 'react';
import { Chunk } from '../types';
import ApiKeyInstructionsModal from './ApiKeyInstructionsModal';

interface EditTaskModalProps {
    chunk?: Chunk; // Optional for creation
    onClose: () => void;
    onSave: (chunk: Chunk | Partial<Chunk>) => void; // Can pass full object for creation
    onDelete?: (id: string) => void;
}

export default function EditTaskModal({ chunk, onClose, onSave, onDelete }: EditTaskModalProps) {
    const isNew = !chunk;
    const [title, setTitle] = useState(chunk?.title || '');
    const [desc, setDesc] = useState(chunk?.description || '');
    const [duration, setDuration] = useState(chunk?.duration_minutes || 30);
    const [frequency, setFrequency] = useState(chunk?.frequency || 'Once');
    const [deadline, setDeadline] = useState(chunk?.deadline ? chunk.deadline.split('T')[0] : '');

    const [saving, setSaving] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [aiConfigured, setAiConfigured] = useState(false);

    useEffect(() => {
        // Check AI Status
        fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/config/ai-status`)
            .then(res => res.json())
            .then(data => setAiConfigured(data.configured))
            .catch(err => console.error("AI Status Check Failed", err));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const payload: any = {
            title,
            description: desc,
            duration_minutes: duration,
            frequency: frequency,
            deadline: deadline ? new Date(deadline).toISOString() : null
        };

        if (isNew) {
            await onSave({
                ...payload,
                status: 'TODO',
                estimated_hours: 1
            });
        } else {
            await onSave({
                ...chunk,
                ...payload
            });
        }
        setSaving(false);
        onClose();
    };

    const handleDelete = () => {
        if (chunk && onDelete && confirm("Delete this task?")) {
            onDelete(chunk.id);
            onClose();
        }
    }

    const handleAutoFill = async () => {
        if (!aiConfigured) {
            setShowInstructions(true);
            return;
        }

        if (!title) return;
        setSaving(true);
        try {
            const apiKey = localStorage.getItem('gemini_api_key') || '';
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/chunks/suggest_details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-gemini-api-key': apiKey },
                body: JSON.stringify({ title })
            });
            if (res.ok) {
                const data = await res.json();
                setDesc(data.description);
                setDuration(data.duration_minutes);
                setFrequency(data.frequency);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 700, backdropFilter: 'blur(5px)'
        }}>
            <div className="card" style={{ width: '500px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, background: 'linear-gradient(to right, #fff, #bbb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {isNew ? 'Add New Task' : 'Edit Task'}
                    </h2>
                    {!isNew && onDelete && (
                        <button onClick={handleDelete}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px',
                                transition: 'all 0.2s'
                            }}
                            title="Delete Task"
                        >
                            <span style={{ fontSize: '1.2rem' }}>🗑️</span>
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label className="label" style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Title</label>
                        <input
                            className="input-field"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            autoFocus
                            style={{ fontSize: '1.1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem' }}
                        />
                    </div>

                    <div>
                        <label className="label" style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Description</label>
                        <textarea
                            className="input-field"
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            style={{ minHeight: '100px', background: 'rgba(0,0,0,0.2)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label className="label" style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Duration (min)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={duration}
                                onChange={e => setDuration(Number(e.target.value))}
                                step={15}
                                style={{ background: 'rgba(0,0,0,0.2)' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label" style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Frequency</label>
                            <select
                                className="input-field"
                                value={frequency}
                                onChange={e => setFrequency(e.target.value as any)}
                                style={{ background: 'rgba(0,0,0,0.2)' }}
                            >
                                <option value="Once">Once</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label" style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>End Date (Optional)</label>
                            <input
                                type="date"
                                className="input-field"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                style={{ background: 'rgba(0,0,0,0.2)' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
                    <button className="btn"
                        onClick={handleAutoFill}
                        disabled={saving || (!title && aiConfigured)}
                        style={{ background: 'var(--accent)', color: 'black', border: 'none', marginRight: 'auto' }}
                    >
                        {saving ? 'Thinking...' : (aiConfigured ? '✨ Ask AI' : '⚠️ Add API Key')}
                    </button>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--secondary)' }} onClick={onClose}>Cancel</button>
                        <button className="btn" onClick={handleSave} disabled={saving} style={{ background: 'var(--primary)', color: 'white' }}>
                            {saving ? 'Saving...' : (isNew ? 'Add Task' : 'Save Changes')}
                        </button>
                    </div>
                </div>
            </div>

            {showInstructions && (
                <ApiKeyInstructionsModal onClose={() => setShowInstructions(false)} />
            )}
        </div>
    );
}
