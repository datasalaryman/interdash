import "dotenv/config";
import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./src/db/url";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	tablesFilter: "interdash_*",
	dbCredentials: {
		url: getDatabaseUrl() ?? "",
	},
});
