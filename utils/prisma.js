import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const appendQueryParam = (url, key, value) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${value}`;
};

const getDatasourceUrl = () => {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }

  // Render-hosted Postgres commonly requires SSL for external connections.
  if (
    rawUrl.startsWith("postgresql://") &&
    !/sslmode=|ssl=/.test(rawUrl)
  ) {
    return appendQueryParam(rawUrl, "sslmode", "require");
  }

  return rawUrl;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"],
    datasources: {
      db: {
        url: getDatasourceUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const connectPrismaWithRetry = async (attempts = 3, delayMs = 2000) => {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await prisma.$connect();
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `Prisma connection attempt ${attempt}/${attempts} failed:`,
        error.message
      );

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
};
