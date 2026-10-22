"""Paths for the browser tests, so they run from any checkout (CI, the church laptop):
ROOT  - the repository (LF_ROOT to test another copy, e.g. a backup branch checked out elsewhere)
AUDIO - what the fake microphone plays (LF_AUDIO; the recogniser's answers are mocked, so any sound works)
SCRATCH - where larger local data lives (LF_SCRATCH; recordings, offline models) - tests needing it skip without it
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(os.environ.get('LF_ROOT', os.path.dirname(HERE)), '')
AUDIO = os.environ.get('LF_AUDIO', os.path.join(HERE, 'fixtures', 'fake_mic.wav'))
SCRATCH = os.environ.get('LF_SCRATCH', '/tmp/claude-0/-home-claude/75b7af5e-7062-5e5d-a087-c193c46c265e/scratchpad')
