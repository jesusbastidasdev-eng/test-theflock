import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** `apps/api` (contains `prisma/`, `src/`) */
const apiRoot = path.resolve(__dirname, "..");
/** Monorepo root (parent of `apps/`) */
const monorepoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(monorepoRoot, ".env") });
dotenv.config({ path: path.join(apiRoot, ".env") });
