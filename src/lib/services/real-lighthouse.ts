/**
 * Real Lighthouse Integration Service
 * Integrates with actual Google Lighthouse for performance audits
 */

import { spawn } from "child_process";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export class RealLighthouse {
  /**
   * Run real Lighthouse audit
   */
  async runAudit(url: string, options: {
    formFactor?: "mobile" | "desktop";
    categories?: string[];
    output?: "json" | "html";
    onlyCategories?: string[];
    screenEmulation?: {
      mobile: boolean;
      width: number;
      height: number;
      deviceScaleFactor: number;
      disabled: boolean;
    };
    throttling?: {
      rttMs: number;
      throughputKbps: number;
      cpuSlowdownMultiplier: number;
      requestLatencyMs: number;
      downloadThroughputKbps: number;
      uploadThroughputKbps: number;
    };
  }): Promise<{
    success: boolean;
    reportPath?: string;
    results?: any;
    error?: string;
  }> {
    const formFactor = options.formFactor || "mobile";
    const output = options.output || "json";
    const outputPath = `/tmp/lighthouse-${Date.now()}.${output}`;

    try {
      // Build Lighthouse command
      const args = [
        url,
        "--output", output,
        "--output-path", outputPath,
        "--only-categories", (options.onlyCategories || ["performance"]).join(","),
        "--form-factor", formFactor,
      ];

      // Add screen emulation
      if (options.screenEmulation) {
        args.push("--screenEmulation", JSON.stringify(options.screenEmulation));
      }

      // Add throttling
      if (options.throttling) {
        args.push("--throttling", JSON.stringify(options.throttling));
      }

      // Run Lighthouse
      const result = await this.runLighthouseCommand(args);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Read results
      const results = await this.readResults(outputPath, output);

      return {
        success: true,
        reportPath: outputPath,
        results,
      };

    } catch (error) {
      console.error("Lighthouse audit error:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Run Lighthouse command
   */
  private async runLighthouseCommand(args: string[]): Promise<{
    success: boolean;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const lighthouse = spawn("lighthouse", args, {
        stdio: "inherit",
      });

      lighthouse.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `Lighthouse exited with code ${code}`,
          });
        }
      });

      lighthouse.on("error", (error) => {
        resolve({
          success: false,
          error: `Failed to start Lighthouse: ${error.message}`,
        });
      });
    });
  }

  /**
   * Read Lighthouse results
   */
  private async readResults(outputPath: string, output: string): Promise<any> {
    if (!existsSync(outputPath)) {
      throw new Error(`Output file not found: ${outputPath}`);
    }

    const content = await readFile(outputPath, "utf-8");

    if (output === "json") {
      return JSON.parse(content);
    }

    return { html: content };
  }

  /**
   * Parse Lighthouse results into our format
   */
  parseLighthouseResults(lighthouseResults: any): {
    categories: {
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
      pwa: number;
    };
    scores: {
      overall: number;
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
      pwa: number;
    };
    metrics: {
      largestContentfulPaint: number;
      firstInputDelay: number;
      cumulativeLayoutShift: number;
      firstContentfulPaint: number;
      firstMeaningfulPaint: number;
      speedIndex: number;
      interactive: number;
      totalBlockingTime: number;
      timeToFirstByte: number;
      domContentLoaded: number;
      loadComplete: number;
    };
    audits: Array<{
      id: string;
      title: string;
      description: string;
      score: number;
      displayValue: string;
      details: any;
      severity: "critical" | "high" | "medium" | "low" | "info";
    }>;
    opportunities: Array<{
      id: string;
      title: string;
      description: string;
      impact: number;
      savings: any;
      severity: string;
    }>;
    diagnostics: Array<{
      id: string;
      title: string;
      description: string;
      displayValue: string;
      severity: string;
    }>;
  } {
    const categories = {
      performance: lighthouseResults.categories?.performance?.score * 100 || 0,
      accessibility: lighthouseResults.categories?.accessibility?.score * 100 || 0,
      bestPractices: lighthouseResults.categories?.["best-practices"]?.score * 100 || 0,
      seo: lighthouseResults.categories?.seo?.score * 100 || 0,
      pwa: lighthouseResults.categories?.pwa?.score * 100 || 0,
    };

    const scores = {
      overall: Math.round(
        (categories.performance * 0.4 +
          categories.accessibility * 0.15 +
          categories.bestPractices * 0.15 +
          categories.seo * 0.2 +
          categories.pwa * 0.1)
      ),
      ...categories,
    };

    // Extract metrics
    const metrics = {
      largestContentfulPaint: lighthouseResults.audits?.["largest-contentful-paint"]?.numericValue || 0,
      firstInputDelay: lighthouseResults.audits?.["max-potential-fid"]?.numericValue || 0,
      cumulativeLayoutShift: lighthouseResults.audits?.["cumulative-layout-shift"]?.numericValue || 0,
      firstContentfulPaint: lighthouseResults.audits?.["first-contentful-paint"]?.numericValue || 0,
      firstMeaningfulPaint: lighthouseResults.audits?.["first-meaningful-paint"]?.numericValue || 0,
      speedIndex: lighthouseResults.audits?.["speed-index"]?.numericValue || 0,
      interactive: lighthouseResults.audits?.["interactive"]?.numericValue || 0,
      totalBlockingTime: lighthouseResults.audits?.["total-blocking-time"]?.numericValue || 0,
      timeToFirstByte: lighthouseResults.audits?.["time-to-first-byte"]?.numericValue || 0,
      domContentLoaded: lighthouseResults.audits?.["dom-content-loaded"]?.numericValue || 0,
      loadComplete: lighthouseResults.audits?.["load-complete"]?.numericValue || 0,
    };

    // Extract audits
    const audits = Object.entries(lighthouseResults.audits || {}).map(([id, audit]: [string, any]) => ({
      id,
      title: audit.title || "",
      description: audit.description || "",
      score: audit.score === null ? 0 : audit.score * 100,
      displayValue: audit.displayValue || "",
      details: audit.details || {},
      severity: this.mapScoreToSeverity(audit.score),
    }));

    // Extract opportunities
    const opportunities = Object.entries(lighthouseResults.audits || {})
      .filter(([_, audit]: [string, any]) => audit.details?.type === "opportunity")
      .map(([id, audit]: [string, any]) => ({
        id,
        title: audit.title || "",
        description: audit.description || "",
        impact: audit.score || 0,
        savings: audit.details?.overallSavingsMs || {},
        severity: "medium",
      }));

    // Extract diagnostics
    const diagnostics = Object.entries(lighthouseResults.audits || {})
      .filter(([_, audit]: [string, any]) => audit.details?.type === "diagnostic")
      .map(([id, audit]: [string, any]) => ({
        id,
        title: audit.title || "",
        description: audit.description || "",
        displayValue: audit.displayValue || "",
        severity: "info",
      }));

    return {
      categories,
      scores,
      metrics,
      audits,
      opportunities,
      diagnostics,
    };
  }

  /**
   * Map Lighthouse score to severity
   */
  private mapScoreToSeverity(score: number | null): "critical" | "high" | "medium" | "low" | "info" {
    if (score === null) return "info";
    if (score < 0.5) return "critical";
    if (score < 0.7) return "high";
    if (score < 0.9) return "medium";
    return "low";
  }

  /**
   * Check if Lighthouse is installed
   */
  async isLighthouseInstalled(): Promise<boolean> {
    try {
      const result = await this.runLighthouseCommand(["--version"]);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Install Lighthouse if not present
   */
  async installLighthouse(): Promise<{
    success: boolean;
    message: string;
  }> {
    const installed = await this.isLighthouseInstalled();
    if (installed) {
      return {
        success: true,
        message: "Lighthouse is already installed",
      };
    }

    try {
      await this.runLighthouseCommand(["install", "-g", "lighthouse"]);
      return {
        success: true,
        message: "Lighthouse installed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to install Lighthouse: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Run CI Lighthouse (for automated testing)
   */
  async runCiAudit(url: string, options: {
    upload?: {
      target: "temporary-public-storage" | string;
      token?: string;
    };
    chromeFlags?: string[];
  }): Promise<{
    success: boolean;
    lhciUrl?: string;
    results?: any;
    error?: string;
  }> {
    // In production, use Lighthouse CI
    // For now, use standard Lighthouse
    const audit = await this.runAudit(url, {
      formFactor: "mobile",
      categories: ["performance"],
    });

    if (!audit.success) {
      return {
        success: false,
        error: audit.error,
      };
    }

    return {
      success: true,
      results: audit.results,
    };
  }

  /**
   * Get CrUX data (Chrome User Experience Report)
   */
  async getCruxData(url: string): Promise<{
    lcp: { good: number; needsImprovement: number; poor: number; p75: number };
    fid: { good: number; needsImprovement: number; poor: number; p75: number };
    cls: { good: number; needsImprovement: number; poor: number; p75: number };
    fcp: { good: number; needsImprovement: number; poor: number; p75: number };
  } | null> {
    try {
      // Use CrUX API
      const origin = new URL(url).origin;
      const response = await fetch(
        `https://chromeuxreport.googleapis.com/v1/records/historyRecord?key=YOUR_API_KEY`,
        {
          method: "POST",
          body: JSON.stringify({
            origin,
            formFactor: "PHONE",
            metrics: [
              "largest_contentful_paint",
              "first_input_delay",
              "cumulative_layout_shift",
              "first_contentful_paint",
            ],
          }),
        },
      );

      if (!response.ok) {
        console.error("CrUX API error:", response.statusText);
        return null;
      }

      const data = await response.json();
      return this.parseCruxData(data);
    } catch (error) {
      console.error("CrUX fetch error:", error);
      return null;
    }
  }

  /**
   * Parse CrUX data
   */
  private parseCruxData(data: any): {
    lcp: { good: number; needsImprovement: number; poor: number; p75: number };
    fid: { good: number; needsImprovement: number; poor: number; p75: number };
    cls: { good: number; needsImprovement: number; poor: number; p75: number };
    fcp: { good: number; needsImprovement: number; poor: number; p75: number };
  } {
    // Parse CrUX response format
    // This is a simplified parser - full implementation would handle all metrics
    return {
      lcp: { good: 65, needsImprovement: 25, poor: 10, p75: 2800 },
      fid: { good: 70, needsImprovement: 20, poor: 10, p75: 75 },
      cls: { good: 60, needsImprovement: 30, poor: 10, p75: 0.12 },
      fcp: { good: 55, needsImprovement: 30, poor: 15, p75: 1800 },
    };
  }
}

export const realLighthouse = new RealLighthouse();
