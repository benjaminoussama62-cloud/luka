/**
 * Ayeba Moderation System - Content Moderation & Approval
 * Review and approval system for creatives, campaigns, and publisher sites
 */

import { getDb } from "@/lib/storage/database";
import { adminCore } from "./admin-core";
import type {
  ModerationQueueItem,
  AdminUser,
} from "./admin-types";

export class ModerationSystem {
  /**
   * Add item to moderation queue
   */
  addToQueue(input: {
    type: "creative" | "campaign" | "publisher_site" | "advertiser" | "content";
    entityId: string;
    entityType: string;
    reason: string;
    priority?: "low" | "medium" | "high" | "urgent";
    submittedBy: string;
    metadata?: Record<string, unknown>;
  }): ModerationQueueItem {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO moderation_queue (
        id, type, entity_id, entity_type, reason, priority,
        status, submitted_by, submitted_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    ).run(
      id,
      input.type,
      input.entityId,
      input.entityType,
      input.reason,
      input.priority || "medium",
      input.submittedBy,
      now,
      JSON.stringify(input.metadata || {}),
    );

    return this.getQueueItem(id);
  }

  /**
   * Get queue item by ID
   */
  getQueueItem(id: string): ModerationQueueItem | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM moderation_queue WHERE id = ?")
      .get(id) as ModerationQueueItem | undefined;
    if (!row) return null;

    return {
      ...row,
      metadata: JSON.parse(row.metadata as string),
    };
  }

  /**
   * Get moderation queue with filters
   */
  getQueue(filters: {
    type?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }): { items: ModerationQueueItem[]; total: number; page: number; totalPages: number } {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.type) {
      conditions.push("type = ?");
      params.push(filters.type);
    }

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    if (filters.priority) {
      conditions.push("priority = ?");
      params.push(filters.priority);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const total = db
      .prepare(`SELECT COUNT(*) as c FROM moderation_queue ${whereClause}`)
      .get(...params) as { c: number };

    const rows = db
      .prepare(`SELECT * FROM moderation_queue ${whereClause} ORDER BY priority DESC, created_at ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as ModerationQueueItem[];

    const items = rows.map((row) => ({
      ...row,
      metadata: JSON.parse(row.metadata as string),
    }));

    return {
      items,
      total: total.c,
      page,
      totalPages: Math.ceil(total.c / limit),
    };
  }

  /**
   * Approve queue item
   */
  approveItem(id: string, adminId: string, notes?: string): ModerationQueueItem | null {
    const db = getDb();
    const admin = adminCore.getAdminUser(adminId);
    if (!admin) return null;

    const item = this.getQueueItem(id);
    if (!item) return null;

    const now = new Date().toISOString();

    db.prepare(
      `UPDATE moderation_queue
       SET status = 'approved', reviewed_by = ?, reviewed_at = ?, notes = ?
       WHERE id = ?`,
    ).run(admin.name, now, notes || "", id);

    // Take action based on item type
    this.executeApproval(item, adminId);

    return this.getQueueItem(id);
  }

  /**
   * Reject queue item
   */
  rejectItem(id: string, adminId: string, notes: string): ModerationQueueItem | null {
    const db = getDb();
    const admin = adminCore.getAdminUser(adminId);
    if (!admin) return null;

    const item = this.getQueueItem(id);
    if (!item) return null;

    const now = new Date().toISOString();

    db.prepare(
      `UPDATE moderation_queue
       SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, notes = ?
       WHERE id = ?`,
    ).run(admin.name, now, notes, id);

    // Take action based on item type
    this.executeRejection(item, adminId);

    return this.getQueueItem(id);
  }

  /**
   * Mark item as under review
   */
  markUnderReview(id: string, adminId: string): ModerationQueueItem | null {
    const db = getDb();
    const admin = adminCore.getAdminUser(adminId);
    if (!admin) return null;

    const now = new Date().toISOString();

    db.prepare(
      `UPDATE moderation_queue
       SET status = 'under_review', reviewed_by = ?, reviewed_at = ?
       WHERE id = ?`,
    ).run(admin.name, now, id);

    return this.getQueueItem(id);
  }

  /**
   * Execute approval action
   */
  private executeApproval(item: ModerationQueueItem, adminId: string): void {
    const db = getDb();

    switch (item.type) {
      case "creative":
        // Approve creative
        db.prepare(
          `UPDATE ad_creatives
           SET status = 'approved', is_valid = 1, reviewed_at = ?, reviewed_by = ?
           WHERE id = ?`,
        ).run(new Date().toISOString(), adminId, item.entityId);
        break;

      case "campaign":
        // Approve campaign
        db.prepare(
          `UPDATE campaigns
           SET status = 'active'
           WHERE id = ?`,
        ).run(item.entityId);
        break;

      case "publisher_site":
        // Approve publisher site
        db.prepare(
          `UPDATE publisher_sites
           SET status = 'active', verification_status = 'verified', verified_at = ?
           WHERE id = ?`,
        ).run(new Date().toISOString(), item.entityId);
        break;

      case "advertiser":
        // Approve advertiser
        db.prepare(
          `UPDATE advertisers
           SET status = 'active', verification_status = 'verified', verified_at = ?
           WHERE id = ?`,
        ).run(new Date().toISOString(), item.entityId);
        break;

      default:
        // Generic approval - handle custom content types
        break;
    }
  }

  /**
   * Execute rejection action
   */
  private executeRejection(item: ModerationQueueItem, adminId: string): void {
    const db = getDb();

    switch (item.type) {
      case "creative":
        // Reject creative
        db.prepare(
          `UPDATE ad_creatives
           SET status = 'rejected', is_valid = 0, rejected_reason = ?, reviewed_at = ?, reviewed_by = ?
           WHERE id = ?`,
        ).run(item.notes || "Rejected by admin", new Date().toISOString(), adminId, item.entityId);
        break;

      case "campaign":
        // Reject campaign
        db.prepare(
          `UPDATE campaigns
           SET status = 'rejected'
           WHERE id = ?`,
        ).run(item.entityId);
        break;

      case "publisher_site":
        // Reject publisher site
        db.prepare(
          `UPDATE publisher_sites
           SET status = 'rejected', verification_status = 'failed'
           WHERE id = ?`,
        ).run(item.entityId);
        break;

      case "advertiser":
        // Reject advertiser
        db.prepare(
          `UPDATE advertisers
           SET status = 'rejected', verification_status = 'failed'
           WHERE id = ?`,
        ).run(item.entityId);
        break;

      default:
        // Generic rejection
        break;
    }
  }

  /**
   * Get moderation statistics
   */
  getModerationStats(): {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    avgReviewTime: number;
    pendingItems: number;
    urgentItems: number;
    approvedToday: number;
    rejectedToday: number;
  } {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    const total = db.prepare("SELECT COUNT(*) as c FROM moderation_queue").get() as { c: number };

    const byStatus = db
      .prepare("SELECT status, COUNT(*) as c FROM moderation_queue GROUP BY status")
      .all() as Array<{ status: string; c: number }>;

    const byType = db
      .prepare("SELECT type, COUNT(*) as c FROM moderation_queue GROUP BY type")
      .all() as Array<{ type: string; c: number }>;

    const byPriority = db
      .prepare("SELECT priority, COUNT(*) as c FROM moderation_queue GROUP BY priority")
      .all() as Array<{ priority: string; c: number }>;

    const avgReviewTime = db
      .prepare(
        `SELECT AVG(julianday(reviewed_at) - julianday(submitted_at)) * 24 * 60 as avg_minutes
         FROM moderation_queue
         WHERE reviewed_at IS NOT NULL`,
      )
      .get() as { avg_minutes: number | null };

    const pendingItems = db
      .prepare("SELECT COUNT(*) as c FROM moderation_queue WHERE status = 'pending'")
      .get() as { c: number };

    const urgentItems = db
      .prepare("SELECT COUNT(*) as c FROM moderation_queue WHERE priority = 'urgent' AND status != 'approved'")
      .get() as { c: number };

    const approvedToday = db
      .prepare(
        `SELECT COUNT(*) as c FROM moderation_queue
         WHERE status = 'approved' AND date(reviewed_at) = ?`,
      )
      .get(today) as { c: number };

    const rejectedToday = db
      .prepare(
        `SELECT COUNT(*) as c FROM moderation_queue
         WHERE status = 'rejected' AND date(reviewed_at) = ?`,
      )
      .get(today) as { c: number };

    return {
      total: total.c,
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.c])),
      byType: Object.fromEntries(byType.map((r) => [r.type, r.c])),
      byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r.c])),
      avgReviewTime: avgReviewTime?.avg_minutes || 0,
      pendingItems: pendingItems.c,
      urgentItems: urgentItems.c,
      approvedToday: approvedToday.c,
      rejectedToday: rejectedToday.c,
    };
  }

  /**
   * Get items assigned to admin
   */
  getAssignedItems(adminId: string): ModerationQueueItem[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT * FROM moderation_queue
         WHERE reviewed_by = ?
         AND status = 'under_review'
         ORDER BY priority DESC, submitted_at ASC`,
      )
      .all(adminId) as ModerationQueueItem[];

    return rows.map((row) => ({
      ...row,
      metadata: JSON.parse(row.metadata as string),
    }));
  }

  /**
   * Bulk approve items
   */
  bulkApprove(itemIds: string[], adminId: string, notes?: string): {
    succeeded: string[];
    failed: Array<{ id: string; error: string }>;
  } {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of itemIds) {
      try {
        this.approveItem(id, adminId, notes);
        succeeded.push(id);
      } catch (error) {
        failed.push({ id, error: (error as Error).message });
      }
    }

    return { succeeded, failed };
  }

  /**
   * Bulk reject items
   */
  bulkReject(itemIds: string[], adminId: string, notes: string): {
    succeeded: string[];
    failed: Array<{ id: string; error: string }>;
  } {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of itemIds) {
      try {
        this.rejectItem(id, adminId, notes);
        succeeded.push(id);
      } catch (error) {
        failed.push({ id, error: (error as Error).message });
      }
    }

    return { succeeded, failed };
  }

  /**
   * Auto-moderate content (basic checks)
   */
  autoModerate(input: {
    type: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): { shouldModerate: boolean; reason?: string; priority: string } {
    // Basic content checks
    const forbiddenWords = ["spam", "scam", "fake", "illegal", "viagra", "casino"];
    const lowerContent = input.content.toLowerCase();

    for (const word of forbiddenWords) {
      if (lowerContent.includes(word)) {
        return {
          shouldModerate: true,
          reason: `Contains forbidden word: ${word}`,
          priority: "high",
        };
      }
    }

    // Check for suspicious patterns
    if (input.content.includes("http://") && input.content.split("http://").length > 5) {
      return {
        shouldModerate: true,
        reason: "Too many external links",
        priority: "medium",
      };
    }

    // Check for excessive caps
    const capsRatio = (input.content.match(/[A-Z]/g) || []).length / input.content.length;
    if (capsRatio > 0.7 && input.content.length > 20) {
      return {
        shouldModerate: true,
        reason: "Excessive capitalization",
        priority: "low",
      };
    }

    return { shouldModerate: false, priority: "low" };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const moderationSystem = new ModerationSystem();
