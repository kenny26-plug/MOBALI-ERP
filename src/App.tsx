/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  User, 
  Tenant, 
  Commodity, 
  Report, 
  ReportItem, 
  HistoricalArchive, 
  AuditLog, 
  SubmissionStatus 
} from './types';
import LoginScreen from './components/LoginScreen';
import ChangePasswordModal from './components/ChangePasswordModal';
import { 
  ShieldCheck, 
  Store, 
  LogOut, 
  Plus, 
  Save, 
  Send, 
  CheckCircle, 
  XCircle, 
  Lock, 
  Unlock, 
  Calendar, 
  Search, 
  FileSpreadsheet, 
  BookOpen, 
  History, 
  PlusCircle, 
  Database, 
  Activity, 
  Info, 
  Coins, 
  TrendingUp, 
  Loader2,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  LayoutDashboard,
  Box,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Secure fetch wrapper implementing JWT Authorization Headers and auto-logout on 401
  const secureFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('erp_token');
    const headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token || ''}`,
      'Content-Type': 'application/json'
    } as Record<string, string>;
    
    if (options.body === undefined && !options.headers) {
      delete headers['Content-Type'];
    }

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_refresh_token');
      setCurrentUser(null);
    }
    return res;
  };

  // Restore session from token on mount
  useEffect(() => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        else {
          localStorage.removeItem('erp_token');
          localStorage.removeItem('erp_refresh_token');
          throw new Error('Token expired');
        }
      })
      .then(data => {
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(e => console.log('Session restore failed:', e));
    }
  }, []);
  
  // App navigation state for owner
  const [ownerActiveTab, setOwnerActiveTab] = useState<'review' | 'tenants' | 'catalog' | 'audit' | 'sandbox' | 'accounts'>('review');
  // Tenant selection for owner drill-down
  const [ownerSelectedTenantId, setOwnerSelectedTenantId] = useState<string>('');
  
  // User accounts administration
  const [adminUsers, setAdminUsers] = useState<User[]>([]);

  // Branch & Main Stock state
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [gridItems, setGridItems] = useState<ReportItem[]>([]);
  const [isNewCycleOpen, setIsNewCycleOpen] = useState(false);
  const [newCycleDate, setNewCycleDate] = useState('');
  
  // Real-time edits tracking (local un-saved grid state)
  const [editingItems, setEditingItems] = useState<Record<string, {
    initialStock?: number;
    purchasedReceived?: number;
    sales?: number;
    unitPrice?: number;
    purchasePrice?: number;
  }>>({});

  // Historical sandbox state
  const [sandboxTenantId, setSandboxTenantId] = useState('');
  const [sandboxDate, setSandboxDate] = useState('');
  const [sandboxResult, setSandboxResult] = useState<HistoricalArchive | null>(null);
  const [sandboxSearched, setSandboxSearched] = useState(false);
  const [sandboxError, setSandboxError] = useState('');

  // Global notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Date-to-date history review filters
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [opHistoryDateFrom, setOpHistoryDateFrom] = useState('');
  const [opHistoryDateTo, setOpHistoryDateTo] = useState('');
  
  // Audit logs (owner panel)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState('');
  
  // New commodity form (owner scope)
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');

  // User Accounts Admin states
  const [actName, setActName] = useState('');
  const [actUsername, setActUsername] = useState('');
  const [actEmail, setActEmail] = useState('');
  const [actRole, setActRole] = useState<'owner' | 'main_stock' | 'branch'>('branch');
  const [actPortal, setActPortal] = useState('branch_1');
  const [actBranch, setActBranch] = useState('Branch 1');
  const [actTenantId, setActTenantId] = useState('branch_1');
  const [actPassword, setActPassword] = useState('');
  const [resetPassInputs, setResetPassInputs] = useState<Record<string, string>>({});

  // Clock tick
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTimeStr(d.toLocaleString('en-US', {
        timeZone: 'UTC',
        hour12: false,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial globally available metadata (tenants, commodities)
  useEffect(() => {
    secureFetch('/api/tenants')
      .then(r => r.json())
      .then(data => {
        setTenants(data);
        if (data.length > 0) {
          setOwnerSelectedTenantId(data[0].id);
          setSandboxTenantId(data[0].id);
        }
      });

    secureFetch('/api/commodities')
      .then(r => r.json())
      .then(data => setCommodities(data));
  }, []);

  // Whenever a user logs in, fetch relevant dashboard and report data
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'owner') {
      fetchAuditLogs();
      fetchOwnerDashboardReports();
      fetchAdminUsers();
    } else {
      fetchTenantReportsList(currentUser.tenantId);
    }
  }, [currentUser]);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await secureFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (err) {
      console.error("Error loading administration user catalog:", err);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: 'pending' | 'approved' | 'rejected' | 'suspended') => {
    try {
      setIsSubmitting(true);
      const res = await secureFetch('/api/admin/users/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');

      showToast(`User account status successfully updated to ${status.toUpperCase()}.`);
      await fetchAdminUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminResetPassword = async (userId: string, newPass: string) => {
    try {
      setIsSubmitting(true);
      const res = await secureFetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: newPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      showToast("Password reset successfully! Force password change flagged.");
      await fetchAdminUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminCreateUser = async (userFormPayload: any) => {
    try {
      setIsSubmitting(true);
      const res = await secureFetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      showToast(`User account ${userFormPayload.username} created successfully! Force-change flag set.`);
      await fetchAdminUsers();
      await fetchAuditLogs();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminUpdateUserRole = async (userId: string, role: string) => {
    try {
      setIsSubmitting(true);
      const res = await secureFetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role');

      showToast(`User role updated to ${role.toUpperCase()} successfully.`);
      await fetchAdminUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGlobalPrice = async (commodityId: string, price: number) => {
    try {
      setIsSubmitting(true);
      const res = await secureFetch('/api/admin/commodities/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commodityId, unitPrice: price })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update global price');
      
      showToast('Global unit price securely written back!');
      const commRes = await secureFetch('/api/commodities');
      if (commRes.ok) {
        const commData = await commRes.json();
        setCommodities(commData);
        // If there's a selected report, force update its prices
        if (selectedReport) {
          // Trigger a silent reload of report grid
          secureFetch(`/api/reports/details/${selectedReport.id}`)
            .then(r => r.json())
            .then(gItems => setGridItems(gItems));
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await secureFetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // List of reports seen by the owner (all system reports)
  const [allSystemReports, setAllSystemReports] = useState<Report[]>([]);
  const fetchOwnerDashboardReports = async () => {
    try {
      const res = await secureFetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setAllSystemReports(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // List of reports seen by a branch operator
  const fetchTenantReportsList = async (tenantId: string) => {
    try {
      const res = await secureFetch(`/api/reports?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setMyReports(data);
        
        // Auto select newest report if none selected
        if (data.length > 0 && !selectedReport) {
          handleSelectReport(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch items for selected report
  const handleSelectReport = async (report: Report) => {
    try {
      setSelectedReport(report);
      setEditingItems({}); // Reset local edit changes
      const res = await secureFetch(`/api/reports/details/${report.id}`);
      if (res.ok) {
        const data = await res.json();
        setGridItems(data.items);
      }
    } catch (e) {
      showToast("Failed to fetch report items details", "error");
    }
  };

  // Create a new report cycle (carryover trigger)
  const handleCreateNewCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleDate.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const res = await secureFetch('/api/reports/create', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: currentUser.tenantId,
          reportDate: newCycleDate
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize cycle');
      }

      showToast(`Initiated cycle ${newCycleDate} with carry-over stocks!`);
      setIsNewCycleOpen(false);
      setNewCycleDate('');
      
      // Refresh list
      await fetchTenantReportsList(currentUser.tenantId);
      // Select the newly created draft
      if (data.report) {
        handleSelectReport(data.report);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Track edits in the Excel grid
  const handleCellChange = (
    itemId: string, 
    field: 'initialStock' | 'purchasedReceived' | 'sales' | 'unitPrice' | 'purchasePrice', 
    val: string
  ) => {
    const numericVal = val === '' ? 0 : parseFloat(val);
    const safeVal = isNaN(numericVal) ? 0 : numericVal;

    setEditingItems(prev => {
      const existing = prev[itemId] || {};
      return {
        ...prev,
        [itemId]: {
          ...existing,
          [field]: safeVal
        }
      };
    });
  };

  // Local dynamically computed grid representation
  const getComputedItems = (): ReportItem[] => {
    // Determine if this is an initial setup index (no prior reports approved)
    const hasApproved = currentUser?.role === 'owner'
      ? allSystemReports.some(r => r.tenantId === selectedReport?.tenantId && r.submissionStatus === 'approved')
      : myReports.some(r => r.submissionStatus === 'approved');
    const isInitialSetup = !hasApproved;

    return gridItems.map(item => {
      const edits = editingItems[item.id] || {};
      
      const purchasedReceived = edits.purchasedReceived !== undefined 
        ? edits.purchasedReceived 
        : item.purchasedReceived;

      // initially, user should be allowed to fill in "initial stock" data but the next cycle "initial stock" should be previous "remain stock" data
      const initialStock = isInitialSetup 
        ? (edits.initialStock !== undefined ? edits.initialStock : item.initialStock)
        : item.initialStock;

      const sales = edits.sales !== undefined 
        ? edits.sales 
        : item.sales;

      const unitPrice = edits.unitPrice !== undefined 
        ? edits.unitPrice 
        : item.unitPrice;

      const purchasePrice = edits.purchasePrice !== undefined
        ? edits.purchasePrice
        : (item.purchasePrice !== undefined ? item.purchasePrice : 0);

      // Real-time grid formula variables matching guidelines:
      // [Total Stock] = [Initial Stock] + [Purchased/Received]
      const totalStock = initialStock + purchasedReceived;
      
      // sales are capped at total stock available
      const sanitizedSales = sales > totalStock ? totalStock : sales;
      
      // [Remain Stock] = [Total Stock] - [Sales]
      const remainStock = totalStock - sanitizedSales;
      
      // [Total Valuation] = [Sales] * [Unit Price] (Part 4 specification)
      const totalValuation = sanitizedSales * unitPrice;

      // [Profit] = [Total Valuation] - [Purchase Price]
      const profit = totalValuation - purchasePrice;

      return {
        ...item,
        initialStock,
        purchasedReceived,
        totalStock,
        sales: sanitizedSales,
        remainStock,
        unitPrice,
        totalValuation,
        purchasePrice,
        profit
      };
    });
  };

  // Grand totals of the computed view elements
  const getGridTotals = (items: ReportItem[]) => {
    return items.reduce((acc, curr) => {
      acc.initialStock += curr.initialStock || 0;
      acc.purchasedReceived += curr.purchasedReceived || 0;
      acc.totalStock += curr.totalStock || 0;
      acc.sales += curr.sales || 0;
      acc.remainStock += curr.remainStock || 0;
      acc.totalValuation += curr.totalValuation || 0;
      acc.purchasePrice += curr.purchasePrice || 0;
      acc.profit += curr.profit !== undefined ? curr.profit : ((curr.sales * curr.unitPrice) - (curr.purchasePrice || 0));
      return acc;
    }, {
      initialStock: 0,
      purchasedReceived: 0,
      totalStock: 0,
      sales: 0,
      remainStock: 0,
      totalValuation: 0,
      purchasePrice: 0,
      profit: 0
    });
  };

  // Save the draft progress to backend
  const handleSaveDraft = async () => {
    if (!selectedReport || !currentUser) return;
    setIsSubmitting(true);

    const computedList = getComputedItems();
    // Prepare minimal save payload
    const payloadItems = computedList.map(item => ({
      id: item.id,
      initialStock: item.initialStock,
      purchasedReceived: item.purchasedReceived,
      sales: item.sales,
      unitPrice: item.unitPrice,
      purchasePrice: item.purchasePrice || 0
    }));

    try {
      const res = await secureFetch('/api/reports/draft/save', {
        method: 'POST',
        body: JSON.stringify({
          reportId: selectedReport.id,
          items: payloadItems
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save draft');
      }

      showToast("Spreadsheet formulas verified and draft saved successfully!");
      setEditingItems({}); // clear local changes since server updated
      setGridItems(data.items);
      if (data.report) {
        setSelectedReport(data.report);
      }
      
      // Refresh list
      if (currentUser.role === 'owner') {
        fetchOwnerDashboardReports();
      } else {
        fetchTenantReportsList(currentUser.tenantId);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit report to pending_approval state for Owner evaluation
  const handleSubmitReport = async () => {
    if (!selectedReport || !currentUser) return;
    
    // Auto-save any local draft changes first
    setIsSubmitting(true);
    try {
      const computedList = getComputedItems();
      const payloadItems = computedList.map(item => ({
        id: item.id,
        initialStock: item.initialStock,
        purchasedReceived: item.purchasedReceived,
        sales: item.sales,
        unitPrice: item.unitPrice,
        purchasePrice: item.purchasePrice || 0
      }));

      // 1. Save draft
      const saveRes = await secureFetch('/api/reports/draft/save', {
        method: 'POST',
        body: JSON.stringify({
          reportId: selectedReport.id,
          items: payloadItems
        })
      });

      if (!saveRes.ok) throw new Error("Could not auto-save draft before submission.");

      // 2. Submit
      const submitRes = await secureFetch('/api/reports/submit', {
        method: 'POST',
        body: JSON.stringify({
          reportId: selectedReport.id
        })
      });

      const data = await submitRes.json();
      if (!submitRes.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      showToast("Report submitted successfully! Future changes to this cycle are now locked for review.", "success");
      setEditingItems({});
      setSelectedReport(data);
      
      // Refresh report list
      fetchTenantReportsList(currentUser.tenantId);
      // reload item details
      handleSelectReport(data);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- OWNER BOARD MANAGEMENT FUNCTIONS ---

  const handleOwnerApprove = async (reportId: string) => {
    if (!currentUser || currentUser.role !== 'owner') return;
    setIsSubmitting(true);

    try {
      const res = await secureFetch('/api/reports/approve', {
        method: 'POST',
        body: JSON.stringify({ reportId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Approval failed');
      }

      showToast("Stock spreadsheet Approved and Immutably Archived in secure public.historical_archives!");
      fetchOwnerDashboardReports();
      fetchAuditLogs();
      
      // If we are currently reviewing this report in a drilldown modal, reload details
      if (selectedReport && selectedReport.id === reportId) {
        handleSelectReport(data);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOwnerReject = async (reportId: string) => {
    if (!currentUser || currentUser.role !== 'owner') return;
    setIsSubmitting(true);

    try {
      const res = await secureFetch('/api/reports/reject', {
        method: 'POST',
        body: JSON.stringify({ reportId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Rejection failed');
      }

      showToast("Report rejected/unlocked and returned to originating division draft with editable permission.");
      fetchOwnerDashboardReports();
      fetchAuditLogs();
      
      if (selectedReport && selectedReport.id === reportId) {
        handleSelectReport(data);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create global commodity
  const handleCreateCommodity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim() || !currentUser) return;

    try {
      const res = await secureFetch('/api/commodities/new', {
        method: 'POST',
        body: JSON.stringify({
          name: newCommName,
          description: newCommDesc
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create commodity');
      }

      showToast(`Global record "${newCommName}" added successfully. New reports will carry this field.`);
      setNewCommName('');
      setNewCommDesc('');
      
      // Refresh global list
      const commRes = await secureFetch('/api/commodities');
      const commData = await commRes.json();
      setCommodities(commData);
      
      fetchAuditLogs();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Delete global commodity
  const handleDeleteCommodity = async (id: string) => {
    if (!currentUser || currentUser.role !== 'owner') return;
    if (!window.confirm("Are you sure you want to remove this commodity globally? Active grids and drafts will refresh instantly to reflect the removal.")) {
      return;
    }

    try {
      const res = await secureFetch(`/api/commodities/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove commodity');
      }

      showToast(`Commodity removed successfully. Active working records updated.`, 'success');
      
      // Refresh list
      const commRes = await secureFetch('/api/commodities');
      const commData = await commRes.json();
      setCommodities(commData);
      
      fetchOwnerDashboardReports();
      fetchAuditLogs();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Sandbox search query handler
  const handleSandboxSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxTenantId || !sandboxDate) {
      setSandboxError('Please select both a division and a proper date snapshot context.');
      return;
    }

    setSandboxError('');
    setSandboxSearched(true);
    
    const parsedDate = new Date(sandboxDate);
    if (isNaN(parsedDate.getTime())) {
      setSandboxError('Invalid date input format.');
      return;
    }

    const timestamp = parsedDate.getTime();

    try {
      const res = await secureFetch(`/api/historical?tenantId=${sandboxTenantId}&timestamp=${timestamp}`);
      if (res.ok) {
        const data = await res.json();
        setSandboxResult(data.archive);
      } else {
        throw new Error("Unable to fetch archive timeline");
      }
    } catch (err: any) {
      setSandboxError(err.message || 'Error occurred during snapshot recovery.');
    }
  };


  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => {
      setCurrentUser(u);
    }} />;
  }

  const handleExportCSV = (items: ReportItem[], reportTitle: string) => {
    const headers = [
      'Commodity',
      'Initial Stock',
      'Purchased Received',
      'Total Stock',
      'Sales',
      'Remain Stock',
      'Unit Price ($)',
      'Total Valuation ($)'
    ];
    const rows = items.map(item => [
      `"${item.commodityName.replace(/"/g, '""')}"`,
      item.initialStock,
      item.purchasedReceived,
      item.initialStock + item.purchasedReceived,
      item.sales,
      (item.initialStock + item.purchasedReceived) - item.sales,
      item.unitPrice,
      ((item.initialStock + item.purchasedReceived) - item.sales) * item.unitPrice
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportTitle || 'report'}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Successfully exported spreadsheet to CSV!");
  };

  const handleExportPDF = (items: ReportItem[], reportDate: string, tenantId: string, status: string, approvedBy?: string) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const tenantName = tenants.find(t => t.id === tenantId)?.name || tenantId;

    // Outer framing box (border around page) - 1.5mm thickness, grey color
    doc.setDrawColor(229, 231, 235);
    doc.rect(8, 8, 281, 194);

    // Title / Header
    doc.setTextColor(30, 58, 138); // Navy
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('MOBALI SUPPLIES', 15, 20);

    // Subtitle
    doc.setTextColor(75, 85, 99); // Medium Gray
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('ENTERPRISE RESOURCE PLANNING • DIVISION INVENTORY LEDGER', 15, 25);

    // Status Ribbon
    let ribbonColor = [99, 102, 241]; // Indigo for draft/rejected
    if (status === 'approved') ribbonColor = [16, 185, 129]; // Emerald
    else if (status === 'pending_approval') ribbonColor = [245, 158, 11]; // Amber

    doc.setFillColor(ribbonColor[0], ribbonColor[1], ribbonColor[2]);
    doc.rect(225, 13, 57, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`STATUS: ${status.toUpperCase()}`, 253, 18, { align: 'center' });

    // Double rule line
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.8);
    doc.line(15, 28, 282, 28);
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.2);
    doc.line(15, 29.5, 282, 29.5);

    // Metadata Details (Two column layout)
    doc.setTextColor(17, 24, 39);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('REPORT METADATA', 15, 36);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    doc.text(`Reporting Terminal:   ${tenantName}`, 15, 41);
    doc.text(`Ledger Cycle Date:    ${reportDate}`, 15, 45);
    doc.text(`System Operator:      ${currentUser?.displayName || 'N/A'} (@${currentUser?.username || 'unknown'})`, 15, 49);

    doc.text(`Document Type:        Official Inventory Ledger`, 140, 41);
    doc.text(`Exported Date/Time:   ${new Date().toLocaleString()}`, 140, 45);
    if (status === 'approved' && approvedBy) {
      doc.text(`Audited & Approved By:  ${approvedBy}`, 140, 49);
    } else {
      doc.text(`Audited & Approved By:  [Pending HQ Review]`, 140, 49);
    }

    // Grid Column Definitions & Coordinates
    const columns = [
      { header: 'Commodity Asset', width: 45, align: 'left' },
      { header: 'Initial Stock', width: 24, align: 'right' },
      { header: 'Purchased/Recv', width: 26, align: 'right' },
      { header: 'Total Stock', width: 24, align: 'right' },
      { header: 'Sales Volume', width: 24, align: 'right' },
      { header: 'Rem. Stock', width: 24, align: 'right' },
      { header: 'Unit Price ($)', width: 24, align: 'right' },
      { header: 'Total Val ($)', width: 26, align: 'right' },
      { header: 'Purch. Price ($)', width: 26, align: 'right' },
      { header: 'Profit ($)', width: 28, align: 'right' }
    ];

    let startX = 15;
    let startY = 58;
    const rowHeight = 7;

    // Draw Column Headers
    doc.setFillColor(30, 58, 138); // Navy header
    doc.rect(startX, startY, 271, rowHeight + 1, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);

    let currentX = startX;
    columns.forEach(col => {
      let textX = currentX;
      if (col.align === 'right') {
        textX = currentX + col.width - 2;
      } else {
        textX = currentX + 2;
      }
      doc.text(col.header, textX, startY + 5.5, { align: col.align as any });
      currentX += col.width;
    });

    startY += rowHeight + 1; // move past header

    // Draw Table Rows
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(17, 24, 39);

    let totalInitial = 0;
    let totalPurchased = 0;
    let totalTotalStock = 0;
    let totalSales = 0;
    let totalRemain = 0;
    let grandValuation = 0;
    let grandPurchasePrice = 0;
    let grandProfit = 0;

    items.forEach((item, idx) => {
      // Manage page break if items list exceeds bounds
      if (startY > 175) {
        // Draw bottom label on current page first of two pages
        doc.setFontSize(7.5);
        doc.setTextColor(156, 163, 175);
        doc.text('Continued on the next page...', 15, 190);
        
        doc.addPage();
        // Redraw outer framing box for page 2
        doc.setDrawColor(229, 231, 235);
        doc.rect(8, 8, 281, 194);
        
        // Redraw table headers on second page
        startY = 18;
        doc.setFillColor(30, 58, 138);
        doc.rect(startX, startY, 271, rowHeight + 1, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);

        let p2X = startX;
        columns.forEach(col => {
          let textX = p2X;
          if (col.align === 'right') textX = p2X + col.width - 2;
          else textX = p2X + 2;
          doc.text(col.header, textX, startY + 5.5, { align: col.align as any });
          p2X += col.width;
        });

        startY += rowHeight + 1;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(17, 24, 39);
      }

      // Calculations (Part 4 dynamic calculations audit)
      const initialStock = item.initialStock;
      const totalStock = initialStock + item.purchasedReceived;
      const remainStock = totalStock - item.sales;
      const totalValuation = item.sales * item.unitPrice;
      const purchasePrice = item.purchasePrice || 0;
      const profit = totalValuation - purchasePrice;

      totalInitial += initialStock;
      totalPurchased += item.purchasedReceived;
      totalTotalStock += totalStock;
      totalSales += item.sales;
      totalRemain += remainStock;
      grandValuation += totalValuation;
      grandPurchasePrice += purchasePrice;
      grandProfit += profit;

      // Draw Zebra Background Striping
      if (idx % 2 === 1) {
        doc.setFillColor(249, 250, 251); // off-white row light grey
        doc.rect(startX, startY, 271, rowHeight, 'F');
      }

      // Subtle light horizontal border line
      doc.setDrawColor(243, 244, 246);
      doc.setLineWidth(0.15);
      doc.line(startX, startY + rowHeight, startX + 271, startY + rowHeight);

      // Render cells
      let rowX = startX;

      const cells = [
        { text: item.commodityName || 'Unknown', align: 'left', width: 45 },
        { text: initialStock.toLocaleString(), align: 'right', width: 24 },
        { text: item.purchasedReceived.toLocaleString(), align: 'right', width: 26 },
        { text: totalStock.toLocaleString(), align: 'right', width: 24 },
        { text: item.sales.toLocaleString(), align: 'right', width: 24 },
        { text: remainStock.toLocaleString(), align: 'right', width: 24 },
        { text: `$${item.unitPrice.toFixed(2)}`, align: 'right', width: 24 },
        { text: `$${totalValuation.toFixed(2)}`, align: 'right', width: 26 },
        { text: `$${purchasePrice.toFixed(2)}`, align: 'right', width: 26 },
        { text: `$${profit.toFixed(2)}`, align: 'right', width: 28 }
      ];

      cells.forEach(cell => {
        let textX = rowX;
        if (cell.align === 'right') {
          textX = rowX + cell.width - 2;
        } else {
          textX = rowX + 2;
        }
        doc.text(cell.text, textX, startY + 4.8, { align: cell.align as any });
        rowX += cell.width;
      });

      startY += rowHeight;
    });

    // Draw Totals Summary Row
    doc.setFillColor(243, 244, 246); // Medium grey backfill for footers
    doc.rect(startX, startY, 271, rowHeight + 1, 'F');
    // Top border of total row
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.4);
    doc.line(startX, startY, startX + 271, startY);
    // Bottom double line border
    doc.line(startX, startY + rowHeight + 1, startX + 271, startY + rowHeight + 1);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);

    let totalsX = startX;
    const totalsCells = [
      { text: 'GRAND LEDGER TOTALS', align: 'left', width: 45 },
      { text: totalInitial.toLocaleString(), align: 'right', width: 24 },
      { text: totalPurchased.toLocaleString(), align: 'right', width: 26 },
      { text: totalTotalStock.toLocaleString(), align: 'right', width: 24 },
      { text: totalSales.toLocaleString(), align: 'right', width: 24 },
      { text: totalRemain.toLocaleString(), align: 'right', width: 24 },
      { text: '', align: 'right', width: 24 }, // No sum for unit price
      { text: `$${grandValuation.toFixed(2)}`, align: 'right', width: 26 },
      { text: `$${grandPurchasePrice.toFixed(2)}`, align: 'right', width: 26 },
      { text: `$${grandProfit.toFixed(2)}`, align: 'right', width: 28 }
    ];

    totalsCells.forEach(cell => {
      let textX = totalsX;
      if (cell.align === 'right') {
        textX = totalsX + cell.width - 2;
      } else {
        textX = totalsX + 2;
      }
      doc.text(cell.text, textX, startY + 5.2, { align: cell.align as any });
      totalsX += cell.width;
    });

    // Signed certification notice footer spacing
    let footerY = 175;
    doc.setLineWidth(0.2);
    doc.setDrawColor(209, 213, 219);
    doc.line(15, footerY, 282, footerY);

    doc.setTextColor(107, 114, 128);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('DECLARATION: This inventory and valuation statement represents a true and accurate physical balance record synchronized with central databases.', 15, footerY + 4);
    doc.text('This ledger document is secure, tamper-proof, and can be instantly audited on-demand by authorized personnel at ERP.mobalisupplies.rw.', 15, footerY + 8);

    doc.setFont('Helvetica', 'italic');
    doc.text('Thank you for choosing ERP Mobali Supplies System.', 15, footerY + 13);

    // Save PDF trigger
    doc.save(`MobaliSupplies_ERP_${tenantId}_Cycle_${reportDate}.pdf`);
    showToast("Successfully generated and saved professional PDF report workbook!", "success");
  };

  // Derived filtered views Helper variables
  const computedItems = getComputedItems();
  const branchTotals = getGridTotals(computedItems);
  
  // Pending reports seen by owner
  const pendingReports = allSystemReports.filter(r => r.submissionStatus === 'pending_approval');
  
  // Grouped systems totals for metrics dashboard
  const totalValuationAllPortals = allSystemReports
    .filter(r => r.submissionStatus === 'approved')
    // We can fetch approved system valuations or count
    .length;

  return (
    <div id="app-root-container" className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 selection:bg-gray-900 selection:text-white">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      {notification && (
        <div 
          id="toast-notification"
          className={`fixed right-6 top-6 z-50 flex items-center space-x-3 rounded-lg px-4 py-3 shadow-lg border text-sm transition-all animate-bounce ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* SECURE HUB TOP NAVIGATION */}
      <header id="secure-hub-header" className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          
          <div className="flex items-center space-x-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-md font-semibold tracking-tight text-gray-950">
                BalanceSheet Pro
              </h1>
              <p className="text-[10px] text-gray-500 font-medium">
                Multi-Tenant Enterprise Ledger
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Real-time Ticking UTC status */}
            <div className="hidden md:flex items-center space-x-1.5 rounded-full bg-gray-100 px-3 py-1 font-mono text-[10px] text-gray-600">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span>{currentTimeStr}</span>
            </div>

            {/* User Session Info Dropdown Menu */}
            <div className="relative">
              <button
                id="user-profile-menu-button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition-all text-left cursor-pointer border border-transparent hover:border-gray-200"
                title="Account Settings & Profile"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-800">
                    {currentUser.displayName}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono tracking-tight uppercase">
                    {currentUser.role === 'owner' ? 'HQ Owner' : currentUser.role === 'main_stock' ? 'Central Stock' : `${currentUser.branch || 'Branch'}`}
                  </span>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${
                  currentUser.role === 'owner' ? 'bg-zinc-800' : currentUser.role === 'main_stock' ? 'bg-blue-600' : 'bg-amber-600'
                }`} />
              </button>

              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setUserMenuOpen(false)} 
                  />
                  <div 
                    id="user-profile-dropdown"
                    className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-white p-4 shadow-xl border border-gray-100 ring-1 ring-black/5 focus:outline-none z-50 animate-fade-in space-y-4"
                  >
                    {/* Profile Section header */}
                    <div className="space-y-1 pb-3 border-b border-gray-100">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 font-mono">My Profile</p>
                      <h4 className="text-sm font-bold text-gray-900">{currentUser.displayName}</h4>
                      <p className="text-xs font-mono text-gray-500">{currentUser.email}</p>
                    </div>

                    {/* Account Settings / Permissions details */}
                    <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-500">Security User</span>
                        <span className="font-mono text-gray-800 font-bold">{currentUser.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-500">Auth Persona</span>
                        <span className="font-mono text-gray-800 font-bold uppercase text-[10px]">{currentUser.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-500">Unit Bind</span>
                        <span className="font-mono text-gray-800 font-bold uppercase text-[10px]">{currentUser.branch || 'None (HQ)'}</span>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="space-y-1 pt-1">
                      <button
                        id="user-change-password-btn"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setShowChangePasswordModal(true);
                        }}
                        className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs font-bold rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 transition-colors cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        <span>🔒 Change Password</span>
                      </button>

                      <button
                        id="user-logout-btn"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setCurrentUser(null);
                          setSelectedReport(null);
                          setGridItems([]);
                          showToast("Signed out of secure portal terminal.", "info");
                        }}
                        className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs font-bold rounded-xl text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                        <span>Logout Suite</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              id="global-logout-button"
              onClick={() => {
                setCurrentUser(null);
                setSelectedReport(null);
                setGridItems([]);
                showToast("Signed out of secure portal terminal.", "info");
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
              title="Logout Securely"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>


      {/* --- OWNER CORE WORKSPACE --- */}
      {currentUser.role === 'owner' && (
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          
          {/* OWNER INTRO / BADGE SECTION */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-6">
            <div>
              <span className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">Executive Intelligence Command</span>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 mt-1">Owner Administration Board</h2>
              <p className="text-sm text-gray-500 mt-1">
                Approve submissions, audit past transactions, customize global stock catalogs, and inspect real-time logs.
              </p>
            </div>
            
            {/* Owner Tab Selection Utilities */}
            <div className="mt-4 md:mt-0 flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                id="tab-review-btn"
                onClick={() => { setOwnerActiveTab('review'); fetchOwnerDashboardReports(); }}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  ownerActiveTab === 'review' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Review Feed ({pendingReports.length})</span>
              </button>

              <button
                id="tab-tenants-btn"
                onClick={() => { setOwnerActiveTab('tenants'); fetchOwnerDashboardReports(); }}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  ownerActiveTab === 'tenants' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                <span>Branch Portals Browser</span>
              </button>

              <button
                id="tab-catalog-btn"
                onClick={() => setOwnerActiveTab('catalog')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  ownerActiveTab === 'catalog' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <Box className="h-3.5 w-3.5" />
                <span>Global Commodities</span>
              </button>

              <button
                id="tab-audit-btn"
                onClick={() => { setOwnerActiveTab('audit'); fetchAuditLogs(); }}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  ownerActiveTab === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Audit Ledger</span>
              </button>

              <button
                id="tab-sandbox-btn"
                onClick={() => setOwnerActiveTab('sandbox')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  ownerActiveTab === 'sandbox' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Forensic Sandbox</span>
              </button>

              <button
                id="tab-accounts-btn"
                onClick={() => { setOwnerActiveTab('accounts'); fetchAdminUsers(); }}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  ownerActiveTab === 'accounts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Security & Accounts</span>
              </button>
            </div>
          </div>


          {/* TAB 1: REVIEW WORKSPACE */}
          {ownerActiveTab === 'review' && (
            <div id="owner-review-workspace" className="space-y-6">
              
              {/* STATISTICS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">Awaiting Review</span>
                    <span className="text-xl font-extrabold text-gray-900">{pendingReports.length} reports</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">Approved Cycles</span>
                    <span className="text-xl font-extrabold text-gray-900">
                      {allSystemReports.filter(r => r.submissionStatus === 'approved').length} completed
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">Total Commodities</span>
                    <span className="text-xl font-extrabold text-gray-900">{commodities.length} active</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">Logged Transactions</span>
                    <span className="text-xl font-extrabold text-gray-900">{auditLogs.length} events</span>
                  </div>
                </div>
              </div>

              {/* TWO PANEL WORKSPACE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* SUBMISSIONS LISTING */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Pending Feed</span>
                  </h3>
                  
                  {pendingReports.length === 0 ? (
                    <div className="text-center py-12 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                      <CheckCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-medium">All clear! No pending submissions found.</p>
                      <p className="text-[10px] text-gray-400 px-3 mt-1">Branch operators will notify you when their inventory cycle completes.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[550px] overflow-y-auto">
                      {pendingReports.map(report => {
                        const tenantName = tenants.find(t => t.id === report.tenantId)?.name || report.tenantId;
                        const isMainStock = report.tenantId === 'main_stock';

                        return (
                          <button
                            key={report.id}
                            id={`pending-card-${report.id}`}
                            onClick={() => handleSelectReport(report)}
                            className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex flex-col space-y-2 relative group hover:bg-gray-50 ${
                              selectedReport?.id === report.id 
                                ? 'border-indigo-600 bg-indigo-50/20 shadow-sm' 
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                isMainStock ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {tenantName}
                              </span>
                              <span className="text-[10px] font-bold text-gray-900 border border-gray-300 rounded px-1.5 bg-white">
                                {report.reportDate}
                              </span>
                            </div>
                            
                            <div className="text-[11px] text-gray-500 flex flex-col">
                              <span>Submitted: <strong className="text-gray-700 font-mono text-[10px]">{new Date(report.submittedAt || 0).toLocaleString()}</strong></span>
                              <span>Cycle ID: <span className="font-mono text-[10px]">{report.id.substring(0,8)}...</span></span>
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[10px] font-medium text-indigo-600 inline-flex items-center space-x-1">
                                <span>Inspect Ledger</span>
                                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SPREADSHEET VIEWER PANEL */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm min-h-[450px] flex flex-col justify-between">
                  {selectedReport ? (
                    <div className="space-y-4">
                      
                      {/* SPREADSHEET HEADER INFO */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Selected Active Ledger</p>
                          <h4 className="text-md font-bold text-gray-900 mt-0.5">
                            {tenants.find(t => t.id === selectedReport.tenantId)?.name || selectedReport.tenantId} — Cycle {selectedReport.reportDate}
                          </h4>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            Document ID: <span className="font-mono">{selectedReport.id}</span>
                          </span>
                        </div>

                        {/* STATUS EMBLEM */}
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                            Awaiting HQ Approval
                          </span>
                        </div>
                      </div>

                      {/* LOCK METADATA MESSAGE */}
                      <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 flex items-center space-x-2 border border-amber-100">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <div>
                          <strong>Ledger is Read-Only:</strong> Check computed totals, stock balances and global valuations. When satisfied, click <strong>Approve &amp; Lock</strong> to archive immutably.
                        </div>
                      </div>

                      {/* THE GRID SPREADSHEET (exactly matching requested column order) */}
                      <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[400px]">
                        <table id="review-grid-table" className="w-full text-left border-collapse text-xs">
                          <thead className="bg-gray-100/80 sticky top-0 text-gray-700 font-semibold border-b border-gray-200">
                            <tr>
                              <th className="p-3 border-r border-gray-200">Commodity</th>
                              <th className="p-3 text-right border-r border-gray-200">Initial Stock</th>
                              <th className="p-3 text-right border-r border-gray-200">Purchased/Received</th>
                              <th className="p-3 text-right border-r border-gray-200 bg-gray-100 font-bold text-gray-900">Total Stock</th>
                              <th className="p-3 text-right border-r border-gray-200">Sales</th>
                              <th className="p-3 text-right border-r border-gray-200 bg-gray-100 font-bold text-gray-900">Remain Stock</th>
                              <th className="p-3 text-right border-r border-gray-200">Unit Price ($)</th>
                              <th className="p-3 text-right border-r bg-indigo-50/50 font-extrabold text-indigo-900">Total Valuation ($)</th>
                              <th className="p-3 text-right border-r border-gray-200">Purch. Price ($)</th>
                              <th className="p-3 text-right bg-emerald-55 font-extrabold text-emerald-950">Profit ($)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150">
                            {computedItems.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50/50">
                                <td className="p-3 font-medium text-gray-900 border-r border-gray-200">
                                  {item.commodityName}
                                </td>
                                <td className="p-3 text-right font-mono border-r border-gray-200 bg-gray-50/30">
                                  {item.initialStock.toLocaleString()}
                                </td>
                                <td className="p-3 text-right font-mono border-r border-gray-200">
                                  {item.purchasedReceived.toLocaleString()}
                                </td>
                                <td className="p-3 text-right font-mono bg-gray-50 font-semibold border-r border-gray-200">
                                  {item.totalStock.toLocaleString()}
                                </td>
                                <td className="p-3 text-right font-mono border-r border-gray-200">
                                  {item.sales.toLocaleString()}
                                </td>
                                <td className="p-3 text-right font-mono bg-gray-50 font-semibold border-r border-gray-200">
                                  {item.remainStock.toLocaleString()}
                                </td>
                                <td className="p-2 text-right font-mono border-r border-gray-200 bg-indigo-50/5">
                                  {selectedReport.submissionStatus !== 'approved' ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice}
                                      onChange={(e) => handleCellChange(item.id, 'unitPrice', e.target.value)}
                                      className="block w-full text-right p-1.5 rounded text-xs font-mono border border-gray-200 bg-white font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                                    />
                                  ) : (
                                    `$${item.unitPrice.toFixed(2)}`
                                  )}
                                </td>
                                <td className="p-3 text-right font-mono font-bold bg-indigo-50/30 text-indigo-950 border-r border-gray-200">
                                  ${item.totalValuation.toFixed(2)}
                                </td>
                                <td className="p-3 text-right font-mono border-r border-gray-200 bg-emerald-50/10">
                                  ${(item.purchasePrice || 0).toFixed(2)}
                                </td>
                                <td className={`p-3 text-right font-mono font-bold ${item.profit >= 0 ? 'bg-emerald-50/20 text-emerald-800' : 'bg-red-50/20 text-red-800'}`}>
                                  ${item.profit.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                            {/* TOTALS OVERVIEW */}
                            {(() => {
                              const totals = getGridTotals(computedItems);
                              return (
                                <tr className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300">
                                  <td className="p-3 border-r border-gray-200 uppercase tracking-wider text-[10px]">Grand System Totals</td>
                                  <td className="p-3 text-right font-mono border-r border-gray-200">{totals.initialStock.toLocaleString()}</td>
                                  <td className="p-3 text-right font-mono border-r border-gray-200">{totals.purchasedReceived.toLocaleString()}</td>
                                  <td className="p-3 text-right font-mono border-r border-gray-200 bg-gray-200/50">{totals.totalStock.toLocaleString()}</td>
                                  <td className="p-3 text-right font-mono border-r border-gray-200">{totals.sales.toLocaleString()}</td>
                                  <td className="p-3 text-right font-mono border-r border-gray-200 bg-gray-200/50">{totals.remainStock.toLocaleString()}</td>
                                  <td className="p-3 text-right border-r border-gray-200">—</td>
                                  <td className="p-3 text-right font-mono text-indigo-950 font-black bg-indigo-100 border-r border-gray-200">${totals.totalValuation.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono border-r border-gray-200 bg-emerald-50/10 text-emerald-800">${totals.purchasePrice.toFixed(2)}</td>
                                  <td className={`p-3 text-right font-mono font-black ${totals.profit >= 0 ? 'bg-emerald-100 text-emerald-950' : 'bg-red-100 text-red-950'}`}>${totals.profit.toFixed(2)}</td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* DECISION BUTTONS */}
                      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        {selectedReport.submissionStatus !== 'approved' && (
                          <button
                            id="owner-save-prices-btn"
                            disabled={isSubmitting}
                            onClick={handleSaveDraft}
                            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 px-4 py-2 hover:bg-indigo-100 text-xs font-semibold disabled:bg-gray-200 cursor-pointer transition-colors"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save Price Updates</span>
                          </button>
                        )}

                        <button
                          id="owner-reject-btn"
                          disabled={isSubmitting}
                          onClick={() => handleOwnerReject(selectedReport.id)}
                          className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-2 hover:bg-red-100 text-xs font-semibold disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer transition-colors"
                        >
                          <Unlock className="h-4 w-4" />
                          <span>Reject &amp; Unlock (Unlock Draft)</span>
                        </button>

                        <button
                          id="owner-approve-btn"
                          disabled={isSubmitting}
                          onClick={() => handleOwnerApprove(selectedReport.id)}
                          className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 rounded-lg bg-gray-900 text-white px-5 py-2 hover:bg-gray-800 text-xs font-semibold disabled:bg-gray-200 cursor-pointer transition-colors"
                        >
                          <Lock className="h-4 w-4" />
                          <span>Approve &amp; Lock Ledger</span>
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-gray-50/30 rounded-lg border border-dashed border-gray-200">
                      <FileSpreadsheet className="h-16 w-16 text-gray-300 mb-3" />
                      <h4 className="text-sm font-bold text-gray-800">No Submission Selected</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm">
                        Choose an active pending report from the left sidebar feed to perform audit calculations, view inline pricing and lock transactions.
                      </p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}


          {/* TAB 2: TENANTS MULTI-TENANCY BROWSER */}
          {ownerActiveTab === 'tenants' && (
            <div id="owner-tenants-workspace" className="space-y-6">
              
              {/* TENANTS SELECTOR GRID */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {tenants.map(tenant => {
                  const itemsOfTenant = allSystemReports.filter(r => r.tenantId === tenant.id);
                  const isSelected = ownerSelectedTenantId === tenant.id;

                  return (
                    <button
                      key={tenant.id}
                      id={`tenant-browser-btn-${tenant.id}`}
                      onClick={() => {
                        setOwnerSelectedTenantId(tenant.id);
                        setSelectedReport(null); // Clear selected to drill down fresh
                        setGridItems([]);
                      }}
                      className={`text-center p-3 rounded-lg border transition-all flex flex-col items-center justify-center ${
                        isSelected 
                          ? 'border-gray-900 bg-gray-900 text-white shadow-sm font-bold' 
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Store className={`h-4 w-4 mb-1.5 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                      <span className="text-[10px] uppercase font-bold tracking-tight block truncate max-w-full">
                        {tenant.name.replace(' (Central Central)', '').replace(' Area', '').replace(' Portal', '')}
                      </span>
                      <span className="text-[9px] opacity-70 mt-1 font-mono">
                        {itemsOfTenant.length} records
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* DUAL WORKSPACE FOR CHOSEN TENANT */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* CYCLES HISTORY BY SELECTED TENANT */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                    Available Cycles List
                  </h3>

                  {/* DATE-TO-DATE FILTER */}
                  <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-150 space-y-2 text-xs">
                    <p className="font-bold text-gray-700 text-[10px] uppercase tracking-wider flex items-center space-x-1">
                      <Calendar className="h-3 w-3 text-indigo-600" />
                      <span>History Review (Date-To-Date)</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-gray-450 block mb-0.5">Start (From):</span>
                        <input
                          type="date"
                          value={historyDateFrom}
                          onChange={(e) => setHistoryDateFrom(e.target.value)}
                          className="w-full text-[10px] rounded border border-gray-300 p-1 bg-white font-mono focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-450 block mb-0.5">End (To):</span>
                        <input
                          type="date"
                          value={historyDateTo}
                          onChange={(e) => setHistoryDateTo(e.target.value)}
                          className="w-full text-[10px] rounded border border-gray-300 p-1 bg-white font-mono focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                    {(historyDateFrom || historyDateTo) && (
                      <button
                        type="button"
                        onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }}
                        className="text-[10px] text-indigo-600 font-bold hover:underline hover:text-indigo-800 block text-right w-full cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>

                  {allSystemReports
                    .filter(r => r.tenantId === ownerSelectedTenantId)
                    .filter(r => {
                      if (!historyDateFrom && !historyDateTo) return true;
                      const checkFrom = historyDateFrom ? (r.reportDate >= historyDateFrom) : true;
                      const checkTo = historyDateTo ? (r.reportDate <= historyDateTo) : true;
                      return checkFrom && checkTo;
                    })
                    .length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      <p className="text-xs font-medium">No records match the active date filters.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
                      {allSystemReports
                        .filter(r => r.tenantId === ownerSelectedTenantId)
                        .filter(r => {
                          if (!historyDateFrom && !historyDateTo) return true;
                          const checkFrom = historyDateFrom ? (r.reportDate >= historyDateFrom) : true;
                          const checkTo = historyDateTo ? (r.reportDate <= historyDateTo) : true;
                          return checkFrom && checkTo;
                        })
                        .map(r => {
                          const isSel = selectedReport?.id === r.id;
                          return (
                            <button
                              key={r.id}
                              id={`cycle-history-btn-${r.id}`}
                              onClick={() => handleSelectReport(r)}
                              className={`w-full text-left p-2.5 rounded-md border text-xs transition-all flex justify-between items-center ${
                                isSel 
                                  ? 'border-indigo-600 bg-indigo-50/30' 
                                  : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
                              }`}
                            >
                              <div>
                                <span className="font-bold text-gray-950 font-mono">{r.reportDate}</span>
                                <span className="text-[9px] text-gray-400 block mt-0.5">ID: {r.id.substring(0,8)}</span>
                              </div>

                              <span className={`px-2 py-0.5 text-[9px] rounded-full uppercase tracking-wider font-bold ${
                                r.submissionStatus === 'approved' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : r.submissionStatus === 'pending_approval'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                  : r.submissionStatus === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {r.submissionStatus}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* VISUALIZER DETAIL SCREEN */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5 shadow-sm min-h-[400px]">
                  {selectedReport ? (
                    <div className="space-y-4">
                      
                      {/* SUBMISSION STATE RIBBON INDENT */}
                      <div className="flex items-center justify-between border-b pb-4">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 font-mono uppercase">
                            Cycle Record Details: {selectedReport.reportDate}
                          </h4>
                          <span className="text-[10px] text-gray-400">
                            Created {new Date(selectedReport.createdAt).toLocaleString()} • Updated {new Date(selectedReport.updatedAt).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleExportCSV(computedItems, `ERP_Cycle_${selectedReport.reportDate}`)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-3 py-1.5 flex items-center space-x-1 rounded-lg border border-indigo-100 cursor-pointer"
                          >
                            <span>Excel CSV Export</span>
                          </button>
                          <button
                            onClick={() => handleExportPDF(
                              computedItems,
                              selectedReport.reportDate,
                              selectedReport.tenantId,
                              selectedReport.submissionStatus,
                              selectedReport.approvedBy || undefined
                            )}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-extrabold px-3 py-1.5 flex items-center space-x-1 rounded-lg border border-rose-100 cursor-pointer"
                          >
                            <span>Professional PDF Export</span>
                          </button>
                          <span className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${
                            selectedReport.submissionStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : selectedReport.submissionStatus === 'pending_approval'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}>
                            Status: {selectedReport.submissionStatus}
                          </span>
                        </div>
                      </div>

                      {/* CONDITIONAL ACTIONABLE FOR THE OWNER INDEPENDENT BROWZING */}
                      {selectedReport.submissionStatus === 'pending_approval' && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-800 flex items-center justify-between">
                          <span>This report is awaiting approval review from HQ.</span>
                          <div className="flex items-center space-x-2">
                            <button
                              id="browse-reject-action"
                              onClick={() => handleOwnerReject(selectedReport.id)}
                              className="bg-white hover:bg-gray-100 text-red-600 px-2.5 py-1 text-[10px] font-bold rounded border cursor-pointer border-red-200"
                            >
                              Unlock/Reject
                            </button>
                            <button
                              id="browse-approve-action"
                              onClick={() => handleOwnerApprove(selectedReport.id)}
                              className="bg-gray-900 hover:bg-gray-800 text-white px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer"
                            >
                              Approve &amp; Lock
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SPREADSHEET TABLE GRID FOR DETAIL VIEW (exact columns) */}
                      <div className="overflow-x-auto border border-gray-150 rounded-lg">
                        <table id="drilldown-grid-table" className="w-full text-left border-collapse text-xs">
                          <thead className="bg-gray-50/80 text-gray-700 font-semibold border-b">
                            <tr>
                              <th className="p-3 border-r">Commodity</th>
                              <th className="p-3 text-right border-r">Initial Stock</th>
                              <th className="p-3 text-right border-r">Purchased/Received</th>
                              <th className="p-3 text-right border-r font-bold bg-gray-100/50">Total Stock</th>
                              <th className="p-3 text-right border-r">Sales</th>
                              <th className="p-3 text-right border-r font-bold bg-gray-100/50">Remain Stock</th>
                              <th className="p-3 text-right border-r">Unit Price ($)</th>
                              <th className="p-3 text-right border-r bg-indigo-50/50 font-bold text-indigo-950">Total Valuation ($)</th>
                              <th className="p-3 text-right border-r">Purch. Price ($)</th>
                              <th className="p-3 text-right bg-emerald-50/30 font-bold text-emerald-950">Profit ($)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {computedItems.map(item => (
                              <tr key={item.id} className="hover:bg-gray-50/50">
                                <td className="p-2.5 border-r font-medium text-gray-950">{item.commodityName}</td>
                                <td className="p-2.5 text-right border-r font-mono">{item.initialStock.toLocaleString()}</td>
                                <td className="p-2.5 text-right border-r font-mono">{item.purchasedReceived.toLocaleString()}</td>
                                <td className="p-2.5 text-right border-r font-mono bg-gray-50 font-semibold">{item.totalStock.toLocaleString()}</td>
                                <td className="p-2.5 text-right border-r font-mono">{item.sales.toLocaleString()}</td>
                                <td className="p-2.5 text-right border-r font-mono bg-gray-50 font-semibold">{item.remainStock.toLocaleString()}</td>
                                <td className="p-2 text-right border-r font-mono bg-indigo-50/5">
                                  {selectedReport.submissionStatus !== 'approved' ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice}
                                      onChange={(e) => handleCellChange(item.id, 'unitPrice', e.target.value)}
                                      className="block w-full text-right p-1.5 rounded text-xs font-mono border border-gray-200 bg-white font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                                    />
                                  ) : (
                                    `$${item.unitPrice.toFixed(2)}`
                                  )}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold bg-indigo-50/20 text-indigo-900 border-r border-gray-200">${item.totalValuation.toFixed(2)}</td>
                                <td className="p-2.5 text-right font-mono border-r border-gray-200 bg-emerald-50/5">${(item.purchasePrice || 0).toFixed(2)}</td>
                                <td className={`p-2.5 text-right font-mono font-bold ${item.profit >= 0 ? 'bg-emerald-50/20 text-emerald-800' : 'bg-red-50/20 text-red-800'}`}>${item.profit.toFixed(2)}</td>
                              </tr>
                            ))}
                            {(() => {
                              const totals = getGridTotals(computedItems);
                              return (
                                <tr className="bg-gray-50 font-bold text-gray-900 border-t-2">
                                  <td className="p-3 border-r uppercase text-[9px] tracking-wider">Totals</td>
                                  <td className="p-3 text-right border-r font-mono">{totals.initialStock.toLocaleString()}</td>
                                  <td className="p-3 text-right border-r font-mono">{totals.purchasedReceived.toLocaleString()}</td>
                                  <td className="p-3 text-right border-r font-mono bg-gray-100">{totals.totalStock.toLocaleString()}</td>
                                  <td className="p-3 text-right border-r font-mono">{totals.sales.toLocaleString()}</td>
                                  <td className="p-3 text-right font-mono bg-gray-100 border-r">{totals.remainStock.toLocaleString()}</td>
                                  <td className="p-3 text-right border-r">—</td>
                                  <td className="p-3 text-right font-mono text-indigo-900 bg-indigo-55/40 font-bold border-r border-gray-200">${totals.totalValuation.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono border-r border-gray-200 bg-emerald-50/10">${totals.purchasePrice.toFixed(2)}</td>
                                  <td className={`p-3 text-right font-mono font-black ${totals.profit >= 0 ? 'bg-emerald-100 text-emerald-950' : 'bg-red-100 text-red-950'}`}>${totals.profit.toFixed(2)}</td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {selectedReport.submissionStatus !== 'approved' && (
                        <div className="flex items-center justify-end pt-2">
                          <button
                            id="owner-drilldown-save-prices-btn"
                            disabled={isSubmitting}
                            onClick={handleSaveDraft}
                            className="inline-flex items-center justify-center space-x-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 px-4 py-2 hover:bg-indigo-100 text-xs font-semibold disabled:bg-gray-200 cursor-pointer transition-colors"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save Price Updates</span>
                          </button>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 bg-gray-50/40 rounded-lg">
                      <FileSpreadsheet className="h-12 w-12 text-gray-300 mb-2" />
                      <h4 className="text-xs font-bold text-gray-800">No Cycle Selected</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">Choose an initialized date cycle from the sidebar to inspect ledger assets and values.</p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}


          {/* TAB 3: GLOBAL COMMODITY CATALOG */}
          {ownerActiveTab === 'catalog' && (
            <div id="owner-catalog-workspace" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* NEW COMMODITY FORM */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4 h-fit">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Add Global Commodity</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Newly configured commodities will dynamically propagate to all newly created report spreadsheets across all branches.
                  </p>
                </div>

                <form onSubmit={handleCreateCommodity} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Commodity Name</label>
                    <input
                      id="new-commodity-name"
                      type="text"
                      required
                      placeholder="e.g. Organic Black Beans"
                      value={newCommName}
                      onChange={(e) => setNewCommName(e.target.value)}
                      className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Aesthetic Description</label>
                    <textarea
                      id="new-commodity-desc"
                      rows={3}
                      placeholder="e.g. Grade A extra-fine black beans sourced in bulk."
                      value={newCommDesc}
                      onChange={(e) => setNewCommDesc(e.target.value)}
                      className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none"
                    />
                  </div>

                  <button
                    id="submit-commodity-btn"
                    type="submit"
                    className="w-full inline-flex items-center justify-center space-x-1.5 rounded-lg bg-gray-900 text-white py-2 text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Register Commodity</span>
                  </button>
                </form>
              </div>

              {/* COMMODITY TABLE LIST */}
              <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Active Commodity Catalogue</h3>
                  <span className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider bg-gray-100 text-gray-700 rounded-lg">
                    {commodities.length} Active Codes
                  </span>
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                   <table id="commodities-table" className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                      <tr>
                        <th className="p-3">Reference Code</th>
                        <th className="p-3">Official Title</th>
                        <th className="p-3">System Description</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {commodities.map((comm) => (
                        <tr key={comm.id} className="hover:bg-gray-50/30">
                          <td className="p-3 font-mono text-gray-600 uppercase font-semibold text-[10px]">{comm.id}</td>
                          <td className="p-3 font-bold text-gray-900">{comm.name}</td>
                          <td className="p-3 text-gray-500">{comm.description}</td>
                          <td className="p-3 text-right">
                            <button
                              id={`delete-comm-${comm.id}`}
                              onClick={() => handleDeleteCommodity(comm.id)}
                              className="text-red-600 hover:text-red-800 font-semibold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span>Remove</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* TAB 4: CENTRAL AUDIT LOGS TIMELINE */}
          {ownerActiveTab === 'audit' && (
            <div id="owner-audit-workspace" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              
              {/* LEDGER BAR HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-indigo-600" />
                    <span>Central Audit Trail Log</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Immutable log tracing system activities occurring inside multi-tenant schemas.
                  </p>
                </div>

                {/* SEARCH FILTER BOX */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    id="audit-filter-input"
                    type="text"
                    placeholder="Filter by keyword (branch, operator...)"
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="block w-full text-xs rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* TIMELINE LIST */}
              <div className="overflow-x-auto max-h-[500px] border border-gray-150 rounded-lg">
                <table id="audit-trail-table" className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-gray-50 sticky top-0 text-gray-650 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">Timestamp (UTC)</th>
                      <th className="p-3">User Node</th>
                      <th className="p-3">Division Context</th>
                      <th className="p-3">Security Action</th>
                      <th className="p-3">Action Core Log Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 font-mono">
                    {auditLogs
                      .filter(log => {
                        const word = auditFilter.toLowerCase();
                        return (
                          log.action.toLowerCase().includes(word) ||
                          log.userDisplayName.toLowerCase().includes(word) ||
                          log.tenantName.toLowerCase().includes(word) ||
                          log.details.toLowerCase().includes(word)
                        );
                      })
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="p-3 text-gray-500 whitespace-nowrap text-[10px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3 font-semibold text-gray-900">
                            {log.userDisplayName}
                          </td>
                          <td className="p-3">
                            <span className="px-1.5 py-0.5 rounded border text-[9px] bg-gray-50 font-bold text-gray-700">
                              {log.tenantName}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-indigo-700">
                            {log.action}
                          </td>
                          <td className="p-3 text-gray-600 break-words font-sans text-xs">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}


          {/* TAB 5: UNIFIED FORENSIC DATE SANDBOX */}
          {ownerActiveTab === 'sandbox' && (
            <div id="owner-sandbox-workspace" className="space-y-6">
              
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <div>
                  <span className="text-xs font-semibold tracking-widest text-[10px] text-purple-600 uppercase">Chronological Asset Sandbox</span>
                  <h3 className="text-md font-bold text-gray-900 mt-0.5">Forensic Historical Archival Browser</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Select a Division context and a Target Date. The state engine recovers the exact approved inventory balances as of that timestamp.
                  </p>
                </div>

                <form onSubmit={handleSandboxSearch} className="flex flex-col sm:flex-row items-end gap-3 p-4 bg-gray-50 rounded-xl border border-gray-150">
                  <div className="w-full sm:flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Target Division</label>
                    <select
                      id="sandbox-tenant-select"
                      value={sandboxTenantId}
                      onChange={(e) => setSandboxTenantId(e.target.value)}
                      className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline bg-white"
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Snapshot Date/Time</label>
                    <input
                      id="sandbox-date-select"
                      type="datetime-local"
                      required
                      value={sandboxDate}
                      onChange={(e) => setSandboxDate(e.target.value)}
                      className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline bg-white"
                    />
                  </div>

                  <button
                    id="sandbox-query-btn"
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 rounded-lg bg-gray-900 text-white px-5 py-2 text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Search className="h-4 w-4" />
                    <span>Query Timeline Snapshot</span>
                  </button>
                </form>

                {/* SEARCH RESULTS VIEW */}
                {sandboxSearched && (
                  <div id="sandbox-results" className="pt-4 border-t border-gray-150 space-y-3">
                    {sandboxResult ? (
                      <div className="space-y-4">
                        
                        {/* SNAPSHOT SUCCESS STRIPE */}
                        <div className="bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 p-4 rounded-r-lg text-xs leading-relaxed">
                          <h4 className="font-bold flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <span>APPROVED IMMUTABLE ARCHIVE SNAPSHOT DETECTED</span>
                          </h4>
                          <p className="mt-1">
                            Recovered state from cycle: <strong className="font-mono text-[11px]">{sandboxResult.reportDate}</strong>. 
                            Approved &amp; Locked at UTC Timestamp: <strong className="font-mono text-[11px]">{new Date(sandboxResult.approvedAt).toLocaleString()}</strong>
                          </p>
                        </div>

                        {/* TABLE VIEW */}
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table id="sandbox-results-table" className="w-full text-left border-collapse text-xs">
                            <thead className="bg-gray-50/80 text-gray-700 font-semibold border-b">
                              <tr>
                                <th className="p-3 border-r">Commodity</th>
                                <th className="p-3 text-right border-r">Initial Stock</th>
                                <th className="p-3 text-right border-r">Purchased/Received</th>
                                <th className="p-3 text-right border-r font-bold bg-gray-100/50">Total Stock</th>
                                <th className="p-3 text-right border-r">Sales</th>
                                <th className="p-3 text-right border-r font-bold bg-gray-100/50">Remain Stock</th>
                                <th className="p-3 text-right border-r">Unit Price ($)</th>
                                <th className="p-3 text-right border-r bg-indigo-50/50 font-bold text-indigo-950">Total Valuation ($)</th>
                                <th className="p-3 text-right border-r">Purch. Price ($)</th>
                                <th className="p-3 text-right bg-emerald-50/30 font-bold text-emerald-950">Profit ($)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {sandboxResult.approvedData.map(item => {
                                const initialStock = item.initialStock;
                                const totalStock = initialStock + item.purchasedReceived;
                                const remainStock = totalStock - item.sales;
                                const totalValuation = item.sales * item.unitPrice;
                                const purchasePrice = item.purchasePrice || 0;
                                const profit = totalValuation - purchasePrice;
                                return (
                                  <tr key={item.id} className="hover:bg-gray-50/20">
                                    <td className="p-2.5 border-r font-medium text-gray-950">{item.commodityName}</td>
                                    <td className="p-2.5 text-right border-r font-mono">{initialStock.toLocaleString()}</td>
                                    <td className="p-2.5 text-right border-r font-mono">{item.purchasedReceived.toLocaleString()}</td>
                                    <td className="p-2.5 text-right border-r font-mono bg-gray-50 font-semibold">{totalStock.toLocaleString()}</td>
                                    <td className="p-2.5 text-right border-r font-mono">{item.sales.toLocaleString()}</td>
                                    <td className="p-2.5 text-right border-r font-mono bg-gray-50 font-semibold">{remainStock.toLocaleString()}</td>
                                    <td className="p-2.5 text-right border-r font-mono">${item.unitPrice.toFixed(2)}</td>
                                    <td className="p-2.5 text-right font-mono font-bold bg-indigo-50/10 text-indigo-900 border-r border-gray-200">${totalValuation.toFixed(2)}</td>
                                    <td className="p-2.5 text-right font-mono border-r border-gray-200 bg-emerald-50/5">${purchasePrice.toFixed(2)}</td>
                                    <td className={`p-2.5 text-right font-mono font-bold ${profit >= 0 ? 'bg-emerald-50/20 text-emerald-800' : 'bg-red-50/20 text-red-800'}`}>${profit.toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                              {(() => {
                                const totals = getGridTotals(sandboxResult.approvedData);
                                return (
                                  <tr className="bg-gray-50 font-bold text-gray-900 border-t-2">
                                    <td className="p-3 border-r uppercase text-[9px] tracking-wider">Historical Totals</td>
                                    <td className="p-3 text-right border-r font-mono">{totals.initialStock.toLocaleString()}</td>
                                    <td className="p-3 text-right border-r font-mono">{totals.purchasedReceived.toLocaleString()}</td>
                                    <td className="p-3 text-right border-r font-mono bg-gray-100">{totals.totalStock.toLocaleString()}</td>
                                    <td className="p-3 text-right border-r font-mono">{totals.sales.toLocaleString()}</td>
                                    <td className="p-3 text-right border-r font-mono bg-gray-100">{totals.remainStock.toLocaleString()}</td>
                                    <td className="p-3 text-right border-r">—</td>
                                    <td className="p-3 text-right font-mono text-indigo-900 bg-indigo-50 font-bold border-r border-gray-200">${totals.totalValuation.toFixed(2)}</td>
                                    <td className="p-3 text-right font-mono border-r border-gray-200 bg-emerald-50/10 text-emerald-850">${totals.purchasePrice.toFixed(2)}</td>
                                    <td className={`p-3 text-right font-mono font-black ${totals.profit >= 0 ? 'bg-emerald-100 text-emerald-950' : 'bg-red-100 text-red-950'}`}>${totals.profit.toFixed(2)}</td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    ) : (
                      <div className="text-center py-16 rounded-lg bg-gray-50 border border-gray-150">
                        <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-gray-700">No Prior Approved Snapshots Documented</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5 max-w-sm mx-auto">
                          There is no approved data archived for this branch and timestamp context yet. Check that reports are approved and locked by HQ before querying past timelines.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {ownerActiveTab === 'accounts' && (
            <div id="owner-accounts-workspace" className="space-y-6 animate-fade-in">
              
              {/* HEADER STATISTICS */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Enterprise Access Directory</p>
                  <h3 className="text-lg font-bold text-gray-900 mt-0.5 font-sans">Operator Privilege & Provisioning Dashboard</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage operational branch access limits, reset default passwords, alter execution roles, and enforce corporate security policies.
                  </p>
                </div>
                <div className="flex bg-gray-50 px-4 py-2 rounded-xl border border-gray-150 text-xs font-mono">
                  <span className="text-gray-400">Total Provisioned:</span>
                  <span className="ml-2 font-bold text-indigo-700">{adminUsers.length} Users</span>
                </div>
              </div>

              <div id="operator-setup-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMN 1: PROVISION NEW OPERATOR */}
                <div id="operator-setup-card font-sans" className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5 h-fit">
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider font-sans">Provision Operator Account</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Initialize credentials and enforce portal bindings for new staff members.</p>
                  </div>

                  <form 
                    id="admin-create-user-form"
                    className="space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!actUsername.trim() || !actPassword.trim()) {
                        showToast('Username and initial password are required.', 'error');
                        return;
                      }
                      
                      // Map standard portals nicely
                      let branchNameStr = actBranch;
                      if (actPortal === 'owner_hq') {
                        branchNameStr = 'HQ System';
                      } else if (actPortal === 'main_stock') {
                        branchNameStr = 'Central Warehouse';
                      }

                      const success = await handleAdminCreateUser({
                        displayName: actName || actUsername,
                        username: actUsername,
                        email: actEmail || `${actUsername}@enterprise.internal`,
                        role: actRole,
                        portal: actPortal,
                        branch: branchNameStr,
                        tenantId: actTenantId,
                        password: actPassword
                      });

                      if (success) {
                        setActName('');
                        setActUsername('');
                        setActEmail('');
                        setActPassword('');
                      }
                    }}
                  >
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Full Name</label>
                      <input
                        id="admin-create-fullname"
                        type="text"
                        placeholder="John Doe"
                        value={actName}
                        onChange={(e) => setActName(e.target.value)}
                        className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline bg-white font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">System Username *</label>
                      <input
                        id="admin-create-username"
                        type="text"
                        required
                        placeholder="jdoe"
                        value={actUsername}
                        onChange={(e) => setActUsername(e.target.value)}
                        className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline bg-white font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Email Address</label>
                      <input
                        id="admin-create-email"
                        type="email"
                        placeholder="jdoe@company.com"
                        value={actEmail}
                        onChange={(e) => setActEmail(e.target.value)}
                        className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline bg-white font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-sans">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">System Role</label>
                        <select
                          id="admin-create-role"
                          value={actRole}
                          onChange={(e) => {
                            const selectedRole = e.target.value as any;
                            setActRole(selectedRole);
                            if (selectedRole === 'owner') {
                              setActPortal('owner_hq');
                              setActTenantId('owner_hq');
                              setActBranch('HQ System');
                            } else if (selectedRole === 'main_stock') {
                              setActPortal('main_stock');
                              setActTenantId('main_stock');
                              setActBranch('Central Warehouse');
                            } else {
                              setActPortal('branch_1');
                              setActTenantId('branch_1');
                              setActBranch('Branch 1');
                            }
                          }}
                          className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline bg-white"
                        >
                          <option value="owner">Owner / Admin</option>
                          <option value="main_stock">Main Stock Manager</option>
                          <option value="branch">Branch Operator</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Target Portal</label>
                        <select
                          id="admin-create-portal"
                          value={actPortal}
                          onChange={(e) => {
                            const port = e.target.value;
                            setActPortal(port);
                            // Bind associated branches/tenants automatically for convenience
                            if (port === 'owner_hq') {
                              setActTenantId('owner_hq');
                              setActBranch('HQ System');
                            } else if (port === 'main_stock') {
                              setActTenantId('main_stock');
                              setActBranch('Central Warehouse');
                            } else {
                              setActTenantId(port);
                              const label = port.replace('_', ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
                              setActBranch(label);
                            }
                          }}
                          className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline bg-white font-sans"
                        >
                          <option value="owner_hq">Owner / HQ</option>
                          <option value="main_stock">Main Stock</option>
                          <option value="branch_1">Branch 1</option>
                          <option value="branch_2">Branch 2</option>
                          <option value="branch_3">Branch 3</option>
                          <option value="branch_4">Branch 4</option>
                          <option value="branch_5">Branch 5</option>
                          <option value="branch_6">Branch 6</option>
                        </select>
                      </div>
                    </div>

                    {actRole === 'branch' && (
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1 font-sans">Assigned Tenant Division</label>
                        <select
                          id="admin-create-tenant"
                          value={actTenantId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActTenantId(val);
                            const label = val.replace('_', ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
                            setActBranch(label);
                          }}
                          className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline bg-white font-sans"
                        >
                          {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Initial Temporary Password *</label>
                      <input
                        id="admin-create-password"
                        type="password"
                        required
                        placeholder="At least 8 chars"
                        value={actPassword}
                        onChange={(e) => setActPassword(e.target.value)}
                        className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline bg-white font-sans"
                      />
                    </div>

                    <button
                      id="admin-create-operator-btn"
                      type="submit"
                      disabled={isSubmitting || !actUsername || !actPassword}
                      className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white font-semibold py-2.5 text-xs focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all cursor-pointer font-sans"
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      <span>{isSubmitting ? 'Creating User...' : 'Provision Secure Operator'}</span>
                    </button>
                  </form>
                </div>

                {/* COLUMN 2 & 3: OPERATOR REGISTRY TABLE */}
                <div id="operator-registry-container" className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4 font-sans">
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Active Portal Operators Registry</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Control operational statuses, update database permissions, and trigger password updates.</p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-xs text-gray-600 font-sans">
                      <thead className="bg-gray-50 text-[10px] font-mono uppercase text-gray-450 tracking-wider">
                        <tr>
                          <th className="p-3">Operator Context</th>
                          <th className="p-3">Operational Role</th>
                          <th className="p-3">Portal Binding</th>
                          <th className="p-3">State Status</th>
                          <th className="p-3">Control Commands</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {adminUsers.map((userObj) => {
                          const currentResetPass = resetPassInputs[userObj.id] || '';
                          return (
                            <tr key={userObj.id} className="hover:bg-slate-50/50">
                              
                              {/* Operator Context */}
                              <td className="p-3 space-y-1">
                                <p className="font-bold text-gray-900">{userObj.displayName}</p>
                                <p className="text-[10px] text-indigo-650 font-bold font-mono">@{userObj.username}</p>
                                <p className="text-[10px] font-mono text-gray-400 break-all">{userObj.email}</p>
                              </td>

                              {/* Operational Role */}
                              <td className="p-3">
                                <select
                                  id={`role-select-${userObj.id}`}
                                  value={userObj.role}
                                  onChange={(e) => handleAdminUpdateUserRole(userObj.id, e.target.value)}
                                  className="text-xs bg-gray-50 border border-gray-300 rounded px-2 py-1 focus:outline-none"
                                >
                                  <option value="owner">Owner / HQ</option>
                                  <option value="main_stock">Main Stock</option>
                                  <option value="branch">Branch</option>
                                </select>
                              </td>

                              {/* Portal Binding */}
                              <td className="p-3 space-y-0.5">
                                <p className="font-semibold text-indigo-700 font-mono text-[10px] uppercase">
                                  {userObj.portal ? userObj.portal.replace('_', ' ') : 'Any'}
                                </p>
                                <p className="text-[10px] font-mono text-gray-400 font-semibold">
                                  Div: {userObj.branch || 'None'}
                                </p>
                              </td>

                              {/* State Status Badge */}
                              <td className="p-3 space-y-1">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase ${
                                  userObj.status === 'suspended' ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' :
                                  userObj.status === 'approved' || userObj.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold' :
                                  'bg-amber-50 text-amber-700 border border-amber-200 font-bold'
                                }`}>
                                  {userObj.status || 'approved'}
                                </span>
                                
                                {userObj.force_password_change && (
                                  <p className="text-[9px] text-amber-600 font-black tracking-tight bg-amber-50 rounded px-1.5 py-0.5 w-fit border border-amber-200/55 uppercase font-mono">
                                    Force Reset
                                  </p>
                                )}
                              </td>

                              {/* Control Commands */}
                              <td className="p-3 space-y-3 min-w-[200px]">
                                
                                {/* Status controls */}
                                <div className="flex items-center gap-1.5">
                                  {userObj.status === 'suspended' ? (
                                    <button
                                      id={`btn-enable-${userObj.id}`}
                                      onClick={() => handleUpdateUserStatus(userObj.id, 'approved')}
                                      className="px-2 py-1 text-[10px] font-mono bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-bold cursor-pointer transition-all"
                                    >
                                      Enable Account
                                    </button>
                                  ) : (
                                    <button
                                      id={`btn-disable-${userObj.id}`}
                                      onClick={() => handleUpdateUserStatus(userObj.id, 'suspended')}
                                      className="px-2 py-1 text-[10px] font-mono bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded font-bold cursor-pointer transition-all"
                                    >
                                      Suspend Account
                                    </button>
                                  )}
                                  
                                  {userObj.status === 'pending' && (
                                    <button
                                      id={`btn-approve-${userObj.id}`}
                                      onClick={() => handleUpdateUserStatus(userObj.id, 'approved')}
                                      className="px-2 py-1 text-[10px] font-mono bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-bold cursor-pointer transition-all"
                                    >
                                      Approve
                                    </button>
                                  )}
                                </div>

                                {/* Password Reset controls */}
                                <div className="pt-2 border-t border-gray-100 space-y-1">
                                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono">Force Pass Reset</label>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      id={`reset-pwd-${userObj.id}`}
                                      type="password"
                                      placeholder="New password"
                                      value={currentResetPass}
                                      onChange={(e) => {
                                        setResetPassInputs(prev => ({ ...prev, [userObj.id]: e.target.value }));
                                      }}
                                      className="text-[10px] bg-gray-50 border border-gray-300 rounded px-2 py-1 focus:outline-none flex-1 max-w-[120px]"
                                    />
                                    <button
                                      id={`btn-reset-${userObj.id}`}
                                      disabled={!currentResetPass.trim() || isSubmitting}
                                      onClick={async () => {
                                        await handleAdminResetPassword(userObj.id, currentResetPass);
                                        setResetPassInputs(prev => ({ ...prev, [userObj.id]: '' }));
                                      }}
                                      className="px-2 py-1 text-[10px] font-mono bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-200 rounded font-bold disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all shrink-0"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                </div>

                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
              
            </div>
          )}

        </main>
      )}


      {/* --- DIVISION BRANCH & STOCK OPERATOR CORE WORKSPACE --- */}
      {currentUser.role !== 'owner' && (
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* LEFT COLUMN: CYCLES TIMELINE BAR & CONTROLLER */}
            <div className="space-y-6">
              
              {/* CURRENT TENANT BADGE CARD */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Branch Identity Context</p>
                <div className="flex items-center space-x-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-900 border border-gray-200">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {tenants.find(t => t.id === currentUser.tenantId)?.name || currentUser.tenantId}
                    </h3>
                    <span className="text-[9px] font-semibold uppercase text-gray-400 tracking-wider">
                      Authorized operator node
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION: INHERITED AUTO-CARRYOVER TRIGGER */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900">Cycle Ledger Timeline</h3>
                  <button
                    id="new-cycle-trigger-btn"
                    onClick={() => setIsNewCycleOpen(!isNewCycleOpen)}
                    className="inline-flex items-center justify-center rounded-lg bg-gray-950 text-white p-1 text-[11px] font-bold hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Initialize Cycle"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {isNewCycleOpen && (
                  <form onSubmit={handleCreateNewCycle} className="p-3 bg-gray-50 rounded-lg border border-gray-150 space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Select Report Date (Year, Month, Day)</label>
                      <input
                        id="new-report-date-period"
                        type="date"
                        required
                        value={newCycleDate}
                        onChange={(e) => setNewCycleDate(e.target.value)}
                        className="block w-full text-xs rounded-lg border border-gray-300 px-3 py-1.5 focus:outline bg-white font-mono"
                      />
                    </div>
                    
                    <p className="text-[10px] text-gray-500 leading-normal bg-white p-2 rounded border border-gray-100">
                      <strong>State Engine Rule:</strong> Clicking Create carrying over the closing balances (<em>remain stock</em>) of your last approved ledger to act as initial opening balances. Unlocked if first cycle.
                    </p>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        id="cancel-cycle-btn"
                        type="button"
                        onClick={() => setIsNewCycleOpen(false)}
                        className="text-gray-500 hover:text-gray-800 text-[11px] font-semibold"
                      >
                        Cancel
                      </button>
                      
                      <button
                        id="submit-cycle-btn"
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-gray-900 hover:bg-gray-800 text-white px-2.5 py-1 text-[11px] font-semibold rounded disabled:bg-gray-300 cursor-pointer"
                      >
                        {isSubmitting ? 'Loading...' : 'Create Cycle'}
                      </button>
                    </div>
                  </form>
                )}
                {/* DATE-TO-DATE HISTORY RANGE FILTER */}
                <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-200 space-y-2 text-xs">
                  <p className="font-bold text-gray-700 text-[10px] uppercase tracking-wider flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    <span>History Date-to-Date Review</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-gray-400 block mb-0.5">From:</span>
                      <input
                        type="date"
                        value={opHistoryDateFrom}
                        onChange={(e) => setOpHistoryDateFrom(e.target.value)}
                        className="w-full text-[10px] rounded border border-gray-300 p-1 bg-white font-mono focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block mb-0.5">To:</span>
                      <input
                        type="date"
                        value={opHistoryDateTo}
                        onChange={(e) => setOpHistoryDateTo(e.target.value)}
                        className="w-full text-[10px] rounded border border-gray-300 p-1 bg-white font-mono focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                  {(opHistoryDateFrom || opHistoryDateTo) && (
                    <button
                      type="button"
                      onClick={() => { setOpHistoryDateFrom(''); setOpHistoryDateTo(''); }}
                      className="text-[10px] text-indigo-600 font-bold hover:underline block text-right w-full cursor-pointer shadow-none"
                    >
                      Clear Range
                    </button>
                  )}
                </div>

                {/* TIMELINE LIST */}
                {myReports
                  .filter(r => {
                    if (!opHistoryDateFrom && !opHistoryDateTo) return true;
                    const rDate = r.reportDate;
                    const checkFrom = opHistoryDateFrom ? (rDate >= opHistoryDateFrom) : true;
                    const checkTo = opHistoryDateTo ? (rDate <= opHistoryDateTo) : true;
                    return checkFrom && checkTo;
                  })
                  .length === 0 ? (
                  <div className="text-center py-10 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400">No initialized inventories match specified date range.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                    {myReports
                      .filter(r => {
                        if (!opHistoryDateFrom && !opHistoryDateTo) return true;
                        const rDate = r.reportDate;
                        const checkFrom = opHistoryDateFrom ? (rDate >= opHistoryDateFrom) : true;
                        const checkTo = opHistoryDateTo ? (rDate <= opHistoryDateTo) : true;
                        return checkFrom && checkTo;
                      })
                      .map((report) => {
                        const isSel = selectedReport?.id === report.id;
                        return (
                          <button
                            key={report.id}
                            id={`operator-report-card-${report.id}`}
                            onClick={() => handleSelectReport(report)}
                            className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex flex-col space-y-1.5 ${
                              isSel 
                                ? 'border-indigo-600 bg-indigo-50/30 font-semibold' 
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-900 font-mono text-[12px]">{report.reportDate}</span>
                              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
                                report.submissionStatus === 'approved'
                                  ? 'bg-emerald-55 text-emerald-800 border-emerald-200'
                                  : report.submissionStatus === 'pending_approval'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                                  : report.submissionStatus === 'rejected'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              }`}>
                                {report.submissionStatus}
                              </span>
                            </div>
                            
                            <div className="text-[10px] text-gray-400">
                              ID: <span className="font-mono">{report.id.substring(0,12)}...</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: ACTIVE EXCEL LEDGER & CONTROLS */}
            <div className="lg:col-span-3 space-y-6">
              
              {selectedReport ? (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                  
                  {/* WORKSPACE RIBBON SUMMARY INFO */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 p-4 rounded-xl border border-gray-150 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Active Ledger Spreadsheet</p>
                      <h3 className="text-md font-bold text-gray-900 mt-0.5">Cycle: Period {selectedReport.reportDate}</h3>
                      <p className="text-[10px] text-gray-400">ID: <span className="font-mono">{selectedReport.id}</span></p>
                    </div>

                    <div className="flex items-center space-x-2">
                       {/* STATUS EMBLEMS */}
                       {selectedReport.submissionStatus === 'draft' && (
                         <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                           Draft - Editable
                         </span>
                       )}

                       {selectedReport.submissionStatus === 'rejected' && (
                         <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                           Unlocked - Please Correct &amp; Resubmit
                         </span>
                       )}

                       {selectedReport.submissionStatus === 'pending_approval' && (
                         <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                           Locked - Pending HQ Review
                         </span>
                       )}

                       {selectedReport.submissionStatus === 'approved' && (
                         <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-55 text-emerald-800 border border-emerald-250">
                           Immutable Archive Lock
                         </span>
                       )}
                    </div>
                  </div>

                  {/* FORMULA ARCHITECTURE INSTRUCTION BANNER */}
                  {selectedReport.submissionStatus === 'draft' || selectedReport.submissionStatus === 'rejected' ? (
                    <div className="bg-indigo-50 text-indigo-800 rounded-lg p-3.5 text-xs border border-indigo-250 flex items-start space-x-2.5">
                      <Info className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Aesthetic Live Grid Configured:</strong> Fill in cell values. Dependent cells will perform live responsive calculations:
                        <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[9px] bg-white p-2 border border-indigo-100 rounded text-indigo-900 leading-normal">
                          <span>• [Total Stock] = Initial + Received</span>
                          <span>• [Remain Stock] = Total - Sales</span>
                          <span>• [Valuation] = Remain * Unit Price</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-800 rounded-lg p-3 text-xs border border-amber-200 flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                      <div>
                        <strong>Immutable Ledger Archival:</strong> This document is locked because it is in <strong>{selectedReport.submissionStatus}</strong> status. Ask the owner to "Reject/Unlock" to edit values.
                      </div>
                    </div>
                  )}

                  {/* CORE EDIT SPREADSHEET TABLE GRID CONTROLLERS */}
                  <div className="text-xs overflow-x-auto border border-gray-200 rounded-lg">
                    <table id="spreadsheet-editable-grid" className="w-full text-left border-collapse text-xs">
                      <thead className="bg-gray-105 sticky top-0 text-gray-700 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="p-3 border-r min-w-[120px]">Commodity</th>
                          <th className="p-3 text-right border-r">Initial Stock</th>
                          <th className="p-3 text-right border-r">Purchased/Received</th>
                          <th className="p-3 text-right border-r bg-gray-50/50 font-bold text-gray-950">Total Stock</th>
                          <th className="p-3 text-right border-r">Sales</th>
                          <th className="p-3 text-right border-r bg-gray-50/50 font-bold text-gray-950">Remain Stock</th>
                          <th className="p-3 text-right border-r">Unit Price ($)</th>
                          <th className="p-3 text-right border-r bg-indigo-50/30 font-bold text-indigo-950">Total Valuation ($)</th>
                          <th className="p-3 text-right border-r">Purch. Price ($)</th>
                          <th className="p-3 text-right bg-emerald-50/35 font-bold text-emerald-950">Profit ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {computedItems.map((item) => {
                          const hasApprovedState = myReports.some(r => r.submissionStatus === 'approved');
                          const isInitialSetup = !hasApprovedState; 

                          // Lock rules matching spec:
                          // 'initialStock' is edit-enabled ONLY on are first setup system cycle. Clamped read-only in subsequent cycles.
                          // 'purchasedReceived', 'sales', and 'unitPrice' are edit-enabled.
                          // calculations cells are completely read-only.
                          const isLockedState = selectedReport.submissionStatus === 'approved' || selectedReport.submissionStatus === 'pending_approval';
                          const isInitialLocked = !isInitialSetup || isLockedState;
                          const isOtherLocked = isLockedState;

                          return (
                            <tr key={item.id} className="hover:bg-gray-50/40">
                              {/* COMMODITY CELL */}
                              <td className="p-2.5 font-semibold text-gray-900 border-r border-gray-200 bg-gray-50/10">
                                {item.commodityName}
                              </td>

                              {/* INITIAL STOCK */}
                              <td className="p-2 border-r border-gray-200 bg-gray-55/10">
                                <input
                                  type="number"
                                  disabled={isInitialLocked}
                                  value={item.initialStock}
                                  onChange={(e) => handleCellChange(item.id, 'initialStock', e.target.value)}
                                  className={`w-full text-right p-1.5 rounded text-xs font-mono border focus:outline bg-white font-medium ${
                                    isInitialLocked 
                                      ? 'bg-gray-50/50 text-gray-400 border-transparent cursor-not-allowed text-right' 
                                      : 'border-gray-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                                  }`}
                                />
                              </td>

                              {/* PURCHASED RECEIVED */}
                              <td className="p-2 border-r border-gray-200">
                                <input
                                  type="number"
                                  disabled={isOtherLocked}
                                  value={item.purchasedReceived}
                                  onChange={(e) => handleCellChange(item.id, 'purchasedReceived', e.target.value)}
                                  className={`w-full text-right p-1.5 rounded text-xs font-mono border focus:outline bg-white font-medium ${
                                    isOtherLocked 
                                      ? 'bg-gray-50/50 text-gray-400 border-transparent cursor-not-allowed' 
                                      : 'border-gray-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                                  }`}
                                />
                              </td>

                              {/* TOTAL STOCK (READ ONLY CALC) */}
                              <td className="p-2.5 text-right font-mono border-r border-gray-200 bg-gray-100/50 text-gray-900 font-bold">
                                {item.totalStock.toLocaleString()}
                              </td>

                              {/* SALES */}
                              <td className="p-2 border-r border-gray-200">
                                <input
                                  type="number"
                                  disabled={isOtherLocked}
                                  value={item.sales}
                                  onChange={(e) => handleCellChange(item.id, 'sales', e.target.value)}
                                  className={`w-full text-right p-1.5 rounded text-xs font-mono border focus:outline bg-white font-medium ${
                                    isOtherLocked 
                                      ? 'bg-gray-50/50 text-gray-400 border-transparent cursor-not-allowed' 
                                      : 'border-gray-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                                  }`}
                                />
                              </td>

                              {/* REMAIN STOCK (READ ONLY CALC) */}
                              <td className="p-2.5 text-right font-mono border-r border-gray-200 bg-gray-100/50 text-gray-900 font-bold">
                                {item.remainStock.toLocaleString()}
                              </td>

                              {/* UNIT PRICE */}
                              <td className="p-2 border-r border-gray-200">
                                <input
                                  type="number"
                                  step="0.01"
                                  disabled={isOtherLocked}
                                  value={item.unitPrice}
                                  onChange={(e) => handleCellChange(item.id, 'unitPrice', e.target.value)}
                                  className={`w-full text-right p-1.5 rounded text-xs font-mono border focus:outline bg-white font-medium ${
                                    isOtherLocked 
                                      ? 'bg-gray-50/50 text-gray-400 border-transparent cursor-not-allowed' 
                                      : 'border-gray-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                                  }`}
                                />
                              </td>

                              {/* GRAND VALUATION (READ ONLY CALC) */}
                              <td className="p-2.5 text-right font-mono font-bold bg-indigo-50/20 text-indigo-900 border-r border-gray-200">
                                ${item.totalValuation.toFixed(2)}
                              </td>

                              {/* PURCHASE PRICE */}
                              <td className="p-2 border-r border-gray-200 bg-emerald-50/5">
                                <input
                                  type="number"
                                  step="0.01"
                                  disabled={isOtherLocked}
                                  value={item.purchasePrice !== undefined ? item.purchasePrice : 0}
                                  onChange={(e) => handleCellChange(item.id, 'purchasePrice', e.target.value)}
                                  className={`w-full text-right p-1.5 rounded text-xs font-mono border focus:outline bg-white font-medium ${
                                    isOtherLocked 
                                      ? 'bg-gray-50/50 text-gray-400 border-transparent cursor-not-allowed' 
                                      : 'border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                                  }`}
                                />
                              </td>

                              {/* PROFIT (READ-ONLY CALC) */}
                              <td className={`p-2.5 text-right font-mono font-bold ${item.profit >= 0 ? 'bg-emerald-50/25 text-emerald-800' : 'bg-red-50/25 text-red-800'}`}>
                                ${item.profit.toFixed(2)}
                              </td>

                            </tr>
                          );
                        })}

                        {/* SUM TOTALS ROW */}
                        {(() => {
                          const totals = getGridTotals(computedItems);
                          return (
                            <tr id="table-totals-row" className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300">
                              <td className="p-3 border-r border-gray-100 uppercase text-[9px] tracking-wider">Sub-total assets</td>
                              <td className="p-3 text-right border-r font-mono text-gray-700">{totals.initialStock.toLocaleString()}</td>
                              <td className="p-3 text-right border-r font-mono text-gray-700">{totals.purchasedReceived.toLocaleString()}</td>
                              <td className="p-3 text-right border-r font-mono bg-gray-200/50">{totals.totalStock.toLocaleString()}</td>
                              <td className="p-3 text-right border-r font-mono text-gray-700">{totals.sales.toLocaleString()}</td>
                              <td className="p-3 text-right border-r font-mono bg-gray-200/50">{totals.remainStock.toLocaleString()}</td>
                              <td className="p-3 border-r border-gray-100 text-center text-gray-400">—</td>
                              <td className="p-3 text-right font-mono text-indigo-900 bg-indigo-100 font-bold border-r border-gray-200">${totals.totalValuation.toFixed(2)}</td>
                              <td className="p-3 text-right border-r font-mono text-emerald-900 bg-emerald-50/10">${totals.purchasePrice.toFixed(2)}</td>
                              <td className={`p-3 text-right font-mono font-black ${totals.profit >= 0 ? 'bg-emerald-100 text-emerald-950' : 'bg-red-100 text-red-950'}`}>${totals.profit.toFixed(2)}</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* BOTTOM SAVE ACTIONS ACTION BAR CONTAINER */}
                  {(selectedReport.submissionStatus === 'draft' || selectedReport.submissionStatus === 'rejected') && (
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-150">
                      
                      <button
                        id="op-save-draft"
                        disabled={isSubmitting}
                        onClick={handleSaveDraft}
                        className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 rounded-lg border border-gray-350 bg-white text-gray-700 px-4 py-2 hover:bg-gray-50 text-xs font-semibold disabled:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save Working Draft</span>
                      </button>

                      <button
                        id="op-submit-hq"
                        disabled={isSubmitting}
                        onClick={handleSubmitReport}
                        className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 rounded-lg bg-gray-900 text-white px-5 py-2 hover:bg-gray-800 text-xs font-semibold disabled:bg-gray-300 cursor-pointer transition-colors"
                      >
                        <Send className="h-4 w-4" />
                        <span>Submit to HQ Approval Board</span>
                      </button>

                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                  <FileSpreadsheet className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-gray-800">No initialized ledger cycle selected</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Select an initialized period from the timeline sidebar, or click the plus button to inherit carryover balances and start a new period draft.
                  </p>
                </div>
              )}

            </div>

          </div>

        </main>
      )}

      {/* FOOTER METADATA MARKERS */}
      <footer className="bg-white border-t border-gray-100 mt-auto py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-[10px] text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:px-6 lg:px-8">
          <span className="font-medium text-gray-500 md:text-xs">Built by Kenny • By God's grace</span>
          <div className="flex items-center space-x-3">
            <span className="font-mono text-gray-400">Version: v2.4 (React 19)</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-700 font-semibold uppercase">Operational &amp; Secure</span>
          </div>
        </div>
      </footer>

      {showChangePasswordModal && (
        <ChangePasswordModal 
          user={currentUser}
          onClose={() => setShowChangePasswordModal(false)}
          onPasswordChanged={(updatedUser) => {
            setCurrentUser(updatedUser);
            showToast("Password updated successfully.", "success");
          }}
        />
      )}

    </div>
  );
}
