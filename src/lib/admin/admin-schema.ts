/**
 * Ayeba Admin Database Schema
 * Tables for back-office management system
 */

export const ADMIN_SCHEMA = `
-- ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'support',
  permissions TEXT NOT NULL DEFAULT '[]',
  departments TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);

-- ADMIN AUDIT LOG
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  changes TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_timestamp ON admin_audit_log(timestamp DESC);

-- MODERATION QUEUE
CREATE TABLE IF NOT EXISTS moderation_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  notes TEXT,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_moderation_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_priority ON moderation_queue(priority);
CREATE INDEX IF NOT EXISTS idx_moderation_type ON moderation_queue(type);

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT REFERENCES admin_users(id),
  assigned_at TEXT,
  resolved_by TEXT REFERENCES admin_users(id),
  resolved_at TEXT,
  resolution TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_category ON support_tickets(category);

-- SUPPORT MESSAGES
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT NOT NULL DEFAULT '[]',
  is_internal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at DESC);

-- SYSTEM ALERTS
CREATE TABLE IF NOT EXISTS system_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  affected_entities TEXT NOT NULL DEFAULT '[]',
  recommended_actions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON system_alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON system_alerts(resolved_at);

-- ADMIN TASK QUEUE
CREATE TABLE IF NOT EXISTS admin_task_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  payload TEXT NOT NULL DEFAULT '{}',
  result TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  processed_by TEXT REFERENCES admin_users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_status ON admin_task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_priority ON admin_task_queue(priority);
CREATE INDEX IF NOT EXISTS idx_task_scheduled ON admin_task_queue(scheduled_at);

-- ADMIN SETTINGS
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by TEXT REFERENCES admin_users(id),
  updated_at TEXT NOT NULL
);

-- ADMIN NOTIFICATIONS
CREATE TABLE IF NOT EXISTS admin_notifications (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_admin ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON admin_notifications(created_at DESC);
`;

export function applyAdminSchema(db: { exec(sql: string): unknown }) {
  const migrations = [
    "ALTER TABLE admin_users ADD COLUMN id TEXT",
    "ALTER TABLE admin_users ADD COLUMN user_id TEXT",
    "ALTER TABLE admin_users ADD COLUMN name TEXT",
    "ALTER TABLE admin_users ADD COLUMN email TEXT",
    "ALTER TABLE admin_users ADD COLUMN role TEXT",
    "ALTER TABLE admin_users ADD COLUMN permissions TEXT",
    "ALTER TABLE admin_users ADD COLUMN departments TEXT",
    "ALTER TABLE admin_users ADD COLUMN created_at TEXT",
    "ALTER TABLE admin_users ADD COLUMN last_login_at TEXT",
    "ALTER TABLE admin_users ADD COLUMN status TEXT",
    "ALTER TABLE admin_audit_log ADD COLUMN id TEXT",
    "ALTER TABLE admin_audit_log ADD COLUMN admin_id TEXT",
    "ALTER TABLE admin_audit_log ADD COLUMN admin_name TEXT",
    "ALTER TABLE admin_audit_log ADD COLUMN action TEXT",
    "ALTER TABLE admin_audit_log ADD COLUMN entity_type TEXT",
    "ALTER TABLE admin_audit_log ADD COLUMN entity_id TEXT",
    "ALTER TABLE admin_audit_log ADD COLUMN changes TEXT",
    "ALTER TABLE admin_audit_log ADD COLUMN ip_address TEXT",
    "ALTER TABLE admin_audit_log ADD COLUMN user_agent TEXT",
    "ALTER TABLE admin_audit_log ADD COLUMN timestamp TEXT",
    "ALTER TABLE moderation_queue ADD COLUMN type TEXT",
    "ALTER TABLE moderation_queue ADD COLUMN entity_id TEXT",
    "ALTER TABLE moderation_queue ADD COLUMN entity_type TEXT",
    "ALTER TABLE moderation_queue ADD COLUMN priority TEXT",
    "ALTER TABLE moderation_queue ADD COLUMN submitted_by TEXT",
    "ALTER TABLE moderation_queue ADD COLUMN submitted_at TEXT",
    "ALTER TABLE moderation_queue ADD COLUMN reviewed_by TEXT",
    "ALTER TABLE moderation_queue ADD COLUMN reviewed_at TEXT",
    "ALTER TABLE moderation_queue ADD COLUMN notes TEXT",
    "ALTER TABLE moderation_queue ADD COLUMN metadata TEXT",
    "ALTER TABLE support_tickets ADD COLUMN id TEXT",
    "ALTER TABLE support_tickets ADD COLUMN ticket_number TEXT",
    "ALTER TABLE support_tickets ADD COLUMN user_id TEXT",
    "ALTER TABLE support_tickets ADD COLUMN user_name TEXT",
    "ALTER TABLE support_tickets ADD COLUMN user_email TEXT",
    "ALTER TABLE support_tickets ADD COLUMN category TEXT",
    "ALTER TABLE support_tickets ADD COLUMN priority TEXT",
    "ALTER TABLE support_tickets ADD COLUMN subject TEXT",
    "ALTER TABLE support_tickets ADD COLUMN description TEXT",
    "ALTER TABLE support_tickets ADD COLUMN status TEXT",
    "ALTER TABLE support_tickets ADD COLUMN assigned_to TEXT",
    "ALTER TABLE support_tickets ADD COLUMN assigned_at TEXT",
    "ALTER TABLE support_tickets ADD COLUMN resolved_by TEXT",
    "ALTER TABLE support_tickets ADD COLUMN resolved_at TEXT",
    "ALTER TABLE support_tickets ADD COLUMN resolution TEXT",
    "ALTER TABLE support_tickets ADD COLUMN created_at TEXT",
    "ALTER TABLE support_tickets ADD COLUMN updated_at TEXT",
    "ALTER TABLE support_messages ADD COLUMN id TEXT",
    "ALTER TABLE support_messages ADD COLUMN ticket_id TEXT",
    "ALTER TABLE support_messages ADD COLUMN sender_id TEXT",
    "ALTER TABLE support_messages ADD COLUMN sender_name TEXT",
    "ALTER TABLE support_messages ADD COLUMN sender_type TEXT",
    "ALTER TABLE support_messages ADD COLUMN message TEXT",
    "ALTER TABLE support_messages ADD COLUMN attachments TEXT",
    "ALTER TABLE support_messages ADD COLUMN is_internal TEXT",
    "ALTER TABLE support_messages ADD COLUMN created_at TEXT",
    "ALTER TABLE system_alerts ADD COLUMN id TEXT",
    "ALTER TABLE system_alerts ADD COLUMN type TEXT",
    "ALTER TABLE system_alerts ADD COLUMN severity TEXT",
    "ALTER TABLE system_alerts ADD COLUMN title TEXT",
    "ALTER TABLE system_alerts ADD COLUMN message TEXT",
    "ALTER TABLE system_alerts ADD COLUMN source TEXT",
    "ALTER TABLE system_alerts ADD COLUMN affected_entities TEXT",
    "ALTER TABLE system_alerts ADD COLUMN recommended_actions TEXT",
    "ALTER TABLE system_alerts ADD COLUMN created_at TEXT",
    "ALTER TABLE system_alerts ADD COLUMN resolved_at TEXT",
    "ALTER TABLE system_alerts ADD COLUMN resolved_by TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN id TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN type TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN priority TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN status TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN payload TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN result TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN error TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN attempts TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN max_attempts TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN scheduled_at TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN started_at TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN completed_at TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN processed_by TEXT",
    "ALTER TABLE admin_task_queue ADD COLUMN created_at TEXT",
    "ALTER TABLE admin_settings ADD COLUMN key TEXT",
    "ALTER TABLE admin_settings ADD COLUMN value TEXT",
    "ALTER TABLE admin_settings ADD COLUMN description TEXT",
    "ALTER TABLE admin_settings ADD COLUMN updated_by TEXT",
    "ALTER TABLE admin_settings ADD COLUMN updated_at TEXT",
    "ALTER TABLE admin_notifications ADD COLUMN id TEXT",
    "ALTER TABLE admin_notifications ADD COLUMN admin_id TEXT",
    "ALTER TABLE admin_notifications ADD COLUMN type TEXT",
    "ALTER TABLE admin_notifications ADD COLUMN title TEXT",
    "ALTER TABLE admin_notifications ADD COLUMN message TEXT",
    "ALTER TABLE admin_notifications ADD COLUMN link TEXT",
    "ALTER TABLE admin_notifications ADD COLUMN read TEXT",
    "ALTER TABLE admin_notifications ADD COLUMN created_at TEXT",
  ];

  for (const sql of migrations) {
    try { db.exec(sql); } catch {}
  }
  db.exec(ADMIN_SCHEMA);
}
