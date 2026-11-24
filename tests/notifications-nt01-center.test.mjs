import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/pages/Notifications.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/pages/Notifications.css', import.meta.url), 'utf8');
test('NT01 visual shell and states preserved in NT02',()=>{for(const token of ['fz-notice-center__workspace','role="status"','role="alert"','to="/account"','aria-pressed={filter === entry.id}']) assert.ok(src.includes(token),token);});
test('NT01 responsive scoped layout and reduced motion',()=>{assert.match(css,/\.fz-notice-center__workspace\{display:grid/);assert.match(css,/@media\(max-width:560px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);});
