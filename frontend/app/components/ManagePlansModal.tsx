'use client';

import { Plan } from '../types';

interface ManagePlansModalProps {
    plans: Plan[];
    onClose: () => void;
    onViewPlan: (id: string) => void;
    onCreatePlan: () => void;
    onDeletePlan: (id: string) => void;
}

const calculatePlanProgress = (plan: Plan) => {
    let totalMinutes = 0;
    let completedMinutes = 0;
    const now = new Date();
    // Default to 1 year horizon if no deadline, to show meaningful annual progress
    const deadline = plan.deadline ? new Date(plan.deadline) : new Date(new Date().setFullYear(now.getFullYear() + 1));
    deadline.setHours(23, 59, 59, 999);

    plan.chunks.forEach(chunk => {
        const duration = chunk.duration_minutes || 30; // Default 30m if missing

        if (!chunk.frequency || chunk.frequency === 'Once') {
            totalMinutes += duration;
            if (chunk.status === 'DONE') completedMinutes += duration;
        } else {
            let ptr = chunk.scheduled_date ? new Date(chunk.scheduled_date) : new Date();
            ptr.setHours(0, 0, 0, 0);
            const chunkDeadline = chunk.deadline ? new Date(chunk.deadline) : null;
            // Use the tighter deadline (Task vs Plan)
            const effectiveEnd = chunkDeadline && chunkDeadline < deadline ? chunkDeadline : deadline;

            let count = 0;
            let pastDone = 0; // "Implied Done" (Past & Not Skipped)

            // Limit loop to avoid browser hang on infinite dates
            let safety = 0;
            while (ptr <= effectiveEnd && safety < 3000) {
                safety++;
                count++;
                if (ptr < now) {
                    const dStr = ptr.toISOString().split('T')[0];
                    const isSkipped = chunk.history?.skipped?.includes(dStr);
                    if (!isSkipped) pastDone++;
                }

                if (chunk.frequency === 'Daily') ptr.setDate(ptr.getDate() + 1);
                else if (chunk.frequency === 'Weekly') ptr.setDate(ptr.getDate() + 7);
                else if (chunk.frequency === 'Monthly') ptr.setMonth(ptr.getMonth() + 1);
                else break;
            }
            totalMinutes += count * duration;
            completedMinutes += pastDone * duration;
        }
    });

    return totalMinutes === 0 ? 0 : Math.min(100, Math.round((completedMinutes / totalMinutes) * 100));
};

export default function ManagePlansModal({ plans, onClose, onViewPlan, onCreatePlan, onDeletePlan }: ManagePlansModalProps) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 900, backdropFilter: 'blur(5px)'
        }}>
            <div className="card" style={{
                width: '800px', maxHeight: '80vh', overflowY: 'auto',
                border: '1px solid var(--border)', background: 'var(--background)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '2rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Manage Plans
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn" onClick={onCreatePlan} style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                            + New Plan
                        </button>
                        <button className="btn" onClick={onClose} style={{ background: 'transparent', fontSize: '1.5rem', padding: '0.5rem', color: 'var(--secondary)' }}>
                            &times;
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>

                    {/* Create New Card */}
                    <div
                        onClick={onCreatePlan}
                        style={{
                            border: '2px dashed var(--secondary)', borderRadius: '12px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            minHeight: '150px', cursor: 'pointer', transition: 'all 0.2s',
                            opacity: 0.7
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                    >
                        <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>+</span>
                        <span style={{ fontWeight: 600 }}>Create New Plan</span>
                    </div>

                    {/* Existing Plans */}
                    {plans.map(plan => {
                        const progress = calculatePlanProgress(plan);
                        return (
                            <div key={plan.id} style={{ position: 'relative' }}>
                                <div
                                    onClick={() => onViewPlan(plan.id)}
                                    className="card"
                                    style={{
                                        height: '100%', minHeight: '150px',
                                        borderLeft: `6px solid ${plan.color || '#3b82f6'}`,
                                        cursor: 'pointer', transition: 'transform 0.2s',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{plan.title}</h3>
                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--primary)', color: 'white' }}>Active</span>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                            {plan.description || "No description"}
                                        </p>
                                    </div>

                                    <div style={{ marginTop: '1rem' }}>
                                        {/* Progress Bar */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem', color: 'var(--secondary)' }}>
                                            <span>{progress}% Complete</span>
                                            <span>{plan.chunks.length} tasks</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${progress}%`, height: '100%',
                                                background: plan.color || '#3b82f6',
                                                transition: 'width 0.5s ease-out'
                                            }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Delete Button (Outside click area) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Are you sure you want to delete "${plan.title}"? This cannot be undone.`)) {
                                            onDeletePlan(plan.id);
                                        }
                                    }}
                                    style={{
                                        position: 'absolute', top: '10px', right: '10px',
                                        background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '4px',
                                        color: '#ef4444', cursor: 'pointer', padding: '0.3rem',
                                        zIndex: 10
                                    }}
                                    title="Delete Plan"
                                >
                                    🗑️
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
