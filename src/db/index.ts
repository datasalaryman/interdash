import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import { getDatabaseUrl } from "./url";

type Database = NodePgDatabase<typeof schema>;

let db: Database | null = null;
let pool: Pool | null = null;

export function hasDatabaseUrl() {
	return Boolean(getDatabaseUrl());
}

export function getDb() {
	const connectionString = getDatabaseUrl();

	if (!connectionString) {
		return null;
	}

	if (!db) {
		pool = new Pool({ connectionString });
		db = drizzle(pool, { schema });
	}

	return db;
}

export async function closeDb() {
	await pool?.end();
	pool = null;
	db = null;
}
