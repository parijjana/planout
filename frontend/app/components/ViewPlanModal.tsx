'use client';

import { useState } from 'react';
import { Plan, Chunk } from '../types';
import EditTaskModal from './EditTaskModal';

interface ViewPlanModalProps {
    plan: Plan;
    onClose: () => void;
    onLaunchCalendar: () => void;
    onPlanUpdated: () => void; // Trigger refresh in parent
}

const FlagIcon = ({ color, size = 16 }: { color: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ minWidth: size }}>
        <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
    </svg>
);

const calculateTaskStats = (chunk: Chunk, planDeadline?: string) => {
    if (!chunk.frequency || chunk.frequency === 'Once') {
        const isSkipped = chunk.history?.skipped?.length || 0;
        return { total: 1, past: 0, completed: 1 - isSkipped, skipped: isSkipped, future: 0, label: 'Single Task' };
    }

    const start = chunk.scheduled_date ? new Date(chunk.scheduled_date) : new Date();
    const end = chunk.deadline ? new Date(chunk.deadline) : (planDeadline ? new Date(planDeadline) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)));

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (end < start) return { total: 0, past: 0, completed: 0, skipped: 0, future: 0, label: 'Invalid Range' };

    let count = 0;
    let past = 0;
    let skipped = 0;
    let future = 0;

    // Iterate
    let ptr = new Date(start);
    const now = new Date();

    while (ptr <= end) {
        count++;
        const targetStr = ptr.toISOString().split('T')[0];
        const isSkipped = chunk.history?.skipped?.includes(targetStr);

        if (ptr < now) {
            past++;
            if (isSkipped) skipped++;
        }
        else {
            future++;
            // Future skips? Usually not, but logically feasible if planned ahead.
            if (isSkipped) skipped++; // Should we count future skips? Or keep them as future?
            // "Skipped" usually implies Past.
            // If I skip a future task, it is "Skipped" state.
            // Let's count it as skipped so it doesn't show as "Pending Future".
            // But 'future' var usually means "Pending".
            // If skipped, subtract from future?
            if (ptr >= now && isSkipped) future--;
        }

        if (chunk.frequency === 'Daily') ptr.setDate(ptr.getDate() + 1);
        else if (chunk.frequency === 'Weekly') ptr.setDate(ptr.getDate() + 7);
        else if (chunk.frequency === 'Monthly') ptr.setMonth(ptr.getMonth() + 1);
        else break;

        if (count > 1000) break;
    }

    // Completed = Past - (Past Skips)
    // Actually `past` variable above counts ALL past occurrences.
    // If we incremented `skipped` for past ones, then `completed = past - skipped (past ones)`.
    // My loop logic: `if (ptr < now) { past++; if(isSkipped) skipped++; }`
    // So `skipped` holds past skips.
    // `completed` = past - skipped.
    const completed = Math.max(0, past - skipped); // Safety

    return { total: count, past, completed, skipped, future, label: `${chunk.frequency} Cycle` };
};

export default function ViewPlanModal({ plan, onClose, onLaunchCalendar, onPlanUpdated }: ViewPlanModalProps) {
    const [editingChunk, setEditingChunk] = useState<Chunk | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // ... (Handlers) ...

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 950, backdropFilter: 'blur(5px)'
        }}>
            <div className="card" style={{
                width: '700px', maxHeight: '85vh', overflowY: 'auto',
                border: `1px solid ${plan.color}`, background: 'var(--background)',
                display: 'flex', flexDirection: 'column'
            }}>
                {/* Header ... */}
                {/* ... (Keep Header & Actions Same) ... */}
                <div style={{
                    paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', color: plan.color, marginBottom: '0.5rem' }}>{plan.title}</h2>
                        <p style={{ color: 'var(--secondary)' }}>{plan.description || "No description"}</p>
                        <div style={{ marginTop: '0.5rem', color: 'var(--foreground)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--secondary)' }}>Target Completion:</span>
                            {plan.deadline ? (
                                <span style={{ fontWeight: 'bold' }}>{new Date(plan.deadline).toLocaleDateString()}</span>
                            ) : (
                                <span style={{ color: 'var(--secondary)', fontStyle: 'italic' }}>None</span>
                            )}
                        </div>
                    </div>
                    <button className="btn" onClick={onClose} style={{ background: 'transparent', fontSize: '1.5rem', color: 'var(--secondary)' }}>&times;</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <button className="btn"
                        onClick={() => { setEditingChunk(null); setShowEditModal(true); }}
                        style={{ background: 'var(--primary)', color: 'white' }}
                    >
                        + Add Task
                    </button>
                    <button className="btn"
                        onClick={onLaunchCalendar}
                        style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                    >
                        📅 Calendar
                    </button>
                </div>

                {/* Task List */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {plan.chunks.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--secondary)', margin: '2rem 0' }}>No tasks yet.</p>
                    ) : (
                        plan.chunks.map(chunk => {
                            const stats = calculateTaskStats(chunk, plan.deadline);
                            return (
                                <div key={chunk.id}
                                    style={{
                                        background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px',
                                        display: 'flex', flexDirection: 'column', gap: '0.5rem',
                                        border: '1px solid var(--border)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <FlagIcon color={plan.color || '#3b82f6'} size={18} />
                                        <div style={{ flex: 1, fontWeight: 600 }}>{chunk.title}</div>
                                        <button className="btn"
                                            onClick={() => { setEditingChunk(chunk); setShowEditModal(true); }}
                                            style={{ padding: '0.3rem', background: 'transparent', opacity: 0.7 }}
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                    </div>

                                    {/* Stats Row */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'minmax(60px, 1fr) 0.8fr 1fr 1fr 1fr',
                                        gap: '0.5rem', fontSize: '0.8rem',
                                        background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px'
                                    }}>
                                        <div>
                                            <div style={{ color: 'var(--secondary)', fontSize: '0.7rem' }}>Schedule</div>
                                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chunk.frequency || 'Once'}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--secondary)', fontSize: '0.7rem' }}>Total</div>
                                            <div style={{ fontWeight: 'bold' }}>{stats.total}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--success)', fontSize: '0.7rem' }}>Done</div>
                                            <div style={{ color: 'var(--success)' }}>{stats.completed}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Skip</div>
                                            <div style={{ color: '#94a3b8' }}>{stats.skipped}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: '#3b82f6', fontSize: '0.7rem' }}>Future</div>
                                            <div style={{ color: 'var(--primary)' }}>{stats.future}</div>
                                        </div>
                                    </div>

                                    {/* Status Footer */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.2rem' }}>
                                        <div>Duration: {chunk.duration_minutes}m</div>
                                        <div style={{
                                            color: chunk.status === 'DONE' ? 'var(--success)' :
                                                chunk.status === 'IN_PROGRESS' ? 'var(--primary)' : 'var(--secondary)'
                                        }}>
                                            Current Status: {chunk.status}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {showEditModal && (
                <EditTaskModal
                    chunk={editingChunk || undefined}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleSaveTask}
                    onDelete={editingChunk ? handleDeleteTask : undefined}
                />
            )}
        </div>
    );
}
