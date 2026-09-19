/**
 * Ayeba Support System - Customer Support Management
 * Complete ticket system for managing user support requests
 */

import { getDb } from "@/lib/storage/database";
import { adminCore } from "./admin-core";
import type {
  SupportTicket,
  SupportMessage,
  AdminUser,
} from "./admin-types";

export class SupportSystem {
  /**
   * Create support ticket
   */
  createTicket(input: {
    userId: string;
    userName: string;
    userEmail: string;
    category: "billing" | "technical" | "account" | "policy" | "fraud";
    priority: "low" | "medium" | "high" | "urgent";
    subject: string;
    description: string;
  }): SupportTicket {
    const db = getDb();
    const id = this.generateId();
    const ticketNumber = this.generateTicketNumber();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO support_tickets (
        id, ticket_number, user_id, user_name, user_email,
        category, priority, subject, description, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
    ).run(
      id,
      ticketNumber,
      input.userId,
      input.userName,
      input.userEmail,
      input.category,
      input.priority,
      input.subject,
      input.description,
      now,
      now,
    );

    // Auto-assign based on category and priority
    this.autoAssignTicket(id, input.category, input.priority);

    return this.getTicket(id);
  }

  /**
   * Get ticket by ID
   */
  getTicket(id: string): SupportTicket | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM support_tickets WHERE id = ?")
      .get(id) as SupportTicket | undefined;
    if (!row) return null;

    return {
      ...row,
      messages: this.getTicketMessages(id),
    };
  }

  /**
   * Get ticket by number
   */
  getTicketByNumber(ticketNumber: string): SupportTicket | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM support_tickets WHERE ticket_number = ?")
      .get(ticketNumber) as SupportTicket | undefined;
    if (!row) return null;

    return {
      ...row,
      messages: this.getTicketMessages(row.id),
    };
  }

  /**
   * Get tickets for user
   */
  getUserTickets(userId: string): SupportTicket[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as SupportTicket[];

    return rows.map((row) => ({
      ...row,
      messages: this.getTicketMessages(row.id),
    }));
  }

  /**
   * Get tickets with filters
   */
  getTickets(filters: {
    status?: string;
    category?: string;
    priority?: string;
    assignedTo?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }): { tickets: SupportTicket[]; total: number; page: number; totalPages: number } {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    if (filters.category) {
      conditions.push("category = ?");
      params.push(filters.category);
    }

    if (filters.priority) {
      conditions.push("priority = ?");
      params.push(filters.priority);
    }

    if (filters.assignedTo) {
      conditions.push("assigned_to = ?");
      params.push(filters.assignedTo);
    }

    if (filters.userId) {
      conditions.push("user_id = ?");
      params.push(filters.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const total = db
      .prepare(`SELECT COUNT(*) as c FROM support_tickets ${whereClause}`)
      .get(...params) as { c: number };

    const rows = db
      .prepare(`SELECT * FROM support_tickets ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as SupportTicket[];

    const tickets = rows.map((row) => ({
      ...row,
      messages: this.getTicketMessages(row.id),
    }));

    return {
      tickets,
      total: total.c,
      page,
      totalPages: Math.ceil(total.c / limit),
    };
  }

  /**
   * Update ticket
   */
  updateTicket(id: string, updates: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    resolution?: string;
  }): SupportTicket | null {
    const db = getDb();
    const ticket = this.getTicket(id);
    if (!ticket) return null;

    const setClause: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      setClause.push("status = ?");
      params.push(updates.status);

      if (updates.status === "resolved") {
        setClause.push("resolved_at = ?");
        params.push(new Date().toISOString());
      }
    }

    if (updates.priority !== undefined) {
      setClause.push("priority = ?");
      params.push(updates.priority);
    }

    if (updates.assignedTo !== undefined) {
      setClause.push("assigned_to = ?");
      params.push(updates.assignedTo);
      setClause.push("assigned_at = ?");
      params.push(new Date().toISOString());
    }

    if (updates.resolution !== undefined) {
      setClause.push("resolution = ?");
      params.push(updates.resolution);
    }

    setClause.push("updated_at = ?");
    params.push(new Date().toISOString());

    if (setClause.length === 0) return ticket;

    db.prepare(`UPDATE support_tickets SET ${setClause.join(", ")} WHERE id = ?`).run(...params, id);

    return this.getTicket(id);
  }

  /**
   * Add message to ticket
   */
  addMessage(input: {
    ticketId: string;
    senderId: string;
    senderName: string;
    senderType: "user" | "admin";
    message: string;
    attachments?: string[];
    isInternal?: boolean;
  }): SupportMessage {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO support_messages (
        id, ticket_id, sender_id, sender_name, sender_type,
        message, attachments, is_internal, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.ticketId,
      input.senderId,
      input.senderName,
      input.senderType,
      input.message,
      JSON.stringify(input.attachments || []),
      input.isInternal ? 1 : 0,
      now,
    );

    // Update ticket updated_at
    db.prepare("UPDATE support_tickets SET updated_at = ? WHERE id = ?").run(now, input.ticketId);

    return this.getMessage(id);
  }

  /**
   * Get message by ID
   */
  getMessage(id: string): SupportMessage | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM support_messages WHERE id = ?")
      .get(id) as SupportMessage | undefined;
    if (!row) return null;

    return {
      ...row,
      attachments: JSON.parse(row.attachments as string),
    };
  }

  /**
   * Get messages for ticket
   */
  getTicketMessages(ticketId: string): SupportMessage[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC")
      .all(ticketId) as SupportMessage[];

    return rows.map((row) => ({
      ...row,
      attachments: JSON.parse(row.attachments as string),
    }));
  }

  /**
   * Assign ticket to admin
   */
  assignTicket(ticketId: string, adminId: string): SupportTicket | null {
    const admin = adminCore.getAdminUser(adminId);
    if (!admin) return null;

    return this.updateTicket(ticketId, {
      assignedTo: adminId,
      status: "in_progress",
    });
  }

  /**
   * Auto-assign ticket based on category and priority
   */
  private autoAssignTicket(ticketId: string, category: string, priority: string): void {
    const db = getDb();

    // Find available admin with matching department
    const admin = db
      .prepare(
        `SELECT * FROM admin_users
         WHERE status = 'active'
         AND json_array_length(departments) > 0
         AND json_extract(departments, '$') LIKE ?
         ORDER BY random()
         LIMIT 1`,
      )
      .get(`%${category}%`) as AdminUser | undefined;

    if (admin) {
      this.assignTicket(ticketId, admin.id);
    } else if (priority === "urgent" || priority === "high") {
      // For urgent tickets, assign to any available admin
      const anyAdmin = db
        .prepare(
          `SELECT * FROM admin_users
           WHERE status = 'active'
           ORDER BY random()
           LIMIT 1`,
        )
        .get() as AdminUser | undefined;

      if (anyAdmin) {
        this.assignTicket(ticketId, anyAdmin.id);
      }
    }
  }

  /**
   * Get ticket statistics
   */
  getTicketStats(): {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    avgResolutionTime: number;
    openTickets: number;
    urgentTickets: number;
  } {
    const db = getDb();

    const total = db.prepare("SELECT COUNT(*) as c FROM support_tickets").get() as { c: number };

    const byStatus = db
      .prepare("SELECT status, COUNT(*) as c FROM support_tickets GROUP BY status")
      .all() as Array<{ status: string; c: number }>;

    const byCategory = db
      .prepare("SELECT category, COUNT(*) as c FROM support_tickets GROUP BY category")
      .all() as Array<{ category: string; c: number }>;

    const byPriority = db
      .prepare("SELECT priority, COUNT(*) as c FROM support_tickets GROUP BY priority")
      .all() as Array<{ priority: string; c: number }>;

    const avgResolutionTime = db
      .prepare(
        `SELECT AVG(julianday(resolved_at) - julianday(created_at)) * 24 * 60 as avg_minutes
         FROM support_tickets
         WHERE status = 'resolved' AND resolved_at IS NOT NULL`,
      )
      .get() as { avg_minutes: number | null };

    const openTickets = db
      .prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'open'")
      .get() as { c: number };

    const urgentTickets = db
      .prepare("SELECT COUNT(*) as c FROM support_tickets WHERE priority = 'urgent' AND status != 'resolved'")
      .get() as { c: number };

    return {
      total: total.c,
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.c])),
      byCategory: Object.fromEntries(byCategory.map((r) => [r.category, r.c])),
      byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r.c])),
      avgResolutionTime: avgResolutionTime?.avg_minutes || 0,
      openTickets: openTickets.c,
      urgentTickets: urgentTickets.c,
    };
  }

  /**
   * Get tickets assigned to admin
   */
  getAssignedTickets(adminId: string): SupportTicket[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT * FROM support_tickets
         WHERE assigned_to = ?
         AND status != 'resolved'
         ORDER BY priority DESC, created_at ASC`,
      )
      .all(adminId) as SupportTicket[];

    return rows.map((row) => ({
      ...row,
      messages: this.getTicketMessages(row.id),
    }));
  }

  /**
   * Escalate ticket
   */
  escalateTicket(ticketId: string, reason: string): SupportTicket | null {
    const ticket = this.getTicket(ticketId);
    if (!ticket) return null;

    // Increase priority
    const newPriority = ticket.priority === "low" ? "medium" :
                       ticket.priority === "medium" ? "high" :
                       ticket.priority === "high" ? "urgent" : "urgent";

    // Add internal message about escalation
    this.addMessage({
      ticketId,
      senderId: "system",
      senderName: "System",
      senderType: "admin",
      message: `Ticket escalated due to: ${reason}`,
      isInternal: true,
    });

    // Reassign to super admin if urgent
    if (newPriority === "urgent") {
      const db = getDb();
      const superAdmin = db
        .prepare(
          `SELECT * FROM admin_users
           WHERE role = 'super_admin' AND status = 'active'
           ORDER BY random()
           LIMIT 1`,
        )
        .get() as AdminUser | undefined;

      if (superAdmin) {
        return this.updateTicket(ticketId, {
          priority: newPriority,
          assignedTo: superAdmin.id,
        });
      }
    }

    return this.updateTicket(ticketId, { priority: newPriority });
  }

  /**
   * Merge tickets
   */
  mergeTickets(sourceTicketId: string, targetTicketId: string): SupportTicket | null {
    const sourceTicket = this.getTicket(sourceTicketId);
    const targetTicket = this.getTicket(targetTicketId);

    if (!sourceTicket || !targetTicket) return null;

    const db = getDb();

    // Move messages from source to target
    db.prepare(
      `UPDATE support_messages
       SET ticket_id = ?
       WHERE ticket_id = ?`,
    ).run(targetTicketId, sourceTicketId);

    // Update source ticket status
    db.prepare(
      `UPDATE support_tickets
       SET status = 'closed', resolution = 'Merged into ticket #${targetTicket.ticket_number}'
       WHERE id = ?`,
    ).run(sourceTicketId);

    // Add message to target about merge
    this.addMessage({
      ticketId: targetTicketId,
      senderId: "system",
      senderName: "System",
      senderType: "admin",
      message: `Ticket #${sourceTicket.ticketNumber} has been merged into this ticket.`,
      isInternal: true,
    });

    return this.getTicket(targetTicketId);
  }

  /**
   * Generate ticket number
   */
  private generateTicketNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${timestamp}-${random}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const supportSystem = new SupportSystem();
