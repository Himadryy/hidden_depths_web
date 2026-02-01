-- Audit Logs for Security & Compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Can be NULL for anonymous actions
    action TEXT NOT NULL, -- e.g., 'booking.create', 'insight.update'
    entity_type TEXT, -- 'booking', 'insight', 'user'
    entity_id UUID, -- The ID of the thing being changed
    ip_address TEXT,
    user_agent TEXT,
    details JSONB, -- Flexible JSON for extra metadata
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast searching by user or action
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
