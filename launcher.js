import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import figlet from 'figlet';
import { logInfo, logSuccess, logError } from './src/utils/logger.js';

const execAsync = promisify(exec);
const isDev = process.env.DEV_MODE === 'true';

function figletAsync(text) {
  return new Promise((resolve, reject) => {
    figlet.text(text, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

async function checkDockerReady() {
  try {
    await execAsync("docker info");
    return true;
  } catch {
    return false;
  }
}

async function waitForDockerAndStart() {
  logInfo("Checking Docker status...");

  const isReady = await checkDockerReady();

  if (isReady) {
    logSuccess("Docker is ready. Starting RabbitMQ Container...");

    try {
      const { stdout } = await execAsync("docker compose up -d");
      console.log(stdout.trim());

      logInfo("Starting WebSocket Server...");

      if (isDev) {
        logInfo("Dev mode enabled. Skipping Rider launch in index.js");
      }

      const devProcess = spawn("node", ["src/index.js"], {
        cwd: process.cwd(),
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          FORCE_COLOR: "true",
          DEV_MODE: isDev ? "true" : "false"
        }
      });

      devProcess.on("exit", (code) => {
        logError(`Server exited with code ${code}`);
      });

    } catch (err) {
      logError("Error starting Docker Compose or Websocket Server:");
      console.error(err.message || err);
    }

  } else {
    logError("Docker not ready yet. Retrying in 5 seconds...");
    setTimeout(waitForDockerAndStart, 5000);
  }
}

async function main() {
  const banner = await figletAsync("Rider Server");
  console.log(chalk.greenBright(banner));
  waitForDockerAndStart();
}

main();
