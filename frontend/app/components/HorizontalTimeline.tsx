'use client';

import { Chunk } from '../types';
import { useRef, useEffect, useState } from 'react';


const FlagIcon = ({ color, size = 16 }: { color: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ minWidth: size }}>
        <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
    </svg>
);

interface TimeSlot {
    start: Date;
    end: Date;
    label: string;
    subLabel: string;
    type: 'day' | 'week' | 'month' | 'year';
}

export default function HorizontalTimeline({ chunks, planColor, onTaskClick }: {
    chunks: Chunk[],
    planColor?: string,
    onTaskClick?: (planId: string, taskId: string) => void
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const color = planColor || '#3b82f6';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);

    // 1. Generate Variable Time Slots
    const slots: TimeSlot[] = [];

    // Config:
    const ptr = new Date(today);
    const oneMonthOut = new Date(today); oneMonthOut.setDate(today.getDate() + 30);
    const sixMonthsOut = new Date(today); sixMonthsOut.setMonth(today.getMonth() + 6);
    const twoYearsOut = new Date(today); twoYearsOut.setFullYear(today.getFullYear() + 2);

    // A. Daily (Next 7 days)
    for (let i = 0; i < 7; i++) {
        const start = new Date(ptr);
        const end = new Date(ptr); end.setHours(23, 59, 59, 999);

        slots.push({
            start, end,
            label: start.toLocaleDateString(undefined, { weekday: 'short' }),
            subLabel: String(start.getDate()),
            type: 'day'
        });
        ptr.setDate(ptr.getDate() + 1);
    }

    // B. Weekly (Until 1 Month)
    // Align to nearest boundaries or just chunks? Let's do simple chunks for now.
    while (ptr < oneMonthOut) {
        const start = new Date(ptr);
        const end = new Date(ptr); end.setDate(ptr.getDate() + 6); end.setHours(23, 59, 59, 999);

        slots.push({
            start, end,
            label: 'Week',
            subLabel: `${start.getDate()}-${end.getDate()}`,
            type: 'week'
        });
        ptr.setDate(ptr.getDate() + 7);
    }

    // C. Monthly (Until 6 Months)
    while (ptr < sixMonthsOut) {
        const start = new Date(ptr);
        // End is end of this month? Or just +30 days? 
        // Let's align to calendar month for cleanliness if we can, but 'ptr' might be mid-month.
        // Simple approach: +1 Month relative
        const end = new Date(ptr); end.setMonth(end.getMonth() + 1); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);

        slots.push({
            start, end,
            label: start.toLocaleDateString(undefined, { month: 'short' }),
            subLabel: start.getFullYear().toString(),
            type: 'month'
        });
        ptr.setMonth(ptr.getMonth() + 1);
    }

    // D. Yearly (Until 2 Years)
    while (ptr < twoYearsOut) {
        const start = new Date(ptr);
        const end = new Date(ptr); end.setFullYear(end.getFullYear() + 1); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);

        slots.push({
            start, end,
            label: start.getFullYear().toString(),
            subLabel: '',
            type: 'year'
        });
        ptr.setFullYear(ptr.getFullYear() + 1);
    }

    // 2. Expand recurring chunks (Larger range now: ~2 Years)
    const endDate = twoYearsOut;
    const expandedChunks: Chunk[] = [];

    chunks.forEach(c => {
        if (!c.scheduled_date) return;

        let currentDate = new Date(c.scheduled_date);
        currentDate.setHours(0, 0, 0, 0);

        let loops = 0;
        // Limit loops slightly higher for 2 years daily recurrence: 365*2 = 730
        while (currentDate < endDate && loops < 1500) {
            loops++;
            if (currentDate >= today) {
                expandedChunks.push({
                    ...c,
                    scheduled_date: currentDate.toISOString()
                });
            }

            if (!c.frequency || c.frequency === 'Once') break;

            const freq = c.frequency.toLowerCase();
            if (freq === 'daily') currentDate.setDate(currentDate.getDate() + 1);
            else if (freq === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
            else if (freq === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);
            else break;
        }
    });

    // 3. Group Chunks into Slots
    // Optimization: Map slots to chunk indices instead of copying chunks?
    const chunksBySlot: Chunk[][] = slots.map(() => []);

    expandedChunks.forEach(c => {
        if (!c.scheduled_date) return;
        const d = new Date(c.scheduled_date);

        // Find best slot
        // Since slots are ordered time ranges, we can find the first one that covers it
        const slotIdx = slots.findIndex(s => d >= s.start && d <= s.end);
        if (slotIdx !== -1) {
            chunksBySlot[slotIdx].push(c);
        }
    });

    const selectedSlot = slots[selectedSlotIndex];
    const selectedChunks = chunksBySlot[selectedSlotIndex] || [];

    // Sort selected chunks by date then title
    selectedChunks.sort((a, b) => {
        const da = new Date(a.scheduled_date!).getTime();
        const db = new Date(b.scheduled_date!).getTime();
        return da - db;
    });

    const renderDetailView = () => {
        if (selectedChunks.length === 0) {
            return (
                <div style={{ textAlign: 'center', color: 'var(--secondary)', padding: '2rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                    No tasks in this time window.
                </div>
            );
        }

        // Plan Aggregation Mode
        if (selectedSlot.type === 'month' || selectedSlot.type === 'year') {
            const plansMap = new Map<string, { title: string, color: string, count: number, id: string }>();

            selectedChunks.forEach(c => {
                const pid = c.plan_id || 'unknown';
                if (!plansMap.has(pid)) {
                    plansMap.set(pid, {
                        title: c.plan_title || 'Untitled Plan',
                        color: c.plan_color || color,
                        count: 0,
                        id: pid
                    });
                }
                plansMap.get(pid)!.count++;
            });

            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {Array.from(plansMap.values()).map(p => (
                        <div key={p.id}
                            onClick={() => onTaskClick && onTaskClick(p.id, `PLAN_VIEW_TRIGGER::${selectedSlot.start.toISOString()}::${selectedSlot.type}`)}
                            style={{
                                background: 'var(--card-bg)',
                                borderRadius: '8px',
                                padding: '1.5rem',
                                borderLeft: `6px solid ${p.color}`,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '1rem'
                            }}
                        >
                            <FlagIcon color={p.color} size={32} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{p.title}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>
                                    {p.count} task{p.count !== 1 ? 's' : ''} in {selectedSlot.label}
                                </div>
                            </div>
                            <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                📅 View
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        // Standard Task View
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {selectedChunks.map((c, idx) => (
                    <div key={`${c.id}-${idx}`}
                        onClick={() => onTaskClick && c.plan_id ? onTaskClick(c.plan_id, c.id) : null}
                        style={{
                            background: 'var(--card-bg)',
                            borderRadius: '8px',
                            padding: '1rem',
                            borderLeft: `4px solid ${c.plan_color || color}`,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '1rem'
                        }}
                    >
                        <FlagIcon color={c.plan_color || color} size={20} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold' }}>{c.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', opacity: 0.8 }}>
                                {c.duration_minutes}m • {c.scheduled_date ? new Date(c.scheduled_date).toLocaleDateString() : ''}
                            </div>
                        </div>
                        <div style={{ fontSize: '1.2rem', opacity: 0.2 }}>&rarr;</div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="container" style={{ padding: 0 }}>
            <style>{`
                /* Hide default scrollbar but keep functionality */
                .timeline-strip::-webkit-scrollbar {
                    height: 8px;
                }
                .timeline-strip::-webkit-scrollbar-track {
                    background: transparent;
                }
                .timeline-strip::-webkit-scrollbar-thumb {
                    background-color: var(--border);
                    border-radius: 20px;
                    border: 3px solid transparent;
                    background-clip: content-box;
                }
                .timeline-strip::-webkit-scrollbar-thumb:hover {
                    background-color: var(--secondary);
                }
            `}</style>

            {/* Top Strip: Variable Slots */}
            <div
                ref={scrollRef}
                className="timeline-strip"
                style={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: '0', // No gap for "continuous" feel, or small gap?
                    paddingBottom: '0.5rem',
                    marginBottom: '1rem',
                    position: 'relative',
                }}
            >
                {/* Axis Line */}
                <div style={{
                    position: 'absolute', bottom: '8px', left: 0, right: 0,
                    height: '1px', background: 'var(--border)', zIndex: 0,
                    minWidth: '100%' // Ensure it stretches
                }}></div>

                {slots.map((slot, i) => {
                    const isSelected = i === selectedSlotIndex;
                    const slotChunks = chunksBySlot[i];

                    // Width variable by type?
                    const minWidth = slot.type === 'day' ? '60px' :
                        slot.type === 'week' ? '80px' :
                            slot.type === 'month' ? '100px' : '120px';

                    return (
                        <div key={i}
                            onClick={() => setSelectedSlotIndex(i)}
                            style={{
                                minWidth: minWidth,
                                padding: '0.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                cursor: 'pointer',
                                position: 'relative',
                                height: '90px',
                                justifyContent: 'space-between',
                                background: 'transparent',
                                opacity: isSelected ? 1 : 0.6,
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {/* Dot on Axis */}
                            <div style={{
                                position: 'absolute', bottom: '4px',
                                width: isSelected ? '10px' : '6px',
                                height: isSelected ? '10px' : '6px',
                                borderRadius: '50%',
                                background: isSelected ? color : 'var(--border)',
                                zIndex: 1,
                                transition: 'all 0.2s'
                            }}></div>

                            <div style={{
                                fontSize: '0.7rem', fontWeight: 'bold',
                                color: isSelected ? 'white' : 'var(--secondary)',
                                textAlign: 'center',
                                marginTop: '4px'
                            }}>
                                <div>{slot.label}</div>
                                <div style={{ fontSize: '0.9em', opacity: 0.8 }}>{slot.subLabel}</div>
                            </div>

                            {/* Flags Stack (Floating above) */}
                            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '10px' }}>
                                {(slot.type === 'month' || slot.type === 'year') ? (
                                    // Plan Aggregation Mode
                                    (() => {
                                        const uniqueColors = new Set<string>();
                                        slotChunks.forEach(c => uniqueColors.add(c.plan_color || color));
                                        return Array.from(uniqueColors).slice(0, 5).map((c, idx) => (
                                            <FlagIcon key={idx} color={c} size={12} />
                                        ));
                                    })()
                                ) : (
                                    // Task Mode
                                    slotChunks.slice(0, 4).map((c, idx) => (
                                        <FlagIcon key={idx} color={c.plan_color || color} size={10} />
                                    ))
                                )}
                                {(slot.type !== 'month' && slot.type !== 'year' && slotChunks.length > 4) && (
                                    <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>+</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Panel: Detail View */}
            <div style={{ padding: '0 1rem', minHeight: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {selectedSlot.start.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                            {selectedSlot.type !== 'day' && ` - ${selectedSlot.end.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`}
                        </h3>
                        {selectedSlot.type !== 'day' && (
                            <div style={{ fontSize: '0.8rem', color: color, textTransform: 'uppercase', fontWeight: 600 }}>{selectedSlot.type} View</div>
                        )}
                    </div>

                    <div style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>
                        {selectedChunks.length} Tasks
                    </div>
                </div>

                {renderDetailView()}
            </div>
        </div>
    );
}
