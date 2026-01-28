'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plan, Chunk } from './types';
import HorizontalTimeline from './components/HorizontalTimeline';
import CreatePlanModal from './components/CreatePlanModal';
import PlanManager from './components/PlanManager';
import ManagePlansModal from './components/ManagePlansModal';
import ViewPlanModal from './components/ViewPlanModal';
import SettingsModal from './components/SettingsModal';

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [settingsTab, setSettingsTab] = useState<'appearance' | 'intelligence'>('appearance');
  const [draftPlan, setDraftPlan] = useState<{ title: string; desc: string; color: string; deadline: string } | null>(null);

  // ... (Theme Logic and other states remain same - we don't need to replace them if we target correctly, but simpler to replace block) ...
  // Theme Logic
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const handleSetTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Plan Manager Modal State
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [viewPlanId, setViewPlanId] = useState<string | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/plans`)
      .then(async res => {
        if (!res.ok) throw new Error(`Error: ${res.status}`);
        return res.json();
      })
      .then(data => { setPlans(data); setLoading(false); })
      .catch(err => { console.error("Failed to fetch plans:", err); setPlans([]); setLoading(false); });
  }, [selectedPlanId, viewPlanId, showCreateModal, showManageModal]);

  const [initialViewDate, setInitialViewDate] = useState<Date | undefined>(undefined);
  const [initialViewMode, setInitialViewMode] = useState<'calendar' | 'board' | undefined>(undefined);
  const [initialCalendarGranularity, setInitialCalendarGranularity] = useState<'day' | 'week' | 'month' | 'year' | undefined>(undefined);

  const handleTaskClick = (pid: string, tid: string) => {
    // ... (existing logic) ...
    if (tid.startsWith('PLAN_VIEW_TRIGGER::')) {
      const parts = tid.split('::');
      const dateStr = parts[1];
      const granularity = parts[2] as 'day' | 'week' | 'month' | 'year';

      setInitialViewDate(new Date(dateStr));
      setInitialViewMode('calendar');
      setInitialCalendarGranularity(granularity);

      setFocusTaskId(undefined);
      setSelectedPlanId(pid);
    } else {
      setInitialViewDate(undefined);
      setInitialViewMode(undefined);
      setInitialCalendarGranularity(undefined);
      setFocusTaskId(tid);
      setSelectedPlanId(pid);
    }
  };

  const handleViewPlan = (pid: string) => { setViewPlanId(pid); setShowManageModal(false); };

  const openPlanManager = (pid: string, viewMode?: 'calendar' | 'board') => {
    setSelectedPlanId(pid);
    if (viewMode === 'calendar') { setInitialViewMode('calendar'); setInitialCalendarGranularity('month'); }
    setViewPlanId(null);
  }

  const handleDeletePlan = async (id: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/plans/${id}`, { method: 'DELETE' });
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/plans`);
    const data = await res.json();
    setPlans(data);
  };

  const allChunks: Chunk[] = plans.flatMap(p => p.chunks.map(c => ({ ...c, plan_id: p.id, plan_color: p.color, plan_title: p.title })));

  const handleSettingsClose = () => {
    setShowSettings(false);
    // If we have a draft plan stored, restore the modal
    if (draftPlan) {
      setShowCreateModal(true);
      // Note: We don't clear draftPlan here immediately so it can be passed as prop. 
      // Ideally we might clear it *after* the modal mounts, but React state updates can be tricky.
      // Or we keep it until the Create modal is closed or created.
    }
  };

  return (
    <main className="container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Planout
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn" onClick={() => { setSettingsTab('appearance'); setShowSettings(true); }} style={{ background: 'transparent', color: 'var(--secondary)', fontSize: '1.5rem', padding: '0.5rem', border: 'none' }} title="Settings">
            ⚙️
          </button>
          <button className="btn" onClick={() => setShowManageModal(true)}>
            Manage Plans
          </button>
        </div>
      </header>

      {/* Master Timeline */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--secondary)' }}>Your Unified Timeline</h2>
        {loading ? (
          <p>Loading timeline...</p>
        ) : plans.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem' }}>You don't have any plans yet.</p>
            <button className="btn" onClick={() => setShowCreateModal(true)}>Create Your First Plan</button>
          </div>
        ) : (
          <HorizontalTimeline chunks={allChunks} onTaskClick={handleTaskClick} />
        )}
      </section>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          onClose={handleSettingsClose}
          currentTheme={theme}
          onSetTheme={handleSetTheme}
          initialTab={settingsTab}
        />
      )}
      {showManageModal && (
        <ManagePlansModal
          plans={plans}
          onClose={() => setShowManageModal(false)}
          onViewPlan={handleViewPlan}
          onCreatePlan={() => {
            setShowManageModal(false);
            setShowCreateModal(true);
          }}
          onDeletePlan={handleDeletePlan}
        />
      )}

      {showCreateModal && (
        <CreatePlanModal
          existingColors={plans.map(p => p.color || '')}
          initialData={draftPlan}
          onClose={() => {
            setShowCreateModal(false);
            setDraftPlan(null); // Clear draft when manually closed
          }}
          onCreated={(id) => {
            setShowCreateModal(false);
            setDraftPlan(null); // Clear draft on success
            openPlanManager(id);
          }}
          onOpenSettings={(draft) => {
            console.log('[Page] onOpenSettings triggered. Draft:', draft);
            if (draft) setDraftPlan(draft);
            setSettingsTab('intelligence');
            setShowCreateModal(false); // Close the create modal
            setShowSettings(true); // Open the settings modal
          }}
        />
      )}

      {selectedPlanId && (
        <PlanManager
          planId={selectedPlanId}
          initialFocusTaskId={focusTaskId}
          initialDate={initialViewDate}
          initialViewMode={initialViewMode}
          initialCalendarMode={initialCalendarGranularity}
          onClose={() => setSelectedPlanId(null)}
          onOpenOverview={() => setViewPlanId(selectedPlanId)}
        />
      )}

      {viewPlanId && plans.find(p => p.id === viewPlanId) && (
        <ViewPlanModal
          plan={plans.find(p => p.id === viewPlanId)!}
          onClose={() => setViewPlanId(null)}
          onLaunchCalendar={() => openPlanManager(viewPlanId, 'calendar')}
          onPlanUpdated={() => {
            // Trigger refetch by toggling a dummy state or just ensure effect runs. 
            // Using effect dep [viewPlanId] helps but we might need explicit fetch.
            // Actually the effect runs on viewPlanId change, but here ID is same.
            // Let's rely on effect re-running if we simple invoke a re-fetch or use a refresh flag.
            // For now, simpler:
            fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/plans`).then(r => r.json()).then(setPlans);
          }}
        />
      )}
    </main>
  );
}
