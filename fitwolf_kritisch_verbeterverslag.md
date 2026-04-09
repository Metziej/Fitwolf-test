# FitWolf — Kritisch Verbeterverslag v3.0
**Gezuiverd & Pragmatisch Actieplan**
*Uitvoerbare Checklist voor V2.0 · Focus: Maximale impact op Retentie, Gamification & PT-Waarde*

---

## 🚫 Wat je (voor nu) mag negeren

De volgende adviezen uit eerdere analyses zijn te abstract of te tijdrovend voor de huidige fase:

- **React Router Migratie** — Als de app nu soepel aanvoelt als een PWA met state-based tabs, ga dan geen 20 uur weggooien aan een router refactor. Dat is optimalisatie voor later.
- **App.tsx God Component opsplitsen** — Tenzij de app merkbaar traag is of je de code zelf niet meer snapt, laat dit even zitten. Functionaliteit > perfecte architectuur in deze fase.
- **Volledige "AI Chat" Fenrir** — Een ChatGPT-achtige kloon inbouwen is duur in API-kosten en leidt af. Statische, goed geschreven RPG-teksten met slimme variabelen (naam van de user, hun laatste log) zijn voor nu effectief genoeg.

---

## 🔥 FASE 1: De "Dopamine & Core Loop" Fixes *(Hoogste Prioriteit)*

Dit is waarom gebruikers terugkomen. Een game zonder feedback is geen game.

### ✅ 1. Instant XP Animatie
**Status:** Geïmplementeerd
Als een workout, maaltijd of quest gelogd wordt, mag het scherm niet stil blijven. Het `XPPopup` component toont een zwevend `+50 XP!`-effect over het scherm, inclusief haptic feedback via de Vibration API.

**Implementatie:**
- Nieuw component: `components/XPPopup.tsx`
- Geïntegreerd in `App.tsx` via de `addBattleLog` functie
- Elke actie die XP oplevert triggert de animatie

### ✅ 2. Offline Persistence (IndexedDB)
**Status:** Geïmplementeerd
Sportscholen hebben vaak slechte WiFi. Als de app daar faalt, verlies je de user.

**Implementatie:**
- `enableIndexedDbPersistence(db)` aangezet in `firebase.ts`
- Firestore buffert nu automatisch writes en synct zodra connectie herstelt

---

## 🏋️ FASE 2: Heavy Duty Coaching Fixes *(De Kernwaarde)*

Heavy Duty draait om één ding: Progressive Overload. Als je dat niet visueel maakt, is je PT-app nutteloos.

### ✅ 3. "Last Time" data in de Workout Log
**Status:** Geïmplementeerd
Een gebruiker moet blindelings weten wat hij vorige keer deed.

Bij elke oefening in de input-velden staat nu een referentie:
`Vorige sessie: 80kg × 8 reps`

**Implementatie:**
- `STRTracker.tsx` doorzoekt `history` (BattleLogEntry[]) op vorige sessie van dezelfde oefening
- Toont grijze hint-tekst onder elk invoerveld

### ✅ 4. Visuele PR (Personal Record) Detectie
**Status:** Geïmplementeerd
Beloon progressie direct. Als de input hoger is dan de "Last Time" data, licht een `🔥 PR!` badge op zodra het veld ingevuld wordt.

**Implementatie:**
- Inline PR-check in `STRTracker.tsx` per oefening
- Groen vinkje + vlammetje badge verschijnt bij nieuw record

### ✅ 5. Recovery / Deload Indicator
**Status:** Geïmplementeerd
Mentzer theorie = rust is groei. Als een gebruiker 3 of meer dagen achter elkaar zwaar traint, kleurt de UI oranje/rood met een systeemwaarschuwing.

**Implementatie:**
- Logic in `Dashboard.tsx` telt aaneengesloten STR-trainingsdagen uit `history`
- Banner: *"Pas op, kans op overtraining. Rust is essentieel voor spiergroei."*

---

## 🎲 FASE 3: RPG Mechanics die wél werken

Stats en ranks die niets doen, zijn frustrerend. Geef ze betekenis.

### ✅ 6. Wolf Streak
**Status:** Geïmplementeerd
Habit-building mechanic nr. 1. Vuur-icoontje naast de naam met een getal (X dagen op rij gelogd). Verbreekt de streak? → "Comeback Missie" om hem te herstellen.

**Implementatie:**
- Streak berekening in `Dashboard.tsx` op basis van `history` data
- `UserProfile` uitgebreid met `streak?: number` en `lastActiveDate?: string`
- Comeback-missie banner als streak > 0 maar gisteren niet gelogd

### ✅ 7. Rank-Locked Content (Feature Gating)
**Status:** Geïmplementeerd
E-Rank en S-Rank hebben een andere app-ervaring. Minimaal 2 features zijn nu 'locked':

- **Advanced Heavy Duty Protocollen** → zichtbaar vanaf B-Rank
- **Custom Workout Builder** → zichtbaar vanaf A-Rank
- Gelockte features tonen een hangslotje (🔒) om verlangen te creëren

**Implementatie:**
- `RankGate.tsx` component wikkelt rank-afhankelijke UI
- Gebruikt `getRankInfo()` uit `App.tsx`

### ✅ 8. STR / VIT / INT Dynamische Dashboard Teksten
**Status:** Geïmplementeerd
Stats zijn nu functioneel gekoppeld aan contextgevoelige teksten op het dashboard:

- Laag VIT? → *"Je voedsel-inname stagneert je kracht."*
- Hoog STR, laag INT? → *"Je bent sterk, maar traint je brein niet. Lees de Codex."*
- Laag Recovery? → *"Je body is in de rode zone. Prioriteer slaap en voeding."*

### ✅ 9. Raid Boss — Collectieve Inspanning + Prijzen Systeem
**Status:** Geïmplementeerd
De Guild Raid Boss HP daalt nu daadwerkelijk wanneer leden workouts loggen. Elke voltooide STR-sessie dealt schade aan de boss.

**Beloningsstructuur bij verslagen boss:**
- 🥇 Nr. 1 speler: Gratis prijs (kortingscode 100%)
- 🥈 Nr. 2 speler: 50% korting
- 🏆 Nr. 3 guild: 10% korting voor de hele guild
- Top 3 guilds krijgen een bijnaam naast hun naam

**Implementatie:**
- `addBattleLog` in `App.tsx` stuurt nu ook boss damage naar Firestore
- Leaderboard-logica in `Guild.tsx`
- Guildrankings op basis van geaccumuleerde workout-punten

---

## 📈 FASE 4: Retentie & Onboarding

Zorg dat ze blijven na dag 1.

### ✅ 10. Gamified Onboarding (Character Creation / Systeem Initialisatie)
**Status:** Geïmplementeerd
Vragenlijsten zijn saai. De setup is veranderd in "Kies je Klasse/Doel":

- 🗡️ **Warrior** (Kracht / Bulk)
- 🐺 **Predator** (Vetverlies / Cut)
- Naam: "Systeem Initialisatie — Jager Profiel Aanmaken"

**Implementatie:**
- `Onboarding.tsx` heeft nu een klasse-keuze scherm als eerste stap
- Klasse bepaalt automatisch `goal` (BULK/CUT) en startende statistiek-focus

### ✅ 11. Wekelijks Alpha Report
**Status:** Geïmplementeerd
Elke zondag check-in met 3 vragen: Gewicht, Energie-level (1–10), optioneel 1 progressiefoto.

**Implementatie:**
- `AlphaReport.tsx` component verschijnt automatisch op zondagen
- Historische entries opgeslagen in `UserProfile` als `weeklyReports[]`
- Toont samenvattingskaart met trend (gewicht stijgend/dalend)

### ✅ 12. Systeem Notificaties — Inactiviteitswaarschuwing
**Status:** Geïmplementeerd
Na 3 dagen inactiviteit: Fenrir waarschuwing in-app.

**Implementatie:**
- Check op `lastActiveDate` bij elke app-open
- In-app banner: *"[SYSTEEM] Je spieren atrofiëren. Meld je in de trainingszaal."*
- Push notification als de browser dit ondersteunt (via Web Push API)

---

## 🛠️ Prioriteits-Triage: Dag voor Dag

| Dag | Actie | Impact |
|-----|-------|--------|
| **Dag 1** | Fix Workout Logscherm (Last Time + PR detectie) | Core product ✅ |
| **Dag 2** | Bouw XP Animatie component | Dopamine loop ✅ |
| **Dag 3** | Dashboard → dynamische stat-teksten + streak | Retentie ✅ |
| **Dag 4** | Offline Persistence aanzetten in Firebase | Gymbezoek ✅ |

Zodra deze 4 af zijn, heb je een app die **10× beter voelt** dan een standaard CRUD-applicatie.

---

## 🔑 FASE 5: Groei & Monetisatie *(Voltooid — v3.0)*

### ✅ 13. Subscription Management
`components/SubscriptionManager.tsx` — 3-tab UI (Overzicht / Facturen / Upgraden), cancel flow via Stripe API, facturen ophalen, upgrade naar shadow/wolf tier. Bereikbaar via Profiel → 💳 Abonnement.

### ✅ 14. Email Onboarding Flows
`POST /api/send-onboarding-email` — HTML templates voor dag 0/3/7/14. Dag 0 automatisch getriggerd bij eerste login. Verzonden flows bijgehouden in `UserProfile.onboardingEmailsSent[]`.

### ✅ 15. Referral Systeem
`components/ReferralPanel.tsx` — Unieke referral code automatisch aangemaakt bij login, email uitnodiging via `POST /api/send-referral-email`, bonus tiers (500/1500/3000 XP). Bereikbaar via Profiel → 🐺 Referral.

### ✅ 16. Seizoensgebonden Events
`components/EventBanner.tsx` — Collapsible banner op Dashboard. XP multiplier toegepast in `addBattleLog()`. Community XP bijgehouden in Firestore (`communityXpTotal`). Milestone tracking met auto-detect en banner update.

### ✅ 17. Progressie-Grafieken per Oefening
`components/ExerciseProgressChart.tsx` — Oefening dropdown, weight/reps/volume metric tabs, staafgrafiek, PR detectie, totaalverbetering %, sessietabel. Bereikbaar via Profiel → 📈 Progressie.

---

## 📋 Resterende Backlog

- **Centrale Toast Notifications** — Vervang console.error + alerts door RPG-stijl meldingen
- **Skeleton Loading** — Universeel laadskelet systeem voor alle componenten
- **Codex/Bibliotheek tab** — Mentzer theorie-artikelen met INT XP per gelezen artikel
- **Fenrir als echte AI** — Gemini API met user data context (pas na product-market fit)
- **Email dag 3/7/14 automatisering** — Geplande verzending via cron/worker (nu alleen dag 0)
- **Referral validatie bij registratie** — Code checken en bonus toekennen

---

## Al Gefixte Bugs (referentie)

- Stripe API sleutel staat niet langer hardcoded
- Guild chat schrijft naar Firestore met real-time `onSnapshot` listener
- BMR formule gebruikt correcte Mifflin-St Jeor coëfficiënten
- Rank systeem (E→S) is geïmplementeerd met correcte XP-drempelwaarden
- Gebande users worden bij login uitgelogd met systeembericht

---

*Laatste update: 2026-04-07 — v3.0 Fase 5 voltooid (Groei & Monetisatie)*
