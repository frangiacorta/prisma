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

## Prime misure della proiezione — 6 ottobre 2026

- L'utente ha misurato l'immagine: 155 × 90 cm. La distanza di osservazione riferita è circa 2 metri o poco meno; è impostata a 2000 mm come stima, ancora da precisare.
- Configurazione e scena aggiornate a 1550 × 900 mm. La calibrazione complessiva resta incompleta: posizione dell'occhio, risoluzione effettiva e quattro angoli sono ignoti.
- `npm run check:calibration` passato su Chrome con la RTX 5090: dimensioni fisiche e distanza corrette, altezza indipendente dal ridimensionamento della finestra, variazione della prospettiva al movimento virtuale dell'occhio, nessun errore JavaScript.
- Ricaricata e osservata la finestra reale `Prisma4DTest` di Wallpaper Engine: controlli 1550, 900 e 2000 mm e stato WebGL2 attivo. Questa verifica in finestra non certifica ancora l'allineamento ottico sulla parete.
- L'utente ha poi confermato la posizione degli occhi al centro dell'immagine: x=0 e y=0. Valori salvati; la distanza resta approssimativa, e la geometria degli angoli e la risoluzione effettiva restano da verificare.

## Seconda prova visiva — 6 ottobre 2026

- L'utente ha visto la prima scena sulla parete e l'ha giudicata piatta, simile a uno sfondo normale con un vano 3D. L'effetto percettivo della prima prova non è riuscito.
- La nuova variante porta la sfera davanti al piano della parete, in posizione decentrata, con sovrapposizione al bordo destro e inferiore. Sono state aggiunte ombre della sfera sulla parete frontale, ombre dell'apertura, sorgente estesa con 64 campioni e attenuazione negli angoli. La casella **Sfera davanti al bordo** permette il confronto con la sfera arretrata.
- Test Chrome passato sulla RTX 5090: WebGL2, variante davanti e arretrata producono immagini diverse, cambio virtuale del punto di vista, nessun errore JavaScript. Nuova variante osservata in Wallpaper Engine con WebGL2 attivo. La qualità dell'illusione sulla parete deve ancora essere valutata dall'utente.
- L'utente ha chiesto di mantenere le barre della finestra e di Windows: nessuna modalità a schermo intero applicata. La mappatura fisica del solo contenuto rispetto all'intera proiezione resta approssimativa.
- Su indicazione successiva dell'utente, l'apertura del vano è stata estesa fino ai quattro bordi del contenuto, eliminando fascia grigia e cornice esterne. Le barre di Windows restano. Test Chrome passato anche con questo assetto; percezione sulla parete ancora da valutare.

## Confronto con movimento — 6 ottobre 2026

- L'utente ha riferito che la seconda prova statica migliora poco. L'illusione desiderata resta quindi non dimostrata; una foto della proiezione dalla posizione di osservazione è stata richiesta per verificare il contesto reale.
- Aggiunta una sfera a dimensione fisica costante che percorre avanti e indietro l'asse z in 12 secondi. Prospettiva e ombre sono ricalcolate dalla geometria; la camera non si muove e non usa tracciamento della testa. Un controllo permette di disattivare il movimento e confrontare le scene ferme.
- Test Chrome passato: variazione dell'immagine durante il movimento, immagine stabile a scena ferma, confronto avanti/arretrato e punto di vista virtuale, nessun errore JavaScript. Non è una verifica dell'effetto percettivo né una misura degli FPS in Wallpaper Engine.
- La variante è stata caricata nella finestra reale di Wallpaper Engine, che mostra **WebGL2 attivo · movimento in profondità**. Le barre restano visibili.
