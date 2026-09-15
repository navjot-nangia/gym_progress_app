import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const liftEntries = sqliteTable("lift_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lift: text("lift").notNull(),
  weight: real("weight").notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
