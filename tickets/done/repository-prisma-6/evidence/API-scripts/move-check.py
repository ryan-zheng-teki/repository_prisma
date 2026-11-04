# Independent move check: multiset of stripped non-blank lines, old monolith vs split files at a commit.
import subprocess, sys, collections
old_rev, new_rev = sys.argv[1], sys.argv[2]
def show(rev, path):
    return subprocess.run(['git', 'show', f'{rev}:{path}'], capture_output=True, text=True, check=True).stdout
old = show(old_rev, 'scripts/run-package-smoke.js')
files = subprocess.run(['git', 'ls-tree', '--name-only', f'{new_rev}', 'scripts/package-smoke/'], capture_output=True, text=True, check=True).stdout.split()
new = show(new_rev, 'scripts/run-package-smoke.js') + ''.join(show(new_rev, f) for f in files)
norm = lambda text: [l.strip() for l in text.splitlines() if l.strip()]
o, n = collections.Counter(norm(old)), collections.Counter(norm(new))
old_only, new_only = o - n, n - o
print(f'# {old_rev}:scripts/run-package-smoke.js ({len(old.splitlines())} lines) vs {new_rev} runner + {len(files)} modules: {files}')
print(f'old non-blank lines: {sum(o.values())}; new: {sum(n.values())}')
print(f'old-only lines (in the monolith, not in the split): {sum(old_only.values())}')
for l, c in sorted(old_only.items()): print(f'  -{c}x {l}')
print(f'new-only lines (glue added by the split): {sum(new_only.values())}')
for l, c in sorted(new_only.items()): print(f'  +{c}x {l}')
# Template literal bodies: every line inside backtick templates of the old file must appear verbatim (with indentation)
import re
def template_lines(text):
    out = []
    for m in re.finditer(r'`([^`]*)`', text, re.S):
        out += [l for l in m.group(1).splitlines() if l.strip()]
    return collections.Counter(out)
to, tn = template_lines(old), template_lines(new)
missing = to - tn
print(f'template-literal lines (exact, with indentation): old {sum(to.values())}, missing in split {sum(missing.values())}')
for l, c in missing.items(): print(f'  missing {c}x {l!r}')
