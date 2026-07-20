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

// Next.js carrega .env sozinho; avisar cedo se o ficheiro falta (causa comum de login falhar
// após seed: seed usa default localhost, app sem .env aponta para outra BD ou falha).
const fs = require('fs');
const envPath = path.join(projectRoot, '.env');
const envLocalPath = path.join(projectRoot, '.env.local');
if (!fs.existsSync(envPath) && !fs.existsSync(envLocalPath)) {
  console.warn(
    '\n  Aviso: sem .env / .env.local na raiz. Copie .env.example → .env\n' +
      '  (DATABASE_URL=postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc)\n' +
      '  Sem isto o login pode falhar mesmo após npm run seed:master-admin.\n'
  );
}

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
  console.log(`  Login → http://localhost:${port}/auth/login`);
  console.log(`  Pneus moto (exemplo) → http://localhost:${port}/moto\n`);
}
