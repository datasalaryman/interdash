import { createClient, type RedisClientType } from "redis";

let clientPromise: Promise<RedisClientType | null> | null = null;

async function getRedisClient() {
	const url = process.env.REDIS_URL;

	if (!url) {
		return null;
	}

	if (!clientPromise) {
		const client = createClient({ url });
		client.on("error", (error) => {
			console.error("Redis cache error", error);
		});

		clientPromise = client
			.connect()
			.then(() => client as RedisClientType)
			.catch((error) => {
				console.error("Redis cache connection failed", error);
				return null;
			});
	}

	return clientPromise;
}

export async function readThroughCache<T>(
	key: string,
	loader: () => Promise<T>,
	ttlSeconds = 30,
) {
	const client = await getRedisClient();

	if (!client) {
		return loader();
	}

	const cached = await client.get(key);

	if (cached) {
		return JSON.parse(cached) as T;
	}

	const value = await loader();
	await client.set(key, JSON.stringify(value), { EX: ttlSeconds });

	return value;
}

export async function deleteCacheKeys(keys: Array<string>) {
	const client = await getRedisClient();

	if (!client || keys.length === 0) {
		return;
	}

	await client.del(keys);
}
