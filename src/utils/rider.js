import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import { logSuccess, logError } from './logger.js';

const execAsync = promisify(exec);

export async function launchRider() {
  const username = os.userInfo().username;
  const riderPath = `C:\\Users\\${username}\\AppData\\Local\\rider\\Rider.exe`;

  try {
    execAsync(`"${riderPath}"`);
    logSuccess('Rider launched successfully.');
  } catch (err) {
    logError(`Failed to launch Rider: ${err.message}`);
  }
}
