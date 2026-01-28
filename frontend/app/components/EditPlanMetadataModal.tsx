'use client';

import { useState } from 'react';
import { Plan } from '../types';

interface EditPlanMetadataModalProps {
    plan: Plan;
    onClose: () => void;
    onSave: (updates: { title: string, description: string, color: string, deadline: string | null }) => void;
}

export default function EditPlanMetadataModal({ plan, onClose, onSave }: EditPlanMetadataModalProps) {
    const [title, setTitle] = useState(plan.title);
    const [desc, setDesc] = useState(plan.description || '');
    const [color, setColor] = useState(plan.color || '#3b82f6');
    const [deadline, setDeadline] = useState(plan.deadline ? new Date(plan.deadline).toISOString().split('T')[0] : '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave({
            title,
            description: desc,
            color,
            deadline: deadline ? new Date(deadline).toISOString() : null
        });
        setSaving(false);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 800, backdropFilter: 'blur(5px)'
        }}>
            <div className="card" style={{ width: '500px', border: `1px solid ${color}`, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', background: 'linear-gradient(to right, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Edit Plan Details
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label className="label" style={{ color: 'var(--secondary)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Plan Title</label>
                        <input
                            className="input-field"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            style={{ fontSize: '1.1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}
                        />
                    </div>

                    <div>
                        <label className="label" style={{ color: 'var(--secondary)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Description</label>
                        <textarea
                            className="input-field"
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            style={{ minHeight: '100px', background: 'rgba(0,0,0,0.2)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <div style={{ flex: 1 }}>
                            <label className="label" style={{ color: 'var(--secondary)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Theme Color</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                    style={{ width: '50px', height: '50px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                />
                                <span style={{ color: color, fontWeight: 'bold' }}>{color}</span>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label" style={{ color: 'var(--secondary)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Target Completion</label>
                            <input
                                type="date"
                                className="input-field"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label" style={{ color: 'var(--secondary)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Tasks ({plan.chunks.length})</label>
                        <div style={{
                            maxHeight: '200px', overflowY: 'auto',
                            background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem',
                            display: 'flex', flexDirection: 'column', gap: '0.5rem'
                        }}>
                            {plan.chunks.length === 0 ? (
                                <p style={{ color: 'var(--secondary)', fontStyle: 'italic' }}>No tasks yet.</p>
                            ) : (
                                plan.chunks.map(chunk => (
                                    <div key={chunk.id} style={{
                                        padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <span style={{ fontWeight: 500 }}>{chunk.title}</span>
                                        <span style={{
                                            fontSize: '0.8rem',
                                            padding: '0.2rem 0.6rem', borderRadius: '4px',
                                            background: chunk.status === 'DONE' ? 'rgba(16, 185, 129, 0.2)' :
                                                chunk.status === 'IN_PROGRESS' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                            color: chunk.status === 'DONE' ? '#10b981' :
                                                chunk.status === 'IN_PROGRESS' ? '#60a5fa' : '#94a3b8'
                                        }}>
                                            {chunk.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem' }}>
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--secondary)' }} onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn" onClick={handleSave} disabled={saving} style={{ background: color, color: '#fff' }}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
