/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'trainer'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.trainer.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.trainer.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.trainer.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.trainer              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   trainer: vorname, nachname, email, trainer_typ, fachgebiete  ·  ← kurstermine (list + contextual +)
 *   teilnehmer: vorname, nachname, email, firma_abteilung, rolle, aktiv_status  ·  ← anmeldungen (list + contextual +)
 *   raeume_und_orte: raumname, strasse, hausnummer, plz, stadt, kapazitaet, ausstattung, raum_typ, …  ·  ← kurstermine (list + contextual +)
 *   kurstermine: raum, kurs, startdatum, enddatum, ort, online_link, anmeldefrist, trainer, …  ·  → raeume_und_orte · → kurse · → trainer · ← anmeldungen (list + contextual +)
 *   kurse: kurstitel, kurzbeschreibung, detaillierte_beschreibung, kategorie, dauer_anzahl, dauer_einheit, zielgruppe, max_teilnehmer, …  ·  ← kurstermine (list + contextual +) · ← anmeldungen (list + contextual +)
 *   anmeldungen: kurstermin, kurs, teilnehmer, anmeldedatum, status, bemerkung  ·  → kurstermine · → kurse · → teilnehmer
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Trainer, Teilnehmer, RaeumeUndOrte, Kurstermine, Kurse, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichKurstermine, enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedKurstermine, EnrichedAnmeldungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { TrainerDialog, type TrainerDialogDefaults } from '@/components/dialogs/TrainerDialog';
import { TrainerDetails } from '@/components/details/TrainerDetails';
import { TeilnehmerDialog, type TeilnehmerDialogDefaults } from '@/components/dialogs/TeilnehmerDialog';
import { TeilnehmerDetails } from '@/components/details/TeilnehmerDetails';
import { RaeumeUndOrteDialog, type RaeumeUndOrteDialogDefaults } from '@/components/dialogs/RaeumeUndOrteDialog';
import { RaeumeUndOrteDetails } from '@/components/details/RaeumeUndOrteDetails';
import { KurstermineDialog, type KurstermineDialogDefaults } from '@/components/dialogs/KurstermineDialog';
import { KurstermineDetails } from '@/components/details/KurstermineDetails';
import { KurseDialog, type KurseDialogDefaults } from '@/components/dialogs/KurseDialog';
import { KurseDetails } from '@/components/details/KurseDetails';
import { AnmeldungenDialog, type AnmeldungenDialogDefaults } from '@/components/dialogs/AnmeldungenDialog';
import { AnmeldungenDetails } from '@/components/details/AnmeldungenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'trainer'; record: Trainer }
  | { type: 'teilnehmer'; record: Teilnehmer }
  | { type: 'raeumeUndOrte'; record: RaeumeUndOrte }
  | { type: 'kurstermine'; record: EnrichedKurstermine }
  | { type: 'kurse'; record: Kurse }
  | { type: 'anmeldungen'; record: EnrichedAnmeldungen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  trainer: EntityCrudApi<Trainer, TrainerDialogDefaults>;
  teilnehmer: EntityCrudApi<Teilnehmer, TeilnehmerDialogDefaults>;
  raeumeUndOrte: EntityCrudApi<RaeumeUndOrte, RaeumeUndOrteDialogDefaults>;
  kurstermine: EntityCrudApi<Kurstermine, KurstermineDialogDefaults>;
  kurse: EntityCrudApi<Kurse, KurseDialogDefaults>;
  anmeldungen: EntityCrudApi<Anmeldungen, AnmeldungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { trainer: Trainer[]; teilnehmer: Teilnehmer[]; raeumeUndOrte: RaeumeUndOrte[]; kurstermine: EnrichedKurstermine[]; kurse: Kurse[]; anmeldungen: EnrichedAnmeldungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [trainerDialog, setTrainerDialog] = useState<{ defaults?: TrainerDialogDefaults; editing?: Trainer } | null>(null);
  const [teilnehmerDialog, setTeilnehmerDialog] = useState<{ defaults?: TeilnehmerDialogDefaults; editing?: Teilnehmer } | null>(null);
  const [raeumeUndOrteDialog, setRaeumeUndOrteDialog] = useState<{ defaults?: RaeumeUndOrteDialogDefaults; editing?: RaeumeUndOrte } | null>(null);
  const [kurstermineDialog, setKurstermineDialog] = useState<{ defaults?: KurstermineDialogDefaults; editing?: Kurstermine } | null>(null);
  const [kurseDialog, setKurseDialog] = useState<{ defaults?: KurseDialogDefaults; editing?: Kurse } | null>(null);
  const [anmeldungenDialog, setAnmeldungenDialog] = useState<{ defaults?: AnmeldungenDialogDefaults; editing?: Anmeldungen } | null>(null);
  const enrichedKurstermine = useMemo(() => enrichKurstermine(data.kurstermine, { raeumeUndOrteMap: data.raeumeUndOrteMap, kurseMap: data.kurseMap, trainerMap: data.trainerMap }), [data.kurstermine, data.raeumeUndOrteMap, data.kurseMap, data.trainerMap]);
  const enrichedAnmeldungen = useMemo(() => enrichAnmeldungen(data.anmeldungen, { kurstermineMap: data.kurstermineMap, kurseMap: data.kurseMap, teilnehmerMap: data.teilnehmerMap }), [data.anmeldungen, data.kurstermineMap, data.kurseMap, data.teilnehmerMap]);

  function detailTrainer(record: Trainer, push = false) {
    const item: OverlayItem = { type: 'trainer', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitTrainer(fields: Trainer['fields']) {
    const editing = trainerDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setTrainer(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateTrainerEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('trainer')} — ${t('crud_updated')}`, async () => {
        data.setTrainer(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateTrainerEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createTrainerEntry(fields);
      undoToast(`${appLabel('trainer')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailTeilnehmer(record: Teilnehmer, push = false) {
    const item: OverlayItem = { type: 'teilnehmer', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitTeilnehmer(fields: Teilnehmer['fields']) {
    const editing = teilnehmerDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setTeilnehmer(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateTeilnehmerEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('teilnehmer')} — ${t('crud_updated')}`, async () => {
        data.setTeilnehmer(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateTeilnehmerEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createTeilnehmerEntry(fields);
      undoToast(`${appLabel('teilnehmer')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailRaeumeUndOrte(record: RaeumeUndOrte, push = false) {
    const item: OverlayItem = { type: 'raeumeUndOrte', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitRaeumeUndOrte(fields: RaeumeUndOrte['fields']) {
    const editing = raeumeUndOrteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setRaeumeUndOrte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateRaeumeUndOrteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('raeume_und_orte')} — ${t('crud_updated')}`, async () => {
        data.setRaeumeUndOrte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateRaeumeUndOrteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createRaeumeUndOrteEntry(fields);
      undoToast(`${appLabel('raeume_und_orte')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailKurstermine(record: Kurstermine, push = false) {
    const rec = enrichedKurstermine.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'kurstermine', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKurstermine(fields: Kurstermine['fields']) {
    const editing = kurstermineDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKurstermine(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKurstermineEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kurstermine')} — ${t('crud_updated')}`, async () => {
        data.setKurstermine(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKurstermineEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKurstermineEntry(fields);
      undoToast(`${appLabel('kurstermine')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailKurse(record: Kurse, push = false) {
    const item: OverlayItem = { type: 'kurse', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKurse(fields: Kurse['fields']) {
    const editing = kurseDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKurse(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKurseEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kurse')} — ${t('crud_updated')}`, async () => {
        data.setKurse(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKurseEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKurseEntry(fields);
      undoToast(`${appLabel('kurse')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAnmeldungen(record: Anmeldungen, push = false) {
    const rec = enrichedAnmeldungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'anmeldungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAnmeldungen(fields: Anmeldungen['fields']) {
    const editing = anmeldungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAnmeldungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAnmeldungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('anmeldungen')} — ${t('crud_updated')}`, async () => {
        data.setAnmeldungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAnmeldungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAnmeldungenEntry(fields);
      undoToast(`${appLabel('anmeldungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <TrainerDialog
        open={trainerDialog !== null}
        onClose={() => setTrainerDialog(null)}
        onSubmit={submitTrainer}
        defaultValues={trainerDialog?.defaults}
        recordId={trainerDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Trainer']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Trainer']}
      />
      <TeilnehmerDialog
        open={teilnehmerDialog !== null}
        onClose={() => setTeilnehmerDialog(null)}
        onSubmit={submitTeilnehmer}
        defaultValues={teilnehmerDialog?.defaults}
        recordId={teilnehmerDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Teilnehmer']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Teilnehmer']}
      />
      <RaeumeUndOrteDialog
        open={raeumeUndOrteDialog !== null}
        onClose={() => setRaeumeUndOrteDialog(null)}
        onSubmit={submitRaeumeUndOrte}
        defaultValues={raeumeUndOrteDialog?.defaults}
        recordId={raeumeUndOrteDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['RaeumeUndOrte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['RaeumeUndOrte']}
      />
      <KurstermineDialog
        open={kurstermineDialog !== null}
        onClose={() => setKurstermineDialog(null)}
        onSubmit={submitKurstermine}
        defaultValues={kurstermineDialog?.defaults}
        recordId={kurstermineDialog?.editing?.record_id}
        raeumeUndOrteList={data.raeumeUndOrte}
        kurseList={data.kurse}
        trainerList={data.trainer}
        enablePhotoScan={AI_PHOTO_SCAN['Kurstermine']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kurstermine']}
      />
      <KurseDialog
        open={kurseDialog !== null}
        onClose={() => setKurseDialog(null)}
        onSubmit={submitKurse}
        defaultValues={kurseDialog?.defaults}
        recordId={kurseDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Kurse']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kurse']}
      />
      <AnmeldungenDialog
        open={anmeldungenDialog !== null}
        onClose={() => setAnmeldungenDialog(null)}
        onSubmit={submitAnmeldungen}
        defaultValues={anmeldungenDialog?.defaults}
        recordId={anmeldungenDialog?.editing?.record_id}
        kurstermineList={data.kurstermine}
        kurseList={data.kurse}
        teilnehmerList={data.teilnehmer}
        enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'trainer') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('trainer')} subtitle={undefined} />
                <TrainerDetails
                  record={top.record}
                  kurstermineList={data.kurstermine}
                  onOpenKurstermine={(r) => detailKurstermine(r, true)}
                  onAddKurstermine={perms.canWrite('kurstermine') ? () => setKurstermineDialog({ defaults: { trainer: createRecordUrl(APP_IDS.TRAINER, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'teilnehmer') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('teilnehmer')} subtitle={undefined} />
                <TeilnehmerDetails
                  record={top.record}
                  anmeldungenList={data.anmeldungen}
                  onOpenAnmeldungen={(r) => detailAnmeldungen(r, true)}
                  onAddAnmeldungen={perms.canWrite('anmeldungen') ? () => setAnmeldungenDialog({ defaults: { teilnehmer: createRecordUrl(APP_IDS.TEILNEHMER, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'raeumeUndOrte') {
            return (
              <>
                <RecordHeader title={top.record.fields.raumname ?? appLabel('raeume_und_orte')} subtitle={undefined} />
                <RaeumeUndOrteDetails
                  record={top.record}
                  kurstermineList={data.kurstermine}
                  onOpenKurstermine={(r) => detailKurstermine(r, true)}
                  onAddKurstermine={perms.canWrite('kurstermine') ? () => setKurstermineDialog({ defaults: { raum: createRecordUrl(APP_IDS.RAEUME_UND_ORTE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'kurstermine') {
            return (
              <>
                <RecordHeader title={top.record.fields.ort ?? appLabel('kurstermine')} subtitle={top.record.fields.startdatum ? formatDate(top.record.fields.startdatum) : undefined} />
                <KurstermineDetails
                  record={top.record}
                  raeumeUndOrteList={data.raeumeUndOrte}
                  onOpenRaeumeUndOrte={(r) => detailRaeumeUndOrte(r, true)}
                  kurseList={data.kurse}
                  onOpenKurse={(r) => detailKurse(r, true)}
                  trainerList={data.trainer}
                  onOpenTrainer={(r) => detailTrainer(r, true)}
                  anmeldungenList={data.anmeldungen}
                  onOpenAnmeldungen={(r) => detailAnmeldungen(r, true)}
                  onAddAnmeldungen={perms.canWrite('anmeldungen') ? () => setAnmeldungenDialog({ defaults: { kurstermin: createRecordUrl(APP_IDS.KURSTERMINE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'kurse') {
            return (
              <>
                <RecordHeader title={top.record.fields.kurstitel ?? appLabel('kurse')} subtitle={undefined} />
                <KurseDetails
                  record={top.record}
                  kurstermineList={data.kurstermine}
                  onOpenKurstermine={(r) => detailKurstermine(r, true)}
                  onAddKurstermine={perms.canWrite('kurstermine') ? () => setKurstermineDialog({ defaults: { kurs: createRecordUrl(APP_IDS.KURSE, top.record.record_id) } }) : undefined}
                  anmeldungenList={data.anmeldungen}
                  onOpenAnmeldungen={(r) => detailAnmeldungen(r, true)}
                  onAddAnmeldungen={perms.canWrite('anmeldungen') ? () => setAnmeldungenDialog({ defaults: { kurs: createRecordUrl(APP_IDS.KURSE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'anmeldungen') {
            return (
              <>
                <RecordHeader title={appLabel('anmeldungen')} subtitle={top.record.fields.anmeldedatum ? formatDate(top.record.fields.anmeldedatum) : undefined} />
                <AnmeldungenDetails
                  record={top.record}
                  kurstermineList={data.kurstermine}
                  onOpenKurstermine={(r) => detailKurstermine(r, true)}
                  kurseList={data.kurse}
                  onOpenKurse={(r) => detailKurse(r, true)}
                  teilnehmerList={data.teilnehmer}
                  onOpenTeilnehmer={(r) => detailTeilnehmer(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'trainer') return perms.canWrite('trainer');
          if (top.type === 'teilnehmer') return perms.canWrite('teilnehmer');
          if (top.type === 'raeumeUndOrte') return perms.canWrite('raeume_und_orte');
          if (top.type === 'kurstermine') return perms.canWrite('kurstermine');
          if (top.type === 'kurse') return perms.canWrite('kurse');
          if (top.type === 'anmeldungen') return perms.canWrite('anmeldungen');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'trainer') setTrainerDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'teilnehmer') setTeilnehmerDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'raeumeUndOrte') setRaeumeUndOrteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kurstermine') setKurstermineDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kurse') setKurseDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'anmeldungen') setAnmeldungenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    trainer: {
      openCreate: (defaults?: TrainerDialogDefaults) => (perms.canWrite('trainer') ? setTrainerDialog({ defaults }) : refuse()),
      openEdit: (record: Trainer) => (perms.canWrite('trainer') ? setTrainerDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Trainer) => detailTrainer(record, false),
      canWrite: perms.canWrite('trainer'),
    },
    teilnehmer: {
      openCreate: (defaults?: TeilnehmerDialogDefaults) => (perms.canWrite('teilnehmer') ? setTeilnehmerDialog({ defaults }) : refuse()),
      openEdit: (record: Teilnehmer) => (perms.canWrite('teilnehmer') ? setTeilnehmerDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Teilnehmer) => detailTeilnehmer(record, false),
      canWrite: perms.canWrite('teilnehmer'),
    },
    raeumeUndOrte: {
      openCreate: (defaults?: RaeumeUndOrteDialogDefaults) => (perms.canWrite('raeume_und_orte') ? setRaeumeUndOrteDialog({ defaults }) : refuse()),
      openEdit: (record: RaeumeUndOrte) => (perms.canWrite('raeume_und_orte') ? setRaeumeUndOrteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: RaeumeUndOrte) => detailRaeumeUndOrte(record, false),
      canWrite: perms.canWrite('raeume_und_orte'),
    },
    kurstermine: {
      openCreate: (defaults?: KurstermineDialogDefaults) => (perms.canWrite('kurstermine') ? setKurstermineDialog({ defaults }) : refuse()),
      openEdit: (record: Kurstermine) => (perms.canWrite('kurstermine') ? setKurstermineDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Kurstermine) => detailKurstermine(record, false),
      canWrite: perms.canWrite('kurstermine'),
    },
    kurse: {
      openCreate: (defaults?: KurseDialogDefaults) => (perms.canWrite('kurse') ? setKurseDialog({ defaults }) : refuse()),
      openEdit: (record: Kurse) => (perms.canWrite('kurse') ? setKurseDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Kurse) => detailKurse(record, false),
      canWrite: perms.canWrite('kurse'),
    },
    anmeldungen: {
      openCreate: (defaults?: AnmeldungenDialogDefaults) => (perms.canWrite('anmeldungen') ? setAnmeldungenDialog({ defaults }) : refuse()),
      openEdit: (record: Anmeldungen) => (perms.canWrite('anmeldungen') ? setAnmeldungenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Anmeldungen) => detailAnmeldungen(record, false),
      canWrite: perms.canWrite('anmeldungen'),
    },
    enriched: { trainer: data.trainer, teilnehmer: data.teilnehmer, raeumeUndOrte: data.raeumeUndOrte, kurstermine: enrichedKurstermine, kurse: data.kurse, anmeldungen: enrichedAnmeldungen },
  };
}
