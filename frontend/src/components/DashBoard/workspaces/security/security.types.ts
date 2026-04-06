/**
 * +--- TYPES: Security Intelligence Panel ----------------------------+
 * | PARENT: SecurityWorkspace                                         |
 * | PURPOSE: Shared TypeScript interfaces for all security panels --  |
 * |          vulnerability scanner, dependency health, alerts feed,   |
 * |          CVE watchlist, and security score card.                   |
 * +-------------------------------------------------------------------+
 */

// --- Severity -----------------------------------------------------------
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

// --- Vulnerability Scanner ----------------------------------------------
export interface VulnerabilityEntry {
  id: string;
  cveId: string;
  title: string;
  severity: Severity;
  source: 'NVD' | 'OSV' | 'GitHub Advisory';
  affectedPackage: string;
  affectedVersions: string;
  fixAvailable: boolean;
  fixVersion?: string;
  publishedDate: string;
  description: string;
}

export interface ScanResult {
  id: string;
  timestamp: string;
  totalVulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// --- Dependency Health ---------------------------------------------------
export type DependencyStatus = 'current' | 'outdated' | 'vulnerable' | 'deprecated';
export type LicenseRisk = 'none' | 'low' | 'high';

export interface DependencyEntry {
  name: string;
  currentVersion: string;
  latestVersion: string;
  status: DependencyStatus;
  license: string;
  licenseRisk: LicenseRisk;
  vulnerabilities: number;
  lastUpdated: string;
  type: 'production' | 'dev';
}

export interface NpmAuditSummary {
  totalPackages: number;
  vulnerabilities: { critical: number; high: number; medium: number; low: number };
  fixAvailable: number;
  lastAuditDate: string;
}

// --- Security Alerts ----------------------------------------------------
export type AlertType =
  | 'failed_login'
  | 'suspicious_api'
  | 'rate_limit'
  | 'auth_failure'
  | 'permission_escalation'
  | 'config_change'
  | 'new_device';

export interface SecurityAlert {
  id: string;
  type: AlertType;
  severity: Severity;
  title: string;
  description: string;
  timestamp: string;
  sourceIp?: string;
  userId?: string;
  resolved: boolean;
}

// --- CVE Watch List ------------------------------------------------------
export type CVEStatus = 'monitoring' | 'patched' | 'mitigated' | 'affected';

export interface CVEWatch {
  id: string;
  cveId: string;
  title: string;
  severity: Severity;
  status: CVEStatus;
  affectedTech: string;
  publishedDate: string;
  description: string;
  cvssScore: number;
  references: string[];
}

// --- Security Score Card -------------------------------------------------
export interface SecurityScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface SecurityScore {
  overall: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  categories: SecurityScoreCategory[];
  lastAssessmentDate: string;
  trend: number[]; // last 7 scores
}

// --- Severity config (reusable) ------------------------------------------
export const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; label: string }> = {
  critical: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', label: 'CRITICAL' },
  high: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', label: 'HIGH' },
  medium: { color: '#60C0F0', bg: 'rgba(96, 192, 240, 0.15)', label: 'MEDIUM' },
  low: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', label: 'LOW' },
};
