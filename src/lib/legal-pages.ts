/**
 * Impressum + Datenschutz of Beauty Cosmetic Hoàng (draft by the site team, 03.11.2026).
 * Open fields are written as «…» and must be filled in by the owner before the page is approved —
 * they are never guessed. Contact data comes from the studio flyer (FLYER_STUDIO).
 */
import { FLYER_STUDIO as S } from "./flyer-data";

const OPEN_NAME = "«Vor- und Nachname der Inhaberin — bitte vom Studio ergänzen»";
const OPEN_TAX = "«Umsatzsteuer-Identifikationsnummer bzw. Steuernummer — bitte vom Studio ergänzen; bei Kleinunternehmerregelung: Hinweis nach § 19 UStG»";

export const IMPRESSUM = {
  de: `Angaben gemäß § 5 DDG

Beauty Cosmetic Hoàng
Inhaberin: ${OPEN_NAME}
${S.address}

Kontakt
Telefon: ${S.phone}
Mobil / WhatsApp: ${S.mobilePhone}
E-Mail: ${S.email}

Steuerangaben
${OPEN_TAX}

Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
${OPEN_NAME}, ${S.address}

Verbraucherstreitbeilegung
Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.

Haftung für Inhalte und Links
Wir sind für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Für Inhalte externer Seiten, auf die wir verlinken, sind ausschließlich deren Betreiber verantwortlich; zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar.`,
  en: `Information pursuant to § 5 DDG (German Digital Services Act)

Beauty Cosmetic Hoàng
Owner: ${OPEN_NAME}
${S.address}

Contact
Phone: ${S.phone}
Mobile / WhatsApp: ${S.mobilePhone}
Email: ${S.email}

Tax details
${OPEN_TAX}

Responsible for content (§ 18 (2) MStV)
${OPEN_NAME}, ${S.address}

Consumer dispute resolution
We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.

Liability for content and links
We are responsible for our own content under general law. The operators of external sites we link to are solely responsible for their content; no violations were apparent when the links were set.`,
};

export const DATENSCHUTZ = {
  de: `Datenschutzerklärung

1. Verantwortliche
Beauty Cosmetic Hoàng, ${OPEN_NAME}, ${S.address}
Telefon ${S.phone} · E-Mail ${S.email}

2. Welche Daten wir verarbeiten und wozu
• Besuch der Website: Beim Aufruf verarbeitet der Hosting-Anbieter technisch notwendige Server-Logdaten (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser). Zweck: Auslieferung und Sicherheit der Website (Art. 6 Abs. 1 lit. f DSGVO).
• Terminbuchung: Name, Telefonnummer, E-Mail-Adresse, gewählte Behandlung und Wunschtermin sowie Ihre Notiz. Zweck: Bearbeitung und Bestätigung Ihres Termins (Art. 6 Abs. 1 lit. b DSGVO). Bitte tragen Sie keine Gesundheitsdaten ein.
• Kontaktformular und Anfragen: Ihre Angaben dienen der Beantwortung Ihrer Anfrage (Art. 6 Abs. 1 lit. b bzw. f DSGVO).
• Benachrichtigungen: Über Ihren Termin informieren wir Sie per E-Mail. Eine WhatsApp-Erinnerung senden wir nur, wenn Sie bei der Buchung ausdrücklich eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO); die Einwilligung können Sie jederzeit widerrufen. Bei einer neuen Buchung benachrichtigen wir außerdem die Inhaberin per WhatsApp.
• Kundenkonto und Gutscheine: Konto- und Gutscheindaten verarbeiten wir zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
• Buchungsassistent: Eingaben im Assistenten dienen der Beratung zu Behandlungen. Telefonnummern werden vor einer etwaigen Weitergabe an einen KI-Dienstleister entfernt.

3. Cookies
Wir setzen nur technisch notwendige Cookies/Speicher ein (Anmeldung, Sitzung, Tag-/Nacht-Darstellung). Eine Einwilligung ist dafür nicht erforderlich (§ 25 Abs. 2 TDDDG). Tracking- oder Werbe-Cookies verwenden wir nicht. Schriften werden von unserem eigenen Server geladen.

4. Empfänger
Hosting: Vercel Inc. (Server-Region Frankfurt am Main). Datenbank: Postgres-Datenbankdienst. E-Mail-/Nachrichtenversand: unsere technischen Dienstleister, soweit für die Zustellung nötig. Mit Dienstleistern außerhalb der EU gelten Standardvertragsklauseln (Art. 46 DSGVO). Eine Weitergabe zu Werbezwecken findet nicht statt.

5. Speicherdauer
Termin- und Kundendaten speichern wir, solange es für die Durchführung nötig ist, danach nur im Rahmen gesetzlicher Aufbewahrungsfristen (z. B. steuerrechtlich bis zu 10 Jahre). Server-Logdaten werden kurzfristig gelöscht.

6. Ihre Rechte
Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie auf Widerruf einer Einwilligung. Wenden Sie sich dazu an ${S.email}.
Beschwerden richten Sie an die Berliner Beauftragte für Datenschutz und Informationsfreiheit, Alt-Moabit 59–61, 10555 Berlin.

Stand: November 2026`,
  en: `Privacy policy

1. Controller
Beauty Cosmetic Hoàng, ${OPEN_NAME}, ${S.address}
Phone ${S.phone} · Email ${S.email}

2. What we process and why
• Visiting the site: our hosting provider processes technically necessary server logs (IP address, time, page, browser) to deliver and secure the site (Art. 6(1)(f) GDPR).
• Booking: name, phone number, email address, chosen treatment, preferred time and your note, to handle and confirm your appointment (Art. 6(1)(b) GDPR). Please do not enter health data.
• Contact form and enquiries: used to answer you (Art. 6(1)(b)/(f) GDPR).
• Notifications: we inform you about your appointment by email. We send a WhatsApp reminder only if you explicitly agreed when booking (Art. 6(1)(a) GDPR); you can withdraw consent at any time. For a new booking we also notify the owner by WhatsApp.
• Account and vouchers: processed to perform the contract (Art. 6(1)(b) GDPR).
• Booking assistant: inputs are used to advise on treatments. Phone numbers are removed before anything is passed on to an AI service provider.

3. Cookies
We only use technically necessary cookies/storage (login, session, day/night display). No consent is required for these (§ 25(2) TDDDG). We do not use tracking or advertising cookies. Fonts are served from our own server.

4. Recipients
Hosting: Vercel Inc. (server region Frankfurt). Database: a Postgres database service. Email/message delivery: our technical providers, as far as needed. For providers outside the EU, standard contractual clauses apply (Art. 46 GDPR). We do not pass data on for advertising.

5. Retention
We keep appointment and customer data as long as needed, then only for statutory retention periods (e.g. tax law, up to 10 years). Server logs are deleted shortly.

6. Your rights
You have the right of access, rectification, erasure, restriction, portability and objection (Art. 15–21 GDPR) and to withdraw consent. Contact ${S.email}.
You may complain to the Berlin Commissioner for Data Protection and Freedom of Information, Alt-Moabit 59–61, 10555 Berlin.

Last updated: November 2026`,
};
