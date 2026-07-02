/**
 * Runs Next.js (dev/build) from the project root and sets NODE_PATH to this project's node_modules.
 * Fixes "Can't resolve 'tailwindcss' in '...\clientes'" when the workspace or cwd is a parent folder.
 */
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.resolve(path.join(__dirname, '..'));
const nodeModules = path.join(projectRoot, 'node_modules');

process.chdir(projectRoot);
process.env.NODE_PATH = nodeModules;

const cmd = process.argv[2] || 'dev';
const port = process.env.PORT || '3002';
const isWin = process.platform === 'win32';
const nextArgs = cmd === 'dev' ? ['next', cmd, '-p', port] : ['next', cmd];
const child = spawn('npx', nextArgs, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: nodeModules },
  cwd: projectRoot,
  shell: isWin,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

if (cmd === 'dev') {
  console.log(`\n  MecaniDoc dev → http://localhost:${port}`);
  console.log(`  Pneus moto (exemplo) → http://localhost:${port}/moto\n`);
}
