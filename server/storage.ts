import { db } from "../db/index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session, { type Store } from "express-session";
import type {
  UserAccount,
  InsertUserAccount,
  RoleAssignment,
  InsertRoleAssignment,
  TeacherClassSubject,
  InsertTeacherClassSubject,
  ParentStudentLink,
  InsertParentStudentLink,
  RoleAuditLog,
  InsertRoleAuditLog,
} from "@shared/schema";

const scryptAsync = promisify(scrypt);

export interface IStorage {
  getUser: (id: number) => Promise<schema.User | undefined>;
  getUserByUsername: (username: string) => Promise<schema.User | undefined>;
  getUserByEmail: (email: string) => Promise<schema.User | undefined>;
  createUser: (user: schema.InsertUser) => Promise<schema.User>;
  updateUserLastLogin: (id: number) => Promise<void>;
  sessionStore: Store;
  
  // User accounts
  getUserAccount(userId: string): Promise<UserAccount | null>;
  createUserAccount(data: InsertUserAccount): Promise<UserAccount>;
  updateUserAccount(userId: string, data: Partial<InsertUserAccount>): Promise<UserAccount>;
  
  // Role assignments
  getUserRoles(userId: string): Promise<RoleAssignment[]>;
  assignRole(data: InsertRoleAssignment): Promise<RoleAssignment>;
  removeRole(userId: string, schoolId: number, role: string): Promise<void>;
  getRolesBySchool(schoolId: number): Promise<RoleAssignment[]>;
  
  // Teacher assignments
  getTeacherAssignments(teacherId: string): Promise<TeacherClassSubject[]>;
  assignTeacherToClass(data: InsertTeacherClassSubject): Promise<TeacherClassSubject>;
  removeTeacherAssignment(id: number): Promise<void>;
  
  // Parent links
  getParentLinks(parentId: string): Promise<ParentStudentLink[]>;
  linkParentToStudent(data: InsertParentStudentLink): Promise<ParentStudentLink>;
  removeParentLink(id: number): Promise<void>;
  
  // Audit logs
  createRoleAuditLog(data: InsertRoleAuditLog): Promise<RoleAuditLog>;
  getRoleAuditLogs(schoolId?: number): Promise<RoleAuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;

  constructor() {
    // Use memory session store to avoid PostgreSQL connection issues with Supabase
    this.sessionStore = new session.MemoryStore();
  }

  async getUser(id: number): Promise<schema.User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, id)
    });
    return user;
  }

  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.username, username)
    });
    return user;
  }

  async createUser(user: schema.InsertUser): Promise<schema.User> {
    const [newUser] = await db.insert(schema.users)
      .values(user)
      .returning();
    return newUser;
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    });
    return user;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db.update(schema.users)
      .set({ lastLogin: new Date() })
      .where(eq(schema.users.id, id));
  }

  // Additional storage methods for the school management system
  async getStudents() {
    return await db.query.students.findMany();
  }

  async getFeeReceipts() {
    return await db.query.feeReceipts.findMany({
      with: {
        items: true,
        student: true
      }
    });
  }
}

// Temporary memory storage class to bypass database issues
class MemoryStorage implements IStorage {
  private users: Map<number, schema.User> = new Map();
  private userIdCounter = 1;
  private userAccounts: UserAccount[] = [];
  private roleAssignments: RoleAssignment[] = [];
  private teacherClassSubjects: TeacherClassSubject[] = [];
  private parentStudentLinks: ParentStudentLink[] = [];
  private roleAuditLogs: RoleAuditLog[] = [];
  private roleAssignmentIdCounter = 1;
  private teacherAssignmentIdCounter = 1;
  private parentLinkIdCounter = 1;
  private auditLogIdCounter = 1;
  sessionStore: Store;

  constructor() {
    this.sessionStore = new session.MemoryStore();
  }

  async getUser(id: number): Promise<schema.User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) return user;
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async createUser(userData: schema.InsertUser): Promise<schema.User> {
    const newUser: schema.User = {
      id: this.userIdCounter++,
      username: userData.username,
      name: userData.name,
      email: userData.email,
      passwordHash: userData.passwordHash,
      role: userData.role || 'user',
      schoolId: userData.schoolId || null,
      studentId: userData.studentId || null,
      credits: userData.credits || 0,
      isActive: userData.isActive !== false,
      isAdmin: userData.role === 'admin',
      lastLogin: null,
      profilePicture: userData.profilePicture || null,
      phoneNumber: userData.phoneNumber || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLogin = new Date();
      user.updatedAt = new Date();
    }
  }

  async getStudents() {
    return [];
  }

  async getFeeReceipts() {
    return [];
  }

  // User Account methods
  async getUserAccount(userId: string): Promise<UserAccount | null> {
    const account = this.userAccounts.find(acc => acc.id === userId);
    return account || null;
  }

  async createUserAccount(data: InsertUserAccount): Promise<UserAccount> {
    const newAccount: UserAccount = {
      ...data,
      createdAt: new Date(),
    };
    this.userAccounts.push(newAccount);
    return newAccount;
  }

  async updateUserAccount(userId: string, data: Partial<InsertUserAccount>): Promise<UserAccount> {
    const index = this.userAccounts.findIndex(acc => acc.id === userId);
    if (index === -1) {
      throw new Error(`User account not found: ${userId}`);
    }
    this.userAccounts[index] = {
      ...this.userAccounts[index],
      ...data,
    };
    return this.userAccounts[index];
  }

  // Role Assignment methods
  async getUserRoles(userId: string): Promise<RoleAssignment[]> {
    return this.roleAssignments.filter(ra => ra.userId === userId);
  }

  async assignRole(data: InsertRoleAssignment): Promise<RoleAssignment> {
    const newRole: RoleAssignment = {
      id: this.roleAssignmentIdCounter++,
      ...data,
      createdAt: new Date(),
    };
    this.roleAssignments.push(newRole);
    return newRole;
  }

  async removeRole(userId: string, schoolId: number, role: string): Promise<void> {
    this.roleAssignments = this.roleAssignments.filter(
      ra => !(ra.userId === userId && ra.schoolId === schoolId && ra.role === role)
    );
  }

  async getRolesBySchool(schoolId: number): Promise<RoleAssignment[]> {
    return this.roleAssignments.filter(ra => ra.schoolId === schoolId);
  }

  // Teacher Assignment methods
  async getTeacherAssignments(teacherId: string): Promise<TeacherClassSubject[]> {
    return this.teacherClassSubjects.filter(tcs => tcs.teacherId === teacherId);
  }

  async assignTeacherToClass(data: InsertTeacherClassSubject): Promise<TeacherClassSubject> {
    const newAssignment: TeacherClassSubject = {
      id: this.teacherAssignmentIdCounter++,
      ...data,
      createdAt: new Date(),
    };
    this.teacherClassSubjects.push(newAssignment);
    return newAssignment;
  }

  async removeTeacherAssignment(id: number): Promise<void> {
    this.teacherClassSubjects = this.teacherClassSubjects.filter(tcs => tcs.id !== id);
  }

  // Parent Link methods
  async getParentLinks(parentId: string): Promise<ParentStudentLink[]> {
    return this.parentStudentLinks.filter(psl => psl.parentId === parentId);
  }

  async linkParentToStudent(data: InsertParentStudentLink): Promise<ParentStudentLink> {
    const newLink: ParentStudentLink = {
      id: this.parentLinkIdCounter++,
      ...data,
      createdAt: new Date(),
    };
    this.parentStudentLinks.push(newLink);
    return newLink;
  }

  async removeParentLink(id: number): Promise<void> {
    this.parentStudentLinks = this.parentStudentLinks.filter(psl => psl.id !== id);
  }

  // Audit Log methods
  async createRoleAuditLog(data: InsertRoleAuditLog): Promise<RoleAuditLog> {
    const newLog: RoleAuditLog = {
      id: this.auditLogIdCounter++,
      ...data,
      timestamp: new Date(),
    };
    this.roleAuditLogs.push(newLog);
    return newLog;
  }

  async getRoleAuditLogs(schoolId?: number): Promise<RoleAuditLog[]> {
    if (schoolId) {
      return this.roleAuditLogs.filter(log => log.schoolId === schoolId);
    }
    return this.roleAuditLogs;
  }
}

// Use database storage for production
export const storage = new DatabaseStorage();
