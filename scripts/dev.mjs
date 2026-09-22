import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const certs = resolve(root, ".certs", "windows-roots.pem");
const env = { ...process.env };
if (!env.NODE_EXTRA_CA_CERTS && existsSync(certs)) {
  env.NODE_EXTRA_CA_CERTS = certs;
}

const child = spawn("npx", ["next", "dev"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
