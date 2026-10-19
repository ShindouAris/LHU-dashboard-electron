import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const source = stripTypeScriptTypes(readFileSync(new URL('./main.ts', import.meta.url), 'utf8'));
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
let notifications = 0;
const timers = new Set();
const context = vm.createContext({
  console: { log() {}, error() {} }, Date, URL, Set,
  config: () => ({ notifyNextClassStartedSoon: true }),
  createNotification: () => ({ show() { notifications++; } }),
  StartAfter: () => '10 phút',
  setInterval: fn => { timers.add(fn); return fn; },
  clearInterval: fn => timers.delete(fn),
});
vm.runInContext('const remindBeforeMinutes = 30; const notifiedClasses = new Set();' + section('const checkClassReminder =', 'const fetchNextClassAndCheck ='), context);
for (const [minutes, expected] of [[45, 0], [30, 1], [10, 2], [0, 2], [-1, 2]]) {
  context.item = { ID: minutes, ThoiGianBD: new Date(Date.now() + minutes * 60000 + (minutes > 0 ? -100 : 0)).toISOString(), ThoiGianKT: new Date(Date.now() + 7200000).toISOString() };
  vm.runInContext('checkClassReminder(item)', context);
  assert.equal(notifications, expected);
}
vm.runInContext('checkClassReminder(item)', context);
assert.equal(notifications, 2);
vm.runInContext(section('let reminderCheckerInterval', 'let rpcIntervalTask'), context);
vm.runInContext('createReminderChecker(); createReminderChecker()', context);
assert.equal(timers.size, 1);
vm.runInContext('clearReminderChecker(); createReminderChecker()', context);
assert.equal(timers.size, 1);
vm.runInContext('clearReminderChecker()', context);
assert.equal(timers.size, 0);
context.isIndevelopment = false;
vm.runInContext(section('const isTrustedURL', 'let lastInteraction'), context);
assert.equal(vm.runInContext("isTrustedURL('https://lhu-dashboard.vercel.app/settings')", context), true);
assert.equal(vm.runInContext("isTrustedURL('https://evil.example')", context), false);
assert.equal(vm.runInContext("isTrustedURL('not a URL')", context), false);
assert.match(source, /studentID: data\?\.UserID \?\? currentlyLoggedInUser/);
assert.doesNotMatch(section('const getConfig', 'export const StartAfter'), /writeFileSync/);
console.log('Regression checks passed: reminders, timer restart, trusted origins, polling payload, read-only config.');
