const { spawn } = require("child_process");

function run(command) {
  return spawn(command, {
    stdio: "inherit",
    shell: true,
    windowsHide: false,
  });
}

console.log("Starting Fazajoo frontend and backend...");

const frontend = run("npm run dev:frontend");
const backend = run("npm run dev:backend");

let stopping = false;

function stopAll() {
  if (stopping) return;
  stopping = true;

  if (process.platform === "win32") {
    if (frontend.pid) {
      spawn("taskkill", ["/pid", String(frontend.pid), "/T", "/F"], {
        stdio: "ignore",
        shell: true,
      });
    }
    if (backend.pid) {
      spawn("taskkill", ["/pid", String(backend.pid), "/T", "/F"], {
        stdio: "ignore",
        shell: true,
      });
    }
  } else {
    if (!frontend.killed) frontend.kill("SIGTERM");
    if (!backend.killed) backend.kill("SIGTERM");
  }
}

frontend.on("error", (err) => console.error("Frontend start error:", err.message));
backend.on("error", (err) => console.error("Backend start error:", err.message));

process.on("SIGINT", () => {
  stopAll();
  setTimeout(() => process.exit(0), 300);
});

process.on("SIGTERM", () => {
  stopAll();
  setTimeout(() => process.exit(0), 300);
});
