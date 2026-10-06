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

## Ripresa sul PC Windows — 6 ottobre 2026

- Il ramo autonomo `prisma-4d-tooling` è stato scaricato in una cartella locale dedicata. Il ramo `main` non è stato unito né copiato interamente.
- Node 24.19.0, Git 2.55.0, Chrome ed Edge sono presenti. `gh` non è nel PATH, ma non è indispensabile per i test. GPU rilevata: NVIDIA GeForce RTX 5090 Laptop, driver 617.14. Wallpaper Engine 64 bit è installato e in esecuzione.
- `npm ci --ignore-scripts --no-audit --no-fund` ha installato le dipendenze bloccate. La verifica degli hash è stata adattata agli a capo CRLF del checkout Windows: tutti e sei i riferimenti coincidono dopo normalizzazione LF.
- `npm run check:pc` è passato su Windows: WebGL2, pixel di test, renderer Prisma diagnostico, apertura `file://`, callback simulati ed errore WebGL2 assente. Chrome ha usato la RTX 5090 via ANGLE/D3D11, senza renderer software. Il render diagnostico 192×108 ha impiegato circa 5,4 s; non è un benchmark dell'effetto finale.
- `npm run check:mcp` è passato: 25 strumenti Playwright MCP, navigazione e valutazione reali. `prisma-playwright` è stato registrato nella configurazione Codex locale con percorso assoluto di Node, profilo dedicato e cartella output. Un nuovo processo/client Codex potrebbe dover ricaricare i server per esporre i nuovi strumenti in questa chat.
- Wallpaper Engine ha aperto `web/project.json` in una finestra separata `Prisma4DTest`. Il test tecnico ha riportato WebGL2, RTX 5090 via ANGLE/D3D11, rendering Prisma riuscito e callback **reali** delle proprietà dell'host (scala 1, FPS 60). La scena di calibrazione con vano, bordo, sfera e ombra è stata poi visualizzata nella stessa finestra; Chrome ne ha compilato lo shader e verificato che uno spostamento dell'occhio cambia l'immagine.
- L'immagine di prova in finestra misura 1280×720 pixel. Il browser integrato riporta uno schermo 1920×1080, ma la risoluzione effettiva e l'altezza **della proiezione** non sono ancora verificate. Restano da misurare altezza, quattro angoli, posizione dell'occhio, modello e impostazioni del proiettore. Per ora il prototipo assume un rettangolo ideale e altezza derivata dai pixel della finestra; non applica ancora un'omografia. Il suo oggetto è una sfera di controllo separata, non la Sfera cava o Gelatina originali.
- Il connettore GitHub disponibile in questa attività riconosce `frangiacorta` con permesso admin su `frangiacorta/prisma`. I rami `main` e `gh-pages` includevano già `reference-palettes.js`, ma il sito pubblico restituiva 404 perché l'ultimo deployment era sul vecchio commit `fa6928e`. Il connettore ha creato un commit senza modifiche ai file (`cf126bb`) su `gh-pages`; il workflow Pages [37513856174](https://github.com/frangiacorta/prisma/actions/runs/37513856174) è terminato con successo. Il file pubblico ora risponde 200 e il pannello Colori mostra **20 palette dai riferimenti**. Questo verifica scrittura nella repository e pubblicazione Pages da questa attività.
- Git nel terminale locale non ha ancora credenziali di push: Git Credential Manager ha aperto una finestra di login durante la prova, e il push simulato senza interazione ha confermato che mancano le credenziali. Il connettore GitHub funziona senza questo login aggiuntivo; la pubblicazione Pages non dipende più da esso.
- Il sito originale si apre nel browser. Il connettore Sites elenca il progetto `Prisma Studio` con ruolo owner e una versione 19 pubblicata con successo. Questo verifica l'accesso al progetto e alla cronologia di pubblicazione tramite connettore, non equivale a modificare il codice del sito pubblico. Sites rimane riserva secondo la richiesta dell'utente.
- La precedente chat cloud è leggibile come cronologia tramite gli strumenti Codex, ma il suo filesystem `/workspace` non è montato sul PC. I file mirati del kit e i connettori GitHub/Sites sono i collegamenti operativi disponibili.
