#!/usr/bin/env node
/**
 * SCRIPT: Linear CLI — MCP-independent fallback for board access.
 * PURPOSE: List, search, create and comment on SWA issues without the MCP server.
 * SAFETY: Reads LINEAR_API_KEY from the environment only. Never prints it, never
 *         writes it to disk, never accepts it as an argument (argv is visible in
 *         process listings and shell history).
 *
 * WHY THIS EXISTS (2026-08-12):
 * The Linear MCP server was configured against the hosted OAuth endpoint with no
 * auth header, which forces an interactive browser handshake. That handshake can
 * never complete in a non-interactive session, so agent after agent reported
 * "Linear needs OAuth, I can't capture this" and the board silently fell behind.
 * The MCP config is fixed (API-key header), but MCP servers only connect at
 * launch — so a session that starts before a config change still has no tools.
 * This script has no such dependency: if the key is in the environment, the board
 * is reachable, always.
 *
 * SETUP: create a personal API key at
 *   linear.app -> Settings -> Security & access -> Personal API keys
 * and store it as an environment variable named LINEAR_API_KEY.
 *
 * USAGE:
 *   node scripts/linear-cli.mjs whoami
 *   node scripts/linear-cli.mjs list [--limit=50]
 *   node scripts/linear-cli.mjs search "playwright crawl"
 *   node scripts/linear-cli.mjs create --title="..." --body-file=path/to/body.md
 *   node scripts/linear-cli.mjs comment --issue=SWA-157 --body-file=path/to/note.md
 *
 * Body text is passed by FILE, not by argument, so multi-line markdown survives
 * intact and never lands in shell history.
 */

import { readFileSync } from 'node:fs';

const KEY = process.env.LINEAR_API_KEY;
const TEAM = process.env.LINEAR_TEAM_KEY || 'SWA';
const ENDPOINT = 'https://api.linear.app/graphql';

if (!KEY) {
  console.error(
    'LINEAR_API_KEY is not set.\n'
    + 'Create a key at linear.app -> Settings -> Security & access -> Personal API keys,\n'
    + 'then store it in the environment. Never pass it as a command-line argument.',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const command = args[0];
const opt = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

async function gql(query, variables) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    // Surface the body: a bare status code sends the reader hunting for nothing.
    throw new Error(`HTTP ${response.status} — ${(await response.text()).slice(0, 400)}`);
  }
  const json = await response.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

async function teamId() {
  const data = await gql('query($k:String!){ teams(filter:{key:{eq:$k}}){ nodes { id } } }', { k: TEAM });
  const node = data.teams.nodes[0];
  if (!node) throw new Error(`no team with key "${TEAM}" — set LINEAR_TEAM_KEY`);
  return node.id;
}

function bodyFromFile() {
  const file = opt('body-file');
  if (!file) throw new Error('--body-file=<path> is required (bodies are passed by file, not argv)');
  return readFileSync(file, 'utf8');
}

const ISSUE_FIELDS = 'identifier title url state { name } updatedAt';

const commands = {
  async whoami() {
    const data = await gql('{ viewer { name } teams { nodes { key name } } }');
    console.log(`viewer: ${data.viewer.name}`);
    console.log(`teams : ${data.teams.nodes.map((t) => `${t.key} (${t.name})`).join(', ')}`);
  },

  async list() {
    const limit = Number(opt('limit') || '30');
    const data = await gql(
      `query($k:String!,$n:Int!){ issues(filter:{team:{key:{eq:$k}}}, first:$n, orderBy:updatedAt){ nodes { ${ISSUE_FIELDS} } } }`,
      { k: TEAM, n: limit },
    );
    for (const issue of data.issues.nodes) {
      console.log(`${issue.identifier}  [${issue.state.name}]  ${issue.title}`);
    }
    console.log(`— ${data.issues.nodes.length} issue(s)`);
  },

  /** Dedup helper: always run this before create. */
  async search() {
    const termInput = args.slice(1).filter((a) => !a.startsWith('--')).join(' ').toLowerCase();
    if (!termInput) throw new Error('usage: search "<words>"');
    const terms = termInput.split(/\s+/);
    const data = await gql(
      `query($k:String!){ issues(filter:{team:{key:{eq:$k}}}, first:250, orderBy:updatedAt){ nodes { ${ISSUE_FIELDS} } } }`,
      { k: TEAM },
    );
    const hits = data.issues.nodes.filter((issue) => {
      const haystack = issue.title.toLowerCase();
      return terms.some((term) => haystack.includes(term));
    });
    if (!hits.length) {
      console.log('(no matches — safe to create)');
      return;
    }
    for (const issue of hits) console.log(`${issue.identifier}  [${issue.state.name}]  ${issue.title}`);
    console.log(`— ${hits.length} possible duplicate(s); review before creating`);
  },

  async create() {
    const title = opt('title');
    if (!title) throw new Error('--title="..." is required');
    const data = await gql(
      'mutation($input: IssueCreateInput!){ issueCreate(input:$input){ success issue { identifier url } } }',
      { input: { teamId: await teamId(), title, description: bodyFromFile() } },
    );
    console.log(`CREATED: ${data.issueCreate.issue.identifier}`);
    console.log(`URL: ${data.issueCreate.issue.url}`);
  },

  async comment() {
    const identifier = opt('issue');
    if (!identifier) throw new Error('--issue=SWA-123 is required');
    const found = await gql(
      'query($id:String!){ issues(filter:{number:{eq:$id}}){ nodes { id identifier } } }',
      { id: identifier.split('-')[1] },
    );
    const issue = found.issues.nodes.find((node) => node.identifier === identifier);
    if (!issue) throw new Error(`issue ${identifier} not found in team ${TEAM}`);
    await gql(
      'mutation($input: CommentCreateInput!){ commentCreate(input:$input){ success } }',
      { input: { issueId: issue.id, body: bodyFromFile() } },
    );
    console.log(`COMMENTED on ${identifier}`);
  },
};

const run = commands[command];
if (!run) {
  console.error(`unknown command "${command || '(none)'}" — try: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}