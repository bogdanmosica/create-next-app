export const drizzleConfigTemplate = `import type { Config } from "drizzle-kit";

export default {
  schema: "./models/schema/index.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
} satisfies Config;`;