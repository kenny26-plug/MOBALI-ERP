import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { 
  getTenants, 
  getCommodities, 
  createCommodity,
  deleteCommodity,
  getTenantReports, 
  getAllReports,
  getReportDetails, 
  createNewReport, 
  saveReportDraft, 
  submitReport, 
  approveAndLockReport, 
  rejectAndUnlockReport, 
  getHistoricalStateByDate, 
  getAllHistoricalSnapshots,
  getAuditLogs,
  getDBInstance,
  validateUserPassword,
  createLoginSession,
  verifySessionToken,
  revokeSession,
  getERPNotifications,
  markAsRead,
  registerUser,
  adminUpdateUserStatus,
  verifyUserWithCode,
  updateCommodityPrice,
  getAllUsers,
  findUserByUsername,
  changeUserPassword,
  adminResetUserPassword,
  adminCreateUser,
  generateId
} from './server/db';
import { User, Role } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize and seed database with secure hashes
  getDBInstance();

  // 1. Core Security Middleware Header Injector (Helmet substitute for sandbox consistency)
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data:;");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json());

  // 2. Simple In-Memory Brute-Force Rate Limiter
  const loginAttempts: Record<string, { failedCount: number; lockUntil: number }> = {};
  const RATE_LIMIT_TRIES = 5;
  const ATTEMPT_WINDOW_MS = 3 * 60 * 1000; // 3 minutes lockout

  // 3. Authenticated Identity Resolver (Extract JWT Bearer tokens)
  const getAuthUser = (req: express.Request): User | undefined => {
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
    const token = authHeader.substring(7); // strip "Bearer "
    return verifySessionToken(token) || undefined;
  };

  // --- API ROUTES ---

  // Service Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: Date.now() });
  });

  // Secure User Auth Authentication with brute-force protection, account status verification, and token responses
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const trackerKey = `${(username || '').toLowerCase()}_${ip}`;

    if (!username || !password) {
      res.status(400).json({ error: 'Username/Email and password credentials are required.' });
      return;
    }

    // Rate Limit Security Check
    const track = loginAttempts[trackerKey];
    if (track && track.lockUntil > Date.now()) {
      const waitTime = Math.ceil((track.lockUntil - Date.now()) / 1000);
      res.status(429).json({ 
        error: `Brute-force lockout active. Too many failed logs. Please wait ${waitTime} seconds.` 
      });
      return;
    }

    try {
      // Find the user by username/email first to perform status checks
      const userObj = findUserByUsername(username);
      if (userObj) {
        if (userObj.status === 'pending_approval') {
          res.status(403).json({ 
            error: 'Account is pending administrator approval. Please contact central support.',
            status: 'pending_approval'
          });
          return;
        } else if (userObj.status === 'suspended') {
          res.status(403).json({ 
            error: 'This account has been suspended by HQ System Administrator.',
            status: 'suspended'
          });
          return;
        }
      }

      const user = validateUserPassword(username, password);
      
      if (!user) {
        // Increment fail counter
        const now = Date.now();
        if (!loginAttempts[trackerKey]) {
          loginAttempts[trackerKey] = { failedCount: 1, lockUntil: 0 };
        } else {
          loginAttempts[trackerKey].failedCount += 1;
        }

        // Log failed credentials attempt
        const dbInstance = getDBInstance();
        dbInstance.auditLogs.unshift({
          id: generateId(),
          userId: 'unknown',
          userDisplayName: username,
          username: username,
          role: 'unknown',
          branch: 'unknown',
          action: 'Login Failure: Bad Credentials',
          tenantId: 'unknown',
          tenantName: 'External Terminal',
          relatedReportId: null,
          details: `Login failure registered for client username/email [${username}]`,
          timestamp: Date.now(),
          ipAddress: ip,
          deviceInfo: userAgent
        });
        fs.writeFileSync(path.join(process.cwd(), 'db.json'), JSON.stringify(dbInstance, null, 2), 'utf-8');

        if (loginAttempts[trackerKey].failedCount >= RATE_LIMIT_TRIES) {
          loginAttempts[trackerKey].lockUntil = now + ATTEMPT_WINDOW_MS;
          res.status(429).json({ 
            error: 'Brute force triggered. Username terminal locked for 3 minutes.' 
          });
          return;
        }

        res.status(401).json({ error: 'Unauthorized: Invalid credentials entered.' });
        return;
      }

      // Reset login limitation tracker on successful enter
      loginAttempts[trackerKey] = { failedCount: 0, lockUntil: 0 };

      // Initialize access session
      const session = createLoginSession(user.id, user.username, ip);
      
      // Update database user record with login and audits
      const dbInstance = getDBInstance();
      const targetU = dbInstance.users.find(u => u.id === user.id);
      if (targetU) {
        targetU.last_login = Date.now();
        targetU.lastLogin = Date.now();
        targetU.updated_at = Date.now();
      }
      dbInstance.auditLogs.unshift({
        id: generateId(),
        userId: user.id,
        userDisplayName: user.displayName,
        username: user.username,
        role: user.role,
        branch: user.branch || 'HQ',
        action: 'Login Success',
        tenantId: user.tenantId,
        tenantName: user.branch || 'HQ System',
        relatedReportId: null,
        details: `Successful security credentials verified. Access established.`,
        timestamp: Date.now(),
        ipAddress: ip,
        deviceInfo: userAgent
      });
      fs.writeFileSync(path.join(process.cwd(), 'db.json'), JSON.stringify(dbInstance, null, 2), 'utf-8');

      res.json({ 
        user: targetU ? { ...user, force_password_change: targetU.force_password_change } : user, 
        token: session.accessToken, 
        refreshToken: session.refreshToken 
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal system authenticator error.' });
    }
  });

  // Secure user change-password controller route
  app.post('/api/auth/change-password', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      res.status(400).json({ error: 'All password change fields are required.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      res.status(400).json({ error: 'New passwords do not match.' });
      return;
    }
    const ip = req.ip || 'unknown';
    try {
      const updated = changeUserPassword(user.id, currentPassword, newPassword, ip);
      res.json({ success: true, message: 'Password changed successfully.', user: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Owner reset user's password route (Administrative management)
  app.post('/api/admin/users/reset-password', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Owner role required.' });
      return;
    }
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      res.status(400).json({ error: 'userId and newPassword are required.' });
      return;
    }
    const ip = req.ip || 'unknown';
    try {
      const updated = adminResetUserPassword(user, userId, newPassword, ip);
      res.json({ success: true, user: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Owner create user directly route (Administrative management)
  app.post('/api/admin/users/create', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Owner role required.' });
      return;
    }
    const { displayName, username, email, role, portal, branch, tenantId, password } = req.body;
    if (!displayName || !username || !email || !role || !portal || !tenantId || !password) {
      res.status(400).json({ error: 'DisplayName, username, email, role, portal, tenantId, and password are required.' });
      return;
    }
    const ip = req.ip || 'unknown';
    try {
      const created = adminCreateUser(user, displayName, username, email, role, portal, branch || '', tenantId, password, ip);
      res.json({ success: true, user: created });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Secure User Auth Registration route
  app.post('/api/auth/register', (req, res) => {
    const { displayName, email, password, tenantId } = req.body;
    const ip = req.ip || 'unknown';
    try {
      const user = registerUser(displayName, email, password, tenantId, ip);
      res.json({ success: true, message: "Registration successful! Account is pending administrator approval.", user });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Verify OTP pin route
  app.post('/api/auth/verify', (req, res) => {
    const { email, code } = req.body;
    const ip = req.ip || 'unknown';
    try {
      const user = verifyUserWithCode(email, code, ip);
      res.json({ success: true, message: "Account verified and activated successfully! You can now log in.", user });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get all users (Administrative only)
  app.get('/api/admin/users', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Owner role required.' });
      return;
    }
    try {
      const users = getAllUsers(user);
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Modify user status (Approve, Reject, Suspend, Reactivate)
  app.post('/api/admin/users/status', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Owner role required.' });
      return;
    }
    const { userId, status } = req.body;
    const ip = req.ip || 'unknown';
    try {
      const updated = adminUpdateUserStatus(user, userId, status, ip);
      res.json({ success: true, user: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Modify user role (Owner only)
  app.post('/api/admin/users/role', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Owner role required.' });
      return;
    }
    const { userId, role } = req.body;
    if (!userId || !role) {
      res.status(400).json({ error: 'userId and role are required.' });
      return;
    }
    const ip = req.ip || 'unknown';
    try {
      const db = getDBInstance();
      const u = db.users.find(x => x.id === userId);
      if (!u) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      const oldRole = u.role;
      u.role = role as any;
      u.updated_at = Date.now();
      
      db.auditLogs.unshift({
        id: generateId(),
        userId: user.id,
        userDisplayName: user.displayName,
        action: 'User Audit: Role Changed',
        tenantId: u.tenantId,
        tenantName: u.branch || u.portal || 'Tenant Division',
        relatedReportId: null,
        details: `Administrator altered user ${u.username} role from ${oldRole} to ${role}.`,
        timestamp: Date.now(),
        ipAddress: ip,
        portal: user.portal
      });
      fs.writeFileSync(path.join(process.cwd(), 'db.json'), JSON.stringify(db, null, 2), 'utf-8');
      res.json({ success: true, user: u });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update global commodity unitPrice
  app.post('/api/admin/commodities/price', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Owner role required.' });
      return;
    }
    const { id, unitPrice } = req.body;
    const ip = req.ip || 'unknown';
    try {
      const comm = updateCommodityPrice(user, id, unitPrice, ip);
      res.json({ success: true, commodity: comm });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Self Verification for persistent cookies/tokens
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized session.' });
      return;
    }
    res.json({ user });
  });

  // Log Out / Revoke session
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers['authorization'] as string;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      revokeSession(token);
    }
    res.json({ success: true, message: 'Terminal connection closed.' });
  });

  // Get active tenants (Owner / Auditor logs look up, customized per roles)
  app.get('/api/tenants', (req, res) => {
    res.json(getTenants());
  });

  // Get global commodities
  app.get('/api/commodities', (req, res) => {
    res.json(getCommodities());
  });

  // Create global commodity (Owner only)
  app.post('/api/commodities/new', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Owner role required' });
      return;
    }

    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Commodity name is required' });
      return;
    }

    try {
      const comm = createCommodity(user, name, description || '');
      res.json(comm);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete global commodity (Owner only with relational cascades)
  app.delete('/api/commodities/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Owner role required' });
      return;
    }

    const { id } = req.params;
    try {
      deleteCommodity(user, id);
      res.json({ success: true, message: `Commodity ${id} deleted successfully.` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get report list with strict multi-tenant branch segregation
  app.get('/api/reports', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication is required.' });
      return;
    }

    const queryId = req.query.tenantId as string;

    // RBAC: Non-admin users can ONLY observe local tenant folders
    if (user.role !== 'owner' && user.role !== 'auditor') {
      if (queryId && queryId !== user.tenantId) {
        res.status(403).json({ error: 'Access Denied: Division data segregation enforced.' });
        return;
      }
      res.json(getTenantReports(user.tenantId));
      return;
    }

    // Admins / Owners can see everything
    if (queryId) {
      res.json(getTenantReports(queryId));
    } else {
      res.json(getAllReports());
    }
  });

  // Get detailed report calculation spreadsheet (with tenant division validation checks)
  app.get('/api/reports/details/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication is required.' });
      return;
    }

    const details = getReportDetails(req.params.id);
    if (!details) {
      res.status(404).json({ error: 'Selected report not found in databases.' });
      return;
    }

    // RBAC checks
    if (user.role !== 'owner' && user.role !== 'auditor' && details.report.tenantId !== user.tenantId) {
      res.status(403).json({ error: 'Access Denied: Division data segregation enforced.' });
      return;
    }

    res.json(details);
  });

  // Create new draft report with carrying stock values
  app.post('/api/reports/create', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { tenantId, reportDate } = req.body;
    if (!tenantId || !reportDate) {
      res.status(400).json({ error: 'tenantId and reportDate parameters are required.' });
      return;
    }

    // Role verification: branch operators and stock managers can only initialize inside their portal
    if (user.role !== 'owner' && user.tenantId !== tenantId) {
      res.status(403).json({ error: 'Access Denied: You cannot create reports for another division.' });
      return;
    }

    try {
      const result = createNewReport(user, tenantId, reportDate);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Recalculations and saving drafts securely on the server
  app.post('/api/reports/draft/save', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { reportId, items } = req.body;
    if (!reportId || !items) {
      res.status(400).json({ error: 'reportId and items array are required.' });
      return;
    }

    try {
      const result = saveReportDraft(user, reportId, items);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Submit report to review cycle queue
  app.post('/api/reports/submit', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { reportId } = req.body;
    if (!reportId) {
      res.status(400).json({ error: 'reportId is required.' });
      return;
    }

    try {
      const result = submitReport(user, reportId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Executive Approval & immutable archive Snapshot writing
  app.post('/api/reports/approve', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Owner role required' });
      return;
    }

    const { reportId } = req.body;
    if (!reportId) {
      res.status(400).json({ error: 'reportId is required.' });
      return;
    }

    try {
      const result = approveAndLockReport(user, reportId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Executive Rejection and return back to Draft terminal
  app.post('/api/reports/reject', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Owner role required' });
      return;
    }

    const { reportId } = req.body;
    if (!reportId) {
      res.status(400).json({ error: 'reportId is required.' });
      return;
    }

    try {
      const result = rejectAndUnlockReport(user, reportId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Audit Logs inspection (Owner only)
  app.get('/api/audit-logs', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      res.status(403).json({ error: 'Access Denied: Central Security Audit access required.' });
      return;
    }
    res.json(getAuditLogs());
  });

  // ERP Notifications endpoints
  app.get('/api/notifications', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    res.json(getERPNotifications(user.tenantId));
  });

  app.post('/api/notifications/read', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: 'Notification ID required' });
      return;
    }
    markAsRead(id);
    res.json({ success: true });
  });

  // Historical archives fetching (Strict branch/tenant verification)
  app.get('/api/historical', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Auth required' });
      return;
    }

    const tenantId = req.query.tenantId as string;
    const dateQuery = req.query.timestamp as string;

    if (!tenantId || !dateQuery) {
      res.status(400).json({ error: 'tenantId and timestamp parameters are required.' });
      return;
    }

    const timestamp = parseInt(dateQuery, 10);
    if (isNaN(timestamp)) {
      res.status(400).json({ error: 'Invalid timestamp.' });
      return;
    }

    // Segregation logic check
    if (user.role !== 'owner' && user.role !== 'auditor' && tenantId !== user.tenantId) {
      res.status(403).json({ error: 'Access Denied: Unauthorized timeline check.' });
      return;
    }

    const archive = getHistoricalStateByDate(tenantId, timestamp);
    res.json({ archive });
  });

  app.get('/api/historical/all', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'auditor')) {
      res.status(403).json({ error: 'Access Denied: Global historical query restricted' });
      return;
    }
    res.json(getAllHistoricalSnapshots());
  });


  // --- FRONTEND INTEGRATION & VITE MIDDLEWARE ---

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ERP Relational Back-End running secure sessions on http://localhost:${PORT}`);
  });
}

startServer();
