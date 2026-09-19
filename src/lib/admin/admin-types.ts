/**
 * Ayeba Admin - Back Office Types
 * Administration interface for managing the entire Ayeba Studio ecosystem
 */

export type AdminRole = "super_admin" | "manager" | "support" | "moderator" | "analyst";

export type AdminUser = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  departments: string[];
  createdAt: string;
  lastLoginAt: string;
  status: "active" | "suspended" | "pending";
};

export type AdminAuditLog = {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
};

export type ModerationQueueItem = {
  id: string;
  type: "creative" | "campaign" | "publisher_site" | "advertiser" | "content";
  entityId: string;
  entityType: string;
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "approved" | "rejected" | "under_review";
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  metadata: Record<string, unknown>;
};

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: "billing" | "technical" | "account" | "policy" | "fraud";
  priority: "low" | "medium" | "high" | "urgent";
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
  assignedTo?: string;
  assignedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: "user" | "admin";
  message: string;
  attachments?: string[];
  isInternal: boolean;
  createdAt: string;
};

export type NetworkOverview = {
  timestamp: string;
  domains: DomainOverview[];
  global: {
    totalAdvertisers: number;
    totalPublishers: number;
    activeCampaigns: number;
    totalImpressions: number;
    totalClicks: number;
    totalRevenue: number;
    avgFillRate: number;
    avgCpm: number;
    activeUsers: number;
    systemHealth: "healthy" | "degraded" | "critical";
  };
};

export type DomainOverview = {
  domain: string;
  status: "healthy" | "degraded" | "down";
  fillRate: number;
  avgLatency: number;
  impressions: number;
  revenue: number;
  activePlacements: number;
  issues: string[];
};

export type FinancialOverview = {
  period: string;
  revenue: {
    total: number;
    byDomain: Record<string, number>;
    byCategory: Record<string, number>;
    trend: number;
  };
  costs: {
    total: number;
    publisherPayouts: number;
    infrastructure: number;
    support: number;
  };
  profit: {
    gross: number;
    net: number;
    margin: number;
  };
  pending: {
    invoices: number;
    amount: number;
    payouts: number;
  };
  cashFlow: {
    inflow: number;
    outflow: number;
    balance: number;
  };
};

export type ComplianceReport = {
  period: string;
  policyViolations: {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    pending: number;
  };
  contentModeration: {
    reviewed: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  fraudDetection: {
    blockedRequests: number;
    flaggedAccounts: number;
    suspendedAccounts: number;
    revenueProtected: number;
  };
  dataPrivacy: {
    gdprRequests: number;
    dataDeletions: number;
    consentUpdates: number;
  };
};

export type SystemAlert = {
  id: string;
  type: "system" | "security" | "performance" | "revenue" | "compliance";
  severity: "info" | "warn" | "critical";
  title: string;
  message: string;
  source: string;
  affectedEntities: string[];
  recommendedActions: string[];
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};

export type TaskQueue = {
  id: string;
  type: string;
  priority: number;
  status: "pending" | "processing" | "completed" | "failed";
  payload: Record<string, unknown>;
  result?: unknown;
  error?: string;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  processedBy?: string;
};

export type AnalyticsDashboard = {
  overview: {
    period: string;
    metrics: {
      totalRevenue: number;
      totalImpressions: number;
      totalClicks: number;
      activeCampaigns: number;
      activePublishers: number;
      systemUptime: number;
      avgResponseTime: number;
    };
    trends: {
      revenue: number;
      impressions: number;
      clicks: number;
    };
  };
  breakdown: {
    byDomain: Record<string, { revenue: number; impressions: number; fillRate: number }>;
    byCategory: Record<string, { revenue: number; impressions: number; ctr: number }>;
    byDevice: Record<string, { impressions: number; clicks: number; revenue: number }>;
    byGeo: Record<string, { impressions: number; clicks: number; revenue: number }>;
  };
  realTime: {
    activeRequests: number;
    currentRpm: number;
    avgLatency: number;
    errorRate: number;
    activeUsers: number;
  };
};

export type UserManagement = {
  filters: {
    role?: AdminRole;
    status?: string;
    department?: string;
    search?: string;
  };
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  actions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canSuspend: boolean;
  };
};

export type BulkAction = {
  type: "approve" | "reject" | "suspend" | "activate" | "delete" | "assign";
  entityType: string;
  entityIds: string[];
  parameters?: Record<string, unknown>;
  scheduledFor?: string;
  dryRun: boolean;
};

export type BulkActionResult = {
  actionId: string;
  status: "pending" | "processing" | "completed" | "failed";
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ entityId: string; error: string }>;
  startedAt: string;
  completedAt?: string;
  processedBy: string;
};
