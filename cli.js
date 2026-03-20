#!/usr/bin/env bun
process.stdout.write(await Bun.file(import.meta.dir + "/readme.md").text());
