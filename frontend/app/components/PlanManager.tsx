'use client';

import { useState, useEffect, useRef } from 'react';
import { Plan, Chunk } from '../types';
import CalendarView from './CalendarView';

import EditTaskModal from './EditTaskModal';
import EditPlanMetadataModal from './EditPlanMetadataModal';
import DeferModal from './DeferModal';

interface PlanManagerProps {
    planId: string;
    initialFocusTaskId?: string;
    initialViewMode?: 'board' | 'calendar';
    initialCalendarMode?: 'day' | 'week' | 'month' | 'year'; // Specific granularity
    initialDate?: Date;
    onClose: () => void;
    onOpenOverview: () => void;
}

export default function PlanManager({ planId, initialFocusTaskId, initialViewMode, initialCalendarMode, initialDate, onClose, onOpenOverview }: PlanManagerProps) {
    const [plan, setPlan] = useState<Plan | null>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'board'>(initialViewMode || 'board');
    const [boardDate, setBoardDate] = useState<Date | null>(initialDate || null);

    // AI State
    const [suggestions, setSuggestions] = useState<Chunk[]>([]);
    const [showAIModal, setShowAIModal] = useState(false);
    const [loadingAI, setLoadingAI] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    // Edit State
    const [editingChunk, setEditingChunk] = useState<Chunk | null>(null);
    const [activeDeferChunk, setActiveDeferChunk] = useState<Chunk | null>(null);
    const [showDeferModal, setShowDeferModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditPlanModal, setShowEditPlanModal] = useState(false);
    const [editPlanTitle, setEditPlanTitle] = useState(false);
    const [editPlanDesc, setEditPlanDesc] = useState(false);
    const [tempTitle, setTempTitle] = useState('');
    const [tempDesc, setTempDesc] = useState('');

    const taskRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Define API_URL once
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const fetchPlan = async () => {
        if (!planId) return;
        try {
            const res = await fetch(`${API_URL}/plans/${planId}`);
            if (res.ok) {
                const data = await res.json();
                setPlan(data);
                setTempTitle(data.title);
                setTempDesc(data.description);
            }
        } catch (e) {
            console.error("Failed to fetch plan", e);
        }
    };

    useEffect(() => {
        if (planId) fetchPlan();
    }, [planId]);

    // Focus Logic
    useEffect(() => {
        if (plan && initialFocusTaskId && taskRefs.current[initialFocusTaskId]) {
            taskRefs.current[initialFocusTaskId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const el = taskRefs.current[initialFocusTaskId];
            if (el) {
                el.style.border = '2px solid yellow';
                setTimeout(() => {
                    el.style.border = 'none';
                    el.style.boxShadow = '0 0 15px rgba(255,255,0,0.5)';
                }, 0);
                setTimeout(() => {
                    el.style.boxShadow = 'none';
                }, 2000);
            }
        }
    }, [plan, initialFocusTaskId, viewMode]);

    const updatePlanDetails = async () => {
        if (!plan) return;
        setPlan({ ...plan, title: tempTitle, description: tempDesc });
        setEditPlanTitle(false);
        setEditPlanDesc(false);

        await fetch(`${API_URL}/plans/${planId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: tempTitle, description: tempDesc })
        });
    };

    const handleUpdatePlanMetadata = async (updates: { title: string, description: string, color: string, deadline: string | null }) => {
        if (!plan) return;
        // Optimistic
        setPlan({ ...plan, ...updates, deadline: updates.deadline || undefined });

        await fetch(`${API_URL}/plans/${planId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
    };

    const askAI = async () => {
        setLoadingAI(true);
        try {
            const apiKey = localStorage.getItem('gemini_api_key') || '';
            const res = await fetch(`${API_URL}/plans/${planId}/suggest`, {
                method: 'POST',
                headers: {
                    'x-gemini-api-key': apiKey
                }
            });
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
        await fetch(`${API_URL}/plans/${planId}/chunks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toAdd)
        });
        setShowAIModal(false);
        fetchPlan();
    };

    const handleCreateTask = async (data: any) => {
        if (!plan) return;
        // The endpoint usually accepts a list
        await fetch(`${API_URL}/plans/${planId}/chunks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([data])
        });
        fetchPlan();
    };

    const handleDeleteTask = async (chunkId: string) => {
        if (!plan) return;
        // Optimistic
        const updatedChunks = plan.chunks.filter(c => c.id !== chunkId);
        setPlan({ ...plan, chunks: updatedChunks });

        await fetch(`${API_URL}/plans/${planId}/chunks/${chunkId}`, {
            method: 'DELETE'
        });
    };

    // Drag and Drop Logic
    const onDragStart = (e: React.DragEvent, chunkId: string) => {
        e.dataTransfer.setData("chunkId", chunkId);
    };

    const handleSkip = async (chunk: Chunk) => {
        if (!plan || !chunk.scheduled_date) return;
        const skipDate = boardDate ? boardDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // 1. Update History
        const newHistory = { ...chunk.history || {} };
        newHistory.skipped = [...(newHistory.skipped || []), skipDate];

        // 2. Extend Deadline (Add 1 occurrence)
        let newDeadline = chunk.deadline ? new Date(chunk.deadline) : new Date(chunk.scheduled_date);
        if (chunk.frequency === 'Daily') newDeadline.setDate(newDeadline.getDate() + 1);
        else if (chunk.frequency === 'Weekly') newDeadline.setDate(newDeadline.getDate() + 7);
        else if (chunk.frequency === 'Monthly') newDeadline.setMonth(newDeadline.getMonth() + 1);

        // Optimistic Chunk Update
        const updatedChunks = plan.chunks.map(c =>
            c.id === chunk.id ? { ...c, history: newHistory, deadline: newDeadline.toISOString(), status: 'SKIPPED' as any } : c
        );

        // Optimistic Plan Deadline Update
        const newPlanDeadline = updatedChunks.reduce((max, c) => {
            const d = c.deadline ? new Date(c.deadline) : (c.scheduled_date ? new Date(c.scheduled_date) : new Date());
            return d > max ? d : max;
        }, new Date(plan.deadline || 0)); // Use existing as baseline

        setPlan({ ...plan, chunks: updatedChunks, deadline: newPlanDeadline.toISOString() });

        // API
        await fetch(`${API_URL}/plans/${planId}/chunks/${chunk.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history: newHistory,
                deadline: newDeadline.toISOString(),
                status: 'SKIPPED'
            })
        });
    };

    const confirmDefer = async (newDate: string) => {
        if (!activeDeferChunk || !plan) return;
        const currentTargetDate = boardDate ? boardDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // Update History
        const newHistory = { ...activeDeferChunk.history || {} };
        newHistory.deferred = { ...(newHistory.deferred || {}), [currentTargetDate]: newDate };

        // Optimistic
        const updatedChunks = plan.chunks.map(c =>
            c.id === activeDeferChunk.id ? { ...c, history: newHistory } : c
        );
        setPlan({ ...plan, chunks: updatedChunks });
        setShowDeferModal(false);
        setActiveDeferChunk(null);

        // API
        await fetch(`${API_URL}/plans/${planId}/chunks/${activeDeferChunk.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: newHistory })
        });
    };

    const onDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const chunkId = e.dataTransfer.getData("chunkId");
        if (!plan) return;
        const chunk = plan.chunks.find(c => c.id === chunkId);
        if (!chunk) return;

        if (status === 'SKIPPED') {
            await handleSkip(chunk);
            return;
        }

        if (status === 'DEFERRED') {
            setActiveDeferChunk(chunk);
            setShowDeferModal(true);
            return;
        }

        // Standard Update

        // Check for Un-Skip (Moving FROM Skipped back to Active)
        const targetStr = boardDate ? boardDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const isSkippedInstance = chunk.history?.skipped?.includes(targetStr);

        if (isSkippedInstance && status !== 'SKIPPED') {
            // 1. Remove from history
            const newHistory = { ...chunk.history || {} };
            newHistory.skipped = (newHistory.skipped || []).filter(d => d !== targetStr);

            // 2. Revert Deadline (Subtract 1 occurrence)
            let newDeadline = chunk.deadline ? new Date(chunk.deadline) : (chunk.scheduled_date ? new Date(chunk.scheduled_date) : new Date());
            if (chunk.frequency === 'Daily') newDeadline.setDate(newDeadline.getDate() - 1);
            else if (chunk.frequency === 'Weekly') newDeadline.setDate(newDeadline.getDate() - 7);
            else if (chunk.frequency === 'Monthly') newDeadline.setMonth(newDeadline.getMonth() - 1);

            // Safety check
            const scheduled = chunk.scheduled_date ? new Date(chunk.scheduled_date) : new Date();
            if (newDeadline < scheduled) newDeadline = scheduled;

            // Optimistic Update
            const updatedChunks = plan.chunks.map(c =>
                c.id === chunkId ? { ...c, status: status as any, history: newHistory, deadline: newDeadline.toISOString() } : c
            );

            // Recalculate Plan Deadline
            const newPlanDeadline = updatedChunks.reduce((max, c) => {
                const d = c.deadline ? new Date(c.deadline) : (c.scheduled_date ? new Date(c.scheduled_date) : new Date());
                return d > max ? d : max;
            }, new Date(0));

            setPlan({ ...plan, chunks: updatedChunks, deadline: newPlanDeadline.toISOString() });

            await fetch(`${API_URL}/plans/${planId}/chunks/${chunkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: status, history: newHistory, deadline: newDeadline.toISOString() })
            });
            return;
        }

        // Normal Update (Status Only)
        // Optimistic Update
        const updatedChunks = plan.chunks.map(c =>
            c.id === chunkId ? { ...c, status: status as any } : c
        );
        setPlan({ ...plan, chunks: updatedChunks });

        await fetch(`${API_URL}/plans/${planId}/chunks/${chunkId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Handle Edit Save
    const saveTaskEdit = async (chunkId: string | object | Chunk | Partial<Chunk>, updates?: Partial<Chunk>) => {
        if (!plan) return;

        const data = chunkId as any;

        if (data.id && updates === undefined) {
            // EDIT scenario
            const id = data.id;
            // Optimistic
            const updatedChunks = plan.chunks.map(c => c.id === id ? { ...c, ...data } : c);
            setPlan({ ...plan, chunks: updatedChunks });

            await fetch(`${API_URL}/plans/${planId}/chunks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else if (!data.id) {
            // CREATE scenario
            handleCreateTask(data);
        } else if (typeof chunkId === 'string' && updates) {
            // Legacy signature support
            const updatedChunks = plan.chunks.map(c => c.id === chunkId ? { ...c, ...updates } : c);
            setPlan({ ...plan, chunks: updatedChunks });

            await fetch(`${API_URL}/plans/${planId}/chunks/${chunkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
        }
    };

    if (!plan) return <div className="p-4">Loading Plan...</div>;



    // Helpers
    const isChunkActiveOnDate = (chunk: Chunk, date: Date) => {
        if (!chunk.scheduled_date) return false;

        const scheduled = new Date(chunk.scheduled_date);
        scheduled.setHours(0, 0, 0, 0);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);

        // Check Exceptions
        const targetStr = target.toISOString().split('T')[0];

        if (chunk.history?.deferred) {
            // Is it moved TO this date?
            if (Object.values(chunk.history.deferred).includes(targetStr)) return true;
            // Is it moved FROM this date?
            if (chunk.history.deferred[targetStr]) return false;
        }

        // Deadline Check
        if (chunk.deadline) {
            const deadline = new Date(chunk.deadline);
            deadline.setHours(0, 0, 0, 0);
            if (target.getTime() > deadline.getTime()) return false;
        }

        if (scheduled.getTime() > target.getTime()) return false;

        if (scheduled.getTime() === target.getTime()) return true;

        // Recurrence
        if (chunk.frequency === 'Daily') return true;
        if (chunk.frequency === 'Weekly') {
            const diff = Math.round((target.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
            return diff % 7 === 0;
        }
        if (chunk.frequency === 'Monthly') {
            return target.getDate() === scheduled.getDate();
        }
        return false;
    };

    const getFilteredChunks = () => {
        if (!plan) return { todo: [], doing: [], done: [], skipped: [] };
        let relevant = plan.chunks;

        if (boardDate) {
            relevant = plan.chunks.filter(c => isChunkActiveOnDate(c, boardDate));

            // Visual Reset & Status Overrides
            relevant = relevant.map(c => {
                const targetStr = boardDate.toISOString().split('T')[0];

                // Mask as SKIPPED if in history
                if (c.history?.skipped?.includes(targetStr)) {
                    return { ...c, status: 'SKIPPED' as any };
                }

                // Recurring Task Reset Logic
                if (c.frequency && c.frequency !== 'Once' && c.scheduled_date) {
                    const startISO = c.scheduled_date.split('T')[0];
                    const viewISO = targetStr;

                    // If viewing a future instance, reset visual status to TODO
                    // unless it's explicitly deferred/skipped (handled above or elsewhere)
                    // Note: This prevents seeing "Done" for past completions when viewing future dates.
                    // Ideally we'd valid last completion date, but for now preserving 'reset' behavior.
                    if (viewISO > startISO) {
                        return { ...c, status: 'TODO' };
                    }
                }
                return c;
            });
        }

        return {
            todo: relevant.filter(c => c.status === 'TODO'),
            doing: relevant.filter(c => c.status === 'IN_PROGRESS'),
            done: relevant.filter(c => c.status === 'DONE'),
            skipped: relevant.filter(c => c.status === 'SKIPPED')
        };
    };

    const { todo, doing, done, skipped } = getFilteredChunks();

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 500,
            display: 'flex', flexDirection: 'column'
        }}>
            <div className="container" style={{
                background: 'var(--background)', flex: 1, margin: '2rem auto',
                borderRadius: '12px', overflowY: 'auto', position: 'relative',
                maxWidth: '1200px', width: '95%', padding: '2rem',
                border: `1px solid ${plan.color}`
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'transparent', border: 'none', color: 'var(--secondary)',
                        fontSize: '1.5rem', cursor: 'pointer', zIndex: 10
                    }}
                >
                    &times;
                </button>

                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, paddingRight: '2rem' }}>
                            {/* We keep inline edit logic but also allow modal via button */}
                            {editPlanTitle ? (
                                <input
                                    className="input-field" autoFocus
                                    style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}
                                    value={tempTitle} onChange={e => setTempTitle(e.target.value)}
                                    onBlur={updatePlanDetails}
                                    onKeyDown={e => e.key === 'Enter' && updatePlanDetails()}
                                />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <h1 style={{ fontSize: '2.5rem', color: plan.color || undefined, cursor: 'pointer' }}
                                        onClick={() => setEditPlanTitle(true)}
                                        title="Click to edit title"
                                    >
                                        {plan.title}
                                    </h1>
                                    <button
                                        className="btn"
                                        onClick={onOpenOverview}
                                        style={{
                                            background: 'var(--primary)', padding: '0.5rem 1rem',
                                            borderRadius: '6px', color: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.9rem', fontWeight: 600
                                        }}
                                        title="Plan Overview"
                                    >
                                        Overview
                                    </button>
                                </div>
                            )}

                            {editPlanDesc ? (
                                <textarea
                                    className="input-field" autoFocus
                                    value={tempDesc} onChange={e => setTempDesc(e.target.value)}
                                    onBlur={updatePlanDetails}
                                    style={{ width: '100%', minHeight: '60px' }}
                                />
                            ) : (
                                <div>
                                    <p style={{ color: 'var(--secondary)', marginBottom: '0.5rem', cursor: 'pointer' }}
                                        onClick={() => setEditPlanDesc(true)}
                                        title="Click to edit description"
                                    >
                                        {plan.description || "No description"}
                                    </p>
                                    {plan.deadline && (
                                        <div style={{ fontSize: '0.9rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <span>Target Completion:</span>
                                            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{new Date(plan.deadline).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
                            <div style={{ background: 'var(--card-bg)', borderRadius: '8px', padding: '0.2rem', display: 'flex' }}>
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
                            </div>
                            {viewMode === 'board' && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--card-bg)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <button className="btn"
                                        onClick={() => {
                                            const d = new Date(boardDate || new Date());
                                            d.setDate(d.getDate() - 1);
                                            setBoardDate(d);
                                        }}
                                    >&lt;</button>

                                    <button className="btn"
                                        onClick={() => setBoardDate(new Date())}
                                        style={{ padding: '0.3rem 0.8rem', background: 'transparent', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--foreground)' }}
                                    >
                                        Today
                                    </button>

                                    <button className="btn"
                                        onClick={() => {
                                            const d = new Date(boardDate || new Date());
                                            d.setDate(d.getDate() + 1);
                                            setBoardDate(d);
                                        }}
                                    >&gt;</button>

                                    <input
                                        type="date"
                                        value={boardDate ? boardDate.toISOString().split('T')[0] : ''}
                                        onChange={(e) => setBoardDate(e.target.value ? new Date(e.target.value) : new Date())}
                                        style={{ background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '0.3rem', borderRadius: '4px' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {plan.chunks.length === 0 && (
                    <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                        <p style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>No tasks yet.</p>
                        <button className="btn" onClick={() => setShowAddModal(true)}>Add Your First Task</button>
                    </div>
                )}


                {viewMode === 'calendar' && <CalendarView chunks={plan.chunks} planDefaultColor={plan.color} initialDate={initialDate} initialViewMode={initialCalendarMode || 'month'} onTaskClick={setEditingChunk} />}
                {viewMode === 'board' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <Column title="To Do" chunks={todo} color="var(--secondary)" status="TODO"
                            onDrop={onDrop} onDragOver={onDragOver} onDragStart={onDragStart}
                            onTaskClick={setEditingChunk} taskRefs={taskRefs}
                        />

                        {/* Split Column: Doing / Defer */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Column title="In Progress" chunks={doing} color="var(--primary)" status="IN_PROGRESS"
                                    onDrop={onDrop} onDragOver={onDragOver} onDragStart={onDragStart}
                                    onTaskClick={setEditingChunk} taskRefs={taskRefs}
                                    style={{ height: '100%' }}
                                />
                            </div>
                            {/* Defer Zone - Small & Consistent */}
                            <div style={{ height: '140px' }}>
                                <Column title="Defer" chunks={[]} color="#f59e0b" status="DEFERRED"
                                    onDrop={onDrop} onDragOver={onDragOver} onDragStart={onDragStart}
                                    onTaskClick={setEditingChunk} taskRefs={taskRefs}
                                    style={{ minHeight: '100%', height: '100%', opacity: 0.9 }}
                                />
                            </div>
                        </div>

                        {/* Split Column: Done / Skipped */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Column title="Done" chunks={done} color="var(--success)" status="DONE"
                                    onDrop={onDrop} onDragOver={onDragOver} onDragStart={onDragStart}
                                    onTaskClick={setEditingChunk} taskRefs={taskRefs}
                                    style={{ height: '100%' }}
                                />
                            </div>
                            {/* Skipped Zone - Small */}
                            <div style={{ height: '140px', overflowY: 'auto' }}>
                                <Column title="Skipped" chunks={skipped} color="gray" status="SKIPPED"
                                    onDrop={onDrop} onDragOver={onDragOver} onDragStart={onDragStart}
                                    onTaskClick={setEditingChunk} taskRefs={taskRefs}
                                    style={{ minHeight: '100%', height: '100%', opacity: 0.9 }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal (Updates) */}
                {editingChunk && (
                    <EditTaskModal
                        chunk={editingChunk}
                        onClose={() => setEditingChunk(null)}
                        onSave={saveTaskEdit}
                        onDelete={handleDeleteTask}
                    />
                )}

                {/* Add Modal (Reuse EditTaskModal) */}
                {showAddModal && (
                    <EditTaskModal
                        onClose={() => setShowAddModal(false)}
                        onSave={saveTaskEdit}
                    />
                )}

                {/* Defer Modal */}
                {showDeferModal && activeDeferChunk && (
                    <DeferModal
                        chunk={activeDeferChunk}
                        onClose={() => setShowDeferModal(false)}
                        onDefer={confirmDefer}
                        onSkip={() => {
                            handleSkip(activeDeferChunk);
                            setShowDeferModal(false);
                        }}
                    />
                )}

                {/* Edit Plan Metadata Modal */}
                {showEditPlanModal && (
                    <EditPlanMetadataModal
                        plan={plan}
                        onClose={() => setShowEditPlanModal(false)}
                        onSave={handleUpdatePlanMetadata}
                    />
                )}
            </div>
        </div >
    );
}

function Column({
    title, chunks, color, status, onDrop, onDragOver, onDragStart, onTaskClick, taskRefs, style
}: {
    title: string, chunks: Chunk[], color: string, status: string,
    onDrop: (e: React.DragEvent, status: string) => void,
    onDragOver: (e: React.DragEvent) => void,
    onDragStart: (e: React.DragEvent, id: string) => void,
    onTaskClick: (chunk: Chunk) => void,
    taskRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>,
    style?: React.CSSProperties
}) {
    return (
        <div
            onDrop={(e) => onDrop(e, status)}
            onDragOver={onDragOver}
            style={{
                background: 'var(--card-bg)', padding: '1rem', borderRadius: '12px',
                borderTop: `4px solid ${color}`, minHeight: '400px',
                ...style
            }}
        >
            <h3 style={{ marginBottom: '1rem', color: color }}>{title} ({chunks.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {chunks.map(chunk => (
                    <div
                        key={chunk.id}
                        ref={el => { taskRefs.current[chunk.id] = el; }}
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
