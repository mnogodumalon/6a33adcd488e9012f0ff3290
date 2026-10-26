import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Trainer {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    trainer_typ?: LookupValue;
    fachgebiete?: string;
  };
}

export interface Teilnehmer {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    firma_abteilung?: string;
    rolle?: string;
    aktiv_status?: LookupValue;
  };
}

export interface RaeumeUndOrte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    raumname?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    stadt?: string;
    kapazitaet?: number;
    ausstattung?: string;
    raum_typ?: LookupValue;
    status?: LookupValue;
    online_raum?: LookupValue;
    online_link?: string;
    bemerkung?: string;
  };
}

export interface Kurstermine {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    raum?: RecordUrl; // applookup -> URL zu 'RaeumeUndOrte' Record
    kurs?: RecordUrl; // applookup -> URL zu 'Kurse' Record
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    ort?: string;
    online_link?: string;
    anmeldefrist?: string; // Format: YYYY-MM-DD oder ISO String
    trainer?: RecordUrl; // applookup -> URL zu 'Trainer' Record
    max_teilnehmer_abweichend?: number;
    status?: LookupValue;
  };
}

export interface Kurse {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kurstitel?: string;
    kurzbeschreibung?: string;
    detaillierte_beschreibung?: string;
    kategorie?: LookupValue;
    dauer_anzahl?: number;
    dauer_einheit?: LookupValue;
    zielgruppe?: string;
    max_teilnehmer?: number;
    status?: LookupValue;
  };
}

export interface Anmeldungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kurstermin?: RecordUrl; // applookup -> URL zu 'Kurstermine' Record
    kurs?: RecordUrl; // applookup -> URL zu 'Kurse' Record
    teilnehmer?: RecordUrl; // applookup -> URL zu 'Teilnehmer' Record
    anmeldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    bemerkung?: string;
  };
}

export const APP_IDS = {
  TRAINER: '6a33ac9e6060014a70436880',
  TEILNEHMER: '6a33ac9f9cf5d458275318aa',
  RAEUME_UND_ORTE: '6a33afda2b58f2e41ee46836',
  KURSTERMINE: '6a33ac9f436c052d056df9f7',
  KURSE: '6a33ac97f71b811034a5f224',
  ANMELDUNGEN: '6a33aca0e11531f0f32fe8a9',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'trainer': {
    trainer_typ: [{ key: "intern", get label() { return lookupLabel('trainer', 'trainer_typ', "intern") ?? "Intern"; } }, { key: "extern", get label() { return lookupLabel('trainer', 'trainer_typ', "extern") ?? "Extern"; } }],
  },
  'teilnehmer': {
    aktiv_status: [{ key: "aktiv", get label() { return lookupLabel('teilnehmer', 'aktiv_status', "aktiv") ?? "Aktiv"; } }, { key: "inaktiv", get label() { return lookupLabel('teilnehmer', 'aktiv_status', "inaktiv") ?? "Inaktiv"; } }],
  },
  'raeume_und_orte': {
    raum_typ: [{ key: "intern", get label() { return lookupLabel('raeume_und_orte', 'raum_typ', "intern") ?? "Intern"; } }, { key: "extern", get label() { return lookupLabel('raeume_und_orte', 'raum_typ', "extern") ?? "Extern"; } }],
    status: [{ key: "aktiv", get label() { return lookupLabel('raeume_und_orte', 'status', "aktiv") ?? "Aktiv"; } }, { key: "inaktiv", get label() { return lookupLabel('raeume_und_orte', 'status', "inaktiv") ?? "Inaktiv"; } }],
    online_raum: [{ key: "ja", get label() { return lookupLabel('raeume_und_orte', 'online_raum', "ja") ?? "Ja"; } }, { key: "nein", get label() { return lookupLabel('raeume_und_orte', 'online_raum', "nein") ?? "Nein"; } }],
  },
  'kurstermine': {
    status: [{ key: "geplant", get label() { return lookupLabel('kurstermine', 'status', "geplant") ?? "Geplant"; } }, { key: "offen", get label() { return lookupLabel('kurstermine', 'status', "offen") ?? "Offen zur Anmeldung"; } }, { key: "voll", get label() { return lookupLabel('kurstermine', 'status', "voll") ?? "Voll"; } }, { key: "durchgefuehrt", get label() { return lookupLabel('kurstermine', 'status', "durchgefuehrt") ?? "Durchgeführt"; } }, { key: "abgesagt", get label() { return lookupLabel('kurstermine', 'status', "abgesagt") ?? "Abgesagt"; } }],
  },
  'kurse': {
    kategorie: [{ key: "fachlich", get label() { return lookupLabel('kurse', 'kategorie', "fachlich") ?? "Fachlich"; } }, { key: "soft_skills", get label() { return lookupLabel('kurse', 'kategorie', "soft_skills") ?? "Soft Skills"; } }, { key: "it", get label() { return lookupLabel('kurse', 'kategorie', "it") ?? "IT"; } }, { key: "sonstiges", get label() { return lookupLabel('kurse', 'kategorie', "sonstiges") ?? "Sonstiges"; } }],
    dauer_einheit: [{ key: "stunden", get label() { return lookupLabel('kurse', 'dauer_einheit', "stunden") ?? "Stunden"; } }, { key: "tage", get label() { return lookupLabel('kurse', 'dauer_einheit', "tage") ?? "Tage"; } }],
    status: [{ key: "geplant", get label() { return lookupLabel('kurse', 'status', "geplant") ?? "Geplant"; } }, { key: "aktiv", get label() { return lookupLabel('kurse', 'status', "aktiv") ?? "Aktiv"; } }, { key: "inaktiv", get label() { return lookupLabel('kurse', 'status', "inaktiv") ?? "Inaktiv"; } }, { key: "archiviert", get label() { return lookupLabel('kurse', 'status', "archiviert") ?? "Archiviert"; } }],
  },
  'anmeldungen': {
    status: [{ key: "vorgemerkt", get label() { return lookupLabel('anmeldungen', 'status', "vorgemerkt") ?? "Vorgemerkt"; } }, { key: "angemeldet", get label() { return lookupLabel('anmeldungen', 'status', "angemeldet") ?? "Angemeldet"; } }, { key: "warteliste", get label() { return lookupLabel('anmeldungen', 'status', "warteliste") ?? "Warteliste"; } }, { key: "storniert", get label() { return lookupLabel('anmeldungen', 'status', "storniert") ?? "Storniert"; } }, { key: "teilgenommen", get label() { return lookupLabel('anmeldungen', 'status', "teilgenommen") ?? "Teilgenommen"; } }, { key: "nicht_erschienen", get label() { return lookupLabel('anmeldungen', 'status', "nicht_erschienen") ?? "Nicht erschienen"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'trainer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'trainer_typ': 'lookup/radio',
    'fachgebiete': 'string/textarea',
  },
  'teilnehmer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'firma_abteilung': 'string/text',
    'rolle': 'string/text',
    'aktiv_status': 'lookup/radio',
  },
  'raeume_und_orte': {
    'raumname': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'stadt': 'string/text',
    'kapazitaet': 'number',
    'ausstattung': 'string/textarea',
    'raum_typ': 'lookup/select',
    'status': 'lookup/radio',
    'online_raum': 'lookup/radio',
    'online_link': 'string/url',
    'bemerkung': 'string/textarea',
  },
  'kurstermine': {
    'raum': 'applookup/select',
    'kurs': 'applookup/select',
    'startdatum': 'date/datetimeminute',
    'enddatum': 'date/datetimeminute',
    'ort': 'string/text',
    'online_link': 'string/url',
    'anmeldefrist': 'date/date',
    'trainer': 'applookup/select',
    'max_teilnehmer_abweichend': 'number',
    'status': 'lookup/select',
  },
  'kurse': {
    'kurstitel': 'string/text',
    'kurzbeschreibung': 'string/textarea',
    'detaillierte_beschreibung': 'string/textarea',
    'kategorie': 'lookup/select',
    'dauer_anzahl': 'number',
    'dauer_einheit': 'lookup/select',
    'zielgruppe': 'string/text',
    'max_teilnehmer': 'number',
    'status': 'lookup/select',
  },
  'anmeldungen': {
    'kurstermin': 'applookup/select',
    'kurs': 'applookup/select',
    'teilnehmer': 'applookup/select',
    'anmeldedatum': 'date/datetimeminute',
    'status': 'lookup/select',
    'bemerkung': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateTrainer = StripLookup<Trainer['fields']>;
export type CreateTeilnehmer = StripLookup<Teilnehmer['fields']>;
export type CreateRaeumeUndOrte = StripLookup<RaeumeUndOrte['fields']>;
export type CreateKurstermine = StripLookup<Kurstermine['fields']>;
export type CreateKurse = StripLookup<Kurse['fields']>;
export type CreateAnmeldungen = StripLookup<Anmeldungen['fields']>;