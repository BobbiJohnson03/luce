# Luce

> _luce_ (wł.) — światło. Twoje osobiste **centrum dowodzenia**: kalendarz, notatki i
> to-do listy w spokojnej, minimalistycznej przestrzeni. **Dark mode only.**

Inspiracja wizualna: [junhyungpark.com](https://junhyungpark.com/) — dużo pustej
przestrzeni, lekka typografia, subtelne interakcje i element 3D w centrum. Luce
przenosi ten język na ciemny motyw.

---

## Stack technologiczny

| Warstwa      | Wybór                          |
| ------------ | ------------------------------ |
| Framework    | **Next.js 16** (App Router)    |
| Język        | **TypeScript**                 |
| UI / style   | **Tailwind CSS v4**            |
| Auth + dane  | **Supabase** (chmura)          |
| 3D           | **Spline** (planowane, Etap 6) |
| Runtime      | React 19                       |

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Aplikacja startuje na [http://localhost:3000](http://localhost:3000).

### Zmienne środowiskowe

Skopiuj `.env.example` do `.env.local` i uzupełnij kluczami z projektu
Supabase (Project Settings → API):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Struktura

```
src/
  app/            # trasy (App Router)
    page.tsx      # landing / hero
    login/        # logowanie
    register/     # rejestracja
    dashboard/    # centrum dowodzenia (kalendarz + to-do)
  components/     # komponenty współdzielone (Logo, BlobPlaceholder, ...)
  lib/            # klienci Supabase, helpery
```

---

## Plan — etapy

Projekt realizowany etapami. Status aktualizowany na bieżąco.

- [x] **Etap 0 — Setup.** Next.js + TypeScript + Tailwind, repozytorium git, README.
- [x] **Etap 1 — Fundament UI.** Dark mode only, design system (kolory, typografia),
      landing/hero w stylu referencji, placeholder na element 3D.
- [ ] **Etap 2 — Auth.** Integracja Supabase, ekrany logowania i rejestracji,
      ochrona tras dashboardu.
- [ ] **Etap 3 — Dashboard.** Layout centrum dowodzenia, nawigacja w duchu
      referencji (menu-overlay), miejsce na element 3D.
- [ ] **Etap 4 — Kalendarz.** Zapisywanie ważnych wydarzeń/notatek per dzień.
- [ ] **Etap 5 — To-do + dźwięk.** Listy zadań, checkboxy, dźwięk przy odhaczaniu
      (plik audio do zaimportowania później).
- [ ] **Etap 6 — Spline 3D.** Podmiana placeholdera na prawdziwą scenę 3D.

## Motyw / design tokens

Zdefiniowane w `src/app/globals.css`:

- tło `--background` `#0a0a0a`, powierzchnie `--surface`
- tekst `--foreground`, `--muted`
- akcent `--accent` `#f5f0e6` (ciepłe „światło")
- cienkie obramowania `--border`

---

_Made with care — Luce, dark by design._
