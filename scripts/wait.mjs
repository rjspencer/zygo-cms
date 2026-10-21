#!/usr/bin/env node
const ms = parseInt(process.argv[2] || '3000', 10);
setTimeout(() => process.exit(0), ms);
