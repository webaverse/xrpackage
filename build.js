#!/usr/bin/env node
const fs = require('fs');
const child_process = require('child_process');

child_process.execFileSync('parcel', [
  'build',
  '--target', 'browser',
  'content.js',
  // '--no-minify',
], {
  stdio: 'inherit',
});

const content = fs.readFileSync('dist/content.js', 'utf8');
let contentScript = fs.readFileSync('contentScript.js', 'utf8');
contentScript = contentScript.replace('CONTENT_SCRIPT', JSON.stringify(content));
fs.writeFileSync('dist/contentScript.js', contentScript);