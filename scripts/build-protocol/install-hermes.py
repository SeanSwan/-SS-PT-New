#!/usr/bin/env python3
"""Install Mega Blueprints into verified WSL instruction roots. Dry-run default.

Only local instruction/skill/plugin files and the existing plugin enablement
list change. No chat reads, provider calls, gateway signals or credential output.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import shlex
import uuid
from datetime import datetime, timezone
import yaml

BEGIN = '<!-- MAKEER-BLUEPRINTS:BEGIN -->'
END = '<!-- MAKEER-BLUEPRINTS:END -->'
parser = argparse.ArgumentParser()
parser.add_argument('--apply', action='store_true')
parser.add_argument('--source', required=True)
parser.add_argument('--skill-source', required=True)
args = parser.parse_args()
source = Path(args.source).resolve()
skill_source = Path(args.skill_source).resolve()
home = Path('/home/bigotsmasher').resolve()
hermes = home / 'hermes2/.hermes'
if not (hermes / 'SOUL.md').is_file():
    raise SystemExit('Active Hermes SOUL.md is missing; stop and re-inventory.')
policy = (source / 'POLICY.md').read_text()
soul_block = (source / 'hermes-soul-block.md').read_text()
targets = {}
originals = {}


def read(path):
    if path not in originals:
        originals[path] = path.read_bytes() if path.exists() else None
    return (originals[path] or b'').decode('utf-8')


def add(path, content):
    path = Path(path)
    if not path.resolve().is_relative_to(home):
        raise ValueError(f'Target escapes allowed home: {path}')
    read(path)
    targets[path] = content.encode('utf-8') if isinstance(content, str) else content


def managed(text, content):
    block = f'{BEGIN}\n{content.strip()}\n{END}'
    if BEGIN in text or END in text:
        if text.count(BEGIN) != 1 or text.count(END) != 1 or text.index(END) < text.index(BEGIN):
            raise ValueError('Ambiguous managed block; refusing overwrite.')
        return text[:text.index(BEGIN)] + block + text[text.index(END) + len(END):]
    return block + '\n\n' + text


def instruction(path, content):
    add(path, managed(read(path), content))


def install_skill(base):
    for file in skill_source.rglob('*'):
        if file.is_file():
            add(base / 'skills/non-vibe-coding' / file.relative_to(skill_source), file.read_bytes())


for profile in [hermes, *sorted((hermes / 'profiles').glob('*/'))]:
    if not (profile / 'SOUL.md').is_file():
        continue
    instruction(profile / 'SOUL.md', soul_block)
    add(profile / 'docs/makeer-blueprints.md', policy)
    install_skill(profile)

for base in (home / '.agents', home / '.codex', home / '.claude'):
    install_skill(base)
for path in (home / 'AGENTS.md', home / '.codex/AGENTS.md', home / '.claude/CLAUDE.md', home / '.gemini/GEMINI.md'):
    instruction(path, policy)
add(home / '.agents/MAKEER-BLUEPRINTS.md', policy)
for name in ('prompt-hook.mjs', 'reminder.txt', 'check-readiness.mjs'):
    add(home / '.agents/build-protocol' / name, (source / name).read_bytes())
node = shutil.which('node')
if not node:
    raise SystemExit('Node unavailable for WSL coding hooks.')
for adapter, name in (('codex', '.codex/hooks.json'), ('claude', '.claude/settings.json')):
    path = home / name
    data = json.loads(read(path) or '{}')
    hooks = data.setdefault('hooks', {})
    groups = []
    for group in hooks.get('UserPromptSubmit', []):
        remaining = [h for h in group['hooks'] if '/build-protocol/prompt-hook.mjs' not in h.get('command', '')]
        if remaining:
            groups.append({**group, 'hooks': remaining})
    command = f'{shlex.quote(node)} {shlex.quote(str(home / ".agents/build-protocol/prompt-hook.mjs"))} {adapter}'
    hook = {'type': 'command', 'command': command, 'timeout': 5}
    if adapter == 'codex':
        hook.update(statusMessage='Checking Mega Blueprints activation', additionalContextLimit=4000)
    groups.append({'hooks': [hook]})
    hooks['UserPromptSubmit'] = groups
    add(path, json.dumps(data, indent=2) + '\n')

plugin = hermes / 'plugins/makeer-blueprints'
add(plugin / '__init__.py', (source / 'hermes_plugin.py').read_bytes())
add(plugin / 'reminder.txt', (source / 'reminder.txt').read_bytes())
add(plugin / 'plugin.yaml', 'name: makeer-blueprints\nversion: "1.0.0"\ndescription: "Automatic complete build planning and audit context; no model or network calls."\nauthor: "Sean"\nhooks:\n  - pre_llm_call\nprovides_hooks:\n  - pre_llm_call\n')
config_path = hermes / 'config.yaml'
config_text = read(config_path)
old_config = yaml.safe_load(config_text)
enabled = old_config.get('plugins', {}).get('enabled')
if not isinstance(enabled, list):
    raise SystemExit('Unrecognized Hermes plugin enablement; no configuration changed.')
if 'makeer-blueprints' not in enabled:
    anchor = 'plugins:\n  enabled:\n'
    if config_text.count(anchor) != 1:
        raise SystemExit('Plugin insertion anchor ambiguous; stop before writes.')
    replacement = config_text.replace(anchor, anchor + '  - makeer-blueprints\n', 1)
    new_config = yaml.safe_load(replacement)
    compare = json.loads(json.dumps(new_config))
    compare['plugins']['enabled'].remove('makeer-blueprints')
    if compare != old_config:
        raise SystemExit('Unexpected configuration drift; installation stopped.')
    add(config_path, replacement)

changes = [(path, data) for path, data in targets.items() if originals[path] != data]
if not args.apply:
    print(json.dumps({'mode': 'DRY_RUN', 'changes': len(changes), 'roots': [str(hermes), str(home / '.codex'), str(home / '.claude')]}))
    raise SystemExit(0)
if not changes:
    print(json.dumps({'mode': 'APPLIED', 'changed': 0}))
    raise SystemExit(0)

stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
backup = hermes / 'backups/makeer-blueprints' / stamp
backup.mkdir(parents=True, mode=0o700)
sha = lambda data: hashlib.sha256(data).hexdigest()
entries = []
for i, (path, data) in enumerate(changes):
    before = originals[path]
    entry = {'path': str(path), 'existed': before is not None, 'beforeSha256': sha(before) if before is not None else None,
             'afterSha256': sha(data), 'backup': f'{i}.original' if before is not None else None}
    if before is not None:
        saved = backup / entry['backup']
        saved.write_bytes(before)
        saved.chmod(0o600)
        restored = backup / f'{i}.restore-check'
        shutil.copyfile(saved, restored)
        restored.chmod(0o600)
        if sha(saved.read_bytes()) != entry['beforeSha256'] or sha(restored.read_bytes()) != entry['beforeSha256']:
            raise SystemExit('Snapshot or isolated restore hash mismatch.')
    entries.append(entry)
manifest = backup / 'manifest.json'
receipt = {'status': 'SNAPSHOT_VERIFIED', 'entries': entries}
manifest.write_text(json.dumps(receipt, indent=2))
manifest.chmod(0o600)
for path, _ in changes:
    current = path.read_bytes() if path.exists() else None
    if current != originals[path]:
        raise SystemExit(f'Concurrent modification; stopped: {path}')
for path, data in changes:
    current = path.read_bytes() if path.exists() else None
    if current != originals[path]:
        raise SystemExit(f'Concurrent modification; stopped: {path}')
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.makeer-' + uuid.uuid4().hex + '.tmp')
    temp.write_bytes(data)
    temp.chmod(path.stat().st_mode & 0o777 if path.exists() else 0o600)
    os.replace(temp, path)
    if sha(path.read_bytes()) != sha(data):
        raise SystemExit(f'Read-back mismatch: {path}')
receipt['status'] = 'INSTALLED_READBACK_VERIFIED'
manifest.write_text(json.dumps(receipt, indent=2))
print(json.dumps({'mode': 'APPLIED', 'changed': len(changes), 'manifest': str(manifest)}))
