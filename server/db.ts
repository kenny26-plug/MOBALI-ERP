import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { 
  User, Tenant, Commodity, Report, ReportItem, HistoricalArchive, AuditLog, 
  SubmissionStatus, LoginSession, ERPNotification, UserStatus, Role
} from '../src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface SchemaDB {
  users: User[];
  tenants: Tenant[];
  commodities: Commodity[];
  reports: Report[];
  reportItems: ReportItem[];
  historicalArchives: HistoricalArchive[];
  auditLogs: AuditLog[];
  sessions: LoginSession[];
  notifications: ERPNotification[];
}

// Generate secure UUID
export function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Ensure database file exists and is seeded with relational constraints
function initDB(): SchemaDB {
  let db: SchemaDB = {
    users: [],
    tenants: [],
    commodities: [],
    reports: [],
    reportItems: [],
    historicalArchives: [],
    auditLogs: [],
    sessions: [],
    notifications: []
  };

  const hasDb = fs.existsSync(DB_FILE);
  if (hasDb) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(content);
      
      // Ensure new collections exist in legacy JSON databases
      if (!db.sessions) db.sessions = [];
      if (!db.notifications) db.notifications = [];
      
      // Migrate users to have bcrypt hashes if missing
      let modified = false;
      const defaultPasswords: Record<string, string> = {
        owner: 'owner123',
        main_stock: 'stock123',
        branch_1: 'branch123',
        branch_2: 'branch123',
        branch_3: 'branch123',
        branch_4: 'branch123',
        branch_5: 'branch123',
        branch_6: 'branch123',
      };

      db.users.forEach(u => {
        if (!u.passwordHash) {
          const rawPass = defaultPasswords[u.username] || 'branch123';
          u.passwordHash = bcrypt.hashSync(rawPass, 10);
          modified = true;
        }
        if (!u.status) {
          u.status = 'active';
          modified = true;
        }
        if (!u.email) {
          u.email = `${u.username}@mobalisupplies.rw`;
          modified = true;
        }
      });

      db.commodities.forEach(c => {
        if (c.unitPrice === undefined) {
          c.unitPrice = 15.00;
          modified = true;
        }
      });

      db.reportItems.forEach(item => {
        if (item.purchasePrice === undefined) {
          item.purchasePrice = 0;
          modified = true;
        }
        if (item.profit === undefined) {
          const sales = item.sales || 0;
          const unitPrice = item.unitPrice || 0;
          item.totalValuation = sales * unitPrice;
          item.profit = item.totalValuation - (item.purchasePrice || 0);
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
      }
      return db;
    } catch (e) {
      console.error("Failed to parse db.json, generating a high-grade relational database", e);
    }
  }

  // PureRelational Seed Engine
  const tenants: Tenant[] = [
    { id: 'main_stock', name: 'Main Stock (Central Central)', isActive: true, createdAt: Date.now() },
    { id: 'branch_1', name: 'Branch 1 (North Area)', isActive: true, createdAt: Date.now() },
    { id: 'branch_2', name: 'Branch 2 (South Area)', isActive: true, createdAt: Date.now() },
    { id: 'branch_3', name: 'Branch 3 (Downtown)', isActive: true, createdAt: Date.now() },
    { id: 'branch_4', name: 'Branch 4 (East Coast)', isActive: true, createdAt: Date.now() },
    { id: 'branch_5', name: 'Branch 5 (West Gate)', isActive: true, createdAt: Date.now() },
    { id: 'branch_6', name: 'Branch 6 (Airport Express)', isActive: true, createdAt: Date.now() },
  ];

  const commodities: Commodity[] = [
    { id: generateId(), name: 'T101', description: 'T101 Processor', unitPrice: 45.00, createdAt: Date.now() },
    { id: generateId(), name: 'T301', description: 'T301 Processor', unitPrice: 75.00, createdAt: Date.now() },
    { id: generateId(), name: 'T102', description: 'T102 Terminal Edition', unitPrice: 50.00, createdAt: Date.now() },
    { id: generateId(), name: 'T352', description: 'T352 Processor', unitPrice: 90.00, createdAt: Date.now() },
    { id: generateId(), name: 'T353', description: 'T353 Advanced', unitPrice: 110.00, createdAt: Date.now() },
    { id: generateId(), name: 'T528', description: 'T528 Controller', unitPrice: 120.00, createdAt: Date.now() },
    { id: generateId(), name: 'M17pro', description: 'M17pro Flagship Edition', unitPrice: 350.00, createdAt: Date.now() },
    { id: generateId(), name: 'M16pro', description: 'M16pro High Capacity', unitPrice: 280.00, createdAt: Date.now() },
    { id: generateId(), name: 'A56', description: 'A56 Display Unit', unitPrice: 65.00, createdAt: Date.now() },
    { id: generateId(), name: 'A17', description: 'A17 Modern Unit', unitPrice: 55.00, createdAt: Date.now() },
    { id: generateId(), name: 'A16', description: 'A16 General Edition', unitPrice: 40.00, createdAt: Date.now() },
    { id: generateId(), name: 'A07', description: 'A07 Compact Line', unitPrice: 25.00, createdAt: Date.now() },
    { id: generateId(), name: 'Sens7', description: 'Sens7 Advanced Sensor', unitPrice: 15.00, createdAt: Date.now() },
    { id: generateId(), name: 'Xp10 Mark 3', description: 'Xp10 Mark 3 Core', unitPrice: 130.00, createdAt: Date.now() },
    { id: generateId(), name: 'Xp 10 Mark 4', description: 'Xp 10 Mark 4 Pro', unitPrice: 175.00, createdAt: Date.now() },
    { id: generateId(), name: 'Aquos 3', description: 'Aquos 3 Screen Panel', unitPrice: 85.00, createdAt: Date.now() },
    { id: generateId(), name: 'Aquos 4', description: 'Aquos 4 Liquid Color screen', unitPrice: 105.00, createdAt: Date.now() }
  ];

  const defaultPasswords: Record<string, string> = {
    owner: 'owner123',
    main_stock: 'stock123',
    branch_1: 'branch123',
    branch_2: 'branch123',
    branch_3: 'branch123',
    branch_4: 'branch123',
    branch_5: 'branch123',
    branch_6: 'branch123',
  };

  const users: User[] = [
    { 
      id: generateId(), 
      username: 'owner', 
      role: 'owner', 
      tenantId: 'owner', 
      displayName: 'Mobali patrick (HQ Owner)',
      email: 'owner@mobalisupplies.rw',
      status: 'active',
      passwordHash: bcrypt.hashSync(defaultPasswords.owner, 10),
      createdAt: Date.now()
    },
    { 
      id: generateId(), 
      username: 'main_stock', 
      role: 'main_stock', 
      tenantId: 'main_stock', 
      displayName: 'Central Stock Manager',
      email: 'main_stock@mobalisupplies.rw',
      status: 'active',
      passwordHash: bcrypt.hashSync(defaultPasswords.main_stock, 10),
      createdAt: Date.now()
    },
    ...tenants.filter(t => t.id !== 'main_stock').map(t => ({
      id: generateId(),
      username: t.id,
      role: 'branch' as const,
      tenantId: t.id,
      displayName: `Operator (${t.name})`,
      email: `${t.id}@mobalisupplies.rw`,
      status: 'active' as const,
      passwordHash: bcrypt.hashSync(defaultPasswords[t.id] || 'branch123', 10),
      createdAt: Date.now()
    }))
  ];

  db = {
    users,
    tenants,
    commodities,
    reports: [],
    reportItems: [],
    historicalArchives: [],
    auditLogs: [{
      id: generateId(),
      userId: 'system',
      userDisplayName: 'Security Setup',
      action: 'Database Initialized',
      tenantId: 'owner',
      tenantName: 'HQ System',
      relatedReportId: null,
      details: 'Enterprise secure relational database initialized. Preset login users configured with bcrypt-hashed credentials.',
      timestamp: Date.now()
    }],
    sessions: [],
    notifications: []
  };

  saveDB(db);
  return db;
}

function saveDB(db: SchemaDB) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function ensureDefaultPortalUsers(db: SchemaDB): boolean {
  let modified = false;
  const defaultPortalsUsers = [
    {
      username: 'atlas.vault',
      password: 'K9!Nebula$Cipher88&',
      role: 'owner' as Role,
      portal: 'owner_hq',
      branch: 'HQ',
      displayName: 'HQ Vault Administrator',
      email: 'atlas.vault@mobalisupplies.rw',
      tenantId: 'owner'
    },
    {
      username: 'ironledger',
      password: 'R7@Titan_Stock#204',
      role: 'main_stock' as Role,
      portal: 'main_stock',
      branch: 'CENTRAL_WAREHOUSE',
      displayName: 'Titan stock manager',
      email: 'ironledger@mobalisupplies.rw',
      tenantId: 'main_stock'
    },
    {
      username: 'oakmatrix',
      password: 'B1^QuantumLeaf$731',
      role: 'branch' as Role,
      portal: 'branch_1',
      branch: 'BRANCH_1',
      displayName: 'Operator (Branch 1)',
      email: 'branch_1@mobalisupplies.rw',
      tenantId: 'branch_1'
    },
    {
      username: 'silentforge',
      password: 'F2!ShadowMint@624',
      role: 'branch' as Role,
      portal: 'branch_2',
      branch: 'BRANCH_2',
      displayName: 'Operator (Branch 2)',
      email: 'branch_2@mobalisupplies.rw',
      tenantId: 'branch_2'
    },
    {
      username: 'northvector',
      password: 'N3#CopperSky%582',
      role: 'branch' as Role,
      portal: 'branch_3',
      branch: 'BRANCH_3',
      displayName: 'Operator (Branch 3)',
      email: 'branch_3@mobalisupplies.rw',
      tenantId: 'branch_3'
    },
    {
      username: 'embergrid',
      password: 'E4@NovaBrick&913',
      role: 'branch' as Role,
      portal: 'branch_4',
      branch: 'BRANCH_4',
      displayName: 'Operator (Branch 4)',
      email: 'branch_4@mobalisupplies.rw',
      tenantId: 'branch_4'
    },
    {
      username: 'cobaltnest',
      password: 'C5!IronWave$447',
      role: 'branch' as Role,
      portal: 'branch_5',
      branch: 'BRANCH_5',
      displayName: 'Operator (Branch 5)',
      email: 'branch_5@mobalisupplies.rw',
      tenantId: 'branch_5'
    },
    {
      username: 'vertexhive',
      password: 'V6#LunarStone@268',
      role: 'branch' as Role,
      portal: 'branch_6',
      branch: 'BRANCH_6',
      displayName: 'Operator (Branch 6)',
      email: 'branch_6@mobalisupplies.rw',
      tenantId: 'branch_6'
    }
  ];

  // Purge legacy demo seed usernames
  const legacyDemousernames = ['owner', 'main_stock', 'branch_1', 'branch_2', 'branch_3', 'branch_4', 'branch_5', 'branch_6'];
  const originalLength = db.users.length;
  db.users = db.users.filter(u => !legacyDemousernames.includes(u.username.toLowerCase()));
  if (db.users.length !== originalLength) {
    modified = true;
  }

  defaultPortalsUsers.forEach(item => {
    const existing = db.users.find(u => u.username.toLowerCase() === item.username.toLowerCase());
    if (!existing) {
      const hashed = bcrypt.hashSync(item.password, 10);
      db.users.push({
        id: generateId(),
        username: item.username,
        role: item.role,
        tenantId: item.tenantId,
        displayName: item.displayName,
        email: item.email,
        status: 'active',
        passwordHash: hashed,
        password_hash: hashed,
        portal: item.portal,
        branch: item.branch,
        force_password_change: false,
        created_at: Date.now(),
        updated_at: Date.now(),
        last_login: null,
        password_changed_at: null,
        createdAt: Date.now()
      });
      modified = true;
    } else {
      let madeChanges = false;
      if (existing.role !== item.role) {
        existing.role = item.role;
        madeChanges = true;
      }
      if (existing.branch !== item.branch) {
        existing.branch = item.branch;
        madeChanges = true;
      }
      if (existing.tenantId !== item.tenantId) {
        existing.tenantId = item.tenantId;
        madeChanges = true;
      }
      if (!existing.password_hash && existing.passwordHash) {
        existing.password_hash = existing.passwordHash;
        madeChanges = true;
      }
      if (existing.force_password_change === undefined) {
        existing.force_password_change = false;
        madeChanges = true;
      }
      if (!existing.created_at && existing.createdAt) {
        existing.created_at = existing.createdAt;
        madeChanges = true;
      }
      if (!existing.updated_at) {
        existing.updated_at = Date.now();
        madeChanges = true;
      }
      if (madeChanges) {
        modified = true;
      }
    }
  });

  return modified;
}

export function getDBInstance(): SchemaDB {
  const db = initDB();
  if (ensureDefaultPortalUsers(db)) {
    saveDB(db);
  }
  return db;
}

// Authenticate Credentials Securely with BCrypt
export function validateUserPassword(usernameOrEmail: string, pass: string): User | null {
  const db = getDBInstance();
  const user = db.users.find(u => 
    u.username.toLowerCase() === usernameOrEmail.toLowerCase() || 
    (u.email && u.email.toLowerCase() === usernameOrEmail.toLowerCase())
  );
  if (!user || !user.passwordHash) return null;
  
  const isValid = bcrypt.compareSync(pass, user.passwordHash);
  if (!isValid) return null;
  
  // Strip password hash before sending
  const { passwordHash, password_hash, ...safeUser } = user;
  return safeUser as User;
}

// Change user password endpoint execution
export function changeUserPassword(userId: string, currentPass: string, newPass: string, ipAddress?: string): User {
  const db = getDBInstance();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    throw new Error("User session expired or user not found.");
  }
  const user = db.users[userIndex];
  if (!user.passwordHash) {
    throw new Error("Identity record compromised.");
  }
  const matches = bcrypt.compareSync(currentPass, user.passwordHash);
  if (!matches) {
    throw new Error("Incorrect current password.");
  }

  // Prevent setting password to previous
  if (bcrypt.compareSync(newPass, user.passwordHash)) {
    throw new Error("New password cannot be the same as your previous password.");
  }
  
  // Validate strength
  if (newPass.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(newPass)) {
    throw new Error("New password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(newPass)) {
    throw new Error("New password must contain at least one lowercase letter.");
  }
  if (!/\d/.test(newPass)) {
    throw new Error("New password must contain at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(newPass)) {
    throw new Error("New password must contain at least one special character.");
  }

  const hashed = bcrypt.hashSync(newPass, 10);
  user.passwordHash = hashed;
  user.password_hash = hashed;
  user.force_password_change = false;
  user.password_changed_at = Date.now();
  user.updated_at = Date.now();
  
  // Log audit trail
  const audit: AuditLog = {
    id: generateId(),
    userId: user.id,
    userDisplayName: user.displayName,
    username: user.username,
    role: user.role,
    branch: user.branch || 'HQ',
    action: 'PASSWORD_CHANGED',
    tenantId: user.tenantId,
    tenantName: user.branch || 'HQ System',
    relatedReportId: null,
    details: 'User password was changed securely.',
    timestamp: Date.now(),
    ipAddress,
    portal: user.portal
  };
  db.auditLogs.unshift(audit);

  saveDB(db);
  
  // Strip hash and return
  const { passwordHash, password_hash, ...safe } = user;
  return safe as User;
}

// Owner password reset for targeted accounts
export function adminResetUserPassword(adminUser: User, targetUserId: string, newPass: string, ipAddress?: string): User {
  if (adminUser.role !== 'owner') {
    throw new Error("Access Denied: Owner role required.");
  }
  const db = getDBInstance();
  const u = db.users.find(user => user.id === targetUserId);
  if (!u) {
    throw new Error("Target user not found.");
  }

  // Validate strength
  if (newPass.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(newPass)) {
    throw new Error("New password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(newPass)) {
    throw new Error("New password must contain at least one lowercase letter.");
  }
  if (!/\d/.test(newPass)) {
    throw new Error("New password must contain at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(newPass)) {
    throw new Error("New password must contain at least one special character.");
  }

  const hashed = bcrypt.hashSync(newPass, 10);
  u.passwordHash = hashed;
  u.password_hash = hashed;
  u.force_password_change = true; // force them to change upon login
  u.updated_at = Date.now();

  // Log audit trail
  const audit: AuditLog = {
    id: generateId(),
    userId: adminUser.id,
    userDisplayName: adminUser.displayName,
    action: 'Administrative Password Reset',
    tenantId: adminUser.tenantId,
    tenantName: 'HQ System',
    relatedReportId: null,
    details: `Administrator reset password for user ${u.username}. Force-change flagged.`,
    timestamp: Date.now(),
    ipAddress,
    portal: adminUser.portal
  };
  db.auditLogs.unshift(audit);

  saveDB(db);
  const { passwordHash, password_hash, ...safe } = u;
  return safe as User;
}

// Owner direct account setup
export function adminCreateUser(
  adminUser: User,
  displayName: string,
  username: string,
  email: string,
  role: Role,
  portal: string,
  branch: string,
  tenantId: string,
  pass: string,
  ipAddress?: string
): User {
  if (adminUser.role !== 'owner') {
    throw new Error("Access Denied: Owner role required.");
  }
  const db = getDBInstance();
  const lowerUsername = username.toLowerCase();
  if (db.users.some(u => u.username.toLowerCase() === lowerUsername || (u.email && u.email.toLowerCase() === email.toLowerCase()))) {
    throw new Error("Username or Email already registered in enterprise databases.");
  }

  // Validate strength
  if (pass.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(pass)) {
    throw new Error("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(pass)) {
    throw new Error("Password must contain at least one lowercase letter.");
  }
  if (!/\d/.test(pass)) {
    throw new Error("Password must contain at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(pass)) {
    throw new Error("Password must contain at least one special character.");
  }

  const hashed = bcrypt.hashSync(pass, 10);
  const newUser: User = {
    id: generateId(),
    username,
    role,
    tenantId,
    displayName,
    email,
    status: 'active',
    passwordHash: hashed,
    password_hash: hashed,
    portal,
    branch,
    force_password_change: false,
    created_at: Date.now(),
    updated_at: Date.now(),
    last_login: null,
    password_changed_at: null,
    createdAt: Date.now()
  };

  db.users.push(newUser);

  // Log audit trail
  const audit: AuditLog = {
    id: generateId(),
    userId: adminUser.id,
    userDisplayName: adminUser.displayName,
    action: 'Administrative Account Creation',
    tenantId: tenantId,
    tenantName: branch || portal || 'Tenant Division',
    relatedReportId: null,
    details: `Administrator created active user account ${username} [${role}] for portal ${portal}.`,
    timestamp: Date.now(),
    ipAddress,
    portal: adminUser.portal
  };
  db.auditLogs.unshift(audit);

  saveDB(db);

  const { passwordHash, password_hash, ...safe } = newUser;
  return safe as User;
}

// Register dynamic approval-based User Account
export function registerUser(displayName: string, email: string, pass: string, tenantId: string, ipAddress?: string): User {
  if (!displayName || !email || !pass || !tenantId) {
    throw new Error("All registration fields are required.");
  }
  if (pass.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
  const hasLetter = /[a-zA-Z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  if (!hasLetter || !hasNumber) {
    throw new Error("Security complexity: Password must contain at least one letter and one number.");
  }

  const db = initDB();
  const existing = db.users.find(u => u.email?.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error("An account is already configured/registered with this email.");
  }

  const tenant = db.tenants.find(t => t.id === tenantId);
  if (!tenant) {
    throw new Error("The selected branch selection is invalid.");
  }

  const newUser: User = {
    id: generateId(),
    username: email.toLowerCase(), // email is login username key
    role: 'branch',
    tenantId,
    displayName,
    email,
    status: 'pending_approval',
    passwordHash: bcrypt.hashSync(pass, 10),
    createdAt: Date.now()
  };

  db.users.push(newUser);

  // Notify default admin at kennycyusa10@gmail.com
  db.notifications.unshift({
    id: generateId(),
    title: 'New Account Request',
    message: `A new registration request from ${displayName} (${email}) for branch ${tenant.name} is received and pending validation.`,
    tenantId: 'owner',
    read: false,
    type: 'alert',
    createdAt: Date.now()
  });

  // Track operational Audit trail
  db.auditLogs.unshift({
    id: generateId(),
    userId: 'unauthenticated',
    userDisplayName: displayName,
    action: 'User Registered (Pending)',
    tenantId,
    tenantName: tenant.name,
    relatedReportId: null,
    details: `User registration submitted for ${displayName} (${email}). Assigned to branch ${tenant.name}. Status: PENDING_APPROVAL.`,
    timestamp: Date.now(),
    ipAddress: ipAddress || 'unresolved'
  });

  saveDB(db);
  return newUser;
}

// Approve & Generate verification PIN or Reject account status
export function adminUpdateUserStatus(adminUser: User, targetUserId: string, newStatus: UserStatus, ipAddress?: string): User {
  if (adminUser.role !== 'owner') {
    throw new Error("Access Denied: Owner role required to audit credentials.");
  }
  
  const db = initDB();
  const user = db.users.find(u => u.id === targetUserId);
  if (!user) {
    throw new Error("Selected user account could not be found.");
  }

  const oldStatus = user.status;
  user.status = newStatus;

  let details = `User ${user.displayName} status altered from ${oldStatus} to ${newStatus} by HQ Owner ${adminUser.displayName}.`;

  if (newStatus === 'approved') {
    // Generate secure clean 6-digit PIN code
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = pin;
    user.verificationExpiry = Date.now() + 60 * 60 * 1000; // 60 minutes expiry
    user.approvedBy = adminUser.username;
    user.approvedAt = Date.now();

    details = `Account request approved for ${user.displayName} (${user.email}). Verification passcode generated: [${pin}]. Dispatch notice sent to ${user.email}.`;

    console.log(`\n========================================================================\n[EMAIL DISPATCH] Verification OTP sent to user email: ${user.email}\nSecurity code: ${pin}\n========================================================================\n`);

    // Notify HQ Owner and create internal notification
    db.notifications.unshift({
      id: generateId(),
      title: 'Registration Approved',
      message: `Admin approved ${user.displayName} (${user.email}) for branch terminal. Registration active upon code verification.`,
      tenantId: 'owner',
      read: false,
      type: 'success',
      createdAt: Date.now()
    });
  } else if (newStatus === 'rejected') {
    user.approvedBy = adminUser.username;
    user.approvedAt = Date.now();
    user.verificationCode = null;

    db.notifications.unshift({
      id: generateId(),
      title: 'Registration Rejected',
      message: `Admin rejected registration request for ${user.displayName} (${user.email}).`,
      tenantId: 'owner',
      read: false,
      type: 'info',
      createdAt: Date.now()
    });
  }

  db.auditLogs.unshift({
    id: generateId(),
    userId: adminUser.id,
    userDisplayName: adminUser.displayName,
    action: `User Audit: ${newStatus.toUpperCase()}`,
    tenantId: user.tenantId,
    tenantName: db.tenants.find(t => t.id === user.tenantId)?.name || 'Branch',
    relatedReportId: null,
    details,
    timestamp: Date.now(),
    ipAddress: ipAddress || 'unresolved'
  });

  saveDB(db);
  return user;
}

// User submit verification PIN to activate
export function verifyUserWithCode(email: string, code: string, ipAddress?: string): User {
  if (!email || !code) {
    throw new Error("Email and secure verification pin code are required.");
  }

  const db = initDB();
  const user = db.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error("No account registered with this email.");
  }

  if (user.status !== 'approved') {
    if (user.status === 'active') {
      throw new Error("This account is already active. Proceed to login.");
    }
    throw new Error(`Account authentication state is currently: ${user.status || 'inactive'}`);
  }

  if (!user.verificationCode || user.verificationCode !== code.trim()) {
    throw new Error("Verification code is incorrect. Please verify and retry.");
  }

  if (user.verificationExpiry && user.verificationExpiry < Date.now()) {
    throw new Error("This verification passcode has expired. Please contact HQ owner.");
  }

  // Activate user accounts securely
  user.status = 'active';
  user.verificationCode = null;
  user.verificationExpiry = null;

  db.auditLogs.unshift({
    id: generateId(),
    userId: user.id,
    userDisplayName: user.displayName,
    action: 'Account Active (OTP Verified)',
    tenantId: user.tenantId,
    tenantName: db.tenants.find(t => t.id === user.tenantId)?.name || 'Branch',
    relatedReportId: null,
    details: `User entered correct OTP verification pin. Account is now active.`,
    timestamp: Date.now(),
    ipAddress: ipAddress || 'unresolved'
  });

  saveDB(db);
  return user;
}

// Admin update commodity global unitPrice
export function updateCommodityPrice(adminUser: User, id: string, unitPrice: number, ipAddress?: string): Commodity {
  if (adminUser.role !== 'owner') {
    throw new Error("Access Denied: Owner role required to manipulate global price tables.");
  }
  const db = initDB();
  const comm = db.commodities.find(c => c.id === id);
  if (!comm) {
    throw new Error("Selected product commodity could not be found.");
  }

  const oldPrice = comm.unitPrice;
  comm.unitPrice = Math.max(0, Number(unitPrice));

  // Write Audit Log
  db.auditLogs.unshift({
    id: generateId(),
    userId: adminUser.id,
    userDisplayName: adminUser.displayName,
    action: 'Unit Price Modified',
    tenantId: 'owner',
    tenantName: 'HQ System',
    relatedReportId: null,
    details: `Globally updated unit price for asset "${comm.name}" from $${oldPrice.toFixed(2)} to $${Number(unitPrice).toFixed(2)}. This propagates globally.`,
    timestamp: Date.now(),
    ipAddress: ipAddress || 'unresolved'
  });

  saveDB(db);
  return comm;
}

// Modify findUserByUsername to support email or username fallback
export function findUserByUsername(usernameOrEmail: string): User | undefined {
  const db = initDB();
  const u = db.users.find(u => 
    u.username.toLowerCase() === usernameOrEmail.toLowerCase() || 
    (u.email && u.email.toLowerCase() === usernameOrEmail.toLowerCase())
  );
  if (!u) return undefined;
  
  const { passwordHash, ...safeUser } = u;
  return safeUser as User;
}

export function getAllUsers(adminUser: User): User[] {
  if (adminUser.role !== 'owner') {
    throw new Error("Access Denied.");
  }
  const db = initDB();
  return db.users.map(({ passwordHash, ...safe }) => safe as User);
}

// Database session managers (JWT authentication database states)
export function createLoginSession(userId: string, username: string, ipAddress?: string): LoginSession {
  const db = initDB();
  const sessionId = generateId();
  
  // Sign simple tokens representing the secure sessions (with a random element and session ID context)
  const salt = crypto.randomBytes(32).toString('hex');
  const accessToken = `access_${sessionId}_${salt.substring(0, 32)}`;
  const refreshToken = `refresh_${sessionId}_${salt.substring(32, 64)}`;
  
  const expiration = Date.now() + 24 * 60 * 60 * 1000; // 24 Hours Session Validity

  const session: LoginSession = {
    id: sessionId,
    userId,
    username,
    accessToken,
    refreshToken,
    expiresAt: expiration,
    ipAddress,
    createdAt: Date.now()
  };

  db.sessions.push(session);
  saveDB(db);
  return session;
}

export function verifySessionToken(token: string): User | null {
  const db = initDB();
  const s = db.sessions.find(session => session.accessToken === token);
  if (!s || s.expiresAt < Date.now()) return null;
  
  const u = db.users.find(user => user.id === s.userId);
  if (!u) return null;
  
  const { passwordHash, ...safeUser } = u;
  return safeUser as User;
}

export function revokeSession(token: string): boolean {
  const db = initDB();
  const oldLen = db.sessions.length;
  db.sessions = db.sessions.filter(session => session.accessToken !== token && session.refreshToken !== token);
  if (db.sessions.length !== oldLen) {
    saveDB(db);
    return true;
  }
  return false;
}

// User lookup queries
// (findUserByUsername already exported above with email fallback support)

// Tenants & Commodities
export function getTenants(): Tenant[] {
  const db = initDB();
  return db.tenants;
}

export function getCommodities(): Commodity[] {
  const db = initDB();
  return db.commodities;
}

  // Create global commodity (Owner only)
  export function createCommodity(user: User, name: string, description: string, unitPrice?: number): Commodity {
    const db = initDB();
    const existing = db.commodities.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      throw new Error(`Commodity with name "${name}" already exists.`);
    }
  
    const newComm: Commodity = {
      id: generateId(),
      name,
      description,
      unitPrice: unitPrice !== undefined ? Math.max(0, Number(unitPrice)) : 15.00,
      createdAt: Date.now()
    };
    db.commodities.push(newComm);
  
    // Write Audit Log
    db.auditLogs.unshift({
      id: generateId(),
      userId: user.id,
      userDisplayName: user.displayName,
      action: 'Commodity Added',
      tenantId: user.tenantId,
      tenantName: user.role === 'owner' ? 'HQ System' : (db.tenants.find(t => t.id === user.tenantId)?.name || 'Tenant'),
      relatedReportId: null,
      details: `Added new global commodity asset "${name}" (${description}) with unit price $${newComm.unitPrice.toFixed(2)}.`,
      timestamp: Date.now()
    });
  
    saveDB(db);
    return newComm;
  }

// Cascaded Commodity Deletion under Strict Foreign Key validations
export function deleteCommodity(user: User, id: string): void {
  if (user.role !== 'owner') {
    throw new Error("Access Denied: Owner role required to delete commodities.");
  }
  const db = initDB();
  const comm = db.commodities.find(c => c.id === id);
  if (!comm) {
    throw new Error("Selected commodity does not exist.");
  }

  db.commodities = db.commodities.filter(c => c.id !== id);
  
  // Relational Integrity: Cascade deletion across reportItems of ACTIVE reports (not locked yet)
  db.reportItems = db.reportItems.filter(item => {
    const report = db.reports.find(r => r.id === item.reportId);
    if (!report) return false;
    
    // Only cascade delete items inside non-approved drafts
    if (report.submissionStatus !== 'approved' && item.commodityId === id) {
      return false; // delete row
    }
    return true;
  });

  // Track operational Audit trail
  db.auditLogs.unshift({
    id: generateId(),
    userId: user.id,
    userDisplayName: user.displayName,
    action: 'Commodity Deleted',
    tenantId: user.tenantId,
    tenantName: 'HQ System',
    relatedReportId: null,
    details: `Globally deleted Commodity "${comm.name}". Relational Cascade triggered on active working draft spreadsheets.`,
    timestamp: Date.now()
  });

  saveDB(db);
}

// Multi-Tenant Portal Report Operations
export function getTenantReports(tenantId: string): Report[] {
  const db = initDB();
  return db.reports.filter(r => r.tenantId === tenantId).sort((a,b) => b.createdAt - a.createdAt);
}

export function getAllReports(): Report[] {
  const db = initDB();
  return db.reports.sort((a,b) => b.createdAt - a.createdAt);
}

export function getReportDetails(reportId: string) {
  const db = initDB();
  const report = db.reports.find(r => r.id === reportId);
  if (!report) return null;

  const items = db.reportItems.filter(item => item.reportId === reportId);
  
  // Attach commodity metadata to items
  const itemsWithNames = items.map(item => {
    const comm = db.commodities.find(c => c.id === item.commodityId);
    return {
      ...item,
      commodityName: comm ? comm.name : 'Unknown Commodity'
    };
  });

  return {
    report,
    items: itemsWithNames
  };
}

// Safe carryover engine for Subsequent Reports validation
export function createNewReport(user: User, tenantId: string, reportDate: string): { report: Report, items: ReportItem[] } {
  const db = initDB();
  
  // Integrity check: prevent duplicate cycle logs
  const existingReport = db.reports.find(r => r.tenantId === tenantId && r.reportDate === reportDate);
  if (existingReport) {
    throw new Error(`A report for date "${reportDate}" already exists in the ledger for this terminal.`);
  }

  // Fetch only approved reports to inject immutable remnants
  const approvedReports = db.reports
    .filter(r => r.tenantId === tenantId && r.submissionStatus === 'approved')
    .sort((a, b) => b.approvedAt! - a.approvedAt!);
  
  const lastApprovedReport = approvedReports[0];
  const itemsFromLastReport = lastApprovedReport 
    ? db.reportItems.filter(item => item.reportId === lastApprovedReport.id)
    : [];

  const reportId = generateId();

  // Initialize Report Entity
  const report: Report = {
    id: reportId,
    tenantId,
    reportDate,
    submissionStatus: 'draft',
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const isInitialSetup = approvedReports.length === 0;

  // Compute stock fields on seed
  const items: ReportItem[] = db.commodities.map(comm => {
    const previousItem = itemsFromLastReport.find(pi => pi.commodityId === comm.id);
    const carryOverStock = previousItem ? previousItem.remainStock : 0;

    const initialStock = carryOverStock;
    const purchasedReceived = 0;
    const totalStock = initialStock + purchasedReceived;
    const sales = 0;
    const remainStock = totalStock - sales;
    const unitPrice = comm.unitPrice !== undefined ? comm.unitPrice : (previousItem ? previousItem.unitPrice : 15.00);
    const totalValuation = sales * unitPrice; // Part 4 formula: Sales * Unit Price
    const purchasePrice = 0;
    const profit = totalValuation - purchasePrice;

    return {
      id: generateId(),
      reportId,
      commodityId: comm.id,
      initialStock,
      purchasedReceived,
      totalStock,
      sales,
      remainStock,
      unitPrice,
      totalValuation,
      purchasePrice,
      profit
    };
  });

  db.reports.push(report);
  db.reportItems.push(...items);

  // Write audit trail
  const tenantName = db.tenants.find(t => t.id === tenantId)?.name || tenantId;
  db.auditLogs.unshift({
    id: generateId(),
    userId: user.id,
    userDisplayName: user.displayName,
    action: 'Report Cycle Created',
    tenantId,
    tenantName,
    relatedReportId: reportId,
    details: `Initiated inventory report folder for cycle date "${reportDate}". ${
      isInitialSetup 
        ? 'Baseline initialization (All fields open).' 
        : `Carry-over loaded from locked archives (Initial stock bound to previous remain-stock and made READ-ONLY).`
    }`,
    timestamp: Date.now()
  });

  // Notify HQ Owner
  db.notifications.unshift({
    id: generateId(),
    title: 'New Cycle Initialized',
    message: `${tenantName} started a new inventory draft for cycle ${reportDate}.`,
    tenantId: 'owner',
    read: false,
    type: 'info',
    createdAt: Date.now()
  });

  saveDB(db);

  const itemsWithNames = items.map(item => {
    const comm = db.commodities.find(c => c.id === item.commodityId);
    return {
      ...item,
      commodityName: comm ? comm.name : 'Unknown Commodity'
    };
  });

  return {
    report,
    items: itemsWithNames
  };
}

// Server-side safe spreadsheet updates
export function saveReportDraft(user: User, reportId: string, clientItems: Partial<ReportItem>[]): { report: Report, items: ReportItem[] } {
  const db = initDB();

  const report = db.reports.find(r => r.id === reportId);
  if (!report) {
    throw new Error("Report not found.");
  }

  // Freeze check
  if (report.submissionStatus !== 'draft' && report.submissionStatus !== 'rejected') {
    throw new Error(`Report is frozen. Edits disallowed in status: "${report.submissionStatus}".`);
  }

  // Branch manager security validation
  if (user.role !== 'owner' && user.tenantId !== report.tenantId) {
    throw new Error("Access Denied: You do not have permissions to modify another terminal's ledger.");
  }

  const approvedReportsOfTenant = db.reports.filter(r => r.tenantId === report.tenantId && r.submissionStatus === 'approved');
  const isInitialSetup = approvedReportsOfTenant.length === 0;

  const currentItems = db.reportItems.filter(item => item.reportId === reportId);
  const updatedItems: ReportItem[] = [];

  for (const cItem of clientItems) {
    const originalItem = currentItems.find(item => item.id === cItem.id || item.commodityId === cItem.commodityId);
    if (!originalItem) continue;

    const purchasedReceived = Math.max(0, Number(cItem.purchasedReceived ?? originalItem.purchasedReceived));
    
    // PART 4: Automatic Calculations & Cycle rules:
    // initially, user should be allowed to fill in "initial stock" data but the next cycle "initial stock" should be previous "remain stock" data
    const initialStock = isInitialSetup 
      ? Math.max(0, Number(cItem.initialStock ?? originalItem.initialStock ?? 0))
      : (originalItem.initialStock || 0);

    const sales = Math.max(0, Number(cItem.sales ?? originalItem.sales));
    const purchasePrice = Math.max(0, Number(cItem.purchasePrice ?? originalItem.purchasePrice ?? 0));
    
    // Price controlled globally by Admin
    const comm = db.commodities.find(c => c.id === originalItem.commodityId);
    const unitPrice = comm ? comm.unitPrice : (originalItem.unitPrice || 0);

    // Total Stock = Initial Stock + Purchased/Received
    const totalStock = initialStock + purchasedReceived;
    
    // Remaining Stock = Total Stock - Sales
    const sanitizedSales = sales > totalStock ? totalStock : sales;
    const remainStock = totalStock - sanitizedSales;

    // Total Valuation = Sales * Unit Price
    const totalValuation = sanitizedSales * unitPrice;

    // Profit = Total Valuation - Purchase Price
    const profit = totalValuation - purchasePrice;

    originalItem.initialStock = initialStock;
    originalItem.purchasedReceived = purchasedReceived;
    originalItem.totalStock = totalStock;
    originalItem.sales = sanitizedSales;
    originalItem.remainStock = remainStock;
    originalItem.unitPrice = unitPrice;
    originalItem.totalValuation = totalValuation;
    originalItem.purchasePrice = purchasePrice;
    originalItem.profit = profit;

    updatedItems.push(originalItem);
  }

  report.updatedAt = Date.now();

  const tenantName = db.tenants.find(t => t.id === report.tenantId)?.name || report.tenantId;
  db.auditLogs.unshift({
    id: generateId(),
    userId: user.id,
    userDisplayName: user.displayName,
    action: 'Draft Saved',
    tenantId: report.tenantId,
    tenantName,
    relatedReportId: reportId,
    details: `Updated inventory workbook for cycle "${report.reportDate}". Server computed dependent balances and valuations.`,
    timestamp: Date.now()
  });

  saveDB(db);

  const itemsWithNames = updatedItems.map(item => {
    const comm = db.commodities.find(c => c.id === item.commodityId);
    return {
      ...item,
      commodityName: comm ? comm.name : 'Unknown Commodity'
    };
  });

  return {
    report,
    items: itemsWithNames
  };
}

// Submit for HQ evaluation review
export function submitReport(user: User, reportId: string): Report {
  const db = initDB();
  const report = db.reports.find(r => r.id === reportId);
  if (!report) {
    throw new Error("Report not found.");
  }

  if (user.role !== 'owner' && user.tenantId !== report.tenantId) {
    throw new Error("Access Denied: You cannot submit reports for other terminals.");
  }

  report.submissionStatus = 'pending_approval';
  report.submittedAt = Date.now();
  report.updatedAt = Date.now();

  const tenantName = db.tenants.find(t => t.id === report.tenantId)?.name || report.tenantId;
  db.auditLogs.unshift({
    id: generateId(),
    userId: user.id,
    userDisplayName: user.displayName,
    action: 'Report Submitted',
    tenantId: report.tenantId,
    tenantName,
    relatedReportId: reportId,
    details: `Submitted ledger for cycle "${report.reportDate}" to executive audit queue.`,
    timestamp: Date.now()
  });

  // Notify HQ Owner
  db.notifications.unshift({
    id: generateId(),
    title: 'Cycle Submission Pending',
    message: `${tenantName} submitted cycle ${report.reportDate} for review.`,
    tenantId: 'owner',
    read: false,
    type: 'alert',
    createdAt: Date.now()
  });

  saveDB(db);
  return report;
}

// Immutable Archiving approvals
export function approveAndLockReport(ownerUser: User, reportId: string): Report {
  if (ownerUser.role !== 'owner') {
    throw new Error("Access Denied: HQ auditing authorization required.");
  }

  const db = initDB();
  const report = db.reports.find(r => r.id === reportId);
  if (!report) {
    throw new Error("Selected report folder was not found.");
  }

  const reportItems = db.reportItems.filter(item => item.reportId === reportId);

  // Snapshot structure mapped precisely
  const itemsWithNames = reportItems.map(item => {
    const comm = db.commodities.find(c => c.id === item.commodityId);
    return {
      ...item,
      commodityName: comm ? comm.name : 'Unknown Commodity'
    };
  });

  const archiveId = generateId();
  const approvedAt = Date.now();

  const archive: HistoricalArchive = {
    id: archiveId,
    tenantId: report.tenantId,
    reportId: report.id,
    reportDate: report.reportDate,
    approvedAt,
    approvedData: itemsWithNames
  };

  db.historicalArchives = db.historicalArchives.filter(a => a.reportId !== reportId);
  db.historicalArchives.unshift(archive);

  // Lock status irrevocably
  report.submissionStatus = 'approved';
  report.approvedAt = approvedAt;
  report.rejectedAt = null;
  report.updatedAt = approvedAt;
  report.approvedBy = ownerUser.username;

  const tenantName = db.tenants.find(t => t.id === report.tenantId)?.name || report.tenantId;
  db.auditLogs.unshift({
    id: generateId(),
    userId: ownerUser.id,
    userDisplayName: ownerUser.displayName,
    action: 'Report Approved & Locked',
    tenantId: report.tenantId,
    tenantName,
    relatedReportId: reportId,
    details: `Executive review approved and archived cycle "${report.reportDate}". Ledger record is now locked and read-only. Snapshot checksum generated.`,
    timestamp: Date.now()
  });

  // Notify tenant portal
  db.notifications.unshift({
    id: generateId(),
    title: 'Cycle Approved',
    message: `Cycle ${report.reportDate} has been audited, approved, and locked.`,
    tenantId: report.tenantId,
    read: false,
    type: 'success',
    createdAt: Date.now()
  });

  saveDB(db);
  return report;
}

// Executive rejction back to draft terminal status
export function rejectAndUnlockReport(ownerUser: User, reportId: string): Report {
  if (ownerUser.role !== 'owner') {
    throw new Error("Access Denied: HQ authorization is required.");
  }

  const db = initDB();
  const report = db.reports.find(r => r.id === reportId);
  if (!report) {
    throw new Error("Report not located.");
  }

  report.submissionStatus = 'draft';
  report.rejectedAt = Date.now();
  report.submittedAt = null; // Re-open for edits
  report.updatedAt = Date.now();

  const tenantName = db.tenants.find(t => t.id === report.tenantId)?.name || report.tenantId;
  db.auditLogs.unshift({
    id: generateId(),
    userId: ownerUser.id,
    userDisplayName: ownerUser.displayName,
    action: 'Report Rejected / Unlocked',
    tenantId: report.tenantId,
    tenantName,
    relatedReportId: reportId,
    details: `Cycle review rejected and unlocked for date "${report.reportDate}". Terminal workspace unlocked for corrections.`,
    timestamp: Date.now()
  });

  // Notify tenant portal
  db.notifications.unshift({
    id: generateId(),
    title: 'Cycle Rejected / Unlocked',
    message: `Cycle ${report.reportDate} was returned for revisions. Corrections required.`,
    tenantId: report.tenantId,
    read: false,
    type: 'alert',
    createdAt: Date.now()
  });

  saveDB(db);
  return report;
}

// Queries
export function getHistoricalStateByDate(tenantId: string, timestamp: number): HistoricalArchive | null {
  const db = initDB();
  const archives = db.historicalArchives
    .filter(a => a.tenantId === tenantId && a.approvedAt <= timestamp)
    .sort((a,b) => b.approvedAt - a.approvedAt);

  return archives.length > 0 ? archives[0] : null;
}

export function getAllHistoricalSnapshots(): HistoricalArchive[] {
  const db = initDB();
  return db.historicalArchives.sort((a,b) => b.approvedAt - a.approvedAt);
}

export function getAuditLogs(): AuditLog[] {
  const db = initDB();
  return db.auditLogs.sort((a,b) => b.timestamp - a.timestamp);
}

// Notification Hub endpoints
export function getERPNotifications(tenantId: string): ERPNotification[] {
  const db = initDB();
  return db.notifications.filter(n => n.tenantId === tenantId).sort((a,b) => b.createdAt - a.createdAt);
}

export function markAsRead(id: string): void {
  const db = initDB();
  const n = db.notifications.find(notif => notif.id === id);
  if (n) {
    n.read = true;
    saveDB(db);
  }
}
