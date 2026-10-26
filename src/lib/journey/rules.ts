/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'trainer' | 'teilnehmer' | 'raeume_und_orte' | 'kurstermine' | 'kurse' | 'anmeldungen';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "trainer": "vorname" | "nachname" | "email" | "fachgebiete";
  "teilnehmer": "vorname" | "nachname" | "email" | "firma_abteilung" | "rolle";
  "raeume_und_orte": "raumname" | "strasse" | "hausnummer" | "plz" | "stadt" | "ausstattung" | "online_link" | "bemerkung";
  "kurstermine": "ort" | "online_link";
  "kurse": "kurstitel" | "kurzbeschreibung" | "detaillierte_beschreibung" | "zielgruppe";
  "anmeldungen": "bemerkung";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "trainer": never;
  "teilnehmer": never;
  "raeume_und_orte": never;
  "kurstermine": "raum" | "kurs" | "trainer";
  "kurse": never;
  "anmeldungen": "kurstermin" | "kurs" | "teilnehmer";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it as a value. `file` is false: a file is UPLOADED
   *  (`form.file(key)` → FileField; the chosen file travels in the create as a data URL). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "trainer": {
    "key": "trainer",
    "appId": "6a33ac9e6060014a70436880",
    "label": "Trainer",
    "pascal": "Trainer",
    "single": "TrainerEntry"
  },
  "teilnehmer": {
    "key": "teilnehmer",
    "appId": "6a33ac9f9cf5d458275318aa",
    "label": "Teilnehmer",
    "pascal": "Teilnehmer",
    "single": "TeilnehmerEntry"
  },
  "raeume_und_orte": {
    "key": "raeume_und_orte",
    "appId": "6a33afda2b58f2e41ee46836",
    "label": "Räume und Orte",
    "pascal": "RaeumeUndOrte",
    "single": "RaeumeUndOrteEntry"
  },
  "kurstermine": {
    "key": "kurstermine",
    "appId": "6a33ac9f436c052d056df9f7",
    "label": "Kurstermine",
    "pascal": "Kurstermine",
    "single": "KurstermineEntry"
  },
  "kurse": {
    "key": "kurse",
    "appId": "6a33ac97f71b811034a5f224",
    "label": "Kurse",
    "pascal": "Kurse",
    "single": "KurseEntry"
  },
  "anmeldungen": {
    "key": "anmeldungen",
    "appId": "6a33aca0e11531f0f32fe8a9",
    "label": "Anmeldungen",
    "pascal": "Anmeldungen",
    "single": "AnmeldungenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "trainer": {
    "vorname": {
      "key": "vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "nachname": {
      "key": "nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail-Adresse",
      "writable": true,
      "autoComplete": "email"
    },
    "trainer_typ": {
      "key": "trainer_typ",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Trainer-Typ",
      "writable": true,
      "options": [
        "intern",
        "extern"
      ]
    },
    "fachgebiete": {
      "key": "fachgebiete",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Fachgebiet(e)",
      "writable": true
    }
  },
  "teilnehmer": {
    "vorname": {
      "key": "vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "nachname": {
      "key": "nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail-Adresse",
      "writable": true,
      "autoComplete": "email"
    },
    "firma_abteilung": {
      "key": "firma_abteilung",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Firma / Abteilung",
      "writable": true,
      "maxLength": 4000
    },
    "rolle": {
      "key": "rolle",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rolle im Unternehmen",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "organization"
    },
    "aktiv_status": {
      "key": "aktiv_status",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Aktiv-Status",
      "writable": true,
      "options": [
        "aktiv",
        "inaktiv"
      ]
    }
  },
  "raeume_und_orte": {
    "raumname": {
      "key": "raumname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Name des Raums/Orts",
      "writable": true,
      "maxLength": 4000
    },
    "strasse": {
      "key": "strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Straße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "hausnummer": {
      "key": "hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "plz": {
      "key": "plz",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "PLZ",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "stadt": {
      "key": "stadt",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Stadt",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "kapazitaet": {
      "key": "kapazitaet",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Maximale Personenzahl",
      "writable": true
    },
    "ausstattung": {
      "key": "ausstattung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Ausstattung",
      "writable": true
    },
    "raum_typ": {
      "key": "raum_typ",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Typ",
      "writable": true,
      "options": [
        "intern",
        "extern"
      ]
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "aktiv",
        "inaktiv"
      ]
    },
    "online_raum": {
      "key": "online_raum",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Online-Raum",
      "writable": true,
      "options": [
        "ja",
        "nein"
      ]
    },
    "online_link": {
      "key": "online_link",
      "fulltype": "string/url",
      "kind": "url",
      "required": false,
      "label": "Online-Link",
      "writable": true,
      "autoComplete": "url"
    },
    "bemerkung": {
      "key": "bemerkung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bemerkung",
      "writable": true
    }
  },
  "kurstermine": {
    "raum": {
      "key": "raum",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Raum/Ort",
      "writable": true,
      "targetAppId": "6a33afda2b58f2e41ee46836",
      "targetEntity": "raeume_und_orte"
    },
    "kurs": {
      "key": "kurs",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Kurs",
      "writable": true,
      "targetAppId": "6a33ac97f71b811034a5f224",
      "targetEntity": "kurse"
    },
    "startdatum": {
      "key": "startdatum",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": true,
      "label": "Startdatum und -uhrzeit",
      "writable": true
    },
    "enddatum": {
      "key": "enddatum",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": true,
      "label": "Enddatum und -uhrzeit",
      "writable": true
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ort (Freitext)",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "online_link": {
      "key": "online_link",
      "fulltype": "string/url",
      "kind": "url",
      "required": false,
      "label": "Online-Link",
      "writable": true,
      "autoComplete": "url"
    },
    "anmeldefrist": {
      "key": "anmeldefrist",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Anmeldefrist",
      "writable": true
    },
    "trainer": {
      "key": "trainer",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Trainer",
      "writable": true,
      "targetAppId": "6a33ac9e6060014a70436880",
      "targetEntity": "trainer"
    },
    "max_teilnehmer_abweichend": {
      "key": "max_teilnehmer_abweichend",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Maximale Teilnehmerzahl (abweichend vom Kurs)",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "geplant",
        "offen",
        "voll",
        "durchgefuehrt",
        "abgesagt"
      ]
    }
  },
  "kurse": {
    "kurstitel": {
      "key": "kurstitel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Kurstitel",
      "writable": true,
      "maxLength": 4000
    },
    "kurzbeschreibung": {
      "key": "kurzbeschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": true,
      "label": "Kurzbeschreibung",
      "writable": true
    },
    "detaillierte_beschreibung": {
      "key": "detaillierte_beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Detaillierte Beschreibung",
      "writable": true
    },
    "kategorie": {
      "key": "kategorie",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Kategorie",
      "writable": true,
      "options": [
        "fachlich",
        "soft_skills",
        "it",
        "sonstiges"
      ]
    },
    "dauer_anzahl": {
      "key": "dauer_anzahl",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Dauer (Anzahl)",
      "writable": true
    },
    "dauer_einheit": {
      "key": "dauer_einheit",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Dauer (Einheit)",
      "writable": true,
      "options": [
        "stunden",
        "tage"
      ]
    },
    "zielgruppe": {
      "key": "zielgruppe",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Zielgruppe",
      "writable": true,
      "maxLength": 4000
    },
    "max_teilnehmer": {
      "key": "max_teilnehmer",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Maximale Teilnehmerzahl",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "geplant",
        "aktiv",
        "inaktiv",
        "archiviert"
      ]
    }
  },
  "anmeldungen": {
    "kurstermin": {
      "key": "kurstermin",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Kurstermin",
      "writable": true,
      "targetAppId": "6a33ac9f436c052d056df9f7",
      "targetEntity": "kurstermine"
    },
    "kurs": {
      "key": "kurs",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Kurs",
      "writable": true,
      "targetAppId": "6a33ac97f71b811034a5f224",
      "targetEntity": "kurse"
    },
    "teilnehmer": {
      "key": "teilnehmer",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Teilnehmer",
      "writable": true,
      "targetAppId": "6a33ac9f9cf5d458275318aa",
      "targetEntity": "teilnehmer"
    },
    "anmeldedatum": {
      "key": "anmeldedatum",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": true,
      "label": "Anmeldedatum",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "vorgemerkt",
        "angemeldet",
        "warteliste",
        "storniert",
        "teilgenommen",
        "nicht_erschienen"
      ]
    },
    "bemerkung": {
      "key": "bemerkung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bemerkung",
      "writable": true
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "trainer": [
    {
      "kind": "choice",
      "field": "trainer_typ",
      "count": 2
    }
  ],
  "teilnehmer": [
    {
      "kind": "choice",
      "field": "aktiv_status",
      "count": 2
    }
  ],
  "raeume_und_orte": [
    {
      "kind": "choice",
      "field": "raum_typ",
      "count": 2
    },
    {
      "kind": "choice",
      "field": "status",
      "count": 2
    },
    {
      "kind": "choice",
      "field": "online_raum",
      "count": 2
    },
    {
      "kind": "stock",
      "field": "kapazitaet"
    }
  ],
  "kurstermine": [
    {
      "kind": "range",
      "from": "startdatum",
      "to": "enddatum"
    },
    {
      "kind": "choice",
      "field": "status",
      "count": 5
    },
    {
      "kind": "record",
      "field": "raum",
      "targetEntity": "raeume_und_orte"
    },
    {
      "kind": "record",
      "field": "kurs",
      "targetEntity": "kurse"
    },
    {
      "kind": "record",
      "field": "trainer",
      "targetEntity": "trainer"
    }
  ],
  "kurse": [
    {
      "kind": "choice",
      "field": "kategorie",
      "count": 4
    },
    {
      "kind": "choice",
      "field": "dauer_einheit",
      "count": 2
    },
    {
      "kind": "choice",
      "field": "status",
      "count": 4
    }
  ],
  "anmeldungen": [
    {
      "kind": "choice",
      "field": "status",
      "count": 6
    },
    {
      "kind": "record",
      "field": "kurstermin",
      "targetEntity": "kurstermine"
    },
    {
      "kind": "record",
      "field": "kurs",
      "targetEntity": "kurse"
    },
    {
      "kind": "record",
      "field": "teilnehmer",
      "targetEntity": "teilnehmer"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "trainer": [
    "vorname",
    "nachname"
  ],
  "teilnehmer": [
    "vorname",
    "nachname"
  ],
  "raeume_und_orte": [
    "raumname"
  ],
  "kurstermine": [
    "ort"
  ],
  "kurse": [
    "kurstitel"
  ],
  "anmeldungen": [
    "bemerkung"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
function displayPart(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
