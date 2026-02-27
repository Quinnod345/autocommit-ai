# autocommit-ai

AI-powered git commit messages. Stage your changes, run `autocommit`, get perfect conventional commits in seconds.

## Install

```bash
npm install -g autocommit-ai
```

## Setup

Set your OpenAI API key:

```bash
export OPENAI_API_KEY=sk-...
```

Or create `~/.autocommitrc`:

```json
{ "apiKey": "sk-...", "model": "gpt-4o-mini", "conventional": true }
```

## Usage

```bash
# Stage changes, then:
git add -A
autocommit

# Or use the short alias:
ac

# Auto-commit without confirmation:
ac --auto

# Use a different model:
ac --model gpt-4o
```

### How it works

1. Reads your staged `git diff`
2. Sends it to OpenAI (gpt-4o-mini by default — fast & cheap)
3. Generates a conventional commit message
4. You review: **Enter** to accept, **e** to edit, **r** to regenerate, **q** to quit
5. Commits with the message

### Options

| Flag | Description |
|------|-------------|
| `--auto`, `-a` | Skip confirmation, commit immediately |
| `--model`, `-m` | OpenAI model (default: `gpt-4o-mini`) |
| `--conventional`, `-c` | Force conventional commit format |
| `--no-conventional` | Free-form commit messages |
| `--help`, `-h` | Show help |

## Examples

```
$ git add src/auth.js
$ autocommit
Analyzing 1 file(s) with gpt-4o-mini...

❯ feat(auth): add JWT token refresh on expiry

[Enter] accept · [e] edit · [r] regenerate · [q] quit
```

```
$ git add -A && ac --auto
Analyzing 5 file(s) with gpt-4o-mini...

✓ refactor: migrate database queries to prepared statements

[main 3a1b2c3] refactor: migrate database queries to prepared statements
 5 files changed, 42 insertions(+), 38 deletions(-)
```

## Cost

Uses `gpt-4o-mini` by default — typically **< $0.001 per commit**. You'd need to make 10,000 commits to spend $1.

## Pro ⭐

Love autocommit-ai? [Sponsor on GitHub](https://github.com/sponsors/Quinnod345) for:

- Priority support & feature requests
- Custom model configurations
- Team/enterprise setup guidance
- Early access to new features

## License

MIT © [Oneiro](https://github.com/Quinnod345)
