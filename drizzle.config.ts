import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: "3375c7006881c3b666bce6db4ea0b168", // Placeholder
    databaseId: "22a1442c-64be-466b-917c-02e3a19c5d9c",
    token: "TRaNQMdux5_B7YhQH3onOprGQDpJVqNR6AB6RmrK", // Placeholder
  },
});
