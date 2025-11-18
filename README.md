# Fair Store - Ochrana před podvodnými e-shopy

Chrome rozšíření pro ochranu českých spotřebitelů před podvodnými e-commerce stránkami.

## Funkce

- ⚠️ **Varování při návštěvě podvodných stránek** - Automatická detekce podezřelých domén
- 🛡️ **Okamžitá ochrana** - Zobrazení varovného popup okna při načtení stránky
- 🔒 **Bezpečné akce** - Možnost zavřít záložku nebo pokračovat na vlastní riziko
- 📊 **Databáze podvodných stránek** - Neustále aktualizovaný seznam známých podvodníků

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

Pro testování funkčnosti můžete zkusit navštívit jednu z testovacích domén v `data/scam-domains.json`:

- example-scam-shop.com
- fake-eshop.cz
- podvodny-obchod.cz

## Struktura projektu

```
fair-store/
├── manifest.json           # Chrome extension manifest (v3)
├── background.js          # Background service worker
├── content/
│   ├── content.js        # Content script (varovací popup)
│   └── warning.css       # Styly pro varovací popup
├── data/
│   └── scam-domains.json # Databáze podvodných domén
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

1. **Detekce**: Background script monitoruje všechny návštěvy stránek
2. **Kontrola**: Každá doména je porovnána s databází podvodných e-shopů
3. **Varování**: Pokud je nalezena shoda, content script zobrazí varovní popup
4. **Akce uživatele**:
   - **Zavřít záložku** - Okamžitě zavře aktuální záložku
   - **Ignorovat** - Skryje varování a umožní pokračovat

## Varování popup

Při detekci podvodné stránky se zobrazí červený overlay s:

- ⚠️ Varováním o podezřelé stránce
- 📋 Seznamem důvodů varování
- 🛡️ Doporučením nedůvěřovat stránce
- 🔴 Tlačítkem "Zavřít záložku" - bezpečně zavře stránku
- ⚪ Tlačítkem "Ignorovat" - pokračuje na vlastní riziko

## Rozšíření databáze

Databáze podvodných domén je uložena v `data/scam-domains.json`. Pro přidání nové domény:

```json
{
  "domains": [
    "example-scam-shop.com",
    "nová-podvodná-stránka.cz"
  ],
  "lastUpdated": "2025-11-18",
  "version": "1.0.0"
}
```

## Nahlášení podvodné stránky

Pokud jste narazili na podvodnou stránku, která není v databázi:

1. Klikněte na ikonu rozšíření
2. Klikněte na "Nahlásit podvodnou stránku"
3. Vyplňte formulář s podrobnostmi

## Bezpečnost

- ✅ Žádná data nejsou odesílána na externí servery
- ✅ Rozšíření pouze kontroluje domény lokálně
- ✅ Ochrana před XSS útoky
- ✅ Manifest V3 (nejnovější bezpečnostní standard)

## Vývoj

Pro úpravy a vývoj:

1. Proveďte změny v kódu
2. V Chrome přejděte na `chrome://extensions/`
3. Klikněte na ikonu "refresh" u rozšíření
4. Změny jsou okamžitě aktivní

## Licence

MIT License - viz LICENSE soubor

## Kontakt

Michael Petrik - [GitHub](https://github.com/michaelpetrik)

---

**Varování**: Toto rozšíření poskytuje dodatečnou vrstvu ochrany, ale nezaručuje 100% bezpečnost. Vždy buďte obezřetní při nakupování online.
