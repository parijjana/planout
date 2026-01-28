'use client';

import { useState } from 'react';
import { Chunk } from '../types';

interface DeferModalProps {
    chunk: Chunk;
    onClose: () => void;
    onDefer: (date: string) => void;
    onSkip: () => void;
}

export default function DeferModal({ chunk, onClose, onDefer, onSkip }: DeferModalProps) {
    // Calculate max defer date based on frequency
    const getNextOccurrence = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        if (chunk.frequency === 'Daily') d.setDate(d.getDate() + 1);
        else if (chunk.frequency === 'Weekly') d.setDate(d.getDate() + 7);
        else if (chunk.frequency === 'Monthly') d.setMonth(d.getMonth() + 1);
        else d.setDate(d.getDate() + 365); // Just a fallback
        return d;
    };

    const maxDate = getNextOccurrence();
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1); // Tomorrow

    // If maxDate <= minDate (e.g. Daily task today, max is tomorrow), then range is single day.

    // Generate dates between min and max
    const getDates = () => {
        const dates = [];
        let ptr = new Date(minDate);
        while (ptr <= maxDate) {
            dates.push(new Date(ptr));
            ptr.setDate(ptr.getDate() + 1);
        }
        return dates;
    };

    const availableDates = getDates();
    const [selectedDate, setSelectedDate] = useState<string>(availableDates.length > 0 ? availableDates[0].toISOString().split('T')[0] : '');

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
            <div className="card" style={{
                width: '400px', background: '#1e293b', border: '1px solid var(--primary)',
                padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
                borderRadius: '12px'
            }}>
                <h2 style={{ fontSize: '1.5rem', color: 'white' }}>Defer Task</h2>
                <div style={{ color: 'var(--secondary)' }}>
                    Defer <strong>{chunk.title}</strong> to a later date?
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--secondary)' }}>Select Date</label>
                    <select
                        className="input-field"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem' }}
                    >
                        {availableDates.map(d => (
                            <option key={d.toISOString()} value={d.toISOString().split('T')[0]}>
                                {d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button className="btn"
                        onClick={() => onDefer(selectedDate)}
                        style={{ flex: 1, background: 'var(--primary)', color: 'white' }}
                        disabled={!selectedDate}
                    >
                        Defer
                    </button>
                    <button className="btn"
                        onClick={onSkip}
                        style={{ flex: 1, background: 'var(--card-bg)', border: '1px solid var(--secondary)' }}
                    >
                        Skip Instead
                    </button>
                </div>
                <button
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', color: 'var(--secondary)', textDecoration: 'underline', cursor: 'pointer', alignSelf: 'center' }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
