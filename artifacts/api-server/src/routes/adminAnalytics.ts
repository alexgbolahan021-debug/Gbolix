import { Router } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import {
  activityTable,
  creditAccountsTable,
  creditLedgerEntriesTable,
  db,
  paymentsTable,
  productOrdersTable,
  projectsTable,
  usersTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAuth";

const router = Router();
const ACTIVE_PROJECT_STATUSES = new Set(["approved", "agreement_sent", "agreement_accepted", "queued", "in_progress", "review"]);
const ACCEPTED_REQUEST_STATUSES = new Set(["approved", "agreement_sent", "agreement_accepted", "queued", "in_progress", "review", "completed"]);
const TERMINAL_PROJECT_STATUSES = new Set(["completed", "declined"]);

type Slice = { name: string; value: number };
type Money = { currency: string; amount: number };
type TrendPoint = { date: string; value: number; currency?: string };

function dateRange(value: unknown) {
  const range = String(value ?? "all");
  if (range === "7d") return { key: range, start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  if (range === "30d") return { key: range, start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  if (range === "90d") return { key: range, start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
  if (range === "12m") return { key: range, start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) };
  return { key: "all", start: null };
}

function increment(map: Map<string, number>, key: unknown) {
  const label = String(key || "Unknown");
  map.set(label, (map.get(label) ?? 0) + 1);
}

function slices(map: Map<string, number>): Slice[] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
}

function moneyByCurrency(rows: Array<{ amount: string | number; currency: string }>): Money[] {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + Number(row.amount || 0));
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 }));
}

function bucket(date: Date, range: string) {
  if (range === "12m" || range === "all") return date.toISOString().slice(0, 7);
  return date.toISOString().slice(0, 10);
}

function trend(rows: Array<{ createdAt: Date; value: number; currency?: string }>, range: string): TrendPoint[] {
  const values = new Map<string, number>();
  for (const row of rows) {
    const key = `${bucket(row.createdAt, range)}${row.currency ? `:${row.currency}` : ""}`;
    values.set(key, (values.get(key) ?? 0) + row.value);
  }
  return [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => {
    const [date, currency] = key.split(":");
    return { date, value: Math.round(value * 100) / 100, ...(currency ? { currency } : {}) };
  });
}

router.get("/insights", requireAdmin, async (req, res): Promise<void> => {
  const { start, key: range } = dateRange(req.query.range);
  const [users, projects, payments, orders, accounts, ledger] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(projectsTable),
    db.select({ amount: paymentsTable.amount, currency: paymentsTable.currency, status: paymentsTable.status, createdAt: paymentsTable.createdAt, projectId: paymentsTable.projectId }).from(paymentsTable),
    db.select().from(productOrdersTable),
    db.select().from(creditAccountsTable),
    db.select().from(creditLedgerEntriesTable),
  ]);

  const userTypeMap = new Map<string, number>();
  const locationMap = new Map<string, number>();
  const companySizeMap = new Map<string, number>();
  const acquisitionMap = new Map<string, number>();
  for (const user of users) {
    increment(userTypeMap, user.userType);
    increment(locationMap, user.country);
    increment(companySizeMap, user.companySize);
    increment(acquisitionMap, user.acquisitionSource);
  }

  const statusMap = new Map<string, number>();
  const serviceMap = new Map<string, number>();
  for (const project of projects) {
    increment(statusMap, project.status);
    increment(serviceMap, project.serviceType);
  }

  const paidPayments = payments.filter(payment => payment.status === "paid");
  const pendingPayments = payments.filter(payment => payment.status === "pending");
  const declinedPayments = payments.filter(payment => payment.status === "failed" || payment.status === "cancelled");
  const projectsInRange = start ? projects.filter(project => project.createdAt >= start) : projects;
  const usersInRange = start ? users.filter(user => user.createdAt >= start) : users;
  const ordersInRange = start ? orders.filter(order => order.createdAt >= start) : orders;

  const newUsersThisWeek = users.filter(user => user.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
  const acceptedRequests = projects.filter(project => ACCEPTED_REQUEST_STATUSES.has(project.status)).length;
  const completedProjects = projects.filter(project => project.status === "completed").length;
  const activeProjects = projects.filter(project => ACTIVE_PROJECT_STATUSES.has(project.status)).length;
  const pendingRequests = projects.filter(project => project.status === "pending_review").length;
  const declinedProjects = projects.filter(project => project.status === "declined").length;
  const conversionRate = projects.length ? Math.round((acceptedRequests / projects.length) * 10000) / 100 : 0;

  const walletPurchases = orders.filter(order => order.status === "paid");
  const walletPurchaseValue = moneyByCurrency(walletPurchases);
  const walletCreditsPurchased = walletPurchases.reduce((total, order) => total + order.credits, 0);
  const walletOutstandingCredits = accounts.reduce((total, account) => total + account.availableCredits + account.reservedCredits, 0);
  const walletCreditsUsed = Math.abs(ledger.filter(entry => entry.entryType === "finalize").reduce((total, entry) => total + entry.credits, 0));
  const walletCustomers = new Set(walletPurchases.map(order => order.purchasedByUserId)).size;
  const walletAveragePurchaseValue = walletPurchases.length ? moneyByCurrency(walletPurchases).map(item => ({ ...item, amount: Math.round((item.amount / walletPurchases.filter(order => order.currency === item.currency).length) * 100) / 100 })) : [];

  const statusValueMap = new Map<string, number>();
  for (const project of projects) statusValueMap.set(project.status, (statusValueMap.get(project.status) ?? 0) + Number(project.price ?? 0));
  const projectValueByStatus = [...statusValueMap.entries()].map(([status, amount]) => ({ status, currency: "USD", amount: Math.round(amount * 100) / 100 }));

  const recentActivity = await db.select({ createdAt: activityTable.createdAt }).from(activityTable).orderBy(desc(activityTable.createdAt)).limit(1);

  res.json({
    range,
    generatedAt: new Date().toISOString(),
    totalUsers: users.length,
    totalClients: users.filter(user => user.role === "client").length,
    totalRequests: projects.length,
    totalProjects: projects.length,
    activeProjects,
    completedProjects,
    pendingRequests,
    acceptedRequests,
    completedRequests: completedProjects,
    declinedProjects,
    cancelledProjects: 0,
    openTickets: null,
    newUsersThisWeek,
    conversionRate,
    projectValue: moneyByCurrency(projects.filter(project => project.price !== null).map(project => ({ amount: project.price!, currency: "USD" }))),
    totalAmountPaid: moneyByCurrency(paidPayments),
    totalAmountPending: moneyByCurrency(pendingPayments),
    totalAmountDeclined: moneyByCurrency(declinedPayments),
    totalRevenue: moneyByCurrency(paidPayments),
    outstandingPaymentValue: moneyByCurrency(pendingPayments),
    activeProjectValue: [{ currency: "USD", amount: Math.round(projects.filter(project => ACTIVE_PROJECT_STATUSES.has(project.status)).reduce((total, project) => total + Number(project.price ?? 0), 0) * 100) / 100 }],
    completedProjectValue: [{ currency: "USD", amount: Math.round(projects.filter(project => project.status === "completed").reduce((total, project) => total + Number(project.price ?? 0), 0) * 100) / 100 }],
    projectValueByStatus,
    wallet: { totalPurchases: walletPurchases.length, purchaseValue: walletPurchaseValue, creditsPurchased: walletCreditsPurchased, outstandingCredits: walletOutstandingCredits, creditsUsed: walletCreditsUsed, purchasingCustomers: walletCustomers, averagePurchaseValue: walletAveragePurchaseValue },
    userTypeBreakdown: slices(userTypeMap),
    locationBreakdown: slices(locationMap),
    companySizeBreakdown: slices(companySizeMap),
    acquisitionSourceBreakdown: slices(acquisitionMap),
    serviceRequestBreakdown: slices(serviceMap),
    statusBreakdown: slices(statusMap),
    usersOverTime: trend(usersInRange.map(user => ({ createdAt: user.createdAt, value: 1 })), range),
    clientsOverTime: trend(usersInRange.filter(user => user.role === "client").map(user => ({ createdAt: user.createdAt, value: 1 })), range),
    projectsOverTime: trend(projectsInRange.map(project => ({ createdAt: project.createdAt, value: 1 })), range),
    revenueOverTime: trend(paidPayments.filter(payment => !start || payment.createdAt >= start).map(payment => ({ createdAt: payment.createdAt, value: Number(payment.amount), currency: payment.currency })), range),
    creditPurchaseValueOverTime: trend(walletPurchases.filter(order => !start || order.createdAt >= start).map(order => ({ createdAt: order.createdAt, value: Number(order.amount), currency: order.currency })), range),
    walletOrdersInRange: ordersInRange.filter(order => order.status === "paid").length,
    lastActivityAt: recentActivity[0]?.createdAt?.toISOString() ?? null,
    dataAvailability: { refunds: false, partialPayments: false, tickets: false, cancelledProjects: false },
    insightsSummary: [
      `${activeProjects} active project${activeProjects === 1 ? "" : "s"} currently require attention.`,
      `${paidPayments.length} project payment${paidPayments.length === 1 ? "" : "s"} confirmed from the payment ledger.`,
      `${walletPurchases.length} successful wallet purchase${walletPurchases.length === 1 ? "" : "s"} recorded.`
    ],
  });
});

export default router;
