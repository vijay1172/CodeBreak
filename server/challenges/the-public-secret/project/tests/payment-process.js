import { spawn } from 'node:child_process';

const applicationUrl = new URL('../server/app.js', import.meta.url).href;

// Import the application only after the child has its complete configuration.
// This supports both startup snapshots and request-time server configuration.
export async function withPaymentService(secret, run) {
  const childSource = `
    try {
      const { createApp } = await import(${JSON.stringify(applicationUrl)});
      const server = createApp({}).listen(0, '127.0.0.1', () => {
        process.send({ port: server.address().port });
      });
      process.once('SIGTERM', () => {
        server.closeAllConnections();
        server.close(() => process.exit(0));
      });
      server.once('error', () => process.send({ ready: false }, () => process.exit(1)));
    } catch {
      process.send({ ready: false }, () => process.exit(1));
    }
  `;
  // Never inherit developer credentials, NODE_OPTIONS hooks, or a public-prefixed
  // processor key. These child apps receive only explicit synthetic configuration.
  const environment = {
    NODE_ENV: 'test',
    ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
    ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
    ...(secret === undefined ? {} : { STRIPE_SECRET_KEY: secret }),
  };
  const child = spawn(process.execPath, ['--input-type=module', '-e', childSource], {
    cwd: process.cwd(), env: environment, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  // Application logs are deliberately not replayed into test diagnostics.
  child.stdout.resume();
  child.stderr.resume();
  const exited = new Promise(resolve => {
    child.once('exit', resolve);
    child.once('error', resolve);
  });
  let startupTimer;
  try {
    const port = await new Promise((resolve, reject) => {
      const unavailable = () => reject(new Error('The payment application could not start.'));
      startupTimer = setTimeout(unavailable, 5000);
      child.once('error', unavailable);
      child.once('exit', unavailable);
      child.on('message', message => {
        if (message?.ready === false) return unavailable();
        if (Number.isInteger(message?.port) && message.port > 0 && message.port < 65536) resolve(message.port);
      });
    });
    clearTimeout(startupTimer);
    return await run(async body => {
      const response = await fetch('http://127.0.0.1:' + port + '/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      return { status: response.status, body: await response.json(), contentType: response.headers.get('content-type') };
    });
  } finally {
    clearTimeout(startupTimer);
    if (child.pid && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    const forceStop = setTimeout(() => child.kill('SIGKILL'), 1500);
    await exited;
    clearTimeout(forceStop);
  }
}
