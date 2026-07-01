import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Kurstermine, RaeumeUndOrte, Kurse, Trainer, LookupValue } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Kurstermine';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/Combobox';
import { RaeumeUndOrteDialog } from '@/components/dialogs/RaeumeUndOrteDialog';
import { KurseDialog } from '@/components/dialogs/KurseDialog';
import { TrainerDialog } from '@/components/dialogs/TrainerDialog';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircle, IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface KurstermineDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Kurstermine['fields']) => Promise<void>;
  /** SHAPE-TOLERANT: lookup fields accept the bare key (string) or the
   *  LookupValue object; applookup fields the bare record id or the full
   *  record URL — the dialog normalizes both. */
  defaultValues?: Omit<Kurstermine['fields'], 'status'> & {
    status?: LookupValue | string;
  };
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  raeumeUndOrteList: RaeumeUndOrte[];
  kurseList: Kurse[];
  trainerList: Trainer[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

// defaultValues are SHAPE-TOLERANT: the dialog resolves bare lookup keys via
// its own options and bare record ids via the field's target app — consumers
// never carry the LookupValue/record-URL shape in their head.
const NORMALIZE_LOOKUPS: Record<string, readonly { key: string; label: string }[]> = {
  status: LOOKUP_OPTIONS['kurstermine']?.['status'] ?? [],
};
const NORMALIZE_APPLOOKUPS: Record<string, string> = {
  raum: APP_IDS.RAEUME_UND_ORTE,
  kurs: APP_IDS.KURSE,
  trainer: APP_IDS.TRAINER,
};
function normalizeDefaults(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [k, opts] of Object.entries(NORMALIZE_LOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string') out[k] = opts.find(o => o.key === v) ?? { key: v, label: v };
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' ? opts.find(o => o.key === x) ?? { key: x, label: x } : x));
  }
  for (const [k, appId] of Object.entries(NORMALIZE_APPLOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string' && v !== '' && !v.startsWith('http')) out[k] = createRecordUrl(appId, v);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' && x !== '' && !x.startsWith('http') ? createRecordUrl(appId, x) : x));
  }
  return out;
}

export function KurstermineDialog({ open, onClose, onSubmit, defaultValues, recordId, raeumeUndOrteList, kurseList, trainerList, enablePhotoScan = true, enablePhotoLocation = true }: KurstermineDialogProps) {
  const [fields, setFields] = useState<Partial<Kurstermine['fields']>>({});
  const [saving, setSaving] = useState(false);
  const normalizedDefaults = useMemo<Record<string, unknown> | undefined>(
    () => (defaultValues ? normalizeDefaults(defaultValues as Record<string, unknown>) : undefined),
    [defaultValues],
  );
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!normalizedDefaults) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(normalizedDefaults);
    } catch {
      return true;
    }
  }, [fields, normalizedDefaults]);
  // Inline-Create state for "RaeumeUndOrte" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraRaeumeUndOrte` list, and select it in
  // the originating Combobox via the captured `createRaeumeUndOrteField`.
  const [createRaeumeUndOrteOpen, setCreateRaeumeUndOrteOpen] = useState(false);
  const [createRaeumeUndOrteInitial, setCreateRaeumeUndOrteInitial] = useState('');
  const [createRaeumeUndOrteField, setCreateRaeumeUndOrteField] = useState<string>('');
  const [extraRaeumeUndOrte, setExtraRaeumeUndOrte] = useState< RaeumeUndOrte[]>([]);
  const raeumeUndOrteListAll = useMemo(
    () => [...raeumeUndOrteList, ...extraRaeumeUndOrte],
    [raeumeUndOrteList, extraRaeumeUndOrte],
  );
  function openCreateRaeumeUndOrte(fieldKey: string, q: string) {
    setCreateRaeumeUndOrteField(fieldKey);
    setCreateRaeumeUndOrteInitial(q);
    setCreateRaeumeUndOrteOpen(true);
  }
  // Inline-Create state for "Kurse" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraKurse` list, and select it in
  // the originating Combobox via the captured `createKurseField`.
  const [createKurseOpen, setCreateKurseOpen] = useState(false);
  const [createKurseInitial, setCreateKurseInitial] = useState('');
  const [createKurseField, setCreateKurseField] = useState<string>('');
  const [extraKurse, setExtraKurse] = useState< Kurse[]>([]);
  const kurseListAll = useMemo(
    () => [...kurseList, ...extraKurse],
    [kurseList, extraKurse],
  );
  function openCreateKurse(fieldKey: string, q: string) {
    setCreateKurseField(fieldKey);
    setCreateKurseInitial(q);
    setCreateKurseOpen(true);
  }
  // Inline-Create state for "Trainer" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraTrainer` list, and select it in
  // the originating Combobox via the captured `createTrainerField`.
  const [createTrainerOpen, setCreateTrainerOpen] = useState(false);
  const [createTrainerInitial, setCreateTrainerInitial] = useState('');
  const [createTrainerField, setCreateTrainerField] = useState<string>('');
  const [extraTrainer, setExtraTrainer] = useState< Trainer[]>([]);
  const trainerListAll = useMemo(
    () => [...trainerList, ...extraTrainer],
    [trainerList, extraTrainer],
  );
  function openCreateTrainer(fieldKey: string, q: string) {
    setCreateTrainerField(fieldKey);
    setCreateTrainerInitial(q);
    setCreateTrainerOpen(true);
  }
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      'raum': raeumeUndOrteList,
      'kurs': kurseList,
      'trainer': trainerList,
    },
  }), [raeumeUndOrteList, kurseList, trainerList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults(normalizedDefaults ?? {}, formEnhancements.defaults) as Partial<Kurstermine['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
      setSubmitError(null);
    }
  }, [open, normalizedDefaults]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  // Submit errors surface IN the dialog (it is modal — a banner in the page
  // body would be hidden behind it). A consumer onSubmit that THROWS (the
  // documented "throw to prevent closing" validation pattern) lands here:
  // the dialog stays open, nothing is saved, the message is visible.
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSubmitError(null);
    try {
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'kurstermine');
      await onSubmit(clean as Kurstermine['fields']);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="raum" entity="Räume und Orte">\n${JSON.stringify(raeumeUndOrteList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="kurs" entity="Kurse">\n${JSON.stringify(kurseList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="trainer" entity="Trainer">\n${JSON.stringify(trainerList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "raum": string | null, // Display name from Räume und Orte (see <available-records>)\n  "kurs": string | null, // Display name from Kurse (see <available-records>)\n  "startdatum": string | null, // YYYY-MM-DDTHH:MM\n  "enddatum": string | null, // YYYY-MM-DDTHH:MM\n  "ort": string | null, // Ort (Freitext)\n  "online_link": string | null, // Online-Link\n  "anmeldefrist": string | null, // YYYY-MM-DD\n  "trainer": string | null, // Display name from Trainer (see <available-records>)\n  "max_teilnehmer_abweichend": number | null, // Maximale Teilnehmerzahl (abweichend vom Kurs)\n  "status": LookupValue | null, // Status (select one key: "geplant" | "offen" | "voll" | "durchgefuehrt" | "abgesagt") mapping: geplant=Geplant, offen=Offen zur Anmeldung, voll=Voll, durchgefuehrt=Durchgeführt, abgesagt=Abgesagt\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["raum", "kurs", "trainer"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const raumName = raw['raum'] as string | null;
        if (raumName) {
          const raumMatch = raeumeUndOrteList.find(r => matchName(raumName!, [String(r.fields.raumname ?? '')]));
          if (raumMatch) merged['raum'] = createRecordUrl(APP_IDS.RAEUME_UND_ORTE, raumMatch.record_id);
        }
        const kursName = raw['kurs'] as string | null;
        if (kursName) {
          const kursMatch = kurseList.find(r => matchName(kursName!, [String(r.fields.kurstitel ?? '')]));
          if (kursMatch) merged['kurs'] = createRecordUrl(APP_IDS.KURSE, kursMatch.record_id);
        }
        const trainerName = raw['trainer'] as string | null;
        if (trainerName) {
          const trainerMatch = trainerList.find(r => matchName(trainerName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (trainerMatch) merged['trainer'] = createRecordUrl(APP_IDS.TRAINER, trainerMatch.record_id);
        }
        return merged as Partial<Kurstermine['fields']>;
      });
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Kurstermine bearbeiten' : 'Kurstermine hinzufügen';

  const fieldBlocks: Record<string, React.ReactNode> = {
    'raum': (
      <div key="raum" className="space-y-1.5">
        <Label htmlFor="raum">Raum/Ort</Label>
        <Combobox
          id="raum"
          placeholder=""
          items={raeumeUndOrteListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.raumname ?? r.record_id),
          }))}
          value={extractRecordId(fields.raum)}
          onChange={id => setFields(f => ({ ...f, raum: id ? createRecordUrl(APP_IDS.RAEUME_UND_ORTE, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateRaeumeUndOrte("raum", q)}
          createLabel="Neu in Räume und Orte"
        />
      </div>
    ),
    'kurs': (
      <div key="kurs" className="space-y-1.5">
        <Label htmlFor="kurs">Kurs</Label>
        <Combobox
          id="kurs"
          placeholder=""
          items={kurseListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.kurstitel ?? r.record_id),
          }))}
          value={extractRecordId(fields.kurs)}
          onChange={id => setFields(f => ({ ...f, kurs: id ? createRecordUrl(APP_IDS.KURSE, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateKurse("kurs", q)}
          createLabel="Neu in Kurse"
        />
      </div>
    ),
    'startdatum': (
      <div key="startdatum" className="space-y-1.5">
        <Label htmlFor="startdatum">Startdatum und -uhrzeit</Label>
        <DatePicker
          id="startdatum"
          placeholder=""
          mode="datetime"
          value={fields.startdatum ?? null}
          onChange={v => setFields(f => ({ ...f, startdatum: v ?? undefined }))}
        />
      </div>
    ),
    'enddatum': (
      <div key="enddatum" className="space-y-1.5">
        <Label htmlFor="enddatum">Enddatum und -uhrzeit</Label>
        <DatePicker
          id="enddatum"
          placeholder=""
          mode="datetime"
          value={fields.enddatum ?? null}
          onChange={v => setFields(f => ({ ...f, enddatum: v ?? undefined }))}
        />
      </div>
    ),
    'ort': (
      <div key="ort" className="space-y-1.5">
        <Label htmlFor="ort">Ort (Freitext)</Label>
        <Input
          id="ort"
          placeholder=""
          value={fields.ort ?? ''}
          onChange={e => setFields(f => ({ ...f, ort: e.target.value }))}
        />
      </div>
    ),
    'online_link': (
      <div key="online_link" className="space-y-1.5">
        <Label htmlFor="online_link">Online-Link</Label>
        <Input
          id="online_link"
          value={fields.online_link ?? ''}
          onChange={e => setFields(f => ({ ...f, online_link: e.target.value }))}
        />
      </div>
    ),
    'anmeldefrist': (
      <div key="anmeldefrist" className="space-y-1.5">
        <Label htmlFor="anmeldefrist">Anmeldefrist</Label>
        <DatePicker
          id="anmeldefrist"
          placeholder=""
          mode="date"
          value={fields.anmeldefrist ?? null}
          onChange={v => setFields(f => ({ ...f, anmeldefrist: v ?? undefined }))}
        />
      </div>
    ),
    'trainer': (
      <div key="trainer" className="space-y-1.5">
        <Label htmlFor="trainer">Trainer</Label>
        <Combobox
          id="trainer"
          placeholder=""
          items={trainerListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.vorname ?? r.record_id),
          }))}
          value={extractRecordId(fields.trainer)}
          onChange={id => setFields(f => ({ ...f, trainer: id ? createRecordUrl(APP_IDS.TRAINER, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateTrainer("trainer", q)}
          createLabel="Neu in Trainer"
        />
      </div>
    ),
    'max_teilnehmer_abweichend': (
      <div key="max_teilnehmer_abweichend" className="space-y-1.5">
        <Label htmlFor="max_teilnehmer_abweichend">Maximale Teilnehmerzahl (abweichend vom Kurs)</Label>
        <Input
          id="max_teilnehmer_abweichend"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'max_teilnehmer_abweichend')}
          placeholder=""
          value={fields.max_teilnehmer_abweichend !== undefined ? fields.max_teilnehmer_abweichend : (computedValues['max_teilnehmer_abweichend'] ?? '')}
          onChange={e => setFields(f => ({ ...f, max_teilnehmer_abweichend: clampNumberValue(formEnhancements, 'max_teilnehmer_abweichend', e.target.value) }))}
        />
      </div>
    ),
    'status': (
      <div key="status" className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.status) === 'geplant'}
            onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'geplant' ? undefined : 'geplant') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.status) === 'geplant'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Geplant
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.status) === 'offen'}
            onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'offen' ? undefined : 'offen') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.status) === 'offen'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Offen zur Anmeldung
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.status) === 'voll'}
            onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'voll' ? undefined : 'voll') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.status) === 'voll'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Voll
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.status) === 'durchgefuehrt'}
            onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'durchgefuehrt' ? undefined : 'durchgefuehrt') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.status) === 'durchgefuehrt'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Durchgeführt
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.status) === 'abgesagt'}
            onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'abgesagt' ? undefined : 'abgesagt') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.status) === 'abgesagt'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Abgesagt
          </button>
        </div>
      </div>
    ),
  };
  const orderedFields = applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"raum": "Raum/Ort", "kurs": "Kurs", "startdatum": "Startdatum und -uhrzeit", "enddatum": "Enddatum und -uhrzeit", "ort": "Ort (Freitext)", "online_link": "Online-Link", "anmeldefrist": "Anmeldefrist", "trainer": "Trainer", "max_teilnehmer_abweichend": "Maximale Teilnehmerzahl (abweichend vom Kurs)", "status": "Status"};
  const CURRENCY_KEYS = new Set<string>([]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"raum": {"raumname": "Name des Raums/Orts", "strasse": "Straße", "hausnummer": "Hausnummer", "plz": "PLZ", "stadt": "Stadt", "kapazitaet": "Maximale Personenzahl", "ausstattung": "Ausstattung", "raum_typ": "Typ", "status": "Status", "online_raum": "Online-Raum", "online_link": "Online-Link", "bemerkung": "Bemerkung"}, "kurs": {"kurstitel": "Kurstitel", "kurzbeschreibung": "Kurzbeschreibung", "detaillierte_beschreibung": "Detaillierte Beschreibung", "kategorie": "Kategorie", "dauer_anzahl": "Dauer (Anzahl)", "dauer_einheit": "Dauer (Einheit)", "zielgruppe": "Zielgruppe", "max_teilnehmer": "Maximale Teilnehmerzahl", "status": "Status"}, "trainer": {"vorname": "Vorname", "nachname": "Nachname", "email": "E-Mail-Adresse", "trainer_typ": "Trainer-Typ", "fachgebiete": "Fachgebiet(e)"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0 max-sm:[&>button]:size-10 max-sm:[&>button]:grid max-sm:[&>button]:place-items-center max-sm:[&>button]:rounded-full max-sm:[&>button]:border max-sm:[&>button]:border-input max-sm:[&>button]:bg-background max-sm:[&>button]:opacity-100 max-sm:[&>button>svg]:size-5">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 max-sm:py-2.5 max-sm:px-4 text-xs font-semibold transition-all mr-7 max-sm:mr-12 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">KI-Ausfüllen</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</p>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0 max-sm:[&_input]:h-11">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS.KURSTERMINE} recordId={recordId} />
              </div>
            )}
          </div>
          {submitError && (
            <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/10 px-6 py-2.5 text-sm text-destructive" role="alert">
              <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{submitError}</span>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2 max-sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="max-sm:h-12 max-sm:flex-1 max-sm:text-base">Abbrechen</Button>
            <Button
              type="submit"
              className="max-sm:h-12 max-sm:flex-1 max-sm:text-base"
              disabled={saving || !isDirty}
            >
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createRaeumeUndOrteOpen && (
      <RaeumeUndOrteDialog
        open={createRaeumeUndOrteOpen}
        onClose={() => setCreateRaeumeUndOrteOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createRaeumeUndOrteEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as RaeumeUndOrte;
            setExtraRaeumeUndOrte(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.RAEUME_UND_ORTE, result.id);
            setFields(prev => ({ ...prev, [createRaeumeUndOrteField]: url } as any));
          }
          setCreateRaeumeUndOrteOpen(false);
        }}
        defaultValues={createRaeumeUndOrteInitial
          ? ({ raumname: createRaeumeUndOrteInitial } as any)
          : undefined}
      />
    )}
    {createKurseOpen && (
      <KurseDialog
        open={createKurseOpen}
        onClose={() => setCreateKurseOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createKurseEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Kurse;
            setExtraKurse(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.KURSE, result.id);
            setFields(prev => ({ ...prev, [createKurseField]: url } as any));
          }
          setCreateKurseOpen(false);
        }}
        defaultValues={createKurseInitial
          ? ({ kurstitel: createKurseInitial } as any)
          : undefined}
      />
    )}
    {createTrainerOpen && (
      <TrainerDialog
        open={createTrainerOpen}
        onClose={() => setCreateTrainerOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createTrainerEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Trainer;
            setExtraTrainer(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.TRAINER, result.id);
            setFields(prev => ({ ...prev, [createTrainerField]: url } as any));
          }
          setCreateTrainerOpen(false);
        }}
        defaultValues={createTrainerInitial
          ? ({ vorname: createTrainerInitial } as any)
          : undefined}
      />
    )}
    </>
  );
}