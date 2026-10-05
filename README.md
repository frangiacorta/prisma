# prisma

Workspace completo di **Prisma Studio**, generatore di wallpaper statici e animati.

- **Scarica tutto:** [ZIP del repository](https://github.com/frangiacorta/prisma/archive/refs/heads/main.zip), oppure **Code → Download ZIP**.
- **Applicazione:** [`prisma-studio/dist`](prisma-studio/dist).
- **Sito:** https://prisma-forme-studio.francesco-gioia.chatgpt.site/
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

## ZIP originale completo

Il backup originale contiene **892 file**, comprese directory nascoste, directory
vuote e metadati Git. È conservato in [`backup`](backup), in sei parti ordinate,
per rispettare il limite di GitHub sui singoli file.

Dopo aver scaricato ed estratto il repository, su **Windows** fai doppio clic su
[`backup/Ricrea-ZIP.cmd`](backup/Ricrea-ZIP.cmd): ricrea
`Prisma-workspace-completo.zip` nella cartella principale. Puoi estrarlo normalmente.

Con Python, su qualsiasi sistema:

```sh
python backup/ricrea_zip.py
```

Git non conserva directory vuote o directory `.git` annidate; il backup originale
le conserva. La cronologia del progetto rimane disponibile anche come ramo Git e
come bundle. Le due copie dello ZIP generate durante il download in chat sono
rappresentate dallo stesso backup, senza duplicare l'archivio.
