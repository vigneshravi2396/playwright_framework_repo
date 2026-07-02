import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ✅ Define __filename and __dirname in ESM scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine environment name from ENV or default to 'local'
const envName = (process.env.ENV || 'local').toLowerCase();
const envFile = `.env.${envName}`;

// ✅ Load the appropriate .env file (local only; CI uses workflow env / secrets / variables)
if (!process.env.CI) {
  dotenv.config({ path: resolve(__dirname, envFile), override: false });
}

// ❗Helper to ensure required environment variables are present
function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue = ''): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  return value;
}

const selfhealEnabled = optionalEnv('SELF_HEAL_ENABLED', 'false');

// ✅ Export the config
const config = {
  baseUrl: requireEnv('BASE_URL'),
  openAIKey:
    selfhealEnabled === 'true'
      ? requireEnv('OPENAI_API_KEY')
      : optionalEnv('OPENAI_API_KEY'),
  userName: requireEnv('USER_NAME'),
  password: requireEnv('PASSWORD'),
  selfhealEnabled,
  allScreenshotsEnabled: optionalEnv('ALL_SCREENSHOT_ENABLED', 'false'),
  //password: requireEnv('PASSWORD'),
  //apiUrl: requireEnv('API_URL'),
};

export default config;
