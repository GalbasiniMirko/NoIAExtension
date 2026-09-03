# NoIA

Estensione Chrome che rimuove la **Panoramica AI** e la **Modalità AI** dalle ricerche Google.

Manifest V3, nessuna dipendenza, nessun passaggio di build: si carica così com'è.

## Installazione

1. Apri `chrome://extensions`
2. Attiva **Modalità sviluppatore**
3. **Carica estensione non pacchettizzata** → seleziona la cartella del progetto

Dopo ogni modifica ai file serve un ricaricamento (↻) sulla card dell'estensione; se hai
toccato il content script, ricarica anche la pagina Google.

Per le estensioni non pacchettizzate Chrome deriva l'identificativo dal percorso della
cartella: se la sposti o la rinomini, al ricaricamento è una nuova installazione e le
impostazioni ripartono dai valori predefiniti.

## Opzioni

Dal popup dell'icona:

| Opzione | Cosa fa | Predefinita |
| --- | --- | --- |
| **Nascondi la Panoramica AI** | Toglie il blocco dai risultati, lasciando intatto il resto della pagina | attiva |
| **Blocca la Modalità AI** | Nasconde la scheda e riporta ai risultati Web chi ci arriva comunque | attiva |
| **Solo risultati Web** | Passa ogni ricerca dal filtro Web (`udm=14`) | disattiva |
| **Log diagnostico** | Scrive in console cosa viene agganciato, per aggiornare i selettori | disattiva |

## Come funziona

L'estensione affronta lo stesso problema in due modi, con compromessi opposti. Sono
indipendenti e si possono usare insieme.

### Redirect sul filtro Web

Regole `declarativeNetRequest` riscrivono l'URL prima che la richiesta parta. `udm=14` è il
filtro "Web" ufficiale di Google, e su quella pagina la Panoramica AI non compare affatto:
non c'è niente da nascondere, e niente da riaggiustare quando Google cambia il markup. La
Modalità AI vive su `udm=50` e viene riportata a `udm=14` con lo stesso meccanismo.

Il prezzo è che il filtro Web toglie anche caroselli immagini, video, box "Altre domande" e
riquadri laterali: la pagina diventa una lista di link. Per questo *Solo risultati Web* è
disattiva di default, mentre il blocco della Modalità AI, che agisce solo su `udm=50`, è
attivo.

Ogni ruleset contiene due regole. La prima riscrive la ricerca; la seconda, a priorità più
alta, lascia passare qualsiasi URL che abbia già un `udm=` esplicito. Senza quest'ultima le
schede Immagini (`udm=2`) e Video verrebbero dirottate sul Web a ogni clic, e il redirect
rischierebbe di rimbalzare su se stesso.

### Rimozione del blocco dalla pagina

Un content script lascia la pagina dei risultati intatta e fa sparire solo la Panoramica AI.
È l'opzione più gentile, ed è anche la più fragile: Google offusca e ruota i nomi delle
classi, quindi un selettore come `.M8OgIe` dura poche settimane.

Per questo l'aggancio avviene su due fronti: pochi selettori strutturali su attributi
`data-*` e `aria-label`, più un'euristica sul testo dell'intestazione del blocco
("Panoramica AI", "AI Overview" e gli equivalenti nelle altre lingue). Da lì si risale al
blocco di primo livello della pagina, con un controllo che impedisce di nascondere
contenitori tanto ampi da portarsi via l'intera lista dei risultati.

La Panoramica AI viene inserita in modo asincrono, dopo il primo rendering, quindi serve un
`MutationObserver`; le scansioni sono accorpate in una sola per frame.

## Struttura

```
manifest.json
icons/                    icone generate a 16, 32, 48 e 128 px
popup/                    interfaccia dei toggle
rules/
  force-web.json          riscrive ogni ricerca su udm=14
  block-ai-mode.json      riporta la Modalità AI ai risultati Web
src/
  settings.js             impostazioni condivise fra le tre componenti
  background.js           accende e spegne i ruleset secondo le opzioni
  content.js              rimozione del blocco dalla pagina
  content.css
tools/check.js            controlli automatici su manifest e regole
```

## Se la Panoramica AI ricompare

Significa che Google ha cambiato il markup e l'euristica non aggancia più.

1. Apri la console sulla pagina dei risultati e scrivi `NoIA` nel campo filtro: la console
   di Google è rumorosa, e un eventuale ad blocker la riempie di `ERR_BLOCKED_BY_CLIENT`
   che non c'entrano nulla
2. Attiva **Log diagnostico** dal popup. Lo script risponde subito con `[NoIA] attivo su …`
   e dopo tre secondi con un riepilogo di cosa ha nascosto
3. Se il riepilogo dice `nessun aggancio`, elenca anche tutte le intestazioni presenti nella
   pagina: lì dentro c'è il testo con cui Google chiama il blocco oggi
4. Aggiungi quel testo a `OVERVIEW_HEADING`, oppure ispeziona il contenitore con DevTools e
   metti un attributo stabile in `CONTAINER_SELECTORS`. Sono entrambi in cima a
   `src/content.js` e sono le uniche due cose pensate per essere ritoccate

Se in console non compare nemmeno la riga `attivo su`, il content script non sta girando:
ricarica l'estensione e poi la pagina.

In alternativa, *Solo risultati Web* non dipende dal markup e non si rompe.

## Limiti noti

**Domini.** Sono coperti `google.com`, `.it`, `.ch`, `.co.uk`, `.de`, `.fr` e `.es`. Per
aggiungerne altri servono due modifiche in `manifest.json`: `host_permissions` e
`content_scripts[0].matches`. Le espressioni regolari in `rules/` accettano già qualsiasi
dominio di primo livello, ma non basta: Chrome applica un redirect solo dove l'estensione ha
il permesso sull'host.

**Telefono.** Chrome per Android e iOS non supporta le estensioni. Il comportamento di *Solo
risultati Web* si ottiene comunque impostando come motore di ricerca predefinito
`https://www.google.com/search?q=%s&udm=14`, cosa che Firefox permette su entrambe le
piattaforme. Le ricerche avviate dall'app Google, dal widget o da Discover ignorano
l'impostazione del browser.

**Disponibilità della Panoramica AI.** Non compare su tutte le ricerche: dipende da query,
lingua, area geografica e account. Zero blocchi in una sessione non significa che
l'estensione non stia funzionando.

## Sviluppo

```bash
node tools/check.js
```

Verifica che manifest e regole siano coerenti, che tutti i file referenziati esistano e
simula il matching `declarativeNetRequest` sui casi che contano: assenza di loop di
redirect, schede Immagini e Video non dirottate, Modalità AI bloccata solo quando l'opzione
è attiva.

Le icone sono PNG versionati nel repo.

## Licenza

MIT — vedi [LICENSE](LICENSE).
