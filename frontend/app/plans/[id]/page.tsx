'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plan, Chunk } from '../../types';
import CalendarView from '../../components/CalendarView';
import HorizontalTimeline from '../../components/HorizontalTimeline';
import EditTaskModal from '../../components/EditTaskModal';

export default function PlanView() {
    const params = useParams();
    const id = params?.id as string;

    const [plan, setPlan] = useState<Plan | null>(null);
    const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'board'>('timeline');

    // AI State
    const [suggestions, setSuggestions] = useState<Chunk[]>([]);
    const [showAIModal, setShowAIModal] = useState(false);
    const [loadingAI, setLoadingAI] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    // Edit State
    const [editingChunk, setEditingChunk] = useState<Chunk | null>(null);

    const fetchPlan = async () => {
        const res = await fetch(`http://localhost:8000/plans/${id}`);
        if (res.ok) {
            const data = await res.json();
            setPlan(data);
        }
    };

    useEffect(() => {
        if (id) fetchPlan();
    }, [id]);

    const triggerBreakdown = async () => {
        if (!plan) return;
        const res = await fetch(`http://localhost:8000/plans/${id}/breakdown`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            setPlan(data);
        }
    };

    const askAI = async () => {
        setLoadingAI(true);
        try {
            const res = await fetch(`http://localhost:8000/plans/${id}/suggest`, { method: 'POST' });
            if (res.ok) {
                const data: any[] = await res.json();
                const mapped: Chunk[] = data.map(d => ({
                    id: Math.random().toString(),
                    title: d.title,
                    description: d.description,
                    estimated_hours: d.estimated_hours,
                    duration_minutes: d.duration_minutes,
                    frequency: d.frequency,
                    status: 'TODO'
                }));
                setSuggestions(mapped);
                const allIdx = new Set(mapped.map((_, i) => i));
                setSelectedIndices(allIdx);
                setShowAIModal(true);
            }
        } catch (err) {
            alert("Failed to get suggestions");
        } finally {
            setLoadingAI(false);
        }
    };

    const toggleSelection = (index: number) => {
        const next = new Set(selectedIndices);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        setSelectedIndices(next);
    };

    const applySuggestions = async () => {
        const toAdd = suggestions.filter((_, i) => selectedIndices.has(i));
        await fetch(`http://localhost:8000/plans/${id}/chunks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toAdd)
        });
        setShowAIModal(false);
        fetchPlan();
    };

    // Drag and Drop Logic
    const onDragStart = (e: React.DragEvent, chunkId: string) => {
        e.dataTransfer.setData("chunkId", chunkId);
    };

    const onDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const chunkId = e.dataTransfer.getData("chunkId");

        // Optimistic Update
        if (plan) {
            const updatedChunks = plan.chunks.map(c =>
                c.id === chunkId ? { ...c, status: status as any } : c
            );
            setPlan({ ...plan, chunks: updatedChunks });
        }

        await fetch(`http://localhost:8000/plans/${id}/chunks/${chunkId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Handle Edit Save
    const saveTaskEdit = async (chunkId: string, updates: Partial<Chunk>) => {
        if (!plan) return;

        // Optimistic
        const updatedChunks = plan.chunks.map(c => c.id === chunkId ? { ...c, ...updates } : c);
        setPlan({ ...plan, chunks: updatedChunks });

        await fetch(`http://localhost:8000/plans/${id}/chunks/${chunkId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
    };

    if (!plan) return <div className="container">Loading...</div>;

    const todo = plan.chunks.filter(c => c.status === 'TODO');
    const doing = plan.chunks.filter(c => c.status === 'IN_PROGRESS');
    const done = plan.chunks.filter(c => c.status === 'DONE');

    return (
        <div className="container" style={{ position: 'relative' }}>
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', color: plan.color || undefined }}>{plan.title}</h1>
                        <p style={{ color: 'var(--secondary)' }}>{plan.description}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ background: 'var(--card-bg)', borderRadius: '8px', padding: '0.2rem', display: 'flex' }}>
                            <button
                                onClick={() => setViewMode('timeline')}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                    background: viewMode === 'timeline' ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'timeline' ? 'white' : 'var(--secondary)'
                                }}
                            >
                                Timeline
                            </button>
                            <button
                                onClick={() => setViewMode('calendar')}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                    background: viewMode === 'calendar' ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'calendar' ? 'white' : 'var(--secondary)'
                                }}
                            >
                                Calendar
                            </button>
                            <button
                                onClick={() => setViewMode('board')}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                    background: viewMode === 'board' ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'board' ? 'white' : 'var(--secondary)'
                                }}
                            >
                                Board
                            </button>
                        </div>
                        <button className="btn" onClick={askAI} disabled={loadingAI} style={{ background: 'var(--accent)' }}>
                            {loadingAI ? 'Thinking...' : '✨ Ask Gemini'}
                        </button>
                    </div>
                </div>
            </div>

            {plan.chunks.length === 0 && (
                <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                    <p style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>No tasks yet.</p>
                    <button className="btn" onClick={triggerBreakdown}>Auto-Breakdown Plan</button>
                </div>
            )}

            {/* Pass onEdit handlers? Actually the components don't emit clicks yet. 
                For prototype, let's just make the Board view items clickable for now 
                as modifying the complex components is risky in one shot. 
            */}

            {viewMode === 'timeline' && <HorizontalTimeline chunks={plan.chunks} planColor={plan.color} />}
            {viewMode === 'calendar' && <CalendarView chunks={plan.chunks} />}
            {viewMode === 'board' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <Column title="To Do" chunks={todo} color="var(--secondary)" status="TODO"
                        onDrop={onDrop} onDragOver={onDragOver} onDragStart={onDragStart}
                        onTaskClick={setEditingChunk}
                    />
                    <Column title="In Progress" chunks={doing} color="var(--primary)" status="IN_PROGRESS"
                        onDrop={onDrop} onDragOver={onDragOver} onDragStart={onDragStart}
                        onTaskClick={setEditingChunk}
                    />
                    <Column title="Done" chunks={done} color="var(--success)" status="DONE"
                        onDrop={onDrop} onDragOver={onDragOver} onDragStart={onDragStart}
                        onTaskClick={setEditingChunk}
                    />
                </div>
            )}

            {/* Edit Modal */}
            {editingChunk && (
                <EditTaskModal
                    chunk={editingChunk}
                    onClose={() => setEditingChunk(null)}
                    onSave={(updates) => saveTaskEdit(editingChunk.id, updates)}
                />
            )}

            {/* AI Modal */}
            {showAIModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100
                }}>
                    <div className="card" style={{ width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '1rem' }}>Gemini Suggestions</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            {suggestions.map((s, i) => (
                                <div key={i} style={{
                                    padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                                    display: 'flex', gap: '1rem', alignItems: 'start'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIndices.has(i)}
                                        onChange={() => toggleSelection(i)}
                                        style={{ marginTop: '0.3rem' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontWeight: 'bold' }}>{s.title}</h4>
                                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>{s.description}</p>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--accent)' }}>
                                            <span>⏱ {s.duration_minutes}m</span>
                                            <span>🔄 {s.frequency}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn" style={{ background: 'transparent', border: '1px solid var(--secondary)' }} onClick={() => setShowAIModal(false)}>Cancel</button>
                            <button className="btn" onClick={applySuggestions}>Add Selected Tasks</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Column({
    title, chunks, color, status, onDrop, onDragOver, onDragStart, onTaskClick
}: {
    title: string, chunks: Chunk[], color: string, status: string,
    onDrop: (e: React.DragEvent, status: string) => void,
    onDragOver: (e: React.DragEvent) => void,
    onDragStart: (e: React.DragEvent, id: string) => void,
    onTaskClick: (chunk: Chunk) => void
}) {
    return (
        <div
            onDrop={(e) => onDrop(e, status)}
            onDragOver={onDragOver}
            style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '12px', borderTop: `4px solid ${color}`, minHeight: '400px' }}
        >
            <h3 style={{ marginBottom: '1rem', color: color }}>{title} ({chunks.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {chunks.map(chunk => (
                    <div
                        key={chunk.id}
                        className="card"
                        draggable
                        onDragStart={(e) => onDragStart(e, chunk.id)}
                        onClick={() => onTaskClick(chunk)}
                        style={{ padding: '1rem', cursor: 'grab', position: 'relative' }}
                    >
                        {/* Edit Icon hint */}
                        <div style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.3, fontSize: '0.8rem' }}>✎</div>

                        <h4 style={{ fontSize: '1rem', paddingRight: '1rem' }}>{chunk.title}</h4>
                        {chunk.scheduled_date && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.5rem' }}>
                                📅 {new Date(chunk.scheduled_date).toLocaleDateString()}
                            </div>
                        )}
                        <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.2rem' }}>
                            {chunk.duration_minutes || 30}m • {chunk.frequency || 'Daily'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
