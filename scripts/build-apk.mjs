import { rename } from "fs/promises";
import { execSync } from "child_process";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const scriptsDir = join(process.cwd(), "scripts");
if (!existsSync(scriptsDir)) {
  mkdirSync(scriptsDir);
}

const apiPath = join(process.cwd(), "app", "api");
const apiBackupPath = join(process.cwd(), "app", "_api");

async function main() {
  let moved = false;
  try {
    if (existsSync(apiPath)) {
      console.log("Renaming app/api to app/_api to bypass static export restrictions...");
      await rename(apiPath, apiBackupPath);
      moved = true;
    }

    console.log("Running next build --webpack in export mode...");
    process.env.BUILD_MODE = "export";
    execSync("npx next build --webpack", { stdio: "inherit", env: process.env });

  } catch (error) {
    console.error("Build failed:", error);
    process.exitCode = 1;
  } finally {
    if (moved) {
      console.log("Restoring app/api...");
      await rename(apiBackupPath, apiPath);
    }
  }
}

main();
