#!/usr/bin/env bash
# Builds the backend into infra/lambda.zip for AWS Lambda (Node 20 + Prisma).
# Run from anywhere:  ./infra/build-lambda.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
OUT="$ROOT/infra/lambda.zip"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$BACKEND"

echo "▶ npm install"
npm install --silent

echo "▶ prisma generate"
npx prisma generate

echo "▶ esbuild bundle (dist/index.js)"
npm run build:lambda

echo "▶ verifying Lambda Prisma engine is present"
if ! ls node_modules/.prisma/client/libquery_engine-rhel* > /dev/null 2>&1; then
    echo "✘ rhel-openssl-3.0.x engine missing — check binaryTargets in prisma/schema.prisma"
    exit 1
fi

echo "▶ assembling clean runtime directory"
mkdir -p "$TMP/dist" "$TMP/node_modules"
cp dist/index.js "$TMP/dist/"
cp package.json "$TMP/"

# Copy every production dependency (including transitive ones) straight from
# package-lock.json — more reliable than `npm ls`, which can omit packages
# when the installed tree metadata gets out of sync.
node -e '
const fs = require("fs");
const path = require("path");
const BACKEND = process.argv[1];
const TMP = process.argv[2];
const lock = JSON.parse(fs.readFileSync(path.join(BACKEND, "package-lock.json"), "utf8"));
for (const [p, meta] of Object.entries(lock.packages || {})) {
    if (p === "" || !p.startsWith("node_modules/") || meta.dev) continue;
    // Engine binaries under these dirs are only needed at generate-time;
    // the runtime engine ships inside node_modules/.prisma/client
    if (p.startsWith("node_modules/@prisma/engines") || p.startsWith("node_modules/prisma/engines")) continue;
    const src = path.join(BACKEND, p);
    const dest = path.join(TMP, p);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
}
' "$BACKEND" "$TMP"

# The generated Prisma client lives outside the npm dependency tree
cp -r node_modules/.prisma "$TMP/node_modules/.prisma"

cd "$TMP"
rm -f "$OUT"
zip -qr "$OUT" .
echo "✅ built $OUT ($(du -h "$OUT" | cut -f1))"
