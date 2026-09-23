#!/usr/bin/env python3
"""Exercise native Hermes SOUL loading and only the Mega Blueprints plugin. No inference/chat reads."""
import json
import os
from pathlib import Path
import sys

sys.dont_write_bytecode = True
home = Path('/home/bigotsmasher/hermes2/.hermes')
agent = Path('/home/bigotsmasher/hermes2/hermes-agent')
os.environ['HERMES_HOME'] = str(home)
sys.path.insert(0, str(agent))
from agent.prompt_builder import load_soul_md
from hermes_cli.plugins import PluginManager, _get_enabled_plugins

assert 'makeer-blueprints' in _get_enabled_plugins()
manager = PluginManager(scope_key=str(home))
directory = home / 'plugins/makeer-blueprints'
manifest = manager._parse_manifest(directory / 'plugin.yaml', directory, 'user', '')
assert manifest is not None and manifest.name == 'makeer-blueprints'
manager._load_plugin(manifest)
assert len(manager._hooks.get('pre_llm_call', [])) == 1, 'Do not invoke unrelated hooks.'
scenarios = ['Build a workout screen.', 'Can you add filtering?', 'go',
             'Did we make a blueprint that?', 'Stop. Review only.', 'Hello.']
for prompt in scenarios:
    result = manager.invoke_hook('pre_llm_call', user_message=prompt)
    assert len(result) == 1
    context = result[0]['context']
    assert 'Mega Blueprints' in context and 'all together' in context
    assert 'actual artifacts' in context and 'plan-only' in context
    assert prompt not in context or prompt in ('go', 'Did we make a blueprint that?')
loaded = load_soul_md(context_length=32768, home_override=home)
assert loaded and 'Mega Blueprints' in loaded
assert 'Private personal, family, health' in loaded, 'Original privacy rules must survive.'
private = home / 'profiles/hermes-private'
loaded_private = load_soul_md(context_length=32768, home_override=private)
assert loaded_private and 'Mega Blueprints' in loaded_private
for base in (home, private):
    assert (base / 'skills/non-vibe-coding/SKILL.md').is_file()
    assert (base / 'docs/makeer-blueprints.md').is_file()
receipt = {
    'nativeManifestLoad': 'PASS', 'nativePreLlmDispatch': f'PASS {len(scenarios)}/{len(scenarios)}',
    'activeSoulLoader': 'PASS', 'privateSoulLoader': 'PASS', 'privacyPreservedAt32768': 'PASS',
    'loadedSoulCharacters': len(loaded), 'modelCalls': 0, 'chatReads': 0,
    'scope': 'Fresh native loader process. Existing gateway plugin cache is not claimed refreshed.',
}
print(json.dumps(receipt, indent=2))
