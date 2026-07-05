import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createFileRoute } from "@tanstack/react-router";

import { apiRouter } from "@/server/api/router";

const handler = new OpenAPIHandler(apiRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			docsPath: "/docs",
			docsProvider: "swagger",
			docsTitle: "interdash API",
			schemaConverters: [new ZodToJsonSchemaConverter()],
			specGenerateOptions: {
				info: {
					title: "interdash API",
					version: "0.1.0",
				},
				servers: [{ url: "/api" }],
			},
			specPath: "/openapi.json",
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: {
			ANY: async ({ request }) => {
				const { response } = await handler.handle(request, {
					context: {},
					prefix: "/api",
				});

				return response ?? new Response("Not Found", { status: 404 });
			},
		},
	},
});
