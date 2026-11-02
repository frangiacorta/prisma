# Prisma · Regia online

GitHub e Sites vanno aggiornati, verificati e committati insieme a ogni modifica
di Prisma, come autorizzato dall'utente il 2 novembre 2026. Gli aggiornamenti a Flow
non estendono automaticamente il comportamento della Regia AI.
La roadmap prevede un futuro accesso unico da GitHub e la dismissione di Sites,
dopo la sostituzione verificata delle sue funzioni server. L'architettura è da
valutare; fino ad allora mantenere entrambe le pubblicazioni allineate.

Site privato, accessibile al proprietario tramite l'accesso gestito da Sites.
Il Playground è lo stesso codice pubblicato su GitHub: il renderer resta nel browser.
Il collegamento dal sito pubblico trasferisce il progetto nel frammento URL; non avvia chiamate AI.

## Attivazione

Configurare OPENAI_API_KEY nei segreti runtime del Site, tramite OpenAI Developers.
Non inserirla nel progetto, nel preset o nel browser. Pubblicare nuovamente per applicare
la revisione dell'ambiente. Senza chiave la regia segnala il collegamento mancante e
resta disattivata; editor, Manuale e Flow funzionano.

Modello iniziale: gpt-5.4-mini. Responses API, immagini e output JSON strutturato,
nessuno strumento o codice eseguibile generato. La regia osserva due fotogrammi consecutivi dell'uscita reale e usa memoria e diario
per scegliere il prossimo intervento. Ogni proposta viene validata prima di essere applicata.

## Limiti e memoria

12 tentativi per sessione di un'ora, 60 al giorno UTC, una richiesta alla volta.
I tentativi falliti o interrotti consumano il limite in modo conservativo.
Massimo 4096 token di output, 100 modifiche e 8 colori per proposta; questi limiti
sono dichiarati anche nello schema strutturato inviato al modello. Prompt e immagini
hanno limiti di dimensione.
Questi sono limiti di utilizzo, non una promessa di prezzo o un tetto in euro.
Il contatore include i tentativi falliti e lo stop, e i token restituiti dal fornitore
anche quando la proposta viene rifiutata; richieste interrotte senza risposta
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

Sorgente principale: web/studio nel workspace Prisma. Dopo il build pubblico eseguire
checks/package-regia-online.mjs per aggiornare public/studio e i modelli condivisi.
Conservare il project_id esistente. Le migrazioni D1 sono in drizzle/.
Non copiare reference private, credenziali o file di sessione nella pubblicazione.

Questa cartella conserva il nucleo del server e le migrazioni per revisione. Il servizio completo è distribuito nel Site privato; GitHub Pages non esegue questo modulo. handleDirector richiede identità verificate dal gateway Sites: non pubblicarlo dietro un server che accetta intestazioni identità arbitrarie dai visitatori.

## Test di regressione

Con Node.js 25 (SQLite integrato), dalla radice della repository:

```sh
node --test online/tests/director-api.test.mjs
```

Copertura: espansione della palette, consumi di proposte rifiutate e stop, memoria
persistente, risposta tardiva dopo lo stop, isolamento del proprietario e limiti 12/60.
I test di regressione simulano il provider; la verifica visiva richiede inferenze reali
nel Site privato e non inserisce credenziali nei file pubblicati.
