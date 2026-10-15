import { spawn } from 'node:child_process';

const apiKey = process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey) {
  console.error('Missing OPENROUTER_API_KEY. Add it as a GitHub Actions secret; do not paste it into the workflow.');
  process.exit(1);
}

const baseUrl = 'http://127.0.0.1:3000';
const server = spawn('bun', ['run', 'dev'], {
  detached: true,
  env: { ...process.env, DISABLE_HMR: 'true' },
  stdio: 'ignore',
});
let spawnError = null;
server.on('error', (error) => {
  spawnError = error;
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function stopServer() {
  if (!server.pid || server.exitCode !== null || server.signalCode !== null) return;
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    wait(5000),
  ]);
  if (server.exitCode === null && server.signalCode === null) {
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {
      server.kill('SIGKILL');
    }
  }
}

async function verify() {
  let config;
  const startupDeadline = Date.now() + 90000;

  while (Date.now() < startupDeadline) {
    if (spawnError) throw new Error('Could not start the app server.');
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error('The app server exited before its API became available.');
    }

    try {
      const response = await fetch(`${baseUrl}/api/ai/config`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        config = await response.json();
        break;
      }
    } catch {
      // The Vite server is still starting.
    }
    await wait(1000);
  }

  if (!config) throw new Error('The app server did not become ready within 90 seconds.');
  if (!config.configured || config.provider !== 'openrouter') {
    throw new Error('The app server did not resolve the OpenRouter environment configuration.');
  }

  const response = await fetch(`${baseUrl}/api/bot/mind/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: 'GitHub Actions smoke test',
      message: 'This is a provider connectivity check. Reply with a brief confirmation and do not issue Minecraft commands.',
    }),
    signal: AbortSignal.timeout(90000),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`The chat API returned unreadable JSON (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(`The chat API returned HTTP ${response.status}.`);
  if (result.error) throw new Error(String(result.error));
  if (typeof result.reply !== 'string' || !result.reply.trim()) {
    throw new Error('OpenRouter returned no usable assistant reply.');
  }

  console.log(`OpenRouter verification passed for model ${config.model}. The key and response text were not printed.`);
}

try {
  await verify();
} catch (error) {
  const message = String(error?.message || 'OpenRouter verification failed.');
  console.error(`OpenRouter verification failed: ${message.split(apiKey).join('[redacted]')}`);
  process.exitCode = 1;
} finally {
  await stopServer();
}
