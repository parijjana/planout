'use client';

import { useState, useEffect } from 'react';

interface SettingsModalProps {
    onClose: () => void;
    currentTheme: string;
    onSetTheme: (t: string) => void;
    initialTab?: 'appearance' | 'intelligence';
}

export default function SettingsModal({ onClose, currentTheme, onSetTheme, initialTab = 'appearance' }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'appearance' | 'intelligence'>(initialTab);
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Load partial key status (from localStorage for BYOK)
    useEffect(() => {
        const stored = localStorage.getItem('gemini_api_key');
        if (stored) {
            setApiKey(stored);
            setStatus('success');
        }
    }, []);

    const handleSaveKey = async () => {
        if (!apiKey) return;
        setSaving(true);
        setStatus('idle');
        try {
            // New Logic: Save to LocalStorage
            localStorage.setItem('gemini_api_key', apiKey);

            // Artificial delay for UX
            await new Promise(r => setTimeout(r, 500));

            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (e) {
            console.error(e);
            setStatus('error');
        } finally {
            setSaving(false);
        }
    };

    const themes = [
        { id: 'dark', name: 'Midnight (Default)', bg: '#0f172a', primary: '#3b82f6' },
        { id: 'light', name: 'Clean Light', bg: '#f8fafc', primary: '#3b82f6' },
        { id: 'red-white', name: 'Bold Red', bg: '#ffffff', primary: '#e11d48', border: '#e11d48' },
        { id: 'paper', name: 'Warm Paper', bg: '#fefce8', primary: '#b45309' },
    ];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div className="card" onClick={e => e.stopPropagation()} style={{ width: '600px', height: '500px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem' }}>Settings</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                    {/* Sidebar */}
                    <div style={{ width: '200px', borderRight: '1px solid var(--border)', padding: '1rem 0', background: 'rgba(0,0,0,0.1)' }}>
                        <button
                            onClick={() => setActiveTab('appearance')}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left', padding: '1rem',
                                background: activeTab === 'appearance' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'appearance' ? 'white' : 'var(--foreground)',
                                border: 'none', cursor: 'pointer'
                            }}
                        >
                            Appearance
                        </button>
                        <button
                            onClick={() => setActiveTab('intelligence')}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left', padding: '1rem',
                                background: activeTab === 'intelligence' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'intelligence' ? 'white' : 'var(--foreground)',
                                border: 'none', cursor: 'pointer'
                            }}
                        >
                            Intelligence
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

                        {/* APPEARANCE TAB */}
                        {activeTab === 'appearance' && (
                            <div>
                                <h3 style={{ marginBottom: '1rem' }}>Theme</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {themes.map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => onSetTheme(t.id)}
                                            style={{
                                                border: `2px solid ${currentTheme === t.id ? 'var(--primary)' : 'var(--border)'}`,
                                                borderRadius: '8px', padding: '1rem', cursor: 'pointer',
                                                background: t.bg, color: t.id === 'dark' ? 'white' : 'black',
                                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                                            }}
                                        >
                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: t.border || t.primary }}></div>
                                            <span style={{ fontWeight: 600 }}>{t.name}</span>
                                            {currentTheme === t.id && (
                                                <div style={{ marginLeft: 'auto', color: 'var(--primary)' }}>✓</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* INTELLIGENCE TAB */}
                        {activeTab === 'intelligence' && (
                            <div>
                                <h3 style={{ marginBottom: '1rem' }}>Google Gemini API</h3>
                                <p style={{ marginBottom: '1.5rem', color: 'var(--secondary)', lineHeight: '1.5' }}>
                                    Power the "Ask AI" features by connecting your Google AI Studio key.
                                </p>

                                <div style={{ background: 'rgba(255, 165, 0, 0.1)', border: '1px solid orange', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                    <strong style={{ color: 'orange', display: 'block', marginBottom: '0.5rem' }}>🔒 Privacy Assurance</strong>
                                    Your API Key is stored <strong>locally in your browser</strong>. It is sent securely to the backend only when you make a request and is never permanently stored on our servers.
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="label">API Key</label>
                                    <input
                                        type="password"
                                        className="input-field"
                                        placeholder="AIzaSy..."
                                        value={apiKey}
                                        onChange={e => {
                                            setApiKey(e.target.value);
                                            setStatus('idle');
                                        }}
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                </div>
                                <button className="btn" onClick={handleSaveKey} disabled={saving || !apiKey}>
                                    {saving ? 'Saving...' : 'Save API Key'}
                                </button>

                                {status === 'success' && <p style={{ color: 'var(--success)', marginTop: '1rem' }}>✓ Key saved! AI features active.</p>}
                                {status === 'error' && <p style={{ color: '#ef4444', marginTop: '1rem' }}>⚠ Failed to save key.</p>}

                                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>
                                        Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Get one here</a>.
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
