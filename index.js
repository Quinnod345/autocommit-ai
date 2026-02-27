#!/usr/bin/env node

import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import OpenAI from 'openai';

// --- Config ---
function loadConfig() {
  const rcPath = join(homedir(), '.autocommitrc');
  let rc = {};
  if (existsSync(rcPath)) {
    try { rc = JSON.parse(readFileSync(rcPath, 'utf-8')); } catch {}
  }
  return {
    apiKey: process.env.OPENAI_API_KEY || rc.apiKey,
    model: rc.model || 'gpt-4o-mini',
    conventional: rc.conventional ?? true,
  };
}

// --- Args ---
function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = { auto: false, model: null, conventional: null, help: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--auto' || args[i] === '-a') flags.auto = true;
    else if (args[i] === '--model' || args[i] === '-m') flags.model = args[++i];
    else if (args[i] === '--conventional' || args[i] === '-c') flags.conventional = true;
    else if (args[i] === '--no-conventional') flags.conventional = false;
    else if (args[i] === '--help' || args[i] === '-h') flags.help = true;
  }
  return flags;
}

// --- Git ---
function getStagedDiff() {
  try {
    const diff = execSync('git diff --staged', { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    if (!diff.trim()) {
      console.error('Nothing staged. Stage changes with `git add` first.');
      process.exit(1);
    }
    return diff;
  } catch {
    console.error('Not a git repository or git not installed.');
    process.exit(1);
  }
}

function getStagedFiles() {
  try {
    return execSync('git diff --staged --name-only', { encoding: 'utf-8' }).trim();
  } catch { return ''; }
}

function commit(message) {
  execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: 'inherit' });
}

// --- AI ---
async function generateMessage(openai, diff, files, model, conventional) {
  const conventionalRule = conventional
    ? `Use conventional commit format: type(scope): description
Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
Scope is optional but encouraged.`
    : 'Write a clear, concise commit message.';

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 200,
    messages: [
      {
        role: 'system',
        content: `You are a git commit message generator. Given a diff, write ONE commit message.
${conventionalRule}
Rules:
- First line: max 72 chars, imperative mood ("add" not "added")
- If the change is complex, add a blank line then bullet points for details
- Be specific about what changed, not vague
- Output ONLY the commit message, nothing else`
      },
      {
        role: 'user',
        content: `Files changed:\n${files}\n\nDiff:\n${diff.slice(0, 8000)}`
      }
    ]
  });

  return response.choices[0].message.content.trim();
}

// --- UI ---
function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer); });
  });
}

function printHelp() {
  console.log(`
  autocommit-ai — AI-powered git commit messages

  Usage:
    autocommit          Generate a commit message for staged changes
    ac                  Alias for autocommit

  Options:
    --auto, -a          Skip confirmation, commit immediately
    --model, -m <model> OpenAI model to use (default: gpt-4o-mini)
    --conventional, -c  Force conventional commit format (default)
    --no-conventional   Disable conventional commit format
    --help, -h          Show this help

  Config:
    Set OPENAI_API_KEY env var, or create ~/.autocommitrc:
    { "apiKey": "sk-...", "model": "gpt-4o-mini", "conventional": true }

  Examples:
    git add -A && autocommit
    git add src/ && ac --auto
    ac --model gpt-4o --conventional
`);
}

// --- Main ---
async function main() {
  const flags = parseArgs(process.argv);
  if (flags.help) { printHelp(); return; }

  const config = loadConfig();
  const model = flags.model || config.model;
  const conventional = flags.conventional ?? config.conventional;

  if (!config.apiKey) {
    console.error('Missing OpenAI API key. Set OPENAI_API_KEY or add to ~/.autocommitrc');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: config.apiKey });
  const diff = getStagedDiff();
  const files = getStagedFiles();

  console.log(`\x1b[90mAnalyzing ${files.split('\n').length} file(s) with ${model}...\x1b[0m\n`);

  let message = await generateMessage(openai, diff, files, model, conventional);

  if (flags.auto) {
    console.log(`\x1b[32m✓\x1b[0m ${message}\n`);
    commit(message);
    return;
  }

  while (true) {
    console.log(`\x1b[33m❯\x1b[0m ${message}\n`);
    const answer = await ask('\x1b[90m[Enter] accept · [e] edit · [r] regenerate · [q] quit\x1b[0m ');

    if (answer === '' || answer === 'y') {
      commit(message);
      return;
    } else if (answer === 'e') {
      const edited = await ask('Message: ');
      if (edited.trim()) { commit(edited.trim()); return; }
    } else if (answer === 'r') {
      console.log('\x1b[90mRegenerating...\x1b[0m\n');
      message = await generateMessage(openai, diff, files, model, conventional);
    } else if (answer === 'q') {
      console.log('Aborted.');
      return;
    }
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
