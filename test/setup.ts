// Vitest does not read .env the way Next.js does, so load it before any test
// module imports the Prisma client (which reads DATABASE_URL at import time).
import "dotenv/config";
