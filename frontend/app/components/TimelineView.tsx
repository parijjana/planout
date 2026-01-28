'use client';

import { Chunk } from '../types';

export default function TimelineView({ chunks }: { chunks: Chunk[] }) {
    // Sort chunks by date
    const sorted = [...chunks].sort((a, b) => {
        const da = new Date(a.scheduled_date || 0);
        const db = new Date(b.scheduled_date || 0);
        return da.getTime() - db.getTime();
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    };

    const isUpcoming = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        const diffTime = d.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 7;
    };

    const isFuture = (dateStr?: string) => {
        if (!dateStr) return true; // Unscheduled is future
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        const diffTime = d.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 7;
    };

    const todaysChunks = sorted.filter(c => isToday(c.scheduled_date));
    const upcomingChunks = sorted.filter(c => isUpcoming(c.scheduled_date));
    const futureChunks = sorted.filter(c => isFuture(c.scheduled_date));

    return (
        <div className="container">
            {/* Today: High Resolution */}
            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>
                    Today
                </h2>
                {todaysChunks.length === 0 ? (
                    <p style={{ color: 'var(--secondary)' }}>No tasks for today.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {todaysChunks.map(chunk => (
                            <div key={chunk.id} className="card" style={{
                                padding: '1.5rem', borderLeft: `6px solid var(--primary)`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <h3 style={{ fontSize: '1.4rem' }}>{chunk.title}</h3>
                                    <p style={{ color: 'var(--secondary)' }}>{chunk.description}</p>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                                        <span>⏱ {chunk.duration_minutes || 30}m</span>
                                        <span>🔄 {chunk.frequency || 'Daily'}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                    {new Date(chunk.scheduled_date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Upcoming: Medium Resolution */}
            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', opacity: 0.8 }}>Upcoming (7 Days)</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {upcomingChunks.map(chunk => (
                        <div key={chunk.id} className="card" style={{ padding: '1rem', borderTop: '4px solid var(--secondary)' }}>
                            <h4>{chunk.title}</h4>
                            <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.5rem' }}>
                                📅 {new Date(chunk.scheduled_date!).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                {chunk.duration_minutes || 30}m • {chunk.frequency || 'Daily'}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Future: Low Resolution */}
            <section>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', opacity: 0.6 }}>Future</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {futureChunks.map(chunk => (
                        <div key={chunk.id} style={{
                            padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px',
                            fontSize: '0.9rem', border: '1px solid var(--border)'
                        }}>
                            {chunk.title}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
