import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};

export const generateToken = async (userId: string, secret: string, expiresIn: string = "7d") => {
  const secretKey = new TextEncoder().encode(secret);
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
};

export const verifyToken = async (token: string, secret: string) => {
  const secretKey = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, secretKey);
  return payload as { userId: string };
};

export const generateRecoveryCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
