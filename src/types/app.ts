// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
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

export interface RaeumeUndOrte {
  record_id: string;
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

export interface Trainer {
  record_id: string;
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

export interface Kurse {
  record_id: string;
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
  createdat: string;
  updatedat: string | null;
  fields: {
    kurstermin?: string; // applookup -> URL zu 'Kurstermine' Record
    kurs?: string; // applookup -> URL zu 'Kurse' Record
    teilnehmer?: string; // applookup -> URL zu 'Teilnehmer' Record
    anmeldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    bemerkung?: string;
  };
}

export interface Teilnehmer {
  record_id: string;
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

export interface Kurstermine {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    raum?: string; // applookup -> URL zu 'RaeumeUndOrte' Record
    kurs?: string; // applookup -> URL zu 'Kurse' Record
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    ort?: string;
    online_link?: string;
    anmeldefrist?: string; // Format: YYYY-MM-DD oder ISO String
    trainer?: string; // applookup -> URL zu 'Trainer' Record
    max_teilnehmer_abweichend?: number;
    status?: LookupValue;
  };
}

export const APP_IDS = {
  RAEUME_UND_ORTE: '6a33afda2b58f2e41ee46836',
  TRAINER: '6a33ac9e6060014a70436880',
  KURSE: '6a33ac97f71b811034a5f224',
  ANMELDUNGEN: '6a33aca0e11531f0f32fe8a9',
  TEILNEHMER: '6a33ac9f9cf5d458275318aa',
  KURSTERMINE: '6a33ac9f436c052d056df9f7',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'raeume_und_orte': {
    raum_typ: [{ key: "intern", label: "Intern" }, { key: "extern", label: "Extern" }],
    status: [{ key: "aktiv", label: "Aktiv" }, { key: "inaktiv", label: "Inaktiv" }],
    online_raum: [{ key: "ja", label: "Ja" }, { key: "nein", label: "Nein" }],
  },
  'trainer': {
    trainer_typ: [{ key: "intern", label: "Intern" }, { key: "extern", label: "Extern" }],
  },
  'kurse': {
    kategorie: [{ key: "fachlich", label: "Fachlich" }, { key: "soft_skills", label: "Soft Skills" }, { key: "it", label: "IT" }, { key: "sonstiges", label: "Sonstiges" }],
    dauer_einheit: [{ key: "stunden", label: "Stunden" }, { key: "tage", label: "Tage" }],
    status: [{ key: "geplant", label: "Geplant" }, { key: "aktiv", label: "Aktiv" }, { key: "inaktiv", label: "Inaktiv" }, { key: "archiviert", label: "Archiviert" }],
  },
  'anmeldungen': {
    status: [{ key: "vorgemerkt", label: "Vorgemerkt" }, { key: "angemeldet", label: "Angemeldet" }, { key: "warteliste", label: "Warteliste" }, { key: "storniert", label: "Storniert" }, { key: "teilgenommen", label: "Teilgenommen" }, { key: "nicht_erschienen", label: "Nicht erschienen" }],
  },
  'teilnehmer': {
    aktiv_status: [{ key: "inaktiv", label: "Inaktiv" }, { key: "aktiv", label: "Aktiv" }],
  },
  'kurstermine': {
    status: [{ key: "geplant", label: "Geplant" }, { key: "offen", label: "Offen zur Anmeldung" }, { key: "voll", label: "Voll" }, { key: "durchgefuehrt", label: "Durchgeführt" }, { key: "abgesagt", label: "Abgesagt" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
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
  'trainer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'trainer_typ': 'lookup/radio',
    'fachgebiete': 'string/textarea',
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
  'teilnehmer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'firma_abteilung': 'string/text',
    'rolle': 'string/text',
    'aktiv_status': 'lookup/radio',
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
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateRaeumeUndOrte = StripLookup<RaeumeUndOrte['fields']>;
export type CreateTrainer = StripLookup<Trainer['fields']>;
export type CreateKurse = StripLookup<Kurse['fields']>;
export type CreateAnmeldungen = StripLookup<Anmeldungen['fields']>;
export type CreateTeilnehmer = StripLookup<Teilnehmer['fields']>;
export type CreateKurstermine = StripLookup<Kurstermine['fields']>;