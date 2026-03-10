import { DrizzleD1Database } from "drizzle-orm/d1";

export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  RESEND_API_KEY: string;
  RESEND_EMAIL_FROM: string;
};

export type Variables = {
  userId: string;
};

export type DBType = DrizzleD1Database<typeof import("c:/Users/facua/OneDrive/Escritorio/gymrol-be/src/db/schema")> & {
  $client: D1Database;
}