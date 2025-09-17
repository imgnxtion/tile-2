#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

const target = resolve('web/index.html');

const platform = process.platform;
let command;
let args;

if (platform === 'darwin') {
  command = 'open';
  args = [target];
} else if (platform === 'win32') {
  command = 'cmd';
  args = ['/c', 'start', '', target];
} else {
  command = 'xdg-open';
  args = [target];
}

const child = spawn(command, args, { stdio: 'inherit', shell: false });
child.on('error', (error) => {
  console.error(`Failed to launch browser via ${command}: ${error.message}`);
  process.exit(1);
});
child.on('exit', (code) => {
  process.exit(code ?? 0);
});
