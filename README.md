<h1 align="center">
abrechnung 🧾
</h1>
<h2>Anpassungen im KVZ Fork</h2>
Im Gesetz- und Vorordnungsblatt für Mecklenburg-Vorpommern Ausgabe 38 / 2021 vom 09.06.2021 werden Details geklärt zur Reisekostenabrechnung bei Reisen < 8 oder < 14 Stunden. Diese Änderungen sind in diesem Fork berücksichtigt.
Außerdem werden die Container für DB und LDAP nicht verwendet, da diese schon vorhanden sind außerhalb von Docker.
<h2>Installation und Auslieferung</h2>
<p align="center">
<a href="https://github.com/david-loe/abrechnung/actions/workflows/production-build.yml"><img src="https://github.com/david-loe/abrechnung/actions/workflows/production-build.yml/badge.svg" alt="Production Build"></a>
<a href="https://github.com/david-loe/abrechnung/actions/workflows/migration-test.yml"><img src="https://github.com/david-loe/abrechnung/actions/workflows/migration-test.yml/badge.svg" alt="Migration & Test"></a>
</p>
<h3 align="center"  style="margin-top: 0px; margin-bottom: 30px">
Demo und Hosting ➡️ <a href="https://reiseabrechner.de">reiseabrechner.de</a>
</h3>

**abrechnung 🧾** ist eine Web App die:

- Reisekosten- (inkl. automatischer Pauschalen Berechnung auch für internationale Reisen),
- Auslagen- und
- Krankenkosten-Abrechnungen

digital und einfach möglich macht.

https://github.com/david-loe/abrechnung/assets/56305409/8b31b6a1-e6c4-4bd9-bb76-3871e046a201

## Pauschalbeträge

[pauschbetrag-api](https://github.com/david-loe/pauschbetrag-api)

## Wechselkurse

[InforEuro](https://commission.europa.eu/funding-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_en)

Dieser statische Währungsrechner zeigt den offiziellen monatlichen Buchungskurs der Europäischen Kommission für den Euro und die durch den Rechnungsführer im Einklang mit Artikel 19 der Haushaltsordnung festgelegten Umrechnungskurse an.

## API

[API Documentation](https://david-loe.github.io/abrechnung/)

## Deploy

Using prebuilt docker images:

https://github.com/david-loe/abrechnung/blob/1cb710b1225c65035950a5464e05fc34ff3dd199/deploy-compose.yml#L1-L29

ℹ Don't forget to specify [environment variables](.env.example) in a `.env` file or directly in the compose.yml.

## Run

### Gitpod

Click below to launch a ready-to-use Gitpod workspace in your browser.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/david-loe/abrechnung)

### Local

1. Install [Docker & Docker Compose](https://docs.docker.com/engine/install/)
2. Copy `.env.example` to `.env` and adapt if needed
3. Run `docker compose up`
4. Open `http://localhost:5000` and login with `professor:professor`

> ℹ You can change ports and URLs in the `.env` file

## Schema

![Schema](schema.png)
