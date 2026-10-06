# Prisma 4D — kit per ripartire in Codex locale

Ricerca e diagnostica preparate il 6 ottobre 2026. **Questo kit non è ancora l'effetto 4D**: verifica gli strumenti prima della calibrazione fisica.

1. Leggi [RIPARTI-QUI.md](RIPARTI-QUI.md): contiene il mandato per Codex locale e lo stato del progetto.
2. Consulta [RICERCA-STRUMENTI.md](RICERCA-STRUMENTI.md) e [VERIFICHE.md](VERIFICHE.md).
3. Su Windows, usa Node compatibile (preferibilmente 24 LTS) e Chrome oppure Edge già installato. Nella cartella del kit:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run check:pc
npm run check:mcp
npm start
```

Apri http://127.0.0.1:8240 . I risultati locali sono in `reports/`, esclusa da Git. Per MCP, se è disponibile solo Edge: `$env:PRISMA_MCP_BROWSER = "msedge"` prima del controllo. Per un browser in posizione particolare usa `PRISMA_BROWSER_EXECUTABLE` con il suo percorso assoluto.

`check:pc` apre un browser di prova e poi lo chiude; `npm start` mantiene aperto il server. Nessuna installazione sul PC è stata eseguita dal cloud. Non usare su Windows le variabili o le opzioni Linux elencate nelle prove cloud.

La cartella `web/` comprende un progetto Web per la prova in Wallpaper Engine; la compatibilità effettiva con il programma va ancora verificata. I callback delle proprietà sono verificati solo simulandoli nel browser. Il rendering Prisma si avvia con il pulsante dedicato e può richiedere alcuni secondi.

`reference/` contiene copie mirate di renderer e preset, con hash in `reference/manifest.json`. Non occorre trasferire tutti gli audit, i backup o gli strumenti del cloud. Gli script Python conservati sono riferimenti storici con percorsi cloud: **non sono comandi di avvio pronti per Windows**.
