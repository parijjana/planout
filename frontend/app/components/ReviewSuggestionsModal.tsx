'use client';

import { useState } from 'react';
import { Chunk } from '../types';

interface ReviewSuggestionsModalProps {
    suggestions: Partial<Chunk>[]; // AI might return partials
    planDeadline?: string; // Passed from parent (initial suggestion)
    onConfirm: (tasks: any[], finalDeadline: string | null) => void;
    onCancel: () => void;
}

const calculateTaskDeadline = (totalHours: number, durationMinutes: number, frequency: string): string | null => {
    if (!totalHours || !durationMinutes) return null;

    const sessionHours = durationMinutes / 60.0;
    if (sessionHours <= 0) return null;

    const sessionsNeeded = totalHours / sessionHours;
    let multiplier = 1;
    if (frequency === 'Weekly') multiplier = 7;
    else if (frequency === 'Monthly') multiplier = 30;
    else if (frequency === 'Once') multiplier = 1; // Assuming consecutive days or just 1 day?

    const totalDays = Math.ceil(sessionsNeeded * multiplier);

    // Add days to now
    const d = new Date();
    d.setDate(d.getDate() + totalDays);
    return d.toISOString().split('T')[0];
};

export default function ReviewSuggestionsModal({ suggestions, planDeadline, onConfirm, onCancel }: ReviewSuggestionsModalProps) {
    // Local state to manage edits before confirming
    const [tasks, setTasks] = useState(suggestions.map((s, i) => ({ ...s, _id: i }))); // Add temp ID

    const [deadlineMode, setDeadlineMode] = useState<'computed' | 'custom' | 'perpetual'>('computed');
    const [customDate, setCustomDate] = useState(planDeadline || '');

    // Calculated Plan Deadline
    const getComputedPlanDeadline = (currentTasks: any[]) => {
        if (currentTasks.length === 0) return null;
        let maxDate = '';
        currentTasks.forEach(t => {
            if (t.deadline && t.deadline > maxDate) maxDate = t.deadline;
        });
        return maxDate || null;
    };

    const computedDate = getComputedPlanDeadline(tasks);

    const updateTask = (id: number, field: string, value: any) => {
        setTasks(prev => prev.map(t => {
            if (t._id !== id) return t;

            const updated = { ...t, [field]: value };

            // Auto-recalculate task deadline if drivers change
            if (['frequency', 'duration_minutes', 'estimated_hours'].includes(field)) {
                // Ensure values are numbers/valid
                const est = field === 'estimated_hours' ? value : updated.estimated_hours;
                const dur = field === 'duration_minutes' ? value : updated.duration_minutes;
                const freq = field === 'frequency' ? value : updated.frequency;

                const newDeadline = calculateTaskDeadline(Number(est), Number(dur), String(freq));
                if (newDeadline) updated.deadline = newDeadline;
            }

            return updated;
        }));
    };

    const removeTask = (id: number) => {
        setTasks(prev => prev.filter(t => t._id !== id));
    };

    const finalPlanDeadline = deadlineMode === 'perpetual' ? null
        : deadlineMode === 'custom' ? customDate
            : computedDate;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{ width: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent)', margin: 0 }}>Review AI Suggestions</h2>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            Modify or remove tasks before adding to your plan.
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--secondary)', textTransform: 'uppercase' }}>Target Completion</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                className="input-field"
                                value={deadlineMode}
                                onChange={e => setDeadlineMode(e.target.value as any)}
                                style={{ padding: '0.4rem', width: 'auto', background: 'rgba(255,255,255,0.1)' }}
                            >
                                <option value="computed">Auto-Calculated</option>
                                <option value="custom">Custom Date</option>
                                <option value="perpetual">Perpetual (None)</option>
                            </select>

                            {deadlineMode === 'custom' && (
                                <input
                                    type="date"
                                    className="input-field"
                                    value={customDate}
                                    onChange={e => setCustomDate(e.target.value)}
                                    style={{ padding: '0.4rem', width: 'auto' }}
                                />
                            )}
                        </div>
                        {deadlineMode === 'computed' && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>
                                Suggested: {computedDate ? new Date(computedDate).toLocaleDateString() : 'N/A'}
                            </div>
                        )}
                        {deadlineMode === 'perpetual' && (
                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                                Plan never ends
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
                    {tasks.map((task) => (
                        <div key={task._id} style={{
                            background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px',
                            border: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'flex-start'
                        }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <input
                                    className="input-field"
                                    value={task.title}
                                    onChange={e => updateTask(task._id, 'title', e.target.value)}
                                    placeholder="Task Title"
                                />
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <select
                                            className="input-field"
                                            value={task.frequency || 'Once'}
                                            onChange={e => updateTask(task._id, 'frequency', e.target.value)}
                                            style={{ padding: '0.3rem' }}
                                        >
                                            <option value="Once">Once</option>
                                            <option value="Daily">Daily</option>
                                            <option value="Weekly">Weekly</option>
                                            <option value="Monthly">Monthly</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="number" className="input-field"
                                            value={task.duration_minutes || 30}
                                            onChange={e => updateTask(task._id, 'duration_minutes', Number(e.target.value))}
                                            style={{ padding: '0.3rem' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={task.deadline || ''}
                                            onChange={e => updateTask(task._id, 'deadline', e.target.value)}
                                            style={{ padding: '0.3rem' }}
                                            title="Deadline"
                                        />
                                    </div>
                                </div>
                                <textarea
                                    className="input-field"
                                    value={task.description || ''}
                                    onChange={e => updateTask(task._id, 'description', e.target.value)}
                                    placeholder="Description"
                                    style={{ minHeight: '50px', fontSize: '0.9rem' }}
                                />
                            </div>
                            <button
                                onClick={() => removeTask(task._id)}
                                className="btn"
                                style={{ background: 'transparent', color: 'var(--destructive)', padding: '0.5rem' }}
                                title="Remove Task"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--secondary)', color: 'var(--foreground)' }} onClick={onCancel}>Cancel</button>
                    <button className="btn"
                        onClick={() => onConfirm(tasks.map(({ _id, ...rest }) => rest), finalPlanDeadline)} // Strip temp ID & Pass Deadline
                        style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
                    >
                        Confirm & Create Plan
                    </button>
                </div>
            </div>
        </div>
    );
}
