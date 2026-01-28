export interface Chunk {
    id: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED' | 'DEFERRED';
    estimated_hours: number;
    duration_minutes?: number;
    frequency?: 'Once' | 'Daily' | 'Weekly' | 'Monthly';
    scheduled_date?: string;
    deadline?: string; // ISO Date string
    plan_id?: string;
    plan_color?: string;
    plan_title?: string;
    history?: {
        skipped?: string[];
        deferred?: Record<string, string>;
    };
}

export interface Plan {
    id: string;
    title: string;
    description: string;
    color?: string;
    created_at: string;
    deadline?: string;
    chunks: Chunk[];
}
