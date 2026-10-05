# prisma

Workspace completo di **Prisma Studio**, generatore di wallpaper statici e animati.

- **Applicazione:** [`prisma-studio/dist`](prisma-studio/dist).
- **Sito:** https://prisma-forme-studio.francesco-gioia.chatgpt.site/
- **ZIP completo del workspace originale (110 MB):** [Scarica](https://github.com/frangiacorta/prisma/releases/download/workspace-2026-10-05/Prisma-workspace-completo.zip).
- **Inventario e verifiche SHA-256:** [`WORKSPACE-MANIFEST.json`](WORKSPACE-MANIFEST.json).
- **Cronologia originale:** ramo `prisma-studio-history` e [`history/prisma-studio.bundle`](history/prisma-studio.bundle).

Le cartelle `prisma-*-audit`, `prisma-*-review`, `prisma-user-export`,
`attachments`, `library-files` e `scratch` conservano verifiche, immagini,
registrazioni, preset, esportazioni e altri file di lavoro.

## Avvio locale

Dalla cartella del repository, con Python installato:

```sh
python -m http.server 8080 --directory prisma-studio/dist
```

Apri http://localhost:8080 in Chrome. L'applicazione usa WebGL2 nel browser.

## Backup

La release contiene lo ZIP originale completo, comprese le directory nascoste
e i metadati Git. Git non conserva directory vuote o directory `.git` annidate;
lo ZIP le conserva e il bundle permette di recuperare la cronologia del progetto.
Le due copie dello ZIP generate durante il download in chat sono rappresentate
dallo stesso allegato della release, senza duplicare un file maggiore del limite
di 100 MiB per i normali file GitHub.
