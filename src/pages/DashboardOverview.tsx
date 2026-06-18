import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichKurstermine, enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedKurstermine, EnrichedAnmeldungen } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatDateTime, lookupKey } from '@/lib/formatters';
import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconCalendarEvent, IconUsers, IconAlertTriangle,
  IconClipboardList,
} from '@tabler/icons-react';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatCard, StatCardRow } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';
import {
  RecordOverlay, RecordHeader, RecordSection, RecordField, RecordAttachments,
  RecordKeyFacts, useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { KurstermineDialog } from '@/components/dialogs/KurstermineDialog';
import { AnmeldungenDialog } from '@/components/dialogs/AnmeldungenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';

const APPGROUP_ID = '6a33adcd488e9012f0ff3290';
const REPAIR_ENDPOINT = '/claude/build/repair';

// Tone mapping for Kurstermine status
function toneForTermin(status?: string): CalendarEvent['tone'] {
  switch (status) {
    case 'abgesagt': return 'destructive';
    case 'voll': return 'warning';
    case 'offen': return 'primary';
    case 'durchgefuehrt': return 'default';
    default: return 'default';
  }
}

export default function DashboardOverview() {
  const clock = useClock();
  const {
    kurse, trainer, teilnehmer, kurstermine, anmeldungen,
    setKurstermine, setAnmeldungen,
    kurseMap, trainerMap, teilnehmerMap, kurstermineMap,
    loading, error, fetchAll,
  } = useDashboardData();

  // ALL hooks before any early returns
  const enrichedKurstermine = useMemo(
    () => enrichKurstermine(kurstermine, { kurseMap, trainerMap }),
    [kurstermine, kurseMap, trainerMap]
  );
  const enrichedAnmeldungen = useMemo(
    () => enrichAnmeldungen(anmeldungen, { kurstermineMap, kurseMap, teilnehmerMap }),
    [anmeldungen, kurstermineMap, kurseMap, teilnehmerMap]
  );

  const overlay = useRecordOverlayStack<{ type: 'termin' | 'anmeldung'; id: string }>();

  const [terminDialogOpen, setTerminDialogOpen] = useState(false);
  const [editingTermin, setEditingTermin] = useState<EnrichedKurstermine | null>(null);
  const [anmeldungDialogOpen, setAnmeldungDialogOpen] = useState(false);
  const [editingAnmeldung, setEditingAnmeldung] = useState<EnrichedAnmeldungen | null>(null);
  const [newTerminDefaults, setNewTerminDefaults] = useState<Record<string, unknown>>({});
  const [kpiFilter, setKpiFilter] = useState<'offen' | 'voll' | null>(null);

  const today = format(clock, 'yyyy-MM-dd');
  const todayDate = startOfDay(clock);

  // KPI derivations
  const offeneTermine = useMemo(
    () => enrichedKurstermine.filter(t => lookupKey(t.fields.status) === 'offen'),
    [enrichedKurstermine]
  );
  const volleTermine = useMemo(
    () => enrichedKurstermine.filter(t => lookupKey(t.fields.status) === 'voll'),
    [enrichedKurstermine]
  );
  const vorgemerkteAnmeldungen = useMemo(
    () => enrichedAnmeldungen.filter(a => lookupKey(a.fields.status) === 'vorgemerkt'),
    [enrichedAnmeldungen]
  );
  const naechsterTermin = useMemo(
    () => enrichedKurstermine
      .filter(t => t.fields.startdatum && !isBefore(parseISO(t.fields.startdatum), todayDate))
      .sort((a, b) => (a.fields.startdatum ?? '').localeCompare(b.fields.startdatum ?? ''))[0],
    [enrichedKurstermine, todayDate]
  );

  // Hero: abgesagte Termine
  const abgesagteTermine = useMemo(
    () => enrichedKurstermine.filter(t => lookupKey(t.fields.status) === 'abgesagt'),
    [enrichedKurstermine]
  );

  // Anmeldungen that are "vorgemerkt" and need confirmation
  const pendingAnmeldungen = useMemo(
    () => enrichedAnmeldungen
      .filter(a => lookupKey(a.fields.status) === 'vorgemerkt')
      .sort((a, b) => (a.fields.anmeldedatum ?? '').localeCompare(b.fields.anmeldedatum ?? ''))
      .slice(0, 5),
    [enrichedAnmeldungen]
  );

  // Calendar events
  const calendarEvents = useMemo((): CalendarEvent[] => {
    let list = enrichedKurstermine;
    if (kpiFilter === 'offen') list = offeneTermine;
    else if (kpiFilter === 'voll') list = volleTermine;
    return list
      .filter(t => t.fields.startdatum)
      .map(t => ({
        id: `termin:${t.record_id}`,
        start: t.fields.startdatum!.slice(0, 16),
        end: t.fields.enddatum ? t.fields.enddatum.slice(0, 16) : undefined,
        title: t.kursName || t.fields.ort || 'Kurstermin',
        subtitle: t.trainerName ? `Trainer: ${t.trainerName}` : (t.fields.ort ?? undefined),
        tone: toneForTermin(lookupKey(t.fields.status)),
      }));
  }, [enrichedKurstermine, offeneTermine, volleTermine, kpiFilter]);

  // Advance anmeldung status: vorgemerkt → angemeldet
  const confirmAnmeldung = useCallback(async (a: EnrichedAnmeldungen) => {
    const prev = anmeldungen.map(x => ({ ...x }));
    setAnmeldungen(anmeldungen.map(x =>
      x.record_id === a.record_id ? { ...x, fields: { ...x.fields, status: { key: 'angemeldet', label: 'Angemeldet' } } } : x
    ));
    undoToast(`${a.teilnehmerName || 'Anmeldung'} bestätigt`, () => {
      setAnmeldungen(prev);
      LivingAppsService.updateAnmeldungenEntry(a.record_id, { status: 'vorgemerkt' }).catch(() => fetchAll());
    });
    try {
      await LivingAppsService.updateAnmeldungenEntry(a.record_id, { status: 'angemeldet' });
    } catch {
      fetchAll();
    }
  }, [anmeldungen, setAnmeldungen, fetchAll]);

  // Calendar drag/drop reschedule
  const handleEventDrop = useCallback(async (eventId: string, newStart: string, newEnd?: string) => {
    const rid = eventId.split(':')[1] ?? '';
    const prev = kurstermine.map(x => ({ ...x }));
    setKurstermine(kurstermine.map(k =>
      k.record_id === rid ? { ...k, fields: { ...k.fields, startdatum: newStart, ...(newEnd ? { enddatum: newEnd } : {}) } } : k
    ));
    undoToast('Termin verschoben', () => {
      setKurstermine(prev);
      const old = prev.find(k => k.record_id === rid);
      if (old) LivingAppsService.updateKurstermineEntry(rid, { startdatum: old.fields.startdatum, enddatum: old.fields.enddatum }).catch(() => fetchAll());
    });
    try {
      await LivingAppsService.updateKurstermineEntry(rid, { startdatum: newStart, ...(newEnd ? { enddatum: newEnd } : {}) });
    } catch {
      fetchAll();
    }
  }, [kurstermine, setKurstermine, fetchAll]);

  const handleEventResize = useCallback(async (eventId: string, newStart: string, newEnd: string) => {
    const rid = eventId.split(':')[1] ?? '';
    const prev = kurstermine.map(x => ({ ...x }));
    setKurstermine(kurstermine.map(k =>
      k.record_id === rid ? { ...k, fields: { ...k.fields, startdatum: newStart, enddatum: newEnd } } : k
    ));
    undoToast('Termin-Dauer geändert', () => {
      setKurstermine(prev);
      const old = prev.find(k => k.record_id === rid);
      if (old) LivingAppsService.updateKurstermineEntry(rid, { startdatum: old.fields.startdatum, enddatum: old.fields.enddatum }).catch(() => fetchAll());
    });
    try {
      await LivingAppsService.updateKurstermineEntry(rid, { startdatum: newStart, enddatum: newEnd });
    } catch {
      fetchAll();
    }
  }, [kurstermine, setKurstermine, fetchAll]);

  // Create new Termin from calendar empty click
  const handleEmptyClick = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd\'T\'HH:mm');
    setNewTerminDefaults({ startdatum: dateStr });
    setEditingTermin(null);
    setTerminDialogOpen(true);
  }, []);

  // Create from drag-range
  const handleRangeCreate = useCallback((start: Date, end: Date) => {
    const startStr = format(start, 'yyyy-MM-dd\'T\'HH:mm');
    const endStr = format(end, 'yyyy-MM-dd\'T\'HH:mm');
    setNewTerminDefaults({ startdatum: startStr, enddatum: endStr });
    setEditingTermin(null);
    setTerminDialogOpen(true);
  }, []);

  // Context line
  const contextLine = useMemo(() => {
    const offeneCount = offeneTermine.length;
    const naechster = naechsterTermin;
    if (offeneCount === 0 && !naechster) return 'Keine anstehenden Kurstermine.';
    if (naechster) {
      const datStr = formatDate(naechster.fields.startdatum);
      const kursTitle = naechster.kursName || 'Kurs';
      return `Nächster Termin: ${kursTitle} am ${datStr}${offeneCount > 0 ? ` — ${offeneCount} ${offeneCount === 1 ? 'Termin' : 'Termine'} offen zur Anmeldung` : ''}.`;
    }
    return `${offeneCount} ${offeneCount === 1 ? 'Termin' : 'Termine'} offen zur Anmeldung.`;
  }, [offeneTermine, naechsterTermin]);

  // Overlay record
  const overlayTermin = overlay.top?.type === 'termin'
    ? enrichedKurstermine.find(t => t.record_id === overlay.top!.id)
    : null;
  const overlayAnmeldung = overlay.top?.type === 'anmeldung'
    ? enrichedAnmeldungen.find(a => a.record_id === overlay.top!.id)
    : null;

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-xl">{contextLine}</p>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditingTermin(null); setNewTerminDefaults({}); setTerminDialogOpen(true); }}
        >
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Neuer Termin
        </Button>
      </div>

      <DashboardGrid
        hero={abgesagteTermine.length > 0 ? (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            tone="warning"
            action={{
              label: 'Termin öffnen',
              onClick: () => {
                const t = abgesagteTermine[0];
                overlay.replace({ type: 'termin', id: t.record_id });
              },
            }}
          >
            <b>{namen(abgesagteTermine.map(t => t.kursName || 'Termin'))}</b>{' '}
            {abgesagteTermine.length === 1 ? 'wurde abgesagt' : 'wurden abgesagt'} — bitte prüfe die betroffenen Anmeldungen.
          </HeroBanner>
        ) : undefined}
        kpis={
          <StatCardRow>
            <StatCard
              title="Offen zur Anmeldung"
              value={offeneTermine.length}
              description={offeneTermine.length > 0 ? 'Kurstermine verfügbar' : 'Keine offenen Termine'}
              icon={<IconCalendarEvent size={18} className="text-muted-foreground" />}
              tone={offeneTermine.length > 0 ? 'primary' : 'default'}
              onClick={() => setKpiFilter(f => f === 'offen' ? null : 'offen')}
              active={kpiFilter === 'offen'}
            />
            <StatCard
              title="Ausgebucht"
              value={volleTermine.length}
              description={volleTermine.length > 0 ? 'Keine freien Plätze' : 'Alle Termine haben Plätze'}
              icon={<IconUsers size={18} className="text-muted-foreground" />}
              tone={volleTermine.length > 0 ? 'warning' : 'default'}
              onClick={() => setKpiFilter(f => f === 'voll' ? null : 'voll')}
              active={kpiFilter === 'voll'}
            />
            <StatCard
              title="Unbestätigte Anmeldungen"
              value={vorgemerkteAnmeldungen.length}
              description={vorgemerkteAnmeldungen.length > 0 ? 'Warten auf Bestätigung' : 'Alles bestätigt'}
              icon={<IconClipboardList size={18} className="text-muted-foreground" />}
              tone={vorgemerkteAnmeldungen.length > 0 ? 'warning' : 'default'}
            />
          </StatCardRow>
        }
        aside={
          <>
            <WorkList
              title="Unbestätigte Anmeldungen"
              icon={<IconClipboardList size={14} />}
              items={pendingAnmeldungen.map(a => ({
                id: a.record_id,
                title: a.teilnehmerName || 'Unbekannter Teilnehmer',
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">Vorgemerkt</span>
                    {a.kursName ? <span className="text-muted-foreground"> · {a.kursName}</span> : null}
                    {a.fields.anmeldedatum ? <span className="text-muted-foreground"> · {formatDate(a.fields.anmeldedatum)}</span> : null}
                  </>
                ),
                action: {
                  label: '✓ Bestätigen',
                  onClick: () => confirmAnmeldung(a),
                },
              }))}
              onItemClick={id => overlay.replace({ type: 'anmeldung', id })}
              empty={{
                text: 'Alle Anmeldungen sind bestätigt.',
                action: {
                  label: 'Neue Anmeldung',
                  onClick: () => { setEditingAnmeldung(null); setAnmeldungDialogOpen(true); },
                },
              }}
            />
            <WorkList
              title="Nächste Kurstermine"
              icon={<IconCalendarEvent size={14} />}
              items={enrichedKurstermine
                .filter(t => t.fields.startdatum && !isBefore(parseISO(t.fields.startdatum), todayDate))
                .sort((a, b) => (a.fields.startdatum ?? '').localeCompare(b.fields.startdatum ?? ''))
                .slice(0, 5)
                .map(t => ({
                  id: t.record_id,
                  title: t.kursName || t.fields.ort || 'Kurstermin',
                  secondLine: (
                    <>
                      <span className="text-muted-foreground">{formatDate(t.fields.startdatum)}</span>
                      {t.trainerName ? <span className="text-muted-foreground"> · {t.trainerName}</span> : null}
                      {t.fields.status?.label ? (
                        <span className={`ml-1 font-medium ${
                          lookupKey(t.fields.status) === 'offen' ? 'text-primary' :
                          lookupKey(t.fields.status) === 'voll' ? 'text-amber-600' :
                          lookupKey(t.fields.status) === 'abgesagt' ? 'text-destructive' :
                          'text-muted-foreground'
                        }`}> · {t.fields.status.label}</span>
                      ) : null}
                    </>
                  ),
                  action: {
                    label: '+ Anmeldung',
                    onClick: () => {
                      setEditingAnmeldung(null);
                      setAnmeldungDialogOpen(true);
                    },
                  },
                }))}
              onItemClick={id => overlay.replace({ type: 'termin', id })}
              empty={{
                text: 'Keine anstehenden Kurstermine.',
                action: { label: 'Termin anlegen', onClick: () => { setEditingTermin(null); setNewTerminDefaults({}); setTerminDialogOpen(true); } },
              }}
            />
          </>
        }
        primary={
          <CalendarWidget
            events={calendarEvents}
            defaultView="month"
            locale={de}
            weekDays={5}
            onEventClick={ev => {
              const rid = ev.id.split(':')[1] ?? '';
              overlay.replace({ type: 'termin', id: rid });
            }}
            onEmptyClick={handleEmptyClick}
            onRangeCreate={handleRangeCreate}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
          />
        }
      />

      {/* Kurstermin detail overlay */}
      <RecordOverlay
        open={overlay.open && overlay.top?.type === 'termin'}
        onClose={overlay.close}
        onBack={overlay.canGoBack ? overlay.pop : undefined}
        onEdit={overlayTermin ? () => { setEditingTermin(overlayTermin); setTerminDialogOpen(true); overlay.close(); } : undefined}
        footer={overlayTermin ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingAnmeldung(null);
                setAnmeldungDialogOpen(true);
                overlay.close();
              }}
            >
              <IconPlus size={14} className="mr-1" />
              Anmeldung hinzufügen
            </Button>
          </div>
        ) : undefined}
      >
        {overlayTermin && (
          <>
            <RecordHeader
              title={overlayTermin.kursName || 'Kurstermin'}
              subtitle={overlayTermin.trainerName ? `Trainer: ${overlayTermin.trainerName}` : undefined}
            />
            <RecordKeyFacts
              items={[
                { label: 'Start', value: formatDateTime(overlayTermin.fields.startdatum) },
                { label: 'Ende', value: formatDateTime(overlayTermin.fields.enddatum) },
                { label: 'Ort', value: overlayTermin.fields.ort || '—' },
                { label: 'Status', value: overlayTermin.fields.status?.label || '—' },
              ]}
            />
            <RecordSection title="Details">
              <RecordField label="Anmeldefrist" value={overlayTermin.fields.anmeldefrist} format="date" />
              <RecordField label="Max. Teilnehmer (abw.)" value={overlayTermin.fields.max_teilnehmer_abweichend?.toString()} />
              {overlayTermin.fields.online_link && (
                <RecordField label="Online-Link" value={overlayTermin.fields.online_link} format="url" />
              )}
            </RecordSection>
            <RecordSection title="Anmeldungen für diesen Termin">
              {enrichedAnmeldungen
                .filter(a => {
                  const terminId = extractRecordId(a.fields.kurstermin);
                  return terminId === overlayTermin.record_id;
                })
                .map(a => (
                  <div
                    key={a.record_id}
                    className="flex items-center justify-between py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded px-1"
                    onClick={() => overlay.push({ type: 'anmeldung', id: a.record_id })}
                  >
                    <span className="text-sm font-medium">{a.teilnehmerName || '—'}</span>
                    <span className={`text-xs font-medium ${
                      lookupKey(a.fields.status) === 'angemeldet' ? 'text-primary' :
                      lookupKey(a.fields.status) === 'vorgemerkt' ? 'text-amber-600' :
                      lookupKey(a.fields.status) === 'storniert' ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}>{a.fields.status?.label || '—'}</span>
                  </div>
                ))}
              {enrichedAnmeldungen.filter(a => extractRecordId(a.fields.kurstermin) === overlayTermin.record_id).length === 0 && (
                <p className="text-sm text-muted-foreground py-2">Keine Anmeldungen vorhanden.</p>
              )}
            </RecordSection>
            <RecordAttachments appId={APP_IDS.KURSTERMINE} recordId={overlayTermin.record_id} />
          </>
        )}
      </RecordOverlay>

      {/* Anmeldung detail overlay */}
      <RecordOverlay
        open={overlay.open && overlay.top?.type === 'anmeldung'}
        onClose={overlay.close}
        onBack={overlay.canGoBack ? overlay.pop : undefined}
        onEdit={overlayAnmeldung ? () => { setEditingAnmeldung(overlayAnmeldung); setAnmeldungDialogOpen(true); overlay.close(); } : undefined}
        footer={overlayAnmeldung && lookupKey(overlayAnmeldung.fields.status) === 'vorgemerkt' ? (
          <Button size="sm" onClick={() => { confirmAnmeldung(overlayAnmeldung); overlay.close(); }}>
            ✓ Anmeldung bestätigen
          </Button>
        ) : undefined}
      >
        {overlayAnmeldung && (
          <>
            <RecordHeader
              title={overlayAnmeldung.teilnehmerName || 'Anmeldung'}
              subtitle={overlayAnmeldung.kursName || undefined}
            />
            <RecordKeyFacts
              items={[
                { label: 'Status', value: overlayAnmeldung.fields.status?.label || '—' },
                { label: 'Anmeldedatum', value: formatDateTime(overlayAnmeldung.fields.anmeldedatum) },
                { label: 'Kurs', value: overlayAnmeldung.kursName || '—' },
                { label: 'Termin', value: overlayAnmeldung.kursterminName || '—' },
              ]}
            />
            <RecordSection title="Details">
              {overlayAnmeldung.fields.bemerkung && (
                <RecordField label="Bemerkung" value={overlayAnmeldung.fields.bemerkung} format="longtext" />
              )}
            </RecordSection>
            <RecordAttachments appId={APP_IDS.ANMELDUNGEN} recordId={overlayAnmeldung.record_id} />
          </>
        )}
      </RecordOverlay>

      {/* Kurstermin create/edit dialog */}
      <KurstermineDialog
        open={terminDialogOpen}
        onClose={() => { setTerminDialogOpen(false); setEditingTermin(null); setNewTerminDefaults({}); }}
        onSubmit={async fields => {
          if (editingTermin) {
            await LivingAppsService.updateKurstermineEntry(editingTermin.record_id, fields);
          } else {
            await LivingAppsService.createKurstermineEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editingTermin ? editingTermin.fields : newTerminDefaults as Record<string, unknown>}
        recordId={editingTermin?.record_id}
        kurseList={kurse}
        trainerList={trainer}
        enablePhotoScan={AI_PHOTO_SCAN['Kurstermine']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kurstermine']}
      />

      {/* Anmeldung create/edit dialog */}
      <AnmeldungenDialog
        open={anmeldungDialogOpen}
        onClose={() => { setAnmeldungDialogOpen(false); setEditingAnmeldung(null); }}
        onSubmit={async fields => {
          if (editingAnmeldung) {
            await LivingAppsService.updateAnmeldungenEntry(editingAnmeldung.record_id, fields);
          } else {
            await LivingAppsService.createAnmeldungenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editingAnmeldung?.fields}
        recordId={editingAnmeldung?.record_id}
        kurstermineList={kurstermine}
        kurseList={kurse}
        teilnehmerList={teilnehmer}
        enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
