export function getDatabaseUrl() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		return undefined;
	}

	return normalizeDatabaseUrl(databaseUrl);
}

function normalizeDatabaseUrl(databaseUrl: string) {
	try {
		const url = new URL(databaseUrl);

		if (url.searchParams.get("sslrootcert") === "system") {
			url.searchParams.delete("sslrootcert");
		}

		return url.toString();
	} catch {
		return databaseUrl;
	}
}
