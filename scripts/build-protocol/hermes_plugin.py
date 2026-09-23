"""Mega Blueprints: fixed context through the native Hermes pre_llm_call hook.

No prompt/session reads, network, model dispatch, tool mutation or file writes.
The context is read when invoked, so policy text changes do not need a plugin
code reload in a process that has already registered this callback.
"""
from pathlib import Path


def pre_llm_call(**_kwargs):
    text = (Path(__file__).parent / 'reminder.txt').read_text(encoding='utf-8')
    return {'context': text.strip()}


def register(ctx):
    ctx.register_hook('pre_llm_call', pre_llm_call)
