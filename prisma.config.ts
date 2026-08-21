import "dotenv/config";
import { defineConfig, env } from "prisma/config";

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7 resolves the connection string here rather than in schema.prisma.
    // Relative SQLite paths resolve against this config file's directory.
    url: env<Env>("DATABASE_URL"),
  },
});
