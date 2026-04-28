import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const includeExt = new Set(['.html', '.css', '.js', '.mjs', '.json']);
const ignoredDir = ['.git', 'node_modules', 'dist', 'build', '.next', '.cache', 'coverage'];
const debounceMs = Number(process.env.AUTOPUSH_DEBOUNCE_MS || 4000);

let timer = null;
let running = false;
let pending = false;

function log(msg, extra = '') {
  const ts = new Date().toISOString();
  const suffix = extra ? ` ${extra}` : '';
  process.stdout.write(`[autopush ${ts}] ${msg}${suffix}\n`);
}

function sh(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: repoRoot, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', chunk => { out += String(chunk); });
    child.stderr.on('data', chunk => { err += String(chunk); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${cmd} ${args.join(' ')} failed (${code})\n${err || out}`));
    });
  });
}

function shouldWatch(filePath = '') {
  if (!filePath) return false;
  if (ignoredDir.some(seg => filePath.includes(`${path.sep}${seg}${path.sep}`) || filePath.startsWith(`${seg}${path.sep}`))) return false;
  return includeExt.has(path.extname(filePath).toLowerCase());
}

async function hasChanges() {
  try {
    const { out } = await sh('git', ['status', '--porcelain']);
    return out.trim().length > 0;
  } catch (error) {
    log('git status failed', String(error.message || error));
    return false;
  }
}

async function syncPushCycle() {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  try {
    if (!(await hasChanges())) {
      log('no changes detected');
      return;
    }
    await sh('git', ['add', '-A']);
    const stamp = new Date().toISOString().replace('T', ' ').replace(/\..+$/, 'Z');
    try {
      await sh('git', ['commit', '-m', `auto: sync site updates ${stamp}`]);
      log('commit created');
    } catch (error) {
      const text = String(error.message || error);
      if (/nothing to commit/i.test(text)) {
        log('staged changes resolved to no-op commit');
      } else {
        throw error;
      }
    }
    await sh('git', ['push', 'origin', 'main']);
    log('push complete', 'origin/main');
  } catch (error) {
    log('sync cycle failed', String(error.message || error));
  } finally {
    running = false;
    if (pending) {
      pending = false;
      scheduleSync();
    }
  }
}

function scheduleSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncPushCycle();
  }, debounceMs);
}

log('watching for file changes', repoRoot);
watch(repoRoot, { recursive: true }, (_event, fileName) => {
  const rel = String(fileName || '');
  if (!shouldWatch(rel)) return;
  scheduleSync();
});

