/**
 * Ayeba Admin Core - Back Office Management System
 * Complete admin interface for managing Ayeba Studio ecosystem
 */

import { getDb } from "@/lib/storage/database";
import type {
  AdminUser,
  AdminRole,
  AdminAuditLog,
  NetworkOverview,
  FinancialOverview,
  ComplianceReport,
  DomainOverview,
  SystemAlert,
  TaskQueue,
  BulkAction,
  BulkActionResult,
} from "./admin-types";

type Row = Record<string, unknown>;

function mapAdminUser(row: Row): AdminUser {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as AdminRole,
    permissions: JSON.parse((row.permissions as string) || "[]"),
    departments: JSON.parse((row.departments as string) || "[]"),
    createdAt: row.created_at as string,
    lastLoginAt: (row.last_login_at as string) || "",
    status: row.status as AdminUser["status"],
  };
}

function mapAlert(row: Row): SystemAlert {
  return {
    id: row.id as string,
    type: row.type as SystemAlert["type"],
    severity: row.severity as SystemAlert["severity"],
    title: row.title as string,
    message: row.message as string,
    source: row.source as string,
    affectedEntities: JSON.parse((row.affected_entities as string) || "[]"),
    recommendedActions: JSON.parse((row.recommended_actions as string) || "[]"),
    createdAt: row.created_at as string,
    resolvedAt: (row.resolved_at as string) || undefined,
    resolvedBy: (row.resolved_by as string) || undefined,
  };
}

function mapTask(row: Row): TaskQueue {
  return {
    id: row.id as string,
    type: row.type as string,
    priority: row.priority as number,
    status: row.status as TaskQueue["status"],
    payload: JSON.parse((row.payload as string) || "{}"),
    result: row.result ? JSON.parse(row.result as string) : undefined,
    error: (row.error as string) || undefined,
    attempts: row.attempts as number,
    maxAttempts: row.max_attempts as number,
    scheduledAt: row.scheduled_at as string,
    startedAt: (row.started_at as string) || undefined,
    completedAt: (row.completed_at as string) || undefined,
    processedBy: (row.processed_by as string) || undefined,
  };
}

function mapAudit(row: Row): AdminAuditLog {
  return {
    id: row.id as string,
    adminId: row.admin_id as string,
    adminName: row.admin_name as string,
    action: row.action as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    changes: JSON.parse((row.changes as string) || "{}"),
    ipAddress: (row.ip_address as string) || "",
    userAgent: (row.user_agent as string) || "",
    timestamp: row.timestamp as string,
  };
}

export class AdminCore {
  /**
   * Create admin user
   */
  createAdminUser(input: {
    userId: string;
    name: string;
    email: string;
    role: AdminRole;
    departments: string[];
  }): AdminUser {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    const permissions = this.getPermissionsForRole(input.role);

    db.prepare(
      `INSERT INTO admin_users (
        id, user_id, name, email, role, permissions, departments,
        created_at, last_login_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    ).run(
      id,
      input.userId,
      input.name,
      input.email,
      input.role,
      JSON.stringify(permissions),
      JSON.stringify(input.departments),
      now,
      now,
    );

    this.logAudit({
      adminId: id,
      adminName: input.name,
      action: "create_admin_user",
      entityType: "admin_user",
      entityId: id,
      changes: { role: { old: null, new: input.role } },
    });

    return this.getAdminUser(id) as AdminUser;
  }

  /**
   * Get admin user by ID
   */
  getAdminUser(id: string): AdminUser | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM admin_users WHERE id = ?")
      .get(id) as Row | undefined;
    if (!row) return null;
    return mapAdminUser(row);
  }

  /**
   * Get admin user by user ID
   */
  getAdminByUserId(userId: string): AdminUser | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM admin_users WHERE user_id = ?")
      .get(userId) as Row | undefined;
    if (!row) return null;
    return mapAdminUser(row);
  }

  /**
   * List admin users with filters
   */
  listAdminUsers(filters: {
    role?: AdminRole;
    status?: string;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): { users: AdminUser[]; total: number; page: number; totalPages: number } {
    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.role) {
      conditions.push("role = ?");
      params.push(filters.role);
    }

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    if (filters.department) {
      conditions.push("json_array_length(departments) > 0 AND json_extract(departments, '$') LIKE ?");
      params.push(`%${filters.department}%`);
    }

    if (filters.search) {
      conditions.push("(name LIKE ? OR email LIKE ?)");
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const total = db
      .prepare(`SELECT COUNT(*) as c FROM admin_users ${whereClause}`)
      .get(...params) as { c: number };

    const rows = db
      .prepare(`SELECT * FROM admin_users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Row[];

    const users = rows.map(mapAdminUser);

    return {
      users,
      total: total.c,
      page,
      totalPages: Math.ceil(total.c / limit),
    };
  }

  /**
   * Update admin user
   */
  updateAdminUser(id: string, updates: {
    name?: string;
    email?: string;
    role?: AdminRole;
    departments?: string[];
    status?: string;
  }): AdminUser | null {
    const db = getDb();
    const admin = this.getAdminUser(id);
    if (!admin) return null;

    const setClause: string[] = [];
    const params: unknown[] = [];
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    if (updates.name !== undefined) {
      setClause.push("name = ?");
      params.push(updates.name);
      changes.name = { old: admin.name, new: updates.name };
    }

    if (updates.email !== undefined) {
      setClause.push("email = ?");
      params.push(updates.email);
      changes.email = { old: admin.email, new: updates.email };
    }

    if (updates.role !== undefined) {
      setClause.push("role = ?");
      params.push(updates.role);
      changes.role = { old: admin.role, new: updates.role };
      setClause.push("permissions = ?");
      params.push(JSON.stringify(this.getPermissionsForRole(updates.role)));
    }

    if (updates.departments !== undefined) {
      setClause.push("departments = ?");
      params.push(JSON.stringify(updates.departments));
      changes.departments = { old: admin.departments, new: updates.departments };
    }

    if (updates.status !== undefined) {
      setClause.push("status = ?");
      params.push(updates.status);
      changes.status = { old: admin.status, new: updates.status };
    }

    setClause.push("updated_at = ?");
    params.push(new Date().toISOString());

    if (setClause.length === 0) return admin;

    db.prepare(`UPDATE admin_users SET ${setClause.join(", ")} WHERE id = ?`).run(...params, id);

    this.logAudit({
      adminId: id,
      adminName: admin.name,
      action: "update_admin_user",
      entityType: "admin_user",
      entityId: id,
      changes,
    });

    return this.getAdminUser(id);
  }

  /**
   * Delete admin user
   */
  deleteAdminUser(id: string): boolean {
    const db = getDb();
    const admin = this.getAdminUser(id);
    if (!admin) return false;

    db.prepare("DELETE FROM admin_users WHERE id = ?").run(id);

    this.logAudit({
      adminId: id,
      adminName: admin.name,
      action: "delete_admin_user",
      entityType: "admin_user",
      entityId: id,
      changes: { deleted: { old: true, new: false } },
    });

    return true;
  }

  /**
   * Get permissions for role
   */
  private getPermissionsForRole(role: AdminRole): string[] {
    const rolePermissions: Record<AdminRole, string[]> = {
      super_admin: [
        "all",
        "users.manage",
        "campaigns.manage",
        "publishers.manage",
        "billing.manage",
        "moderation.all",
        "support.all",
        "analytics.all",
        "system.manage",
        "reports.all",
      ],
      manager: [
        "campaigns.manage",
        "publishers.manage",
        "billing.view",
        "moderation.approve",
        "support.assign",
        "analytics.view",
        "reports.view",
      ],
      support: [
        "support.view",
        "support.respond",
        "analytics.view",
        "moderation.view",
      ],
      moderator: [
        "moderation.view",
        "moderation.approve",
        "moderation.reject",
        "analytics.view",
      ],
      analyst: [
        "analytics.view",
        "reports.view",
        "analytics.export",
      ],
    };

    return rolePermissions[role] || [];
  }

  /**
   * Check permission
   */
  hasPermission(adminUser: AdminUser, permission: string): boolean {
    return adminUser.permissions.includes("all") || adminUser.permissions.includes(permission);
  }

  /**
   * Log audit action
   */
  private logAudit(input: {
    adminId: string;
    adminName: string;
    action: string;
    entityType: string;
    entityId: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  }): void {
    const db = getDb();

    db.prepare(
      `INSERT INTO admin_audit_log (
        admin_id, admin_name, action, entity_type, entity_id,
        changes, ip_address, user_agent, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, '', '', ?)`,
    ).run(
      input.adminId,
      input.adminName,
      input.action,
      input.entityType,
      input.entityId,
      JSON.stringify(input.changes),
      new Date().toISOString(),
    );
  }

  /**
   * Get audit logs
   */
  getAuditLogs(filters: {
    adminId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): AdminAuditLog[] {
    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.adminId) {
      conditions.push("admin_id = ?");
      params.push(filters.adminId);
    }

    if (filters.action) {
      conditions.push("action = ?");
      params.push(filters.action);
    }

    if (filters.entityType) {
      conditions.push("entity_type = ?");
      params.push(filters.entityType);
    }

    if (filters.entityId) {
      conditions.push("entity_id = ?");
      params.push(filters.entityId);
    }

    if (filters.startDate) {
      conditions.push("timestamp >= ?");
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push("timestamp <= ?");
      params.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters.limit || 100;

    const rows = db
      .prepare(`SELECT * FROM admin_audit_log ${whereClause} ORDER BY timestamp DESC LIMIT ?`)
      .all(...params, limit) as Row[];

    return rows.map(mapAudit);
  }

  /**
   * Get network overview
   */
  getNetworkOverview(): NetworkOverview {
    const db = getDb();
    const now = new Date().toISOString();

    // Get domain health
    const domains = db
      .prepare("SELECT * FROM network_health ORDER BY timestamp DESC LIMIT 5")
      .all() as {
        domain: string; status: DomainOverview["status"]; fill_rate: number; avg_latency_ms: number;
        impressions: number; revenue: number; active_placements: number;
      }[];

    const domainOverviews = domains.map((d) => ({
      domain: d.domain,
      status: d.status,
      fillRate: d.fill_rate,
      avgLatency: d.avg_latency_ms,
      impressions: d.impressions,
      revenue: d.revenue,
      activePlacements: d.active_placements,
      issues: d.status === "healthy" ? [] : ["Performance degraded"],
    }));

    // Get global stats
    const advertisers = db.prepare("SELECT COUNT(*) as c FROM advertisers WHERE status = 'active'").get() as { c: number };
    const publishers = db.prepare("SELECT COUNT(*) as c FROM publishers WHERE status = 'active'").get() as { c: number };
    const campaigns = db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE status = 'active'").get() as { c: number };

    const impressions = db.prepare("SELECT SUM(impressions) as c FROM performance_stats_daily WHERE day >= date('now', '-7 days')").get() as { c: number | null };
    const clicks = db.prepare("SELECT SUM(clicks) as c FROM performance_stats_daily WHERE day >= date('now', '-7 days')").get() as { c: number | null };
    const revenue = db.prepare("SELECT SUM(revenue) as c FROM performance_stats_daily WHERE day >= date('now', '-7 days')").get() as { c: number | null };

    const fillRate = domainOverviews.length > 0
      ? domainOverviews.reduce((sum, d) => sum + d.fillRate, 0) / domainOverviews.length
      : 0;

    const avgCpm = impressions?.c && impressions.c > 0
      ? (revenue?.c || 0) / (impressions.c / 1000)
      : 0;

    // Determine system health
    const systemHealth = domainOverviews.every((d) => d.status === "healthy")
      ? "healthy"
      : domainOverviews.some((d) => d.status === "down")
      ? "critical"
      : "degraded";

    return {
      timestamp: now,
      domains: domainOverviews,
      global: {
        totalAdvertisers: advertisers.c,
        totalPublishers: publishers.c,
        activeCampaigns: campaigns.c,
        totalImpressions: impressions?.c || 0,
        totalClicks: clicks?.c || 0,
        totalRevenue: revenue?.c || 0,
        avgFillRate: fillRate,
        avgCpm,
        activeUsers: 0, // Would come from trace data
        systemHealth,
      },
    };
  }

  /**
   * Get financial overview
   */
  getFinancialOverview(period: string = "month"): FinancialOverview {
    const db = getDb();
    const days = period === "week" ? 7 : period === "month" ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Revenue breakdown
    const revenueByDomain = db
      .prepare(
        `SELECT
           json_extract(metadata, '$.domain') as domain,
           SUM(amount) as total
         FROM invoices
         WHERE type = 'advertiser'
         AND created_at >= ?
         AND status = 'paid'
         GROUP BY domain`,
      )
      .all(startDate) as Array<{ domain: string; total: number }>;

    const totalRevenue = revenueByDomain.reduce((sum, r) => sum + r.total, 0);

    // Costs
    const publisherPayouts = db
      .prepare(
        `SELECT SUM(total) as total
         FROM invoices
         WHERE type = 'publisher'
         AND created_at >= ?
         AND status = 'paid'`,
      )
      .get(startDate) as { total: number | null };

    // Pending amounts
    const pendingInvoices = db
      .prepare(
        `SELECT COUNT(*) as c, SUM(total) as amount
         FROM invoices
         WHERE type = 'advertiser'
         AND status = 'sent'`,
      )
      .get() as { c: number; amount: number | null };

    const pendingPayouts = db
      .prepare(
        `SELECT COUNT(*) as c, SUM(total) as amount
         FROM invoices
         WHERE type = 'publisher'
         AND status = 'sent'`,
      )
      .get() as { c: number; amount: number | null };

    return {
      period,
      revenue: {
        total: totalRevenue,
        byDomain: Object.fromEntries(revenueByDomain.map((r) => [r.domain, r.total])),
        byCategory: {}, // Would come from campaign categories
        trend: 0, // Would calculate from previous period
      },
      costs: {
        total: publisherPayouts?.total || 0,
        publisherPayouts: publisherPayouts?.total || 0,
        infrastructure: 0,
        support: 0,
      },
      profit: {
        gross: totalRevenue - (publisherPayouts?.total || 0),
        net: totalRevenue - (publisherPayouts?.total || 0),
        margin: totalRevenue > 0 ? ((totalRevenue - (publisherPayouts?.total || 0)) / totalRevenue) * 100 : 0,
      },
      pending: {
        invoices: pendingInvoices.c,
        amount: pendingInvoices.amount || 0,
        payouts: pendingPayouts.c,
      },
      cashFlow: {
        inflow: totalRevenue,
        outflow: publisherPayouts?.total || 0,
        balance: totalRevenue - (publisherPayouts?.total || 0),
      },
    };
  }

  /**
   * Get compliance report
   */
  getComplianceReport(period: string = "month"): ComplianceReport {
    const db = getDb();
    const days = period === "week" ? 7 : period === "month" ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Policy violations
    const violations = db
      .prepare(
        `SELECT COUNT(*) as c FROM moderation_queue
         WHERE created_at >= ?`,
      )
      .get(startDate) as { c: number };

    // Content moderation
    const contentModeration = db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
           SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
         FROM moderation_queue
         WHERE type = 'creative'
         AND created_at >= ?`,
      )
      .get(startDate) as {
        total: number; approved: number | null; rejected: number | null; pending: number | null;
      };

    // Fraud detection
    const fraudStats = db
      .prepare(
        `SELECT
           COUNT(*) as blocked_requests,
           COUNT(DISTINCT json_extract(context, '$.user_id')) as flagged_accounts
         FROM fraud_detection
         WHERE action = 'block'
         AND timestamp >= ?`,
      )
      .get(startDate) as {
        blocked_requests: number; flagged_accounts: number;
      };

    return {
      period,
      policyViolations: {
        total: violations.c,
        byCategory: {},
        bySeverity: {},
        resolved: (contentModeration.approved ?? 0) + (contentModeration.rejected ?? 0),
        pending: contentModeration.pending ?? 0,
      },
      contentModeration: {
        reviewed: contentModeration.total,
        approved: contentModeration.approved ?? 0,
        rejected: contentModeration.rejected ?? 0,
        pending: contentModeration.pending ?? 0,
      },
      fraudDetection: {
        blockedRequests: fraudStats.blocked_requests,
        flaggedAccounts: fraudStats.flagged_accounts,
        suspendedAccounts: 0,
        revenueProtected: 0,
      },
      dataPrivacy: {
        gdprRequests: 0,
        dataDeletions: 0,
        consentUpdates: 0,
      },
    };
  }

  /**
   * Create system alert
   */
  createAlert(input: {
    type: "system" | "security" | "performance" | "revenue" | "compliance";
    severity: "info" | "warn" | "critical";
    title: string;
    message: string;
    source: string;
    affectedEntities: string[];
    recommendedActions: string[];
  }): SystemAlert {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO system_alerts (
        id, type, severity, title, message, source,
        affected_entities, recommended_actions, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.type,
      input.severity,
      input.title,
      input.message,
      input.source,
      JSON.stringify(input.affectedEntities),
      JSON.stringify(input.recommendedActions),
      now,
    );

    return this.getAlert(id) as SystemAlert;
  }

  /**
   * Get alert by ID
   */
  getAlert(id: string): SystemAlert | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM system_alerts WHERE id = ?")
      .get(id) as Row | undefined;
    if (!row) return null;
    return mapAlert(row);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SystemAlert[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM system_alerts WHERE resolved_at IS NULL ORDER BY created_at DESC")
      .all() as Row[];
    return rows.map(mapAlert);
  }

  /**
   * Resolve alert
   */
  resolveAlert(id: string, adminId: string): SystemAlert | null {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE system_alerts
       SET resolved_at = ?, resolved_by = ?
       WHERE id = ?`,
    ).run(now, adminId, id);

    return this.getAlert(id);
  }

  /**
   * Add task to queue
   */
  addTask(input: {
    type: string;
    priority: number;
    payload: Record<string, unknown>;
    scheduledFor?: string;
  }): TaskQueue {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO admin_task_queue (
        id, type, priority, status, payload, attempts, max_attempts,
        scheduled_at, created_at
      ) VALUES (?, ?, ?, 'pending', ?, 0, 3, ?, ?)`,
    ).run(
      id,
      input.type,
      input.priority,
      JSON.stringify(input.payload),
      input.scheduledFor || now,
      now,
    );

    return this.getTask(id) as TaskQueue;
  }

  /**
   * Get task by ID
   */
  getTask(id: string): TaskQueue | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM admin_task_queue WHERE id = ?")
      .get(id) as Row | undefined;
    if (!row) return null;
    return mapTask(row);
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): TaskQueue[] {
    const db = getDb();
    const now = new Date().toISOString();

    const rows = db
      .prepare(
        `SELECT * FROM admin_task_queue
         WHERE status = 'pending'
         AND scheduled_at <= ?
         ORDER BY priority DESC, scheduled_at ASC
         LIMIT 50`,
      )
      .all(now) as Row[];

    return rows.map(mapTask);
  }

  /**
   * Process task
   */
  processTask(taskId: string, adminId: string): TaskQueue | null {
    const db = getDb();
    const task = this.getTask(taskId);
    if (!task) return null;

    const now = new Date().toISOString();

    db.prepare(
      `UPDATE admin_task_queue
       SET status = 'processing', started_at = ?, processed_by = ?
       WHERE id = ?`,
    ).run(now, adminId, taskId);

    // Simulate task processing (in production, implement actual task logic)
    const result = this.executeTask(task);

    const status = result.success ? "completed" : "failed";

    db.prepare(
      `UPDATE admin_task_queue
       SET status = ?, completed_at = ?, result = ?, attempts = attempts + 1
       WHERE id = ?`,
    ).run(status, now, JSON.stringify(result.data), taskId);

    return this.getTask(taskId);
  }

  /**
   * Execute task (simulated)
   */
  private executeTask(task: TaskQueue): { success: boolean; data: Record<string, unknown> } {
    // In production, implement actual task execution logic
    switch (task.type) {
      case "bulk_approve":
        return {
          success: true,
          data: { approved: (task.payload.entityIds as string[] | undefined)?.length || 0 },
        };
      case "bulk_reject":
        return {
          success: true,
          data: { rejected: (task.payload.entityIds as string[] | undefined)?.length || 0 },
        };
      case "generate_report":
        return { success: true, data: { reportUrl: "/reports/generated" } };
      default:
        return { success: false, data: { error: "Unknown task type" } };
    }
  }

  /**
   * Execute bulk action
   */
  executeBulkAction(action: BulkAction, adminId: string): BulkActionResult {
    const actionId = this.generateId();
    const now = new Date().toISOString();

    // Add task to queue
    this.addTask({
      type: `bulk_${action.type}`,
      priority: 10,
      payload: {
        ...action,
        actionId,
        adminId,
      },
      scheduledFor: action.scheduledFor,
    });

    // Simulate immediate execution for dry run
    if (action.dryRun) {
      return {
        actionId,
        status: "completed",
        total: action.entityIds.length,
        processed: action.entityIds.length,
        succeeded: action.entityIds.length,
        failed: 0,
        errors: [],
        startedAt: now,
        completedAt: now,
        processedBy: adminId,
      };
    }

    return {
      actionId,
      status: "pending",
      total: action.entityIds.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
      startedAt: now,
      processedBy: adminId,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const adminCore = new AdminCore();
