<h1 align="center">
abrechnung 🧾
</h1>
<h2>Anpassungen im KVZ Fork</h2>
Im Gesetz- und Vorordnungsblatt für Mecklenburg-Vorpommern Ausgabe 38 / 2021 vom 09.06.2021 werden Details geklärt zur Reisekostenabrechnung bei Reisen < 8 oder < 14 Stunden. Diese Änderungen sind in diesem Fork berücksichtigt.
Außerdem werden die Container für DB und LDAP nicht verwendet, da diese schon vorhanden sind außerhalb von Docker.
<h2>Installation und Auslieferung</h2>

**abrechnung 🧾** ist eine Web App die:

- Reisekosten- (inkl. automatischer Pauschalen Berechnung auch für internationale Reisen),
- Auslagen- und
- Krankenkosten-Abrechnungen

digital und einfach möglich macht.

## Pauschalbeträge

[pauschbetrag-api](https://github.com/david-loe/pauschbetrag-api)

## Wechselkurse

[InforEuro](https://commission.europa.eu/funding-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_en)

Dieser statische Währungsrechner zeigt den offiziellen monatlichen Buchungskurs der Europäischen Kommission für den Euro und die durch den Rechnungsführer im Einklang mit Artikel 19 der Haushaltsordnung festgelegten Umrechnungskurse an.

## API

[API Documentation](https://david-loe.github.io/abrechnung/)

## Run

### Local

1. Install [Docker & Docker Compose](https://docs.docker.com/engine/install/)
2. Copy `.env.example` to `.env` and adapt if needed
3. Run `docker compose up`
4. Open `http://localhost:5000` and login with `professor:professor`

> ℹ You can change ports and URLs in the `.env` file

## Schema

![Schema](schema.png)
