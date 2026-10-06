# Prisma 4D — kit e prima calibrazione locale

Ricerca e diagnostica preparate il 6 ottobre 2026. **Questo kit non è ancora l'effetto 4D**: verifica gli strumenti prima della calibrazione fisica.

1. Leggi [RIPARTI-QUI.md](RIPARTI-QUI.md): contiene il mandato per Codex locale e lo stato del progetto.
2. Consulta [RICERCA-STRUMENTI.md](RICERCA-STRUMENTI.md) e [VERIFICHE.md](VERIFICHE.md).
3. Su Windows, usa Node compatibile (preferibilmente 24 LTS) e Chrome oppure Edge già installato. Nella cartella del kit:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run check:pc
npm run check:mcp
npm run check:calibration
npm start
```

Apri http://127.0.0.1:8240 . I risultati locali sono in `reports/`, esclusa da Git. Per MCP, se è disponibile solo Edge: `$env:PRISMA_MCP_BROWSER = "msedge"` prima del controllo. Per un browser in posizione particolare usa `PRISMA_BROWSER_EXECUTABLE` con il suo percorso assoluto.

`check:pc` apre un browser di prova e poi lo chiude; `npm start` mantiene aperto il server. In Chrome il prototipo è su http://127.0.0.1:8240/calibration.html; la diagnostica originale resta su http://127.0.0.1:8240/. Non usare su Windows le variabili o le opzioni Linux elencate nelle prove cloud.

`web/project.json` apre la prima scena di calibrazione in Wallpaper Engine. Per una finestra separata, con Wallpaper Engine già avviato:

```powershell
& 'C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine\wallpaper64.exe' -control openWallpaper -file 'C:\PERCORSO\Prisma 4D\web\project.json' -playInWindow 'Prisma4DTest' -width 1280 -height 720 -activate
```

Adatta soltanto i percorsi verificati sul tuo PC. L'immagine proiettata è stata misurata dall'utente: 1550 mm di larghezza e 900 mm di altezza. L'utente guarda dal centro dell'immagine: coordinate dell'occhio x=0 e y=0. La distanza dell'occhio è approssimativa: circa 2000 mm (o poco meno). `web/calibration-config.js` conserva i quattro angoli e la risoluzione effettiva come valori ignoti, da compilare dopo la misura. La griglia serve a confrontare l'immagine con il muro; disattivala per giudicare la profondità. La sfera è un oggetto di controllo con ombra, non ancora il materiale Prisma originale.

La prova ora parte con **Sfera davanti al bordo** attiva: l'oggetto copre parte del bordo destro e inferiore, con ombre sulla parete e nel vano. Disattiva questa casella per confrontarla con la sfera arretrata. Le ombre usano una sorgente estesa con 64 campioni e la luce viene schermata dall'apertura. La griglia di calibrazione parte spenta. Questo è un confronto visivo da giudicare sulla parete: il rendering riuscito non dimostra che l'illusione sia convincente. Le barre della finestra e di Windows rimangono visibili per scelta dell'utente.

La diagnostica originale rimane in `web/index.html`: lì il pulsante **Controlla anche Prisma** verifica il renderer reale. Il risultato Windows e le limitazioni sono in [VERIFICHE.md](VERIFICHE.md).

`reference/` contiene copie mirate di renderer e preset, con hash in `reference/manifest.json`. Non occorre trasferire tutti gli audit, i backup o gli strumenti del cloud. Gli script Python conservati sono riferimenti storici con percorsi cloud: **non sono comandi di avvio pronti per Windows**.
