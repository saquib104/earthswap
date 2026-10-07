/**
 * One-time entity secret registration script.
 * Generates a 32-byte secret, registers its ciphertext with Circle,
 * writes the recovery file to .circle/recovery_file.dat,
 * and appends CIRCLE_ENTITY_SECRET to .env.
 *
 * Run: bun run scripts/register-entity-secret.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { registerEntitySecretCiphertext, initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const APP_ROOT = "/home/user/app";
const RECOVERY_DIR = path.join(APP_ROOT, ".circle");
const RECOVERY_PATH = path.join(RECOVERY_DIR, "recovery_file.dat");
const ENV_PATH = path.join(APP_ROOT, ".env");

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    console.error("ERROR: CIRCLE_API_KEY is not set in .env");
    process.exit(1);
  }

  // Check if already registered
  const envContents = fs.readFileSync(ENV_PATH, "utf-8");
  if (envContents.includes("CIRCLE_ENTITY_SECRET=")) {
    console.error("ERROR: CIRCLE_ENTITY_SECRET is already set in .env. Aborting to avoid overwriting.");
    process.exit(1);
  }

  // 1. Generate secret — never printed to stdout
  const entitySecret = crypto.randomBytes(32).toString("hex");

  // 2. Ensure recovery dir exists
  fs.mkdirSync(RECOVERY_DIR, { recursive: true });

  // 3. Register with Circle
  console.log("Registering entity secret ciphertext with Circle...");
  let response;
  try {
    response = await registerEntitySecretCiphertext({
      apiKey,
      entitySecret,
      recoveryFileDownloadPath: RECOVERY_DIR,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ERROR: Registration failed:", msg);
    process.exit(1);
  }

  // 4. Write recovery file
  if (response.data?.recoveryFile) {
    fs.writeFileSync(RECOVERY_PATH, response.data.recoveryFile, "utf-8");
    console.log("Recovery file written to .circle/recovery_file.dat");
  } else {
    // SDK may have written it already — check
    if (!fs.existsSync(RECOVERY_PATH)) {
      console.error("WARNING: Recovery file was not returned or written. Proceeding, but you must obtain it from Circle Console.");
    }
  }

  // 5. Persist to .env
  fs.appendFileSync(ENV_PATH, `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`, "utf-8");
  console.log("CIRCLE_ENTITY_SECRET appended to .env");

  // 6. Verify registration by calling a read-only endpoint
  console.log("Verifying registration...");
  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  try {
    await client.listWalletSets({ pageSize: 1 });
    console.log("SUCCESS: Entity secret is registered and verified.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ERROR: Verification failed:", msg);
    process.exit(1);
  }
}

void main();
