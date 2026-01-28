'use client';

import { useState, useMemo } from 'react';
import { Chunk } from '../types';

type ViewMode = 'day' | 'week' | 'month' | 'year';


const FlagIcon = ({ color, size = 16 }: { color: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ minWidth: size }}>
        <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
    </svg>
);

export default function CalendarView({ chunks, planDefaultColor, initialDate, initialViewMode, planDeadline, onTaskClick }: {
    chunks: Chunk[],
    planDefaultColor?: string,
    initialDate?: Date,
    initialViewMode?: ViewMode,
    planDeadline?: string,
    onTaskClick?: (chunk: Chunk) => void
}) {
    const [currentDate, setCurrentDate] = useState(initialDate || new Date());
    const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode || 'month');

    // Navigation Logic
    const navigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (viewMode === 'day') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (viewMode === 'week') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        } else if (viewMode === 'month') {
            newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else if (viewMode === 'year') {
            newDate.setFullYear(currentDate.getFullYear() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => setCurrentDate(new Date());

    const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setCurrentDate(new Date(e.target.value));
        }
    };

    // Recurrence Expansion Logic (Project Chunks based on View Range)
    // We calculate a broader range based on viewMode to ensure we capture all recurrences
    const startOfRange = new Date(currentDate);
    const endOfRange = new Date(currentDate);

    if (viewMode === 'day') {
        startOfRange.setHours(0, 0, 0, 0);
        endOfRange.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
        const day = startOfRange.getDay();
        const diff = startOfRange.getDate() - day; // adjust when day is sunday
        startOfRange.setDate(diff); // First day is Sunday
        endOfRange.setDate(diff + 6);
        startOfRange.setHours(0, 0, 0, 0);
        endOfRange.setHours(23, 59, 59, 999);
    } else if (viewMode === 'month') {
        startOfRange.setDate(1);
        startOfRange.setHours(0, 0, 0, 0);
        endOfRange.setMonth(endOfRange.getMonth() + 1);
        endOfRange.setDate(0); // Last day of month
    } else if (viewMode === 'year') {
        startOfRange.setMonth(0, 1);
        startOfRange.setHours(0, 0, 0, 0);
        endOfRange.setFullYear(endOfRange.getFullYear() + 1);
        endOfRange.setMonth(0, 0); // Last day of previous year (Dec 31)
    }

    const projectedChunks = useMemo(() => {
        const expanded: Chunk[] = [];
        chunks.forEach(c => {
            if (!c.scheduled_date) return;
            let ptr = new Date(c.scheduled_date);
            ptr.setHours(0, 0, 0, 0);

            // If "starting" after our end of range, skip
            // But Wait! Recurrence means it might have started way back. 
            // Logic: Start from c.scheduled_date. If before startOfRange, advance efficiently.

            // Deadline
            const deadline = c.deadline ? new Date(c.deadline) : null;
            if (deadline) deadline.setHours(0, 0, 0, 0);

            // Simple loop with safety
            let safety = 0;
            while (ptr <= endOfRange && safety < 5000) {
                safety++;

                // If ptr is AFTER endOfRange, stop
                if (ptr > endOfRange) break;

                // Deadline check
                if (deadline && ptr > deadline) break;

                // If ptr is within [startOfRange, endOfRange]
                if (ptr >= startOfRange) {
                    expanded.push({
                        ...c,
                        scheduled_date: ptr.toISOString()
                    });
                }

                // Advance
                if (!c.frequency || c.frequency === 'Once') break;

                const freq = c.frequency.toLowerCase();
                if (freq === 'daily') ptr.setDate(ptr.getDate() + 1);
                else if (freq === 'weekly') ptr.setDate(ptr.getDate() + 7);
                else if (freq === 'monthly') ptr.setMonth(ptr.getMonth() + 1);
                else break;
            }
        });
        return expanded;
    }, [chunks, startOfRange.toISOString(), endOfRange.toISOString()]); // Dep on Range

    const renderHeader = () => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn" onClick={() => navigate('prev')}>&lt;</button>
                <button className="btn" onClick={goToToday}>Today</button>
                <button className="btn" onClick={() => navigate('next')}>&gt;</button>
                <input
                    type="date"
                    value={currentDate.toISOString().split('T')[0]}
                    onChange={handleDateInput}
                    style={{ background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '6px' }}
                />
            </div>

            <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {viewMode === 'year'
                        ? currentDate.getFullYear()
                        : currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                {planDeadline && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.2rem' }}>
                        Target: <span style={{ color: 'var(--accent)' }}>{new Date(planDeadline).toLocaleDateString()}</span>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '8px', padding: '0.2rem' }}>
                {(['day', 'week', 'month', 'year'] as ViewMode[]).map(mode => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            background: viewMode === mode ? 'var(--primary)' : 'transparent',
                            color: viewMode === mode ? 'white' : 'var(--secondary)',
                            textTransform: 'capitalize'
                        }}
                    >
                        {mode}
                    </button>
                ))}
            </div>
        </div>
    );

    // Render Logic Helpers
    const getChunksForDate = (d: Date) => {
        const dStr = d.toDateString();
        return projectedChunks.filter(c => c.scheduled_date && new Date(c.scheduled_date).toDateString() === dStr);
    };

    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay();

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '1px', background: 'var(--border)', width: '100%', overflow: 'hidden' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ background: 'var(--card-bg)', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}>{d}</div>
                ))}
                {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`e-${i}`} style={{ background: 'var(--card-bg)', minHeight: '100px' }} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const thisDate = new Date(year, month, day);
                    const dayChunks = getChunksForDate(thisDate);
                    return (
                        <div key={day}
                            onClick={() => {
                                setCurrentDate(thisDate);
                                setViewMode('day');
                            }}
                            style={{ background: 'var(--card-bg)', minHeight: '100px', padding: '0.5rem', cursor: 'pointer', transition: 'background 0.2s', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--card-bg)'}
                        >
                            <div style={{ opacity: 0.5, marginBottom: '0.5rem' }}>{day}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', overflow: 'hidden' }}>
                                {dayChunks.map(c => (
                                    <div key={c.id + day}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent going to day view
                                            onTaskClick && onTaskClick(c);
                                        }}
                                        style={{
                                            fontSize: '0.7rem', padding: '0.2rem', borderRadius: '4px',
                                            background: 'rgba(255,255,255,0.1)',
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            color: 'white', cursor: 'pointer',
                                            overflow: 'hidden'
                                        }}
                                        title={c.title}
                                    >
                                        <div style={{ flexShrink: 0 }}>
                                            <FlagIcon color={c.plan_color || planDefaultColor || '#3b82f6'} size={12} />
                                        </div>
                                        <span style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            flex: 1
                                        }}>{c.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderWeekView = () => {
        const curr = new Date(currentDate);
        const day = curr.getDay();
        const start = new Date(curr);
        start.setDate(curr.getDate() - day); // Sunday start

        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border)' }}>
                {weekDays.map((d, i) => (
                    <div key={i} style={{ background: 'var(--card-bg)', minHeight: '400px', padding: '0.5rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 'bold' }}>{d.toLocaleDateString('default', { weekday: 'short' })}</div>
                            <div style={{ fontSize: '1.2rem' }}>{d.getDate()}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {getChunksForDate(d).map(c => (
                                <div key={c.id + i}
                                    onClick={() => onTaskClick && onTaskClick(c)}
                                    style={{
                                        padding: '0.5rem', borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white', cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        display: 'flex', gap: '0.5rem', alignItems: 'center'
                                    }}
                                >
                                    <FlagIcon color={c.plan_color || planDefaultColor || '#3b82f6'} size={14} />
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.title}</div>
                                        <div style={{ opacity: 0.8, fontSize: '0.7rem' }}>{c.duration_minutes}m</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderDayView = () => {
        const dayChunks = getChunksForDate(currentDate);
        return (
            <div style={{ background: 'var(--card-bg)', minHeight: '400px', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>{currentDate.toDateString()}</h3>
                {dayChunks.length === 0 ? <p>No tasks scheduled.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {dayChunks.map(c => (
                            <div key={c.id}
                                onClick={() => onTaskClick && onTaskClick(c)}
                                style={{
                                    padding: '1rem', borderRadius: '8px',
                                    background: '#2d3748',
                                    display: 'flex', gap: '1rem', alignItems: 'flex-start',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ marginTop: '4px' }}>
                                    <FlagIcon color={c.plan_color || planDefaultColor || '#3b82f6'} size={24} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{c.title}</div>
                                    <div style={{ color: 'var(--secondary)' }}>{c.description}</div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                                        {c.duration_minutes}m • {c.frequency} • {c.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderYearView = () => {
        const year = currentDate.getFullYear();
        const months = Array.from({ length: 12 }, (_, i) => i);

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {months.map(m => {
                    const monthStart = new Date(year, m, 1);
                    const monthEnd = new Date(year, m + 1, 0);

                    // Filter chunks for this month
                    const monthChunks = projectedChunks.filter(c => {
                        if (!c.scheduled_date) return false;
                        const d = new Date(c.scheduled_date);
                        return d >= monthStart && d <= monthEnd;
                    });

                    const count = monthChunks.length;

                    // Identify unique plans (by plan_id or color)
                    const uniqueFlags = new Map<string, string>(); // key -> color
                    monthChunks.forEach(c => {
                        // Use plan_id if available, otherwise just group by color
                        // This ensures "flag for each plan"
                        const key = c.plan_id || c.plan_color || planDefaultColor || 'unknown';
                        const color = c.plan_color || planDefaultColor || '#3b82f6';
                        uniqueFlags.set(key, color);
                    });

                    return (
                        <div key={m}
                            onClick={() => { setCurrentDate(new Date(year, m, 1)); setViewMode('month'); }}
                            style={{
                                background: 'var(--card-bg)',
                                borderRadius: '12px',
                                cursor: 'pointer', textAlign: 'center', border: '1px solid var(--border)',
                                position: 'relative',
                                display: 'flex', flexDirection: 'column',
                                height: '140px', // Fixed height for consistency
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ padding: '1.5rem', flex: 1 }}>
                                <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{new Date(year, m, 1).toLocaleString('default', { month: 'long' })}</h4>
                                <div style={{ fontSize: '2rem', color: count > 0 ? 'var(--primary)' : 'var(--secondary)' }}>
                                    {count}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>tasks</div>
                            </div>

                            {/* Flags Footer */}
                            {uniqueFlags.size > 0 && (
                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '0.5rem',
                                    display: 'flex',
                                    gap: '0.5rem',
                                    justifyContent: 'center',
                                    borderTop: '1px solid var(--border)'
                                }}>
                                    {Array.from(uniqueFlags.values()).map((color, idx) => (
                                        <FlagIcon key={idx} color={color} size={14} />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )
    };

    return (
        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '1rem' }}>
            {renderHeader()}
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'year' && renderYearView()}
        </div>
    );
}
