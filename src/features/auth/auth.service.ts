import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { User } from "./auth.types";
import { users, recoveryTokens } from "../../db/schema";
import { and, eq, gt } from "drizzle-orm";
import { Context } from "hono";
import { DBType } from "../../types";

export const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};

export const verifyToken = async (token: string, secret: string) => {
  const secretKey = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, secretKey);
  return payload as { userId: string };
};

export default class AuthService {

  constructor(private db: DBType) {
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return await this.db.query.users.findFirst({
        where: eq(users.email, email),
    });
  }

  async registerNewUser(email: string, password: string): Promise<User | undefined> {
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();

    await this.db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      level: 1,
      xp: 0,
      equipment: [],
      isPremium: false,
      createdAt: new Date()
    });

    return await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  async registerNewUserByGoogleId(email: string, googleId: string): Promise<User | undefined> {
    const userId = crypto.randomUUID();
    await this.db.insert(users).values({
      id: userId,
      email,
      googleId,
      level: 1,
      xp: 0,
      equipment: [],
      isPremium: false,
      createdAt: new Date()
    });

    return await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  async areCredentialsValid(user: User, password: string): Promise<boolean> {
    return !!(user.passwordHash && await comparePassword(password, user.passwordHash));
  }

  async generateToken(userId: string, secret: string, expiresIn: string = "7d") {
    const secretKey = new TextEncoder().encode(secret);
    return await new SignJWT({ userId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secretKey);
  };

  async findRecoveryToken(userId: string, code: string) {
    return await this.db.query.recoveryTokens.findFirst({
      where: and(
        eq(recoveryTokens.userId, userId),
        eq(recoveryTokens.code, code),
        gt(recoveryTokens.expiresAt, new Date())
      ),
    });
  }

  async updateUserPassword(userId: string, newPassword: string) {
    const newPasswordHash = await hashPassword(newPassword);
    
    await this.db.update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async deleteUserAllRecoveryTokens(userId: string) {
    await this.db.delete(recoveryTokens).where(eq(recoveryTokens.userId, userId));
  }

  async generateRecoveryCode(userId: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.db.insert(recoveryTokens).values({
      userId,
      code,
      expiresAt,
    });

    return code;
  }

  async sendRecoveryEmail(email: string, code: string, c: Context) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: c.env.RESEND_EMAIL_FROM,
        to: email,
        subject: "GymRol - Recovery Code",
        html: `<p>Your recovery code is: <strong>${code}</strong>. It expires in 15 minutes.</p>`,
      }),
    });
  }
}