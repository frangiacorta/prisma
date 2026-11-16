# Verifiche del renderer

Richiedono Node.js 22 o successivo e Google Chrome installato. Eseguire dalla radice della repository:

```sh
npm ci
npm run test:render
```

Le prove aprono Chrome senza finestra, avviano un server locale temporaneo e lo chiudono al termine. Verificano il nucleo scuro sui diversi materiali, il colore condiviso del frattale e il completamento dei raggi anche dopo un annullamento. Non richiedono account o chiavi API.

Il passaggio delle prove conferma questi comportamenti tecnici; non certifica la somiglianza visiva o il movimento rispetto alle reference. Lo stato dei confronti è in [v94-reference-status.json](../reports/v94-reference-status.json).
