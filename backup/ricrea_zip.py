from pathlib import Path
import hashlib
import json
import sys

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'WORKSPACE-MANIFEST.json').read_text(encoding='utf-8'))
archive = manifest['completeArchive']
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'Prisma-workspace-completo.zip'
digest = hashlib.sha256()
with output.open('xb') as destination:
    for item in archive['parts']:
        part_digest = hashlib.sha256()
        with (root / item['path']).open('rb') as stream:
            while data := stream.read(1024 * 1024):
                part_digest.update(data)
                digest.update(data)
                destination.write(data)
        if part_digest.hexdigest() != item['sha256']:
            raise RuntimeError('Parte danneggiata: ' + item['path'])
if digest.hexdigest() != archive['sha256'] or output.stat().st_size != archive['bytes']:
    raise RuntimeError('Lo ZIP ricostruito non corrisponde al backup originale.')
print('ZIP completo creato e verificato: ' + str(output))
