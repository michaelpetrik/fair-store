# Fair Store - Ochrana před podvodnými e-shopy

Chrome rozšíření pro ochranu českých spotřebitelů před podvodnými e-commerce stránkami pomocí oficiálních dat **České obchodní inspekce (ČOI)**.

## Funkce

- ⚠️ **Varování při návštěvě rizikových e-shopů** - Automatická detekce domén ze seznamu ČOI
- 🏛️ **Oficiální data ČOI** - Využívá aktuální seznam rizikových e-shopů z coi.gov.cz
- 🛡️ **Okamžitá ochrana** - Zobrazení varovného popup okna při načtení stránky
- 🔒 **Bezpečné akce** - Možnost zavřít záložku nebo pokračovat na vlastní riziko
- 📋 **Podrobnosti od ČOI** - Zobrazení důvodu zařazení do seznamu rizikových e-shopů
- 🔄 **Automatická aktualizace** - Data se stahují při každém spuštění prohlížeče

## Instalace

### Pro vývoj (Chrome)

1. Klonujte repozitář:
   ```bash
   git clone https://github.com/michaelpetrik/fair-store.git
   cd fair-store
   ```

2. Otevřete Chrome a přejděte na:
   ```
   chrome://extensions/
   ```

3. Zapněte "Developer mode" (pravý horní roh)

4. Klikněte na "Load unpacked" a vyberte složku projektu

5. Rozšíření je nyní nainstalováno a aktivní!

### Testování

Rozšíření využívá aktuální seznam rizikových e-shopů z ČOI:
- Data se stahují z: `https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv`
- Pro testování navštivte nějakou doménu ze seznamu ČOI
- Seznam můžete zobrazit v developer console po načtení rozšíření

## Struktura projektu

```
fair-store/
├── manifest.json           # Chrome extension manifest (v3)
├── background.js          # Background service worker + ČOI CSV parser
├── content/
│   ├── content.js        # Content script (varovací popup)
│   └── warning.css       # Styly pro varovací popup
├── popup/
│   ├── popup.html        # UI rozšíření
│   ├── popup.js          # Logika popup
│   └── popup.css         # Styly popup
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Jak to funguje

1. **Stažení dat**: Při spuštění se stáhne aktuální CSV seznam z ČOI
2. **Parsing CSV**: Background script zparsuje CSV a extrahuje domény + důvody
3. **Ukládání**: Data se uloží do chrome.storage pro offline použití
4. **Monitoring**: Background script monitoruje všechny návštěvy stránek
5. **Kontrola**: Každá doména je porovnána se seznamem ČOI
6. **Varování**: Pokud je nalezena shoda, content script zobrazí varovní popup
7. **Akce uživatele**:
   - **Zavřít záložku** - Okamžitě zavře aktuální záložku
   - **Zobrazit podrobnosti** - Rozbalí důvod od ČOI
   - **Ignorovat** - Skryje varování a umožní pokračovat

## Varování popup

Při detekci rizikového e-shopu se zobrazí červený overlay s:

- ⚠️ **Varováním o rizikovém e-shopu** - Oficiální informace od ČOI
- 🏛️ **Badge "Oficiální zdroj: ČOI"** - Potvrzení důvěryhodnosti dat
- 📋 **Tlačítkem "Zobrazit podrobnosti"** - Rozbalí důvod od ČOI
- 💬 **Důvod zařazení do seznamu** - Konkrétní odůvodnění od České obchodní inspekce
- 🛡️ **Doporučení** - Nedůvěřovat stránce a nezadávat osobní údaje
- 🔴 **Tlačítkem "Zavřít záložku"** - Bezpečně zavře stránku
- ⚪ **Tlačítkem "Ignorovat"** - Pokračuje na vlastní riziko

## Zdroj dat

Rozšíření využívá **oficiální otevřená data** z České obchodní inspekce:

- **URL**: https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv
- **Formát**: CSV (středník nebo čárka jako oddělovač)
- **Aktualizace**: Automaticky při každém spuštění prohlížeče
- **Offline režim**: Data se cachují v chrome.storage pro použití bez internetu
- **Struktura**: Doména + Důvod zařazení do seznamu

## Nahlášení podvodné stránky

Pokud jste narazili na podvodnou stránku, kterou byste chtěli nahlásit:

**Oficiální nahlášení ČOI:**
- Web: https://www.coi.cz
- E-podatelna: https://www.coi.cz/informace-o-uradu/kontakty/podatelna/
- Telefonická infolinka: 296 366 360

**Nahlášení problému s rozšířením:**
- GitHub Issues: https://github.com/michaelpetrik/fair-store/issues/new

## Bezpečnost

- ✅ **Důvěryhodný zdroj**: Data pocházejí z oficiálního seznamu ČOI
- ✅ **Žádné sledování**: Rozšíření nesbírá ani neodesílá osobní údaje
- ✅ **Lokální kontrola**: Domény se kontrolují pouze lokálně v prohlížeči
- ✅ **Offline cache**: Data se ukládají pro použití bez internetu
- ✅ **Ochrana před XSS**: Všechny vstupy jsou escapovány
- ✅ **Manifest V3**: Nejnovější bezpečnostní standard pro Chrome rozšíření

## Vývoj

Pro úpravy a vývoj:

1. Proveďte změny v kódu
2. V Chrome přejděte na `chrome://extensions/`
3. Klikněte na ikonu "refresh" u rozšíření
4. Změny jsou okamžitě aktivní

## Dokumentace

Podrobná dokumentace je k dispozici v adresáři `/docs`:

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Architektura systému a datové toky
- **[API.md](docs/API.md)** - API pro komunikaci mezi komponenty
- **[PERMISSIONS.md](docs/PERMISSIONS.md)** - Vysvětlení oprávnění a ochrany soukromí
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Průvodce vývojem
- **[TESTING.md](docs/TESTING.md)** - Testování a quality assurance
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Nasazení do Chrome Web Store

## Licence

MIT License - viz LICENSE soubor

## Kontakt

Michael Petrik - [GitHub](https://github.com/michaelpetrik)

---

## Disclaimer

**Varování**: Toto rozšíření je **nezávislý projekt** a není oficiálním produktem České obchodní inspekce. Využívá otevřená data z ČOI, ale neposkytuje žádné záruky. Vždy buďte obezřetní při nakupování online.

**Fair Store je nezávislé rozšíření** vytvořené pro zvýšení povědomí o rizikových e-shopech mezi českými spotřebiteli. Data jsou poskytována "tak jak jsou" bez záruky úplnosti nebo aktuálnosti.

Pro oficiální informace a nahlašování podvodů navštivte: https://www.coi.cz
