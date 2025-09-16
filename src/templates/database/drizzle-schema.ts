export const drizzleSchemaTemplate = `import { integer, pgSchema } from "drizzle-orm/pg-core";

export const customSchema = pgSchema('custom');

export const users = customSchema.table('users', {
  id: integer()
});`;