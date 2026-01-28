'use client';

interface ApiKeyInstructionsModalProps {
    onClose: () => void;
}

export default function ApiKeyInstructionsModal({ onClose }: ApiKeyInstructionsModalProps) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{ width: '500px', maxWidth: '90vw' }}>
                <h2 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Set Up AI Features</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', color: 'rgba(255,255,255,0.8)' }}>
                    <p>To use Gemini-powered suggestions, you need an API Key. It's free and easy to set up.</p>

                    <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Google AI Studio</a>.</li>
                        <li>Click <strong>"Create API key"</strong>.</li>
                        <li>Open the file <code>backend/.env</code> in your project.</li>
                        <li>Paste your key like this:
                            <pre style={{ background: '#000', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', overflowX: 'auto' }}>
                                GEMINI_API_KEY=AIzaSy...
                            </pre>
                        </li>
                        <li>Restart the backend server if needed.</li>
                    </ol>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
