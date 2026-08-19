import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isStaffRole, normalizeRole } from "../lib/roles";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: string;
      clerkId?: string;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkId = clerkUserId;

  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
  if (existing.length === 0) {
    req.userId = undefined;
    req.userRole = "client";
  } else {
    req.userId = existing[0].id;
    req.userRole = normalizeRole(existing[0].role);
  }
  next();
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await requireAuth(req, res, () => {
    if (req.userRole !== "admin" && req.userRole !== "owner") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
};

export const requireOwner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await requireAuth(req, res, () => {
    if (req.userRole !== "owner") {
      res.status(403).json({ error: "Forbidden — Owner only" });
      return;
    }
    next();
  });
};

export const requireStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await requireAuth(req, res, () => {
    if (!isStaffRole(req.userRole)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
};
