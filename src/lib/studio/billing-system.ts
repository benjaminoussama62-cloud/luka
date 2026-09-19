/**
 * Ayeba Billing System - Automated Payment & Invoicing
 * Enterprise-grade billing for advertisers and publishers
 */

import { getDb } from "@/lib/storage/database";
import { yieldEnterprise } from "./yield-enterprise";
import type {
  Invoice,
  Transaction,
  Advertiser,
  Publisher,
  PaymentMethod,
  PayoutMethod,
} from "./ad-network-types";

export class BillingSystem {
  /**
   * Process daily billing cycle
   */
  async processDailyBilling(): Promise<{
    invoicesGenerated: number;
    paymentsProcessed: number;
    payoutsProcessed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let invoicesGenerated = 0;
    let paymentsProcessed = 0;
    let payoutsProcessed = 0;

    try {
      // Generate advertiser invoices
      const advertiserInvoices = await this.generateAdvertiserInvoices();
      invoicesGenerated += advertiserInvoices.length;

      // Generate publisher payout invoices
      const publisherInvoices = await this.generatePublisherInvoices();
      invoicesGenerated += publisherInvoices.length;

      // Process automatic payments
      const autoPayments = await this.processAutomaticPayments();
      paymentsProcessed += autoPayments.length;

      // Process automatic payouts
      const autoPayouts = await this.processAutomaticPayouts();
      payoutsProcessed += autoPayouts.length;

      // Send payment reminders
      await this.sendPaymentReminders();

      // Send payout notifications
      await this.sendPayoutNotifications();

    } catch (error) {
      errors.push(`Billing cycle error: ${error}`);
    }

    return {
      invoicesGenerated,
      paymentsProcessed,
      payoutsProcessed,
      errors,
    };
  }

  /**
   * Generate advertiser invoices
   */
  private async generateAdvertiserInvoices(): Promise<Invoice[]> {
    const db = getDb();
    const invoices: Invoice[] = [];
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Get active advertisers with spend
    const advertisers = db
      .prepare(
        `SELECT DISTINCT c.advertiser_id, a.company_name, a.user_id
         FROM campaigns c
         JOIN advertisers a ON c.advertiser_id = a.id
         WHERE c.status = 'active'
         AND c.budget_spent > 0`,
      )
      .all() as Array<{
      advertiser_id: string;
      company_name: string;
      user_id: string;
    }>;

    for (const advertiser of advertisers) {
      try {
        // Calculate spend for period
        const spend = this.calculateAdvertiserSpend(advertiser.advertiser_id, periodStart, periodEnd);

        if (spend <= 0) continue;

        // Generate invoice items
        const items = [
          {
            description: `Dépenses publicitaires ${now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
            quantity: 1,
            unitPrice: spend,
            amount: spend,
            metadata: { type: "ad_spend", period: { start: periodStart, end: periodEnd } },
          },
        ];

        const invoice = yieldEnterprise.createInvoice({
          type: "advertiser",
          userId: advertiser.user_id,
          entityId: advertiser.advertiser_id,
          periodStart,
          periodEnd,
          items,
        });

        invoices.push(invoice);

        // Update advertiser balance (invoice increases debt)
        this.updateAdvertiserBalance(advertiser.advertiser_id, spend, false);

      } catch (error) {
        console.error(`Failed to generate invoice for advertiser ${advertiser.advertiser_id}:`, error);
      }
    }

    return invoices;
  }

  /**
   * Generate publisher payout invoices
   */
  private async generatePublisherInvoices(): Promise<Invoice[]> {
    const db = getDb();
    const invoices: Invoice[] = [];
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Get active publishers with earnings
    const publishers = db
      .prepare(
        `SELECT DISTINCT p.id, p.company_name, p.user_id, p.payout_frequency, p.payout_day
         FROM publishers p
         JOIN publisher_sites ps ON p.id = ps.publisher_id
         WHERE p.status = 'active'
         AND ps.status = 'verified'`,
      )
      .all() as Array<{
      id: string;
      company_name: string;
      user_id: string;
      payout_frequency: string;
      payout_day: number | null;
    }>;

    for (const publisher of publishers) {
      try {
        // Check if payout is due based on frequency
        if (!this.isPayoutDue(publisher.payout_frequency, publisher.payout_day, now)) {
          continue;
        }

        // Calculate earnings for period
        const earnings = this.calculatePublisherEarnings(publisher.id, periodStart, periodEnd);

        if (earnings <= publisher.minimum_payout) continue;

        // Generate invoice items
        const items = [
          {
            description: `Revenus publicitaires ${now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
            quantity: 1,
            unitPrice: earnings,
            amount: earnings,
            metadata: { type: "publisher_earnings", period: { start: periodStart, end: periodEnd } },
          },
        ];

        const invoice = yieldEnterprise.createInvoice({
          type: "publisher",
          userId: publisher.user_id,
          entityId: publisher.id,
          periodStart,
          periodEnd,
          items,
        });

        invoices.push(invoice);

        // Update publisher balance
        this.updatePublisherBalance(publisher.id, earnings);

      } catch (error) {
        console.error(`Failed to generate invoice for publisher ${publisher.id}:`, error);
      }
    }

    return invoices;
  }

  /**
   * Process automatic payments
   */
  private async processAutomaticPayments(): Promise<Transaction[]> {
    const db = getDb();
    const transactions: Transaction[] = [];

    // Get pending invoices with auto-payment enabled
    const invoices = db
      .prepare(
        `SELECT i.*, a.auto_recharge, a.recharge_amount, a.payment_methods
         FROM invoices i
         JOIN advertisers a ON i.entity_id = a.id
         WHERE i.type = 'advertiser'
         AND i.status = 'sent'
         AND a.auto_recharge = 1`,
      )
      .all() as Array<any>;

    for (const invoice of invoices) {
      try {
        const advertiser = yieldEnterprise.getAdvertiser(invoice.entity_id);
        if (!advertiser) continue;

        const paymentMethods = JSON.parse(invoice.payment_methods as string);
        const defaultMethod = paymentMethods.find((m: PaymentMethod) => m.isDefault);

        if (!defaultMethod) continue;

        // Process payment based on method
        const transaction = await this.processPayment({
          type: "payment",
          userId: invoice.user_id,
          amount: invoice.total,
          currency: invoice.currency,
          method: defaultMethod.type,
          reference: invoice.invoice_number,
          description: `Paiement facture ${invoice.invoice_number}`,
          relatedEntityId: invoice.id,
          relatedEntityType: "invoice",
        });

        if (transaction) {
          transactions.push(transaction);

          // Update invoice status
          this.updateInvoiceStatus(invoice.id, "paid", transaction.id);

          // Update advertiser balance (payment reduces debt)
          this.updateAdvertiserBalance(invoice.entity_id, -invoice.total, true);
        }

      } catch (error) {
        console.error(`Failed to process payment for invoice ${invoice.id}:`, error);
      }
    }

    return transactions;
  }

  /**
   * Process automatic payouts
   */
  private async processAutomaticPayouts(): Promise<Transaction[]> {
    const db = getDb();
    const transactions: Transaction[] = [];

    // Get pending publisher invoices with auto-payout enabled
    const invoices = db
      .prepare(
        `SELECT i.*, p.auto_payout, p.payout_method, p.payout_details
         FROM invoices i
         JOIN publishers p ON i.entity_id = p.id
         WHERE i.type = 'publisher'
         AND i.status = 'sent'
         AND p.auto_payout = 1`,
      )
      .all() as Array<any>;

    for (const invoice of invoices) {
      try {
        const publisher = yieldEnterprise.getPublisher(invoice.entity_id);
        if (!publisher) continue;

        // Process payout based on method
        const transaction = await this.processPayout({
          type: "payout",
          userId: invoice.user_id,
          amount: invoice.total,
          currency: invoice.currency,
          method: invoice.payout_method,
          reference: invoice.invoice_number,
          description: `Paiement revenus ${invoice.invoice_number}`,
          relatedEntityId: invoice.id,
          relatedEntityType: "invoice",
        });

        if (transaction) {
          transactions.push(transaction);

          // Update invoice status
          this.updateInvoiceStatus(invoice.id, "paid", transaction.id);

          // Update publisher balance
          this.updatePublisherBalance(invoice.entity_id, -invoice.total);
        }

      } catch (error) {
        console.error(`Failed to process payout for invoice ${invoice.id}:`, error);
      }
    }

    return transactions;
  }

  /**
   * Process payment
   */
  private async processPayment(input: {
    type: "payment" | "payout" | "refund" | "adjustment";
    userId: string;
    amount: number;
    currency?: string;
    method: string;
    reference?: string;
    description: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
  }): Promise<Transaction | null> {
    const transaction = yieldEnterprise.createTransaction(input);

    // Simulate payment processing (in production, integrate with payment gateways)
    const success = await this.processPaymentGateway(transaction, input.method);

    if (success) {
      yieldEnterprise.updateTransactionStatus(transaction.id, "processed");
      return yieldEnterprise.getTransaction(transaction.id);
    } else {
      yieldEnterprise.updateTransactionStatus(transaction.id, "failed", "Payment gateway error");
      return null;
    }
  }

  /**
   * Process payout
   */
  private async processPayout(input: {
    type: "payment" | "payout" | "refund" | "adjustment";
    userId: string;
    amount: number;
    currency?: string;
    method: string;
    reference?: string;
    description: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
  }): Promise<Transaction | null> {
    const transaction = yieldEnterprise.createTransaction(input);

    // Simulate payout processing (in production, integrate with payout providers)
    const success = await this.processPayoutGateway(transaction, input.method);

    if (success) {
      yieldEnterprise.updateTransactionStatus(transaction.id, "processed");
      return yieldEnterprise.getTransaction(transaction.id);
    } else {
      yieldEnterprise.updateTransactionStatus(transaction.id, "failed", "Payout gateway error");
      return null;
    }
  }

  /**
   * Process payment gateway (simulated)
   */
  private async processPaymentGateway(transaction: Transaction, method: string): Promise<boolean> {
    // Simulate payment processing
    // In production, integrate with Stripe, PayPal, Mobile Money, etc.
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate 95% success rate
    return Math.random() > 0.05;
  }

  /**
   * Process payout gateway (simulated)
   */
  private async processPayoutGateway(transaction: Transaction, method: string): Promise<boolean> {
    // Simulate payout processing
    // In production, integrate with bank transfers, Mobile Money, etc.
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate 90% success rate
    return Math.random() > 0.1;
  }

  /**
   * Calculate advertiser spend for period
   */
  private calculateAdvertiserSpend(advertiserId: string, periodStart: string, periodEnd: string): number {
    const db = getDb();

    const result = db
      .prepare(
        `SELECT SUM(cost) as total_spend
         FROM performance_stats_daily
         WHERE campaign_id IN (
           SELECT id FROM campaigns WHERE advertiser_id = ?
         )
         AND day >= ? AND day <= ?`,
      )
      .get(advertiserId, periodStart.slice(0, 10), periodEnd.slice(0, 10)) as {
      total_spend: number | null;
    };

    return result.total_spend || 0;
  }

  /**
   * Calculate publisher earnings for period
   */
  private calculatePublisherEarnings(publisherId: string, periodStart: string, periodEnd: string): number {
    const db = getDb();

    const result = db
      .prepare(
        `SELECT SUM(publisher_revenue) as total_earnings
         FROM performance_stats_daily
         WHERE publisher_site_id IN (
           SELECT id FROM publisher_sites WHERE publisher_id = ?
         )
         AND day >= ? AND day <= ?`,
      )
      .get(publisherId, periodStart.slice(0, 10), periodEnd.slice(0, 10)) as {
      total_earnings: number | null;
    };

    return result.total_earnings || 0;
  }

  /**
   * Update advertiser balance
   */
  private updateAdvertiserBalance(advertiserId: string, amount: number, isPayment: boolean = false): void {
    const db = getDb();

    if (isPayment) {
      // Payment reduces debt, increases available credit
      db.prepare(
        `UPDATE advertisers
         SET current_balance = current_balance + ?,
             available_credit = available_credit + ?,
             updated_at = ?
         WHERE id = ?`,
      ).run(amount, amount, new Date().toISOString(), advertiserId);
    } else {
      // Invoice increases debt, decreases available credit
      db.prepare(
        `UPDATE advertisers
         SET current_balance = current_balance + ?,
             available_credit = available_credit - ?,
             updated_at = ?
         WHERE id = ?`,
      ).run(amount, amount, new Date().toISOString(), advertiserId);
    }
  }

  /**
   * Update publisher balance
   */
  private updatePublisherBalance(publisherId: string, amount: number): void {
    const db = getDb();

    db.prepare(
      `UPDATE publishers
       SET balance = balance + ?,
           lifetime_earnings = lifetime_earnings + ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(amount, amount, new Date().toISOString(), publisherId);
  }

  /**
   * Update invoice status
   */
  private updateInvoiceStatus(invoiceId: string, status: string, transactionId?: string): void {
    const db = getDb();
    const updates: any = { status, updated_at: new Date().toISOString() };

    if (status === "paid") {
      updates.paid_at = new Date().toISOString();
      if (transactionId) {
        updates.payment_method = transactionId;
      }
    }

    const setClause = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
    const values = Object.values(updates);

    db.prepare(`UPDATE invoices SET ${setClause} WHERE id = ?`).run(...values, invoiceId);
  }

  /**
   * Check if payout is due
   */
  private isPayoutDue(frequency: string, payoutDay: number | null, now: Date): boolean {
    const dayOfMonth = now.getDate();

    switch (frequency) {
      case "weekly":
        return dayOfMonth % 7 === 0; // Every 7 days
      case "biweekly":
        return dayOfMonth % 14 === 0; // Every 14 days
      case "monthly":
        return payoutDay ? dayOfMonth === payoutDay : dayOfMonth === 1; // Specific day or 1st
      default:
        return false;
    }
  }

  /**
   * Send payment reminders
   */
  private async sendPaymentReminders(): Promise<void> {
    const db = getDb();

    // Get overdue invoices
    const overdueInvoices = db
      .prepare(
        `SELECT i.*, u.email, u.name
         FROM invoices i
         JOIN users u ON i.user_id = u.id
         WHERE i.type = 'advertiser'
         AND i.status = 'sent'
         AND i.due_date < ?`,
      )
      .get(new Date().toISOString()) as Array<any>;

    // Send reminders (in production, integrate with email service)
    for (const invoice of overdueInvoices) {
      console.log(`Payment reminder sent to ${invoice.email} for invoice ${invoice.invoice_number}`);
    }
  }

  /**
   * Send payout notifications
   */
  private async sendPayoutNotifications(): Promise<void> {
    const db = getDb();

    // Get recently paid publisher invoices
    const paidInvoices = db
      .prepare(
        `SELECT i.*, u.email, u.name
         FROM invoices i
         JOIN users u ON i.user_id = u.id
         WHERE i.type = 'publisher'
         AND i.status = 'paid'
         AND i.paid_at >= ?`,
      )
      .get(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as Array<any>;

    // Send notifications (in production, integrate with email service)
    for (const invoice of paidInvoices) {
      console.log(`Payout notification sent to ${invoice.email} for invoice ${invoice.invoice_number}`);
    }
  }

  /**
   * Get billing summary for user
   */
  getBillingSummary(userId: string): {
    advertiser: {
      pendingInvoices: number;
      pendingAmount: number;
      overdraftInvoices: number;
      overdraftAmount: number;
      currentBalance: number;
      availableCredit: number;
    };
    publisher: {
      pendingPayouts: number;
      pendingAmount: number;
      currentBalance: number;
      lifetimeEarnings: number;
      lastPayoutDate: string | null;
    };
  } {
    const db = getDb();

    // Advertiser summary
    const advertiser = yieldEnterprise.getAdvertiserByUserId(userId);
    const advertiserSummary = {
      pendingInvoices: 0,
      pendingAmount: 0,
      overdraftInvoices: 0,
      overdraftAmount: 0,
      currentBalance: advertiser?.current_balance || 0,
      availableCredit: advertiser?.available_credit || 0,
    };

    if (advertiser) {
      const pendingInvoices = db
        .prepare(
          `SELECT COUNT(*) as c, SUM(total) as amount
           FROM invoices
           WHERE type = 'advertiser' AND entity_id = ? AND status = 'sent'`,
        )
        .get(advertiser.id) as { c: number; amount: number | null };

      advertiserSummary.pendingInvoices = pendingInvoices.c;
      advertiserSummary.pendingAmount = pendingInvoices.amount || 0;

      const overdueInvoices = db
        .prepare(
          `SELECT COUNT(*) as c, SUM(total) as amount
           FROM invoices
           WHERE type = 'advertiser' AND entity_id = ? AND status = 'sent' AND due_date < ?`,
        )
        .get(advertiser.id, new Date().toISOString()) as { c: number; amount: number | null };

      advertiserSummary.overdraftInvoices = overdueInvoices.c;
      advertiserSummary.overdraftAmount = overdueInvoices.amount || 0;
    }

    // Publisher summary
    const publisher = yieldEnterprise.getPublisherByUserId(userId);
    const publisherSummary = {
      pendingPayouts: 0,
      pendingAmount: 0,
      currentBalance: publisher?.balance || 0,
      lifetimeEarnings: publisher?.lifetime_earnings || 0,
      lastPayoutDate: null as string | null,
    };

    if (publisher) {
      const pendingPayouts = db
        .prepare(
          `SELECT COUNT(*) as c, SUM(total) as amount
           FROM invoices
           WHERE type = 'publisher' AND entity_id = ? AND status = 'sent'`,
        )
        .get(publisher.id) as { c: number; amount: number | null };

      publisherSummary.pendingPayouts = pendingPayouts.c;
      publisherSummary.pendingAmount = pendingPayout.amount || 0;

      const lastPayout = db
        .prepare(
          `SELECT MAX(paid_at) as last_date
           FROM invoices
           WHERE type = 'publisher' AND entity_id = ? AND status = 'paid'`,
        )
        .get(publisher.id) as { last_date: string | null };

      publisherSummary.lastPayoutDate = lastPayout.last_date;
    }

    return {
      advertiser: advertiserSummary,
      publisher: publisherSummary,
    };
  }

  /**
   * Add payment method for advertiser
   */
  addPaymentMethod(userId: string, method: Omit<PaymentMethod, "id" | "addedAt">): PaymentMethod {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    const advertiser = yieldEnterprise.getAdvertiserByUserId(userId);
    if (!advertiser) throw new Error("Advertiser not found");

    // Update existing methods to non-default
    db.prepare(
      `UPDATE advertisers
       SET payment_methods = json_set(
         json_set(payment_methods, '$[#]', json_object('isDefault', 0)),
         '$',
         json_object('isDefault', 0)
       )
       WHERE id = ?`,
    ).run(advertiser.id);

    // Add new method
    const newMethod = { ...method, id, addedAt: now };
    const currentMethods = JSON.parse(advertiser.payment_methods as string);
    const updatedMethods = [...currentMethods, newMethod];

    db.prepare(
      `UPDATE advertisers
       SET payment_methods = ?, updated_at = ?
       WHERE id = ?`,
    ).run(JSON.stringify(updatedMethods), now, advertiser.id);

    return newMethod;
  }

  /**
   * Add payout method for publisher
   */
  addPayoutMethod(userId: string, method: Omit<PayoutMethod, "id" | "addedAt">): PayoutMethod {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    const publisher = yieldEnterprise.getPublisherByUserId(userId);
    if (!publisher) throw new Error("Publisher not found");

    // Add new method
    const newMethod = { ...method, id, addedAt: now };

    db.prepare(
      `UPDATE publishers
       SET payout_method = ?, payout_details = ?, updated_at = ?
       WHERE id = ?`,
    ).run(method.type, JSON.stringify(method), now, publisher.id);

    return newMethod;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const billingSystem = new BillingSystem();
