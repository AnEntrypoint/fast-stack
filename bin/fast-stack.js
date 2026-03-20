#!/usr/bin/env node
const{readFileSync}=require('fs');
const{join}=require('path');
process.stdout.write(readFileSync(join(__dirname,'..','readme.md'),'utf8'));
