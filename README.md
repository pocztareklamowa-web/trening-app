# Trening — aplikacja na telefon

Podgląd planu treningowego, kalendarza i postępu, które trener (skill *klaudiotrainer* w Claude) zapisuje w prywatnym repo `trening`.

**Adres:** https://pocztareklamowa-web.github.io/trening-app/

## Co jest gdzie

- **To repo jest publiczne i zawiera wyłącznie kod** (HTML, CSS, JS). Nie ma tu żadnych danych treningowych.
- **Dane leżą w prywatnym repo `trening`**, w folderze `dane/`. Aplikacja pobiera je bezpośrednio z API GitHuba.
- **Klucz dostępu (fine-grained token) zostaje tylko w pamięci przeglądarki na telefonie.** Aplikacja nie wysyła go nigdzie poza `api.github.com`.

## Instalacja na Androidzie

1. Otwórz adres powyżej w Chrome.
2. Menu ⋮ → **Dodaj do ekranu głównego** (albo „Zainstaluj aplikację”).
3. W aplikacji: ikona ustawień → wklej klucz → **Zapisz i połącz**.

### Klucz dostępu

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token:

- Repository access: **Only select repositories → trening**
- Permissions → Repository permissions → **Contents: Read and write**. Zapis służy tylko do notowania wykonania i RPE w `dane/feedback/`.
- Expiration: np. rok. Po wygaśnięciu wygeneruj nowy i wpisz go w ustawieniach.

## Widoki

- **Dziś**: dzisiejsza sesja z profilem mocy, celem w watach, przyciskiem pobrania `.zwo` i zapisem wykonania (zrobione, RPE 1–10, notatka). Pod spodem cały tydzień.
- **Kalendarz**: miesiąc z kolorami intensywności, eksport tygodnia do `.ics` i pojedynczej sesji do Kalendarza Google.
- **Postęp**: FTP, W/kg, forma (CTL) i zmęczenie (ATL), godziny plan vs wykonanie, dziennik tygodni.

## Format danych

Opisany w `CLAUDE.md` w repo `trening`. Aplikacja czyta:

| Plik | Zawartość |
|---|---|
| `dane/index.json` | lista tygodni z planem |
| `dane/tygodnie/RRRR-Wnn.json` | plan tygodnia: sesje, kroki treningu, gotowość |
| `dane/historia.json` | podsumowania tygodni i historia FTP |
| `dane/feedback/RRRR-Wnn.json` | wykonanie i RPE zapisane z aplikacji |
| `profil/profil-zawodnika.json` | FTP i waga, gdy brak historii |

Kroki treningu mają ten sam format co `build_workout.py` trenera (warmup, steady, recovery, ramp, cooldown, free, sprint, `repeat`).
