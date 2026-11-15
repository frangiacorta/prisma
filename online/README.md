# Prisma · Regia online

Site privato, accessibile al proprietario tramite l'accesso gestito da Sites.
Il Playground è lo stesso codice pubblicato su GitHub: il renderer resta nel browser.
Il collegamento dal sito pubblico trasferisce il progetto nel frammento URL; non avvia chiamate AI.

## Attivazione

Configurare OPENAI_API_KEY nei segreti runtime del Site, tramite OpenAI Developers.
Non inserirla nel progetto, nel preset o nel browser. Pubblicare nuovamente per applicare
la revisione dell'ambiente. Senza chiave la regia segnala il collegamento mancante e
resta disattivata; editor, Manuale e Flow funzionano.

Modello iniziale: gpt-5.4-mini. Responses API, immagini e output JSON strutturato,
nessuno strumento o codice eseguibile generato. La qualità dell'inferenza online va
verificata con chiamate reali dopo il collegamento dell'account.

Impostare anche `PRISMA_DIRECTOR_OWNER_EMAIL` nei segreti runtime. La regia verifica l’indirizzo del proprietario fornito dall’accesso del Site a ogni richiesta. Il limite di 60 tentativi al giorno vale anche per il totale delle sessioni del Site.

## Limiti e memoria

12 tentativi per sessione di un'ora, 60 al giorno UTC, una richiesta alla volta.
I tentativi falliti o interrotti consumano il limite in modo conservativo.
Massimo 4096 token di output per richiesta; prompt e immagini hanno limiti di dimensione.
Questi sono limiti di utilizzo, non una promessa di prezzo o un tetto in euro.
Il contatore mostra i token restituiti dal fornitore; richieste interrotte senza risposta
possono essere fatturate senza poter essere contabilizzate nei token visualizzati.

D1 conserva proprietario, memoria e ultime 8 scelte della sessione, contatori e scadenza.
Le immagini e gli stati completi delle scene non sono salvati nel database; i fotogrammi
sono inviati a OpenAI con store:false. Il progetto mantiene la memoria artistica sul
dispositivo/esportazione JSON, senza token o avvio automatico della regia.
Riaprire una sessione sul medesimo dispositivo non avvia chiamate API.

La chiusura della scheda o Riprendi il controllo annullano la richiesta nel browser e
marcano la sessione interrotta. Un'inferenza già arrivata al provider può avere un costo.
La risposta tardiva non viene applicata. Nessun ripiego su Flow in caso di errore API.

## Aggiornamento

GitHub e Sites devono essere aggiornati, verificati e committati insieme a ogni modifica
di Prisma. Questa è l'autorizzazione permanente dell'utente del 2 novembre 2026.
Un aggiornamento di Flow va pubblicato anche qui senza estendere automaticamente
il comportamento creativo della Regia AI, che richiede una richiesta distinta.

Roadmap: accesso unico da GitHub e futura dismissione di Sites dopo la sostituzione
verificata di tutte le funzioni server, autenticazione, memoria e gestione segreti.
GitHub Pages è statico: l'architettura del servizio sostitutivo resta da progettare.
Fino alla migrazione mantenere lo stesso Site privato e la parità funzionale dei due siti.

Sorgente principale: web/studio nel workspace Prisma. Dopo il build pubblico eseguire
checks/package-regia-online.mjs per aggiornare public/studio e i modelli condivisi.
Conservare il project_id esistente. Le migrazioni D1 sono in drizzle/.
Non copiare reference private, credenziali o file di sessione nella pubblicazione.
