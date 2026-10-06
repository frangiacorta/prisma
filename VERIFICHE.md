# Verifiche effettive — 6 ottobre 2026

Il lavoro è avvenuto su Linux in cloud, non sul PC dell'utente. Non sono stati installati programmi Windows né configurato Wallpaper Engine.

- Installate nel kit le dipendenze npm bloccate, con lifecycle scripts disabilitati.
- SHA256 dei sei file di riferimento: corrispondono al manifest.
- Server locale HTTP e rifiuto traversal fuori dalla cartella Web: verificati.
- WebGL2 GLSL 300 ES: compilazione/disegno/lettura pixel verificati.
- Renderer Prisma originale su sfera diagnostica: immagine non uniforme correttamente prodotta a 192×108; grafica **software llvmpipe**, circa 6.5 secondi. Questo NON misura la velocità della GPU del PC e NON certifica fedeltà delle scene finali.
- Proprietà Wallpaper Engine: callback simulati nel browser verificati; host reale ancora da provare.
- WebGL2 assente: errore esplicito verificato; nessun errore JavaScript inatteso.
- Navigazione `file://`: bloccata dalla policy amministrativa del browser cloud. Policy mantenuta. Il test complessivo termina con codice 2, coreChecksPassed=true, passed=false; resta da verificare su Windows e in Wallpaper Engine.
- MCP: inizializzazione, elenco di 25 strumenti, navigazione e valutazione nel browser superate. Risultato effettivo in `evidence/mcp-check.json`. Questa prova non equivale a registrazione nell'app Codex locale o accesso a siti autenticati.
- GitHub Pages: HTTP 200; file nuove palette HTTP 404. Sites: HTTP 403 dal cloud. Vedi evidence/publication-check.json.
- Nessun terminale locale connesso a questa attività cloud, nessun VPN/ponte PC configurato. Non si può comandare un'altra chat Codex automaticamente.

I report di questa cartella documentano soltanto la macchina di preparazione. I nuovi report Windows vanno in reports/, esclusa da Git. Opzioni Linux per il test software e il sandbox Chromium non sono impostazioni per il PC.
