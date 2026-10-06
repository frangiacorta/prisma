# Ricerca strumenti e decisioni — 6 ottobre 2026

## Revisione dopo le prove visive locali

La prima scelta WebGL sotto è storica. L'utente ha giudicato le prove piatte e ha chiesto di riprendere gli strumenti del percorso originale. Un cambio di motore non garantisce l'illusione: il confronto deve riguardare il risultato sulla parete, non soltanto shader e pixel corretti.

**Requisiti aggiornati:** scena convincente da punto fisso; in seguito webcam PC per aggiornare la posizione dell'occhio; esecuzione come sfondo desktop durante il lavoro. Il tracking è ora accettato, ma non è ancora implementato o verificato. Dimensioni riferite 155 × 90 cm, distanza circa 2 m, occhio centrale, barre Windows mantenute.

### Prova TouchDesigner e continuità Prisma

1. Verificare licenza gratuita di TouchDesigner 2025.33230, quindi round trip reale di [TDMCP](https://github.com/TouchDesigner/TDMCP) 1.1.55 su localhost. L'utente ha autorizzato esplicitamente l'installazione dopo il primo blocco della revisione automatica: TouchDesigner installato con uscita 0, versione verificata, editor e Key Manager osservati. Attende login e attivazione Non-Commercial da parte dell'utente. TDMCP scaricato con hash verificato; caricamento e collegamento ancora da confermare.
2. Provare subito la destinazione desktop: [Wallpaper Engine mantiene le app locali](https://store.steampowered.com/news/posts/?appids=431960&feed=steam_community_announcements), ma catturare TouchPlayer/TouchDesigner non è una compatibilità certificata. [TouchPlayer](https://derivative.ca/UserGuide/TouchPlayer) esegue i progetti in Perform Mode; la versione gratuita ha ulteriori controlli e richieste per camera/rete. Verificare icone, focus, monitor scelto e applicazioni di lavoro aperte. Alternativa da valutare: [SpoutWallpaper](https://github.com/leadedge/SpoutWallpaper), che nel codice attuale copia pixel e limita a 30 fps; non è una funzione nativa di Wallpaper Engine e non è ancora compilata/provata qui.
3. Costruire la scena rispetto al riferimento visivo recuperato. La [camera dello spettatore](https://derivative.ca/UserGuide/Camera_COMP) e la [mappatura dell'uscita](https://derivative.ca/UserGuide/Palette:kantanMapper) sono problemi distinti. Quattro angoli su parete piana possono bastare per una trasformazione proiettiva; controllare anche punti intermedi. Non applicare automaticamente 155 × 90 cm al canvas se le misure includono le barre.
4. Per conservare Prisma, [Web Render TOP](https://derivative.ca/UserGuide/Web_Render_TOP) può ospitare la pagina originale; WebGL2, GPU e prestazioni reali restano da provare. Un'immagine RGB sovrapposta non dà ombre, rifrazione o occlusioni reciproche. Per quelle interazioni serve la stessa scena o passaggi espliciti di profondità/materiale; un port in [GLSL TOP](https://docs.derivative.ca/Write_a_GLSL_TOP) richiede adattamenti e confronti agli stessi istanti. Blender può costruire vano, asset e riferimenti; l'esportazione mesh rimane opzionale.

[TouchDesigner Non-Commercial](https://derivative.ca/product/touchdesigner-non-commercial/77) è gratuito per uso personale non commerciale ma limitato a 1280 × 1280: adatto alla fattibilità, non a validare la nitidezza nativa 1080p/4K. MadMapper e Resolume Arena sono alternative per mapping/uscita, non componenti da installare tutti insieme. MCP automatizza il programma; non produce da solo un effetto convincente.

### Webcam, in una fase successiva

Percorso Windows documentato: [Video Device In TOP](https://derivative.ca/UserGuide/Video_Device_In_TOP) → [Face Track CHOP](https://derivative.ca/UserGuide/Face_Track_CHOP), con NVIDIA RTX e modelli AR SDK aggiuntivi. Alternativa: [MediaPipe TouchDesigner](https://github.com/torinmb/mediapipe-touchdesigner). Non installati né provati. Nessuna necessità dimostrata di iPhone/ARKit per la webcam PC.

Occorre stimare la posizione del punto fra gli occhi rispetto alla parete, con scala e posizione della webcam calibrate; orientamento del volto e landmark normalizzati non equivalgono a coordinate in millimetri. Verificare che la camera veda l'utente anche dal letto. A tracking perso, ritornare gradualmente al punto fisso; misurare jitter, latenza e carico insieme alle applicazioni di lavoro. Un video preregistrato non può aggiornare la prospettiva al movimento della testa.

### Riferimenti originali recuperati e limiti

La chat «Set up prisma» descriveva due foto («Rosso scenografico» e «Mecha: acciaio e rosso»), un personaggio che sembra attraversare una barriera, TouchDesigner, off-axis projection, virtual shadow, Animated FBX, Sketchfab e autori solodovnykov/Just8. Sono dati della cronologia: le due immagini originali non sono state nuovamente visualizzate. VTK era lo strumento proposto per estrarre mesh da Prisma; non è un requisito per il rendering procedurale.

La ricerca ha trovato il post pubblico [Virtual Shadow Projection di ojrgb](https://www.patreon.com/ojrgb/posts/virtual-shadow-167668304): descrive un progetto TouchDesigner con componente appletd, solo Mac nella distribuzione proposta, dichiarato adattabile a Windows dall'autore. **Non è confermato che sia lo stesso riferimento dell'utente.** Nessun template acquistato o scaricato, né compatibilità Windows provata.

## Ricerca iniziale conservata

## Scelta per il primo prototipo

Usare il renderer WebGL2 di Prisma, una pagina di calibrazione e Wallpaper Engine già posseduto dall'utente. Automatizzare il browser con Playwright. Aggiungere la camera fisica e il vano nello stesso ambiente di rendering dopo aver validato un oggetto semplice. L'esportazione mesh non è un prerequisito.

Questo riduce le conversioni, ma non garantisce automaticamente luce e movimento identici: la camera, le ombre aggiunte, l'illuminazione del vano e i percorsi del renderer devono essere verificati. Mantenere le funzioni originali per geometria/materiali/tempo; confrontare fotogrammi di riferimento. Riutilizzare lo shader non rende automaticamente periodica qualunque animazione.

| Strumento | Decisione | Cosa è stato verificato | Cosa manca sul PC |
|---|---|---|---|
| Node.js | Preferire 24 LTS, riusare installazione compatibile | Cloud 24.19.0; catalogo ufficiale riporta 24.21.0 LTS | Versione e architettura Windows |
| Chrome / Edge | Riusare browser presente | Chromium cloud: WebGL2 e renderer Prisma funzionanti con grafica software | GPU reale, policy e browser Windows |
| Playwright SDK | Incluso, versione 1.63.0 | Test HTTP, shader/pixel, Prisma, errore WebGL assente | Esecuzione Windows |
| Playwright MCP | Incluso, versione 0.0.83 | Vedi rapporto di prova effettivo | Registrazione in Codex locale e browser controllabile |
| Wallpaper Engine | Host principale per il desktop | Documentazione ufficiale: Web, proprietà, CLI, CEF debug | Percorso installazione, WebGL2, prestazioni, callback effettivi |
| Git / GitHub CLI | Riusare; installare solo se necessari e mancanti | Repository e Pages accessibili dal cloud | Autenticazione Windows e diritti di scrittura/build |
| Chrome DevTools MCP | Opzionale, non installato | Repository e requisiti Node verificati | Aggiungerlo solo se serve una diagnosi prestazioni specifica |
| TouchDesigner / MCP | Rinviato | Prezzi e opzioni MCP verificati nelle fonti sotto | Installazione/licenza solo se la strada WebGL non basta |
| Blender / MCP | Rinviato | Repository attuale e requisiti di collegamento | Solo se serve davvero una pipeline mesh |
| FFmpeg | Rinviato al video | Già usato nel cloud per gli export precedenti | Disponibilità locale quando servirà |

Le versioni npm sono bloccate in `package-lock.json`. Il server MCP ha una propria dipendenza Playwright prerelease; il test del server è distinto dal test del SDK stabile. Non aggiornare tutto a `latest` durante la calibrazione.

## Wallpaper Engine e automazione

Fonti ufficiali:
- [Web overview](https://docs.wallpaperengine.io/en/web/overview.html)
- [Primo Web wallpaper](https://docs.wallpaperengine.io/en/web/first/gettingstarted.html)
- [Proprietà](https://docs.wallpaperengine.io/en/web/customization/properties.html)
- [FPS](https://docs.wallpaperengine.io/en/web/performance/fps.html)
- [Debug CEF](https://docs.wallpaperengine.io/en/web/debug/debug.html)
- [CLI](https://help.wallpaperengine.io/en/functionality/cli.html)

Il browser integrato è CEF. Non assumere che un test in Chrome certifichi CEF o la scheda video usata da Wallpaper Engine. Il kit deve essere aperto anche dal programma e deve riportare WebGL2, renderer hardware e proprietà ricevute.

Esempio da adattare ai percorsi rilevati, per una finestra di prova separata:

```powershell
& "PERCORSO_VERIFICATO\wallpaper64.exe" -control openWallpaper -file "C:\PERCORSO_KIT\web\project.json" -playInWindow "Prisma4DTest" -width 1280 -height 720
```

Usare la versione eseguibile realmente presente. La documentazione ammette file Web e `project.json`; se la versione installata richiede importazione nell'editor, usare quel percorso e annotarlo. Non sostituire subito lo sfondo quotidiano. Per chiudere la finestra di prova la CLI documenta `-control closeWallpaper -location "Prisma4DTest"`.

Per ispezionare CEF: Settings → General → CEF devtools port. La documentazione suggerisce 8080; qui si propone **9223**, se libero. Il server del kit usa 8240. Verificare che il debug sia raggiungibile solo localmente; non pubblicare la porta. Provare Playwright `--cdp-endpoint http://127.0.0.1:9223` su una configurazione separata solo dopo aver verificato l'endpoint. La compatibilità CDP con la versione CEF installata resta una prova, non una promessa.

Implementare `window.wallpaperPropertyListener.applyUserProperties` gestendo aggiornamenti parziali. Leggere gli FPS tramite `applyGeneralProperties`, limitare i frame senza alterare il tempo del loop e rispettare pausa/ripresa del programma. Il kit ora verifica soltanto ricezione/lettura delle proprietà; non contiene ancora il loop animato finale.

## Browser, MCP e accessi

- [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp): browser Chrome/Edge, percorso eseguibile, profilo dedicato, CDP e opzione estensione per browser esistente. Preferire un profilo di lavoro esplicito. Un profilo nuovo **non eredita automaticamente il login** del browser personale.
- [Playwright browser channels](https://playwright.dev/docs/browsers): riusare Chrome/Edge evita download browser superflui.
- [Codex MCP](https://developers.openai.com/codex/mcp/): usare la configurazione supportata dal client locale, preservando i server già presenti.
- [Codex Windows](https://learn.chatgpt.com/docs/windows/windows-sandbox): il fatto di leggere la chat nell'app Windows non trasforma un'attività cloud in un terminale Windows.
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp): alternativa per analisi avanzata, versione osservata 1.10.1, Node ^20.19 / ^22.12 / >=23. Supporta ufficialmente Chrome; non assumere supporto CEF. Se scelto, valutare `--no-usage-statistics --no-performance-crux`.
- [Node release index](https://nodejs.org/dist/index.json): verificare architettura e LTS prima dell'eventuale installazione.

Per Codex usare un comando MCP con percorsi assoluti a Node e al bin del pacchetto installato, profilo in `profiles/` e output in `reports/`. Consultare `codex mcp add --help`; non sovrascrivere la configurazione dell'utente e non assumere che l'app desktop erediti lo stesso PATH del terminale. Nessun token nei file del kit.

## Alternative: costi e limiti

- [TouchDesigner Non-Commercial](https://derivative.ca/product/touchdesigner-non-commercial): gratuito per uso personale non commerciale, risoluzione massima 1280×1280. Per un'uscita 2560×1440 o 4K è un limite concreto.
- [TouchDesigner Commercial](https://derivative.ca/product/touchdesigner-commercial): prezzo regolare osservato 600 USD; pagina ufficiale indica risoluzione limitata dalla GPU ed esportazione H.264/H.265 in tempo reale. Verificare prezzo/licenza al momento dell'acquisto; nessun acquisto necessario ora.
- [TDMCP](https://github.com/TouchDesigner/TDMCP): repository nell'organizzazione TouchDesigner, beta, server MCP dentro TouchDesigner tramite `.tox`, Streamable HTTP, porta predefinita 13316; build testata dal progetto 2025.33070. Da valutare prima di un bridge esterno.
- [twozero / touchdesigner-mcp](https://github.com/8beeeaaat/touchdesigner-mcp): progetto comunitario alternativo, WebServerDAT / `.tox`, server Node e porta predefinita 9981; creazione operatori, parametri, Python e immagini TOP. Non installare entrambi per lo stesso bisogno.
- [MCP for Blender](https://github.com/ahujasid/mcp-for-blender): nuovo nome del repository `blender-mcp`; addon con Blender aperto e server locale (9876). Eventuale avvio tramite pacchetto Python/uv secondo versione verificata. Disattivare telemetria se usato (`DISABLE_TELEMETRY=true`) e non eseguire script di installazione remoti senza leggerli.

I connettori richiedono un'applicazione in esecuzione e un collegamento raggiungibile dal client. Non funzionano automaticamente perché presenti su un'altra macchina; un collegamento remoto esplicito sarebbe possibile, ma qui non esiste e non è necessario per iniziare.

## Effetto e calibrazione

L'effetto cercato è una scena anamorfica da un punto di vista privilegiato: un vano sembra proseguire dietro la parete e un oggetto sembra superarne il bordo grazie a prospettiva, occlusioni e ombre coerenti. Non è una proiezione volumetrica. Il termine «4D» dei riferimenti è descrittivo, non una dimensione fisica aggiuntiva.

A 1 m con due occhi permane un conflitto: l'immagine è sulla parete e non fornisce la disparità corretta per gli oggetti virtuali. Per un punto a 1 m dietro la parete e distanza interpupillare 63 mm, la differenza approssimata è 0.063*(1/1-1/2) rad ≈ 1.8°. È un'indicazione geometrica, non una soglia che determina da sola quanto sarà convincente. Confrontare occhi aperti / un occhio chiuso e, se possibile, aumentare la distanza. Una registrazione monoculare può sembrare molto più efficace.

`calibration.draft.json` conserva le sole stime note: base 1600 mm e distanza occhio-parete 1000 mm, tracking disattivato. Restano da misurare risoluzione, quattro angoli in un sistema di riferimento comune sul muro, posizione dell'occhio, modello proiettore e trasformazioni attive. Non inventare altezza 16:9 o modello.

Una trasformazione pixel→parete e raggi `normalize(puntoParete - occhio)` permettono l'off-axis nel raymarcher. Quattro angoli su un piano consentono un'omografia se distorsione ottica e warping non lineare sono trascurabili; altrimenti occorre una griglia più ricca. Fissare le impostazioni del proiettore e preferire la disattivazione delle correzioni automatiche prima delle misure. Qualunque cambiamento successivo invalida la calibrazione. Controllare che la testa non intercetti il fascio.

Usare griglia, vano, sfera e cilindro di controllo. Precisazione: un tubo **perpendicolare alla parete** si vede lungo l'asse soltanto se l'occhio è allineato con quell'asse. Per un occhio decentrato, orientare il tubo verso l'occhio o scegliere un controllo diverso; non usare un criterio geometricamente incoerente. Nascondere il rettangolo luminoso con sfondo coerente col muro nei limiti del livello del nero del proiettore. L'occlusione del bordo aiuta ma non crea stereoscopia.

Il renderer Prisma attuale usa raggi ortografici in più percorsi. L'integrazione non è una sostituzione cieca di una riga: controllare preview, percorso moderno, atlanti, rifrazione, coordinate luci e ombre. Il progetto semplice serve a validare la camera prima di toccare le forme complesse.

Se in futuro servono mesh: campionare lo stesso campo GLSL, verificando che includa cavità/deformazioni. Estrarre con adeguata risoluzione/adattività, confrontare silhouette e depth dalla stessa camera. Le luci/materiali/animazioni procedurali non vengono preservate automaticamente da GLB/FBX; vanno trasferite o ricostruite e confrontate.
