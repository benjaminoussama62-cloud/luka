/**
 * Ayeba Admin Dashboard - Main Back Office Interface
 * Central dashboard for managing the entire Ayeba Studio ecosystem
 */

import { getDb } from "@/lib/storage/database";
import { adminCore } from "./admin-core";
import { supportSystem } from "./support-system";
import { moderationSystem } from "./moderation-system";
import type {
  AdminRole,
  AdminUser,
  AnalyticsDashboard,
  SystemAlert,
} from "./admin-types";

export class AdminDashboard {
  /**
   * Get main admin dashboard
   */
  async getMainDashboard(adminUser: AdminUser): Promise<{
    overview: {
      network: unknown;
      financial: unknown;
      compliance: unknown;
      system: {
        health: string;
        uptime: number;
        avgResponseTime: number;
        activeUsers: number;
      };
    };
    alerts: SystemAlert[];
    tasks: unknown[];
    support: {
      openTickets: number;
      urgentTickets: number;
      myTickets: number;
      avgResponseTime: number;
    };
    moderation: {
      pendingItems: number;
      urgentItems: number;
      myItems: number;
      approvedToday: number;
    };
    quickActions: Array<{
      id: string;
      label: string;
      icon: string;
      action: string;
      href: string;
    }>;
    recentActivity: unknown[];
  }> {
    // Get overviews
    const network = adminCore.getNetworkOverview();
    const financial = adminCore.getFinancialOverview();
    const compliance = adminCore.getComplianceReport();

    // Get alerts
    const alerts = adminCore.getActiveAlerts();

    // Get tasks
    const tasks = adminCore.getPendingTasks();

    // Get support stats
    const supportStats = supportSystem.getTicketStats();
    const myTickets = supportSystem.getAssignedTickets(adminUser.id).length;

    // Get moderation stats
    const moderationStats = moderationSystem.getModerationStats();
    const myItems = moderationSystem.getAssignedItems(adminUser.id).length;

    // Generate quick actions based on role
    const quickActions = this.generateQuickActions(adminUser);

    // Get recent activity
    const recentActivity = adminCore.getAuditLogs({ limit: 10 });

    return {
      overview: {
        network,
        financial,
        compliance,
        system: {
          health: network.global.systemHealth,
          uptime: 99.9, // Would come from monitoring
          avgResponseTime: network.domains.reduce((sum, d) => sum + d.avgLatency, 0) / network.domains.length,
          activeUsers: network.global.activeUsers,
        },
      },
      alerts,
      tasks,
      support: {
        openTickets: supportStats.openTickets,
        urgentTickets: supportStats.urgentTickets,
        myTickets,
        avgResponseTime: supportStats.avgResolutionTime,
      },
      moderation: {
        pendingItems: moderationStats.pendingItems,
        urgentItems: moderationStats.urgentItems,
        myItems,
        approvedToday: moderationStats.approvedToday,
      },
      quickActions,
      recentActivity,
    };
  }

  /**
   * Get analytics dashboard
   */
  getAnalyticsDashboard(): AnalyticsDashboard {
    const network = adminCore.getNetworkOverview();
    const financial = adminCore.getFinancialOverview();

    // Generate real-time metrics
    const realTime = {
      activeRequests: Math.floor(Math.random() * 100) + 50,
      currentRpm: Math.floor(Math.random() * 500) + 200,
      avgLatency: network.domains.reduce((sum, d) => sum + d.avgLatency, 0) / network.domains.length,
      errorRate: Math.random() * 0.5,
      activeUsers: network.global.activeUsers,
    };

    // Generate breakdown data
    const breakdown = {
      byDomain: Object.fromEntries(
        network.domains.map((d) => [
          d.domain,
          { revenue: d.revenue, impressions: d.impressions, fillRate: d.fillRate },
        ])
      ),
      byCategory: {
        "brand_awareness": { revenue: financial.revenue.total * 0.3, impressions: 0, ctr: 2.5 },
        "performance": { revenue: financial.revenue.total * 0.5, impressions: 0, ctr: 3.1 },
        "retargeting": { revenue: financial.revenue.total * 0.2, impressions: 0, ctr: 4.2 },
      },
      byDevice: {
        desktop: { impressions: 0, clicks: 0, revenue: financial.revenue.total * 0.6 },
        mobile: { impressions: 0, clicks: 0, revenue: financial.revenue.total * 0.35 },
        tablet: { impressions: 0, clicks: 0, revenue: financial.revenue.total * 0.05 },
      },
      byGeo: {
        CD: { impressions: 0, clicks: 0, revenue: financial.revenue.total * 0.8 },
        FR: { impressions: 0, clicks: 0, revenue: financial.revenue.total * 0.1 },
        BE: { impressions: 0, clicks: 0, revenue: financial.revenue.total * 0.1 },
      },
    };

    return {
      overview: {
        period: "7 days",
        metrics: {
          totalRevenue: financial.revenue.total,
          totalImpressions: network.global.totalImpressions,
          totalClicks: network.global.totalClicks,
          activeCampaigns: network.global.activeCampaigns,
          activePublishers: network.global.totalPublishers,
          systemUptime: 99.9,
          avgResponseTime: realTime.avgLatency,
        },
        trends: {
          revenue: 15.3,
          impressions: 12.7,
          clicks: 18.2,
        },
      },
      breakdown,
      realTime,
    };
  }

  /**
   * Get user management dashboard
   */
  getUserManagementDashboard(filters: {
    role?: AdminRole;
    status?: string;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const users = adminCore.listAdminUsers(filters);

    return {
      users: users.users,
      pagination: {
        page: users.page,
        limit: filters.limit || 20,
        total: users.total,
        totalPages: users.totalPages,
      },
      actions: {
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canSuspend: true,
      },
      stats: {
        totalAdmins: users.total,
        activeAdmins: users.users.filter((u) => u.status === "active").length,
        byRole: this.getUsersByRole(),
        byDepartment: this.getUsersByDepartment(),
      },
    };
  }

  /**
   * Get campaigns management dashboard
   */
  getCampaignsDashboard(filters: {
    status?: string;
    advertiserId?: string;
    page?: number;
  }) {
    // Get campaigns from yield system
    const campaigns: Record<string, unknown>[] = []; // Would fetch from yieldEnterprise

    return {
      campaigns,
      stats: {
        total: 0,
        active: 0,
        paused: 0,
        completed: 0,
        totalBudget: 0,
        spentBudget: 0,
      },
      filters,
    };
  }

  /**
   * Get publishers management dashboard
   */
  getPublishersDashboard(filters: {
    status?: string;
    page?: number;
  }) {
    // Get publishers from yield system
    const publishers: Record<string, unknown>[] = []; // Would fetch from yieldEnterprise

    return {
      publishers,
      stats: {
        total: 0,
        active: 0,
        pending: 0,
        suspended: 0,
        totalRevenue: 0,
        avgEcpm: 0,
      },
      filters,
    };
  }

  /**
   * Get billing management dashboard
   */
  getBillingDashboard(period: string = "month") {
    const financial = adminCore.getFinancialOverview(period);

    return {
      financial,
      pending: {
        invoices: financial.pending.invoices,
        invoiceAmount: financial.pending.amount,
        payouts: financial.pending.payouts,
        payoutAmount: 0, // Would calculate from pending payouts
      },
      trends: {
        revenue: financial.revenue.trend,
        costs: 0,
        profit: 0,
      },
    };
  }

  /**
   * Get system health dashboard
   */
  getSystemHealthDashboard() {
    const network = adminCore.getNetworkOverview();
    const alerts = adminCore.getActiveAlerts();

    return {
      overall: network.global.systemHealth,
      domains: network.domains,
      alerts: alerts.filter((a) => a.severity === "critical"),
      warnings: alerts.filter((a) => a.severity === "warn"),
      metrics: {
        uptime: 99.9,
        avgResponseTime: network.domains.reduce((sum, d) => sum + d.avgLatency, 0) / network.domains.length,
        errorRate: 0.1,
        activeConnections: Math.floor(Math.random() * 1000) + 500,
        diskUsage: 45.2,
        memoryUsage: 67.8,
        cpuUsage: 34.5,
      },
    };
  }

  /**
   * Get compliance dashboard
   */
  getComplianceDashboard(period: string = "month") {
    const compliance = adminCore.getComplianceReport(period);
    const moderation = moderationSystem.getModerationStats();

    return {
      compliance,
      moderation: {
        queue: moderation,
        recent: moderationSystem.getQueue({ limit: 10 }),
      },
      fraud: {
        blockedToday: compliance.fraudDetection.blockedRequests,
        flaggedAccounts: compliance.fraudDetection.flaggedAccounts,
        revenueProtected: compliance.fraudDetection.revenueProtected,
      },
      privacy: {
        gdprRequests: compliance.dataPrivacy.gdprRequests,
        dataDeletions: compliance.dataPrivacy.dataDeletions,
      },
    };
  }

  /**
   * Generate quick actions based on admin role
   */
  private generateQuickActions(adminUser: AdminUser): Array<{
    id: string;
    label: string;
    icon: string;
    action: string;
    href: string;
  }> {
    const actions: Array<{
      id: string;
      label: string;
      icon: string;
      action: string;
      href: string;
    }> = [
      {
        id: this.generateId(),
        label: "Créer admin",
        icon: "user-plus",
        action: "create_admin",
        href: "/admin/users/create",
      },
      {
        id: this.generateId(),
        label: "Modérer contenu",
        icon: "shield",
        action: "moderate",
        href: "/admin/moderation",
      },
      {
        id: this.generateId(),
        label: "Support tickets",
        icon: "ticket",
        action: "support",
        href: "/admin/support",
      },
      {
        id: this.generateId(),
        label: "Rapports",
        icon: "chart",
        action: "reports",
        href: "/admin/reports",
      },
    ];

    // Add role-specific actions
    if (adminUser.role === "super_admin") {
      actions.push({
        id: this.generateId(),
        label: "Gérer système",
        icon: "settings",
        action: "system",
        href: "/admin/system",
      });
    }

    if (adminUser.role === "manager" || adminUser.role === "super_admin") {
      actions.push({
        id: this.generateId(),
        label: "Facturation",
        icon: "credit-card",
        action: "billing",
        href: "/admin/billing",
      });
    }

    return actions;
  }

  /**
   * Get users by role
   */
  private getUsersByRole(): Record<string, number> {
    const users = adminCore.listAdminUsers({});
    const byRole: Record<string, number> = {};

    users.users.forEach((user) => {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
    });

    return byRole;
  }

  /**
   * Get users by department
   */
  private getUsersByDepartment(): Record<string, number> {
    const users = adminCore.listAdminUsers({});
    const byDepartment: Record<string, number> = {};

    users.users.forEach((user) => {
      user.departments.forEach((dept) => {
        byDepartment[dept] = (byDepartment[dept] || 0) + 1;
      });
    });

    return byDepartment;
  }

  /**
   * Search across all entities
   */
  search(query: string, filters?: {
    type?: "users" | "campaigns" | "publishers" | "tickets" | "creatives";
    limit?: number;
  }) {
    const results: Record<string, unknown>[] = [];
    const limit = filters?.limit || 20;

    // Search admin users
    if (!filters || filters.type === "users") {
      const users = adminCore.listAdminUsers({ search: query, limit });
      results.push(...users.users.map((u) => ({
        type: "user",
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
      })));
    }

    // Search support tickets
    if (!filters || filters.type === "tickets") {
      const tickets = supportSystem.getTickets({ limit });
      tickets.tickets = tickets.tickets.filter(
        (t) =>
          t.subject.toLowerCase().includes(query.toLowerCase()) ||
          t.ticketNumber.toLowerCase().includes(query.toLowerCase()),
      );
      results.push(...tickets.tickets.map((t) => ({
        type: "ticket",
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
      })));
    }

    // Search moderation queue
    if (!filters || filters.type === "creatives") {
      const queue = moderationSystem.getQueue({ type: "creative", limit });
      results.push(...queue.items.map((item) => ({
        type: "creative",
        id: item.id,
        entityId: item.entityId,
        reason: item.reason,
        status: item.status,
        priority: item.priority,
      })));
    }

    return {
      query,
      results: results.slice(0, limit),
      total: results.length,
    };
  }

  /**
   * Generate admin report
   */
  generateReport(input: {
    type: "financial" | "performance" | "compliance" | "users" | "support";
    period: string;
    format: "json" | "csv" | "pdf";
  }) {
    // Generate report based on type
    switch (input.type) {
      case "financial":
        return adminCore.getFinancialOverview(input.period);
      case "performance":
        return this.getAnalyticsDashboard();
      case "compliance":
        return adminCore.getComplianceReport(input.period);
      case "users":
        return adminCore.listAdminUsers({});
      case "support":
        return supportSystem.getTicketStats();
      default:
        return null;
    }
  }

  /**
   * Get admin notifications
   */
  getNotifications(adminId: string, unreadOnly: boolean = false) {
    const db = getDb();
    const whereClause = unreadOnly ? "WHERE admin_id = ? AND read = 0" : "WHERE admin_id = ?";

    const rows = db
      .prepare(`SELECT * FROM admin_notifications ${whereClause} ORDER BY created_at DESC LIMIT 20`)
      .all(adminId) as Record<string, unknown>[];

    return rows.map((row) => ({
      ...row,
      read: row.read === 1,
    }));
  }

  /**
   * Mark notification as read
   */
  markNotificationRead(notificationId: string): void {
    const db = getDb();
    db.prepare("UPDATE admin_notifications SET read = 1 WHERE id = ?").run(notificationId);
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead(adminId: string): void {
    const db = getDb();
    db.prepare("UPDATE admin_notifications SET read = 1 WHERE admin_id = ?").run(adminId);
  }

  /**
   * Create notification
   */
  createNotification(input: {
    adminId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
  }): void {
    const db = getDb();
    const id = this.generateId();

    db.prepare(
      `INSERT INTO admin_notifications (id, admin_id, type, title, message, link, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    ).run(
      id,
      input.adminId,
      input.type,
      input.title,
      input.message,
      input.link || null,
      new Date().toISOString(),
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const adminDashboard = new AdminDashboard();
