/**
 * Runs Next.js (dev/build) from the project root and sets NODE_PATH to this project's node_modules.
 * Fixes "Can't resolve 'tailwindcss' in '...\clientes'" when the workspace or cwd is a parent folder.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(path.join(__dirname, '..'));
const nodeModules = path.join(projectRoot, 'node_modules');

process.chdir(projectRoot);
process.env.NODE_PATH = nodeModules;

const cmd = process.argv[2] || 'dev';
const result = spawnSync('npx', ['next', cmd], {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: nodeModules },
  cwd: projectRoot,
});

process.exit(result.status || 0);
