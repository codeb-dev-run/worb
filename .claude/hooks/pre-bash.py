#!/usr/bin/env python3
"""
CodeB Pre-Bash Hook
Blocks dangerous commands to protect infrastructure.
"""

import sys
import re

BLOCKED_PATTERNS = [
    r'podman\s+rm\s+-f',
    r'docker\s+rm\s+-f',
    r'podman\s+volume\s+rm',
    r'docker\s+volume\s+rm',
    r'docker-compose\s+down\s+-v',
    r'podman-compose\s+down\s+-v',
    r'rm\s+-rf\s+/opt/codeb',
    r'DROP\s+DATABASE',
    r'DROP\s+TABLE',
]

def check_command(cmd):
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, cmd, re.IGNORECASE):
            return False, f"Blocked: matches pattern '{pattern}'"
    return True, None

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(0)
    cmd = ' '.join(sys.argv[1:])
    allowed, reason = check_command(cmd)
    if not allowed:
        print(f"Command blocked by CodeB hook: {reason}", file=sys.stderr)
        print(f"Use 'we' CLI commands instead.", file=sys.stderr)
        sys.exit(1)
    sys.exit(0)
