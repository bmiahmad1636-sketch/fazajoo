#!/usr/bin/env node
// Fazajoo production configuration audit. No secret values are printed.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];
const pass = [];
const check = (ok, label) => (ok ? pass : failures).push(label);
const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
function envParse(content) {
  const out = {};
  for (const raw of (content || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[match[1]] = val;
  }
  return out;
}
const frontendFile = path.join(root, '.env.production');
const backendFile = path.join(root, 'backend', '.env.production');
const front = envParse(read(frontendFile));
const back = envParse(read(backendFile));
check(fs.existsSync(frontendFile), 'Frontend .env.production exists');
check(fs.existsSync(backendFile), 'Backend .env.production exists');
const url = front.VITE_API_BASE_URL || '';
const origins = (back.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
function validHttps(s, api = false) {
  try { const u = new URL(s); return u.protocol === 'https:' && !!u.hostname && !/(localhost|127\.0\.0\.1|0\.0\.0\.0|YOUR-DOMAIN|example\.com)/i.test(u.hostname) && (!api || u.pathname.replace(/\/$/, '') === '/api') && !u.username && !u.password; }
  catch { return false; }
}
check(validHttps(url, true), 'Frontend VITE_API_BASE_URL is real HTTPS URL ending in /api');
check(origins.length > 0 && origins.every(o => validHttps(o) && new URL(o).origin === o), 'Backend CORS_ORIGINS contains real HTTPS origins only');
check(back.NODE_ENV === 'production', 'Backend NODE_ENV=production');
const required = ['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','JWT_SECRET','OTP_HASH_SECRET','STORAGE_ENDPOINT','STORAGE_BUCKET','STORAGE_ACCESS_KEY','STORAGE_SECRET_KEY','STORAGE_PUBLIC_BASE_URL'];
const placeholder = /PUT_|YOUR[-_]|CHANGE[-_]?ME|PLACEHOLDER|EXAMPLE|REPLACE|TODO/i;
for (const key of required) check(Boolean(back[key]) && !placeholder.test(back[key]), `Backend ${key} is configured (value hidden)`);
for (const key of ['JWT_SECRET','OTP_HASH_SECRET']) check((back[key] || '').length >= 32, `Backend ${key} has >=32 characters`);
check(back.TRUST_PROXY === '1', 'Backend TRUST_PROXY=1 (only for exactly one trusted reverse proxy)');
check(back.HOST === '127.0.0.1' || back.HOST === '0.0.0.0', 'Backend HOST is valid (bind externally only behind firewall)');
if (back.HOST === '0.0.0.0') warnings.push('Backend binds all interfaces: restrict port 6060 using firewall/reverse proxy');
if (back.KAVENEGAR_API_KEY && !placeholder.test(back.KAVENEGAR_API_KEY)) pass.push('Kavenegar API key configured (value hidden)');
else warnings.push('Kavenegar API key missing/placeholder: real OTP SMS will not work');
const ignore = read(path.join(root,'.gitignore')) || '';
check(ignore.split(/\r?\n/).some(x => x.trim() === '.env.production'), 'Root .gitignore ignores .env.production');
check(ignore.split(/\r?\n/).some(x => x.trim() === 'backend/.env.production'), 'Root .gitignore ignores backend/.env.production');
try {
  const r = cp.spawnSync('git',['ls-files','--cached','--','.env.production','backend/.env.production','.env','backend/.env'],{cwd:root,encoding:'utf8',timeout:4000});
  if (r.status === 0) check(!r.stdout.trim(), 'No real environment files are tracked in Git');
  else warnings.push('Git tracked-files check unavailable');
} catch { warnings.push('Git tracked-files check unavailable'); }
console.log('FAZAJOO | Production Config Audit (secret-safe)');
for (const p of pass) console.log('PASS  '+p);
for (const w of warnings) console.log('WARN  '+w);
for (const f of failures) console.log('FAIL  '+f);
console.log(`\nResult: ${pass.length} passed, ${warnings.length} warnings, ${failures.length} failed`);
process.exitCode = failures.length ? 1 : 0;
