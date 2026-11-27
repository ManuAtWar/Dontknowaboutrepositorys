#!/usr/bin/env bash
# fetch.sh NAME URL : download one Higgsfield result into raw/NAME.png (run from images/woodpecker)
set -euo pipefail
cd "$(dirname "$0")"
curl -sf --retry 3 -o "raw/$1.png" "$2"
python3 -c "from PIL import Image; im=Image.open('raw/$1.png'); print('$1', im.size, im.mode)"
