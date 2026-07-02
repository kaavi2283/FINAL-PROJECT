const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const envToolsDir = path.join(ROOT_DIR, '.env_tools');

const isProduction = process.env.NODE_ENV === 'production' || process.env.PORT || process.platform !== 'win32';

console.log('--- Startup Launcher ---');
console.log('Mode: ' + (isProduction ? 'production' : 'development') + '\n');

if (isProduction) {
  if (!fs.existsSync(path.join(ROOT_DIR, 'backend', 'node_modules'))) {
    console.log('Installing backend packages...');
    execSync('npm install', { cwd: path.join(ROOT_DIR, 'backend'), stdio: 'inherit', shell: true });
  }

  if (!fs.existsSync(path.join(ROOT_DIR, 'frontend', 'node_modules'))) {
    console.log('Installing frontend packages...');
    execSync('npm install', { cwd: path.join(ROOT_DIR, 'frontend'), stdio: 'inherit', shell: true });
  }

  console.log('Building frontend...');
  execSync('npm run build', { cwd: path.join(ROOT_DIR, 'frontend'), stdio: 'inherit', shell: true });

  console.log('Starting backend server...');
  const startProcess = spawn('node', ['server.js'], {
    cwd: path.join(ROOT_DIR, 'backend'),
    stdio: 'inherit',
    shell: true
  });

  process.on('SIGINT', () => startProcess.kill());
  process.on('SIGTERM', () => startProcess.kill());

} else {
  if (!fs.existsSync(envToolsDir)) {
    console.log('local env tools not found. Running setup...');
    try {
      execSync('python setup_env.py', { stdio: 'inherit' });
    } catch (err) {
      console.error('error: python setup_env.py failed');
      process.exit(1);
    }
  }

  const NODE_BIN_DIR = path.join(envToolsDir, 'node', 'extracted', 'node-v20.11.0-win-x64');
  const MARIADB_BIN_DIR = path.join(envToolsDir, 'mariadb', 'extracted', 'mariadb-10.11.8-winx64', 'bin');
  const MARIADB_DATA_DIR = path.join(envToolsDir, 'mariadb', 'extracted', 'mariadb-10.11.8-winx64', 'data');

  const env = { ...process.env };
  env.PATH = NODE_BIN_DIR + ';' + MARIADB_BIN_DIR + ';' + (env.PATH || '');

  const backendModules = path.join(ROOT_DIR, 'backend', 'node_modules');
  if (!fs.existsSync(backendModules)) {
    console.log('installing backend node_modules...');
    try {
      execSync('npm install', { cwd: path.join(ROOT_DIR, 'backend'), env, stdio: 'inherit', shell: true });
    } catch (err) {
      console.error('failed to install backend modules');
    }
  }

  const frontendModules = path.join(ROOT_DIR, 'frontend', 'node_modules');
  if (!fs.existsSync(frontendModules)) {
    console.log('installing frontend node_modules...');
    try {
      execSync('npm install', { cwd: path.join(ROOT_DIR, 'frontend'), env, stdio: 'inherit', shell: true });
    } catch (err) {
      console.error('failed to install frontend modules');
    }
  }

  const processes = [];

  function cleanUp() {
    console.log('\nstopping local database and servers...');
    for (let i = 0; i < processes.length; i++) {
      try {
        if (process.platform === 'win32' && processes[i].pid) {
          execSync('taskkill /F /T /PID ' + processes[i].pid, { stdio: 'ignore' });
        } else {
          processes[i].kill();
        }
      } catch (e) { }
    }

    try {
      if (process.platform === 'win32') {
        execSync('taskkill /F /IM mariadbd.exe', { stdio: 'ignore' });
      }
    } catch (e) { }

    console.log('shutdown finished');
    process.exit(0);
  }

  process.on('SIGINT', cleanUp);
  process.on('SIGTERM', cleanUp);

  console.log('starting local database...');
  const mariadbExe = path.join(MARIADB_BIN_DIR, 'mariadbd.exe');
  const mariadbProcess = spawn(
    mariadbExe,
    ['--datadir=' + MARIADB_DATA_DIR, '--port=3306', '--bind-address=127.0.0.1'],
    { stdio: 'ignore', env }
  );
  processes.push(mariadbProcess);

  console.log('starting backend dev server...');
  const backendProcess = spawn(
    'npm',
    ['run', 'dev'],
    { cwd: path.join(ROOT_DIR, 'backend'), stdio: 'inherit', env, shell: true }
  );
  processes.push(backendProcess);

  console.log('starting frontend dev server...');
  const frontendProcess = spawn(
    'npm',
    ['run', 'dev', '--', '--port', '1000'],
    { cwd: path.join(ROOT_DIR, 'frontend'), stdio: 'inherit', env, shell: true }
  );
  processes.push(frontendProcess);

  console.log('\n--- ALL SERVERS STARTED ---');
  console.log('press ctrl+c to stop');

  setInterval(() => { }, 1000);
}
