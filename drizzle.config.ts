import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: "YOUR_ACCOUNT_ID", // Placeholder
    databaseId: "gymrol-db-id",
    token: "YOUR_TOKEN", // Placeholder
  },
});
