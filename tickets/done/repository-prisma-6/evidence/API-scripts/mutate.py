# Product-level breaks in the built dist (restored afterwards by `npm run build`).
import sys
m = sys.argv[1]
def edit(path, old, new):
    s = open(path).read()
    assert s.count(old) >= 1, (path, old)
    open(path, 'w').write(s.replace(old, new))
if m == 'M1':  # CJS entry loads .env into process.env on import
    s = open('dist/index.js').read()
    loader = 'try{for(const l of require("fs").readFileSync(".env","utf8").split("\\n")){const x=l.match(/^([^=#]+)=(.*)$/);if(x)process.env[x[1].trim()]=x[2].trim();}}catch(e){}\n'
    first, rest = s.split('\n', 1)
    open('dist/index.js', 'w').write(first + '\n' + loader + rest)
elif m == 'M2':  # default log levels include query events
    for p in ['dist/index.js', 'dist/index.mjs']:
        edit(p, ': ["info", "warn", "error"];', ': ["info", "warn", "error", "query"];')
elif m == 'M3':  # ESM entry does not switch to WAL
    edit('dist/index.mjs', 'PRAGMA journal_mode = WAL;', 'PRAGMA journal_mode = DELETE;')
elif m == 'M4':  # declarations no longer accept enableWAL: true
    for p in ['dist/index.d.ts', 'dist/index.d.mts']:
        edit(p, 'enableWAL?: boolean;', 'enableWAL?: false;')
