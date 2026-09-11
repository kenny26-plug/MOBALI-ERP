/**
 * Core Type Definitions for Accounting & Inventory Management
 */

export type Role = 'owner' | 'main_stock' | 'branch' | 'auditor';

export type UserStatus = 'pending_approval' | 'approved' | 'rejected' | 'active' | 'suspended';

export interface User {
  id: string; // UUID primary key
  username: string; // unique index / email address (or username)
  role: Role;
  tenantId: string; // foreign key to Tenant
  displayName: string;
  email?: string;
  status?: UserStatus;
  createdAt?: number;
  lastLogin?: number | null;
  verificationCode?: string | null;
  verificationExpiry?: number | null;
  approvedBy?: string | null;
  approvedAt?: number | null;
  passwordHash?: string; // secure bcrypt secret 

  // Literal snake_case database properties supporting legacy system mappings:
  password_hash?: string;
  portal?: string;
  branch?: string;
  force_password_change?: boolean;
  created_at?: number;
  updated_at?: number;
  last_login?: number | null;
  password_changed_at?: number | null;
}

export interface Tenant {
  id: string; // Primary key (UUID or structured e.g. 'main_stock', 'branch_1')
  name: string;
  isActive: boolean;
  createdAt?: number;
}

export interface Commodity {
  id: string; // UUID
  name: string;
  description: string;
  unitPrice: number; // Admin-controlled global cost valuation price
  createdAt?: number;
}

export type SubmissionStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface Report {
  id: string; // UUID
  tenantId: string; // foreign key to Tenant
  reportDate: string; // Format: YYYY-MM-DD
  submissionStatus: SubmissionStatus;
  submittedAt: number | null; // Unix timestamp
  approvedAt: number | null; // Unix timestamp
  rejectedAt: number | null; // Unix timestamp
  createdAt: number;
  updatedAt: number;
  approvedBy?: string; // Approver username
}

export interface ReportItem {
  id: string; // UUID
  reportId: string; // foreign key to Report
  commodityId: string; // foreign key to Commodity
  commodityName?: string; // Jumper field
  initialStock: number;
  purchasedReceived: number;
  totalStock: number; // calculated: Initial + Purchased
  sales: number;
  remainStock: number; // calculated: Total - Sales
  unitPrice: number;
  totalValuation: number; // calculated Part 4: Sales * Price
  purchasePrice: number; // added manually in Part 2
  profit: number; // calculated Part 2 & 4: Total Valuation - Purchase Price
}

export interface HistoricalArchive {
  id: string; // UUID
  tenantId: string; // foreign key to Tenant
  reportId: string; // foreign key to Report
  reportDate: string;
  approvedAt: number; // Unix timestamp
  approvedData: ReportItem[]; // Immutable JSON snapshot
}

export interface AuditLog {
  id: string; // UUID
  userId: string;
  userDisplayName: string;
  action: string;
  tenantId: string;
  tenantName: string;
  relatedReportId: string | null;
  details: string;
  timestamp: number;
  ipAddress?: string;
  portal?: string; // Access portal for security tracking
  username?: string;
  role?: string;
  branch?: string;
  deviceInfo?: string;
}

export interface LoginSession {
  id: string; // UUID token sequence
  userId: string;
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  ipAddress?: string;
  createdAt: number;
}

export interface ERPNotification {
  id: string;
  title: string;
  message: string;
  tenantId: string;
  read: boolean;
  type: 'info' | 'alert' | 'success';
  createdAt: number;
}
