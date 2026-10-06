# Mandato per Codex locale — riprendere da qui

## Obiettivo e autorizzazione dell'utente

L'utente vuole lavorare nell'app Codex locale sul suo PC Windows come punto centrale per Prisma, GitHub/Pages e un prototipo per Wallpaper Engine. Ha autorizzato ricerca e installazione degli strumenti necessari; procedi con inventario e installa solo ciò che manca. Non chiedere nuovamente il permesso per ogni controllo o installazione ordinaria già richiesta. Se una policy blocca un'azione, riferisci l'azione e il motivo concreto.

Non migrare tutta la repository, gli audit e gli strumenti cloud sul PC. Usa un progetto locale già esistente se pertinente, oppure una cartella dedicata al piccolo kit. Un checkout mirato per modificare i sorgenti è accettabile quando serve, senza duplicare archivi inutili. Non presumere che una nuova chat locale abbia accesso al filesystem o all'esecuzione della vecchia attività cloud.

Repository: https://github.com/frangiacorta/prisma
Sito: https://frangiacorta.github.io/prisma/
Originale: https://prisma-forme-studio.francesco-gioia.chatgpt.site/
Kit: branch `prisma-4d-tooling` della stessa repository. È un ramo autonomo di supporto, **non va unito a main come se fosse un aggiornamento dell'app**.

## Prima: verificare connessioni e strumenti reali

1. Leggi `README.md`, `RICERCA-STRUMENTI.md`, `VERIFICHE.md` e gli eventuali AGENTS.md applicabili. La ricerca è già fatta: aggiorna solo i punti che ne hanno bisogno.
2. Verifica che il terminale sia effettivamente sul PC Windows. Rileva GPU/driver, risoluzione schermo, Node, Git, gh, Chrome/Edge, Wallpaper Engine e configurazione MCP. Non stampare segreti. Cerca prima gli strumenti già presenti.
3. Installa solo i mancanti necessari con fonti ufficiali: Node 24 LTS se non c'è una versione compatibile; Git/gh se servono. Non installare adesso Blender, TouchDesigner, Python, OpenVDB o FFmpeg. Nessun acquisto/licenza richiesto.
4. Nella cartella kit: `npm ci --ignore-scripts --no-audit --no-fund`, `npm run check:pc`, `npm run check:mcp`. Usa Chrome/Edge esistente. Non copiare i flag Linux software/no-sandbox dal rapporto cloud. Conserva i risultati in reports senza pubblicare dati del PC.
5. Registra Playwright MCP con il metodo supportato dal Codex installato; usa percorsi assoluti e profilo dedicato. Prima controlla i server già configurati. Se occorre ricaricare il client, spiegalo con un solo passaggio preciso. Un profilo nuovo non eredita login. Verifica navigazione ed esecuzione reali, non soltanto la presenza di un file config.
6. Verifica GitHub con credenziali locali esistenti: repo, branch, lettura/scrittura disponibili, Pages e ultimo deployment. Se occorre autenticazione, usa il login browser del servizio; non chiedere password/PAT in chat. Le credenziali proxy cloud non sono trasferibili. Distingui accesso al sito pubblico da permesso di modifica.
7. Apri ChatGPT Sites nel browser controllabile e verifica se l'utente ha accesso al **progetto originale e ai comandi di modifica/pubblicazione**. Il solo link pubblico non basta. Non promettere API o connettori inesistenti. Se richiede login/manualità, indica esattamente quel passaggio; prosegui intanto il resto.
8. Verifica accesso al precedente cloud soltanto tramite strumenti/connessioni effettivamente disponibili. Nessun collegamento automatico tra chat è stato trovato. Le copie mirate in reference permettono di proseguire comunque. Elenca alla fine quali accessi sono funzionanti e quali restano manuali.

## Poi: esecuzione Wallpaper Engine e prima calibrazione

Wallpaper Engine è già posseduto. Prima prova `web/project.json` in una finestra separata, tramite CLI documentata o editor se richiesto. Controlla WebGL2, renderer GPU, shader Prisma e ricezione reale delle proprietà. L'esecuzione in Chrome non certifica Wallpaper Engine. Se serve usa CEF devtools locale su porta libera (proposta 9223); il server del kit usa 8240. Verifica il collegamento CDP prima di affidargli l'automazione.

Solo dopo avvia il prototipo di calibrazione: stessa pagina/renderer, un file config con mm, quattro angoli e occhio, griglia + vano + sfera + cilindro orientato correttamente. Niente tracciamento. Dati noti stimati: immagine larga 160 cm e visione a 1 m. Mancano altezza, risoluzione, posizione laterale/verticale dell'occhio, angoli reali e modello proiettore. Fai poche domande concrete quando necessarie e prepara intanto l'interfaccia; non inventare le misure.

Usa WebGL/SDF come percorso principale, senza imporre un esportatore mesh. Obiettivo visivo: vano coerente con la parete, oggetto che occlude/supera il bordo e ombre coerenti. A 1 m non promettere lo stesso effetto dei video monoculari; confronta un occhio/due occhi. Non trattare le vecchie demo bocciate come risultato approvato. Verifica il prototipo con l'utente prima di raffinare l'estetica o renderizzare ad alta risoluzione.

## Continuità Prisma: file e lavori precedenti

- main osservato: `70c3604ee150fb3053a19268469d374e353fbeba`; gh-pages: `54cacd36e386cfb2ffafb6dc9f2134c0451c8bdc`. Ricontrolla prima di modificare.
- Sorgenti: `prisma-studio/dist/`, servibili via semplice HTTP. `reference/prisma/renderer.js` è la copia di riferimento; manifest con SHA256.
- 20 palette da riferimenti aggiunte alle 20 precedenti in main. Pages risponde 200 ma `reference-palettes.js` rispondeva 404 il 6 ottobre: pubblicazione ancora da verificare. Non dichiarare palette online finché non controllate nel sito. Le richieste build dal cloud erano negate dall'integrazione; non rilanciare workflow storici su revisioni vecchie. Esamina la pubblicazione corrente con l'autenticazione locale.
- Sfera cava: `reference/sfera-cava/renderer.js`, `preset.json`, `export-final.py`. Loop 32 s, tentacoli piccoli/lenti con armoniche periodiche, rotazione dell'ambiente della luce interna: **non orbita della luce**. `tentacleMotion` è una personalizzazione esterna al normale import: il preset da solo nel Prisma standard può perdere quel movimento. Preservare renderer + stato + campionamento temporale.
- Sfera finale già esportata: 2560×1440, 60 fps, 32 s. Il rendering usava preview di qualità alta e accumulo; non attribuirgli fedeltà al percorso spettrale completo. Download verificato: https://github.com/frangiacorta/prisma/archive/refs/heads/video-sfera-cava-1440p.zip ; estrarre e avviare APRI-VIDEO.cmd. Nessun bisogno di renderizzare di nuovo per recuperarlo.
- Gelatina: `reference/gelatina/preset.json`, `render-mini.py`. Mini loop 8 s, 480×270, 24 fps, piccola apertura/chiusura dei tentacoli tramite petalCurl. L'export finale non è approvato. Gli script Python sono riferimenti, hanno percorsi cloud da adattare.
- I preset copiati sono versioni derivate per i loop, non gli originali immutati inviati dall'utente. Non presentare la sfera diagnostica opaca come il materiale originale di Gelatina.
- Fiori/particelle ed esportatore mesh rinviati. Non allargare il lavoro a questi moduli.

## Comunicazione e completamento

Spiega in italiano semplice, con pochi passaggi concreti. Esegui i controlli e le attività autorizzate invece di fermarti al piano. Non dire che hai installato o pubblicato senza verifica. Per render lunghi aggiorna a ogni 10% come richiesto dall'utente. Mantieni README/documenti coerenti con Pages come sito di riferimento quando modifichi l'app. Riporta cosa funziona su PC, cosa funziona su GitHub/Pages, cosa è disponibile per Sites e quale prova di calibrazione aprire.
