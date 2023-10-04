import { OpenAPI } from "./gen";

OpenAPI.BASE = "https://app.windmill.dev/api";

OpenAPI.TOKEN = () => {
  throw new Error("Must call setupOpenApiToken before using Windmill services.");
};

export function setupOpenApiToken(token: string) {
  OpenAPI.TOKEN = token;
}

export * from "./gen";
