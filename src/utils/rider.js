import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import {logSuccess, logError, logInfo} from './logger.js';

const execAsync = promisify(exec);

export async function launchRider() {
  if (process.platform !== 'win32') {
    logInfo('Skipping Rider launch: not on Windows');
    return;
  }

  const username = os.userInfo().username;
  const riderPath = `C:\\Users\\${username}\\AppData\\Local\\rider\\Rider.exe`;

  try {
    execAsync(`"${riderPath}"`);
    logSuccess('Rider launched successfully.');
  } catch (err) {
    logError(`Failed to launch Rider: ${err.message}`);
  }
}
