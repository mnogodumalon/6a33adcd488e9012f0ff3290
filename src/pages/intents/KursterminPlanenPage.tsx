import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Kurse, Trainer, Kurstermine } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  IconCalendarPlus,
  IconUser,
  IconCheck,
  IconBook,
  IconMapPin,
  IconLink,
  IconClock,
  IconAlertCircle,
  IconArrowRight,
  IconRefresh,
} from '@tabler/icons-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { dateFnsLocale, tx } from '@/i18n';

interface TerminFormState {
  startdatum: string;
  enddatum: string;
  anmeldefrist: string;
  ort: string;
  online_link: string;
  max_teilnehmer_abweichend: string;
}

export default function KursterminPlanenPage() {
  const WIZARD_STEPS = [
  { label: tx('Kurs') },
  { label: tx('Termin') },
  { label: tx('Trainer') },
  { label: tx('Fertig') },
];

  const [searchParams] = useSearchParams();

  // Derive initial step from URL
  const urlStep = parseInt(searchParams.get('step') ?? '1', 10);
  const initialStep = urlStep >= 1 && urlStep <= 4 ? urlStep : 1;

  const [step, setStep] = useState(initialStep);
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [trainer, setTrainer] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [selectedKurs, setSelectedKurs] = useState<Kurse | null>(null);
  const [createdTermin, setCreatedTermin] = useState<Kurstermine | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

  const [terminForm, setTerminForm] = useState<TerminFormState>({
    startdatum: '',
    enddatum: '',
    anmeldefrist: '',
    ort: '',
    online_link: '',
    max_teilnehmer_abweichend: '',
  });
  const [terminError, setTerminError] = useState<string | null>(null);
  const [terminSaving, setTerminSaving] = useState(false);
  const [trainerSaving, setTrainerSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kurseData, trainerData] = await Promise.all([
        LivingAppsService.getKurse(),
        LivingAppsService.getTrainer(),
      ]);
      setKurse(kurseData);
      setTrainer(trainerData);

      // If kursId in URL, pre-select the course
      const kursId = searchParams.get('kursId');
      if (kursId) {
        const found = kurseData.find(k => k.record_id === kursId);
        if (found) {
          setSelectedKurs(found);
          if (step === 1) setStep(2);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(tx('Fehler beim Laden der Daten')));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Compute duration in hours from form
  const durationHours = (() => {
    if (!terminForm.startdatum || !terminForm.enddatum) return null;
    try {
      const start = new Date(terminForm.startdatum);
      const end = new Date(terminForm.enddatum);
      const mins = differenceInMinutes(end, start);
      if (mins <= 0) return null;
      return (mins / 60).toFixed(1);
    } catch {
      return null;
    }
  })();

  const handleKursSelect = (id: string) => {
    const found = kurse.find(k => k.record_id === id);
    if (found) {
      setSelectedKurs(found);
      setStep(2);
    }
  };

  const handleTerminSubmit = async () => {
    if (!selectedKurs) return;
    if (!terminForm.startdatum || !terminForm.enddatum || !terminForm.anmeldefrist) {
      setTerminError(tx('Bitte fülle alle Pflichtfelder aus.'));
      return;
    }

    const start = new Date(terminForm.startdatum);
    const end = new Date(terminForm.enddatum);
    if (end <= start) {
      setTerminError(tx('Das Enddatum muss nach dem Startdatum liegen.'));
      return;
    }

    setTerminError(null);
    setTerminSaving(true);

    // Determine initial status: first valid key from LOOKUP_OPTIONS
    const statusOptions = LOOKUP_OPTIONS['kurstermine']?.['status'] ?? [];
    const initialStatus = statusOptions[0]?.key ?? 'geplant';

    // Format dates: datetimeminute = 'YYYY-MM-DDTHH:MM' (no seconds)
    const formatDatetimeMinute = (dateStr: string): string => {
      const d = new Date(dateStr);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    try {
      const fields: Record<string, unknown> = {
        kurs: createRecordUrl(APP_IDS.KURSE, selectedKurs.record_id),
        startdatum: formatDatetimeMinute(terminForm.startdatum),
        enddatum: formatDatetimeMinute(terminForm.enddatum),
        anmeldefrist: terminForm.anmeldefrist,
        status: initialStatus,
      };

      if (terminForm.ort.trim()) fields.ort = terminForm.ort.trim();
      if (terminForm.online_link.trim()) fields.online_link = terminForm.online_link.trim();
      if (terminForm.max_teilnehmer_abweichend.trim()) {
        const n = parseInt(terminForm.max_teilnehmer_abweichend, 10);
        if (!isNaN(n)) fields.max_teilnehmer_abweichend = n;
      }

      const response = await LivingAppsService.createKurstermineEntry(fields as Parameters<typeof LivingAppsService.createKurstermineEntry>[0]);

      // Build a local Kurstermine record from what we submitted
      const newTermin: Kurstermine = {
        record_id: (response as { record_id?: string })?.record_id ?? '',
        created_at: new Date().toISOString(),
        updated_at: null,
        createdat: new Date().toISOString(),
        updatedat: null,
        fields: {
          kurs: createRecordUrl(APP_IDS.KURSE, selectedKurs.record_id),
          startdatum: formatDatetimeMinute(terminForm.startdatum),
          enddatum: formatDatetimeMinute(terminForm.enddatum),
          anmeldefrist: terminForm.anmeldefrist,
          ort: terminForm.ort.trim() || undefined,
          online_link: terminForm.online_link.trim() || undefined,
          max_teilnehmer_abweichend: terminForm.max_teilnehmer_abweichend.trim()
            ? parseInt(terminForm.max_teilnehmer_abweichend, 10)
            : undefined,
          status: { key: initialStatus, label: statusOptions[0]?.label ?? initialStatus },
        },
      };

      setCreatedTermin(newTermin);
      setStep(3);
    } catch (err) {
      setTerminError(err instanceof Error ? err.message : tx('Fehler beim Speichern des Termins'));
    } finally {
      setTerminSaving(false);
    }
  };

  const handleTrainerSelect = async (trainerId: string) => {
    if (!createdTermin?.record_id) {
      setStep(4);
      return;
    }
    const found = trainer.find(t => t.record_id === trainerId);
    setTrainerSaving(true);
    try {
      await LivingAppsService.updateKurstermineEntry(createdTermin.record_id, {
        trainer: createRecordUrl(APP_IDS.TRAINER, trainerId),
      });
      setSelectedTrainer(found ?? null);

      // Update local state
      setCreatedTermin(prev => prev
        ? { ...prev, fields: { ...prev.fields, trainer: createRecordUrl(APP_IDS.TRAINER, trainerId) } }
        : prev
      );
      setStep(4);
    } catch {
      // Even on error, proceed to summary
      setSelectedTrainer(found ?? null);
      setStep(4);
    } finally {
      setTrainerSaving(false);
    }
  };

  const handleSkipTrainer = () => {
    setStep(4);
  };

  const handleReset = () => {
    setSelectedKurs(null);
    setCreatedTermin(null);
    setSelectedTrainer(null);
    setTerminForm({
      startdatum: '',
      enddatum: '',
      anmeldefrist: '',
      ort: '',
      online_link: '',
      max_teilnehmer_abweichend: '',
    });
    setTerminError(null);
    setStep(1);
  };

  const formatDisplayDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd. MMM yyyy, HH:mm', { locale: dateFnsLocale() });
    } catch {
      return dateStr;
    }
  };

  const formatDisplayDateShort = (dateStr: string | undefined): string => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd.MM.yyyy', { locale: dateFnsLocale() });
    } catch {
      return dateStr;
    }
  };

  return (
    <IntentWizardShell
      title={tx('Kurstermin planen')}
      subtitle={tx('Lege einen neuen Termin für einen Kurs an und weise einen Trainer zu.')}
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Kurs auswählen */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{tx('Kurs auswählen')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {tx('Wähle den Kurs aus, für den du einen Termin anlegen möchtest.')}
            </p>
          </div>
          <EntitySelectStep
            items={kurse.map(k => ({
              id: k.record_id,
              title: k.fields.kurstitel ?? tx('(Kein Titel)'),
              subtitle: [k.fields.kategorie?.label, k.fields.status?.label]
                .filter(Boolean)
                .join(' · '),
              status: k.fields.status
                ? { key: k.fields.status.key, label: k.fields.status.label }
                : undefined,
              stats: [
                { label: tx('Max. Teilnehmer'), value: k.fields.max_teilnehmer ?? '—' },
              ],
              icon: <IconBook size={20} className="text-primary" />,
            }))}
            onSelect={handleKursSelect}
            searchPlaceholder={tx('Kurs suchen...')}
            emptyIcon={<IconBook size={40} />}
            emptyText={tx('Keine Kurse gefunden.')}
          />
        </div>
      )}

      {/* Step 2: Termin anlegen */}
      {step === 2 && selectedKurs && (
        <div className="space-y-5">
          {/* Context: selected course */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconBook size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{tx('Ausgewählter Kurs')}</p>
              <p className="font-semibold text-sm truncate">{selectedKurs.fields.kurstitel}</p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground shrink-0 underline"
            >
              {tx('Ändern')}
            </button>
          </div>

          <div>
            <h2 className="text-lg font-semibold">{tx('Termindaten eingeben')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {tx('Lege Datum, Uhrzeit und Ort für den Kurstermin fest.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Startdatum */}
            <div className="space-y-1.5">
              <Label htmlFor="startdatum">
                {tx('Startdatum & Uhrzeit')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startdatum"
                type="datetime-local"
                value={terminForm.startdatum}
                onChange={e => setTerminForm(f => ({ ...f, startdatum: e.target.value }))}
              />
            </div>

            {/* Enddatum */}
            <div className="space-y-1.5">
              <Label htmlFor="enddatum">
                {tx('Enddatum & Uhrzeit')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="enddatum"
                type="datetime-local"
                value={terminForm.enddatum}
                onChange={e => setTerminForm(f => ({ ...f, enddatum: e.target.value }))}
              />
            </div>

            {/* Anmeldefrist */}
            <div className="space-y-1.5">
              <Label htmlFor="anmeldefrist">
                {tx('Anmeldefrist')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="anmeldefrist"
                type="date"
                value={terminForm.anmeldefrist}
                onChange={e => setTerminForm(f => ({ ...f, anmeldefrist: e.target.value }))}
              />
            </div>

            {/* Ort */}
            <div className="space-y-1.5">
              <Label htmlFor="ort">{tx('Veranstaltungsort')}</Label>
              <Input
                id="ort"
                type="text"
                placeholder={tx('z.B. Berlin, Raum 101')}
                value={terminForm.ort}
                onChange={e => setTerminForm(f => ({ ...f, ort: e.target.value }))}
              />
            </div>

            {/* Online-Link */}
            <div className="space-y-1.5">
              <Label htmlFor="online_link">{tx('Online-Link (optional)')}</Label>
              <Input
                id="online_link"
                type="url"
                placeholder={tx('https://...')}
                value={terminForm.online_link}
                onChange={e => setTerminForm(f => ({ ...f, online_link: e.target.value }))}
              />
            </div>

            {/* Abweichende Teilnehmeranzahl */}
            <div className="space-y-1.5">
              <Label htmlFor="max_teilnehmer_abweichend">
                {tx('Abweichende Teilnehmeranzahl (optional)')}
              </Label>
              <Input
                id="max_teilnehmer_abweichend"
                type="number"
                min={1}
                placeholder={selectedKurs.fields.max_teilnehmer
                  ? tx`Standard: ${selectedKurs.fields.max_teilnehmer}`
                  : tx('Anzahl eingeben')}
                value={terminForm.max_teilnehmer_abweichend}
                onChange={e => setTerminForm(f => ({ ...f, max_teilnehmer_abweichend: e.target.value }))}
              />
            </div>
          </div>

          {/* Live preview: duration */}
          {durationHours && (
            <Card className="overflow-hidden border-primary/20 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <IconClock size={16} className="shrink-0" />
                  <span>{tx('Dauer:')} <strong>{durationHours} {tx('Stunden')}</strong></span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {terminError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{terminError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Zurück')}
            </Button>
            <Button
              onClick={handleTerminSubmit}
              disabled={terminSaving}
              className="flex-1 sm:flex-none gap-2"
            >
              {terminSaving ? (
                <>
                  <IconRefresh size={16} className="animate-spin" />
                  {tx('Wird gespeichert...')}
                </>
              ) : (
                <>
                  {tx('Termin anlegen')}
                  <IconArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Trainer zuweisen */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Context summary */}
          {selectedKurs && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconCalendarPlus size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{tx('Termin für')}</p>
                <p className="font-semibold text-sm truncate">{selectedKurs.fields.kurstitel}</p>
                {createdTermin?.fields.startdatum && (
                  <p className="text-xs text-muted-foreground">
                    {formatDisplayDate(createdTermin.fields.startdatum)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold">{tx('Trainer zuweisen')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {tx('Wähle einen Trainer für diesen Termin aus. Du kannst diesen Schritt auch überspringen.')}
            </p>
          </div>

          {trainer.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <IconUser size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{tx('Keine Trainer gefunden.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trainer.map(t => (
                <button
                  key={t.record_id}
                  onClick={() => handleTrainerSelect(t.record_id)}
                  disabled={trainerSaving}
                  className="text-left p-4 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-colors overflow-hidden group disabled:opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <IconUser size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {[t.fields.vorname, t.fields.nachname].filter(Boolean).join(' ') || tx('(Kein Name)')}
                      </p>
                      {t.fields.trainer_typ && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {t.fields.trainer_typ.label}
                        </Badge>
                      )}
                      {t.fields.fachgebiete && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {t.fields.fachgebiete}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={handleSkipTrainer} disabled={trainerSaving}>
              {tx('Überspringen')}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Zusammenfassung */}
      {step === 4 && createdTermin && (
        <div className="space-y-5">
          {/* Success indicator */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <IconCheck size={20} className="text-green-700" stroke={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{tx('Kurstermin erfolgreich angelegt!')}</h2>
              <p className="text-sm text-muted-foreground">{tx('Hier ist eine Übersicht des neuen Termins.')}</p>
            </div>
          </div>

          {/* Summary card */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{tx('Termindaten')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Kurs */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <IconBook size={15} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tx('Kurs')}</p>
                  <p className="text-sm font-medium truncate">
                    {selectedKurs?.fields.kurstitel ?? '—'}
                  </p>
                  {selectedKurs?.fields.kategorie && (
                    <p className="text-xs text-muted-foreground">{selectedKurs.fields.kategorie.label}</p>
                  )}
                </div>
              </div>

              <div className="border-t" />

              {/* Datum */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <IconCalendarPlus size={15} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tx('Datum')}</p>
                  <p className="text-sm font-medium">
                    {formatDisplayDate(createdTermin.fields.startdatum)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx('bis')} {formatDisplayDate(createdTermin.fields.enddatum)}
                  </p>
                  {durationHours && (
                    <p className="text-xs text-muted-foreground">{tx('Dauer:')} {durationHours} {tx('Stunden')}</p>
                  )}
                </div>
              </div>

              <div className="border-t" />

              {/* Anmeldefrist */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <IconClock size={15} className="text-amber-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tx('Anmeldefrist')}</p>
                  <p className="text-sm font-medium">
                    {formatDisplayDateShort(createdTermin.fields.anmeldefrist)}
                  </p>
                </div>
              </div>

              {/* Ort */}
              {(createdTermin.fields.ort || createdTermin.fields.online_link) && (
                <>
                  <div className="border-t" />
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      {createdTermin.fields.ort
                        ? <IconMapPin size={15} className="text-primary" />
                        : <IconLink size={15} className="text-primary" />
                      }
                    </div>
                    <div className="min-w-0">
                      {createdTermin.fields.ort && (
                        <>
                          <p className="text-xs text-muted-foreground">{tx('Veranstaltungsort')}</p>
                          <p className="text-sm font-medium truncate">{createdTermin.fields.ort}</p>
                        </>
                      )}
                      {createdTermin.fields.online_link && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {createdTermin.fields.online_link}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="border-t" />

              {/* Trainer */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <IconUser size={15} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tx('Trainer')}</p>
                  {selectedTrainer ? (
                    <p className="text-sm font-medium truncate">
                      {[selectedTrainer.fields.vorname, selectedTrainer.fields.nachname]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{tx('Noch nicht zugewiesen')}</p>
                  )}
                </div>
              </div>

              <div className="border-t" />

              {/* Teilnehmer + Status */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">{tx('Max. Teilnehmer')}</p>
                  <p className="text-sm font-medium">
                    {createdTermin.fields.max_teilnehmer_abweichend
                      ?? selectedKurs?.fields.max_teilnehmer
                      ?? '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">{tx('Status')}</p>
                  <StatusBadge
                    statusKey={createdTermin.fields.status?.key}
                    label={createdTermin.fields.status?.label}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <IconCalendarPlus size={16} />
              {tx('Weiteren Termin planen')}
            </Button>
            <a href="#/" className="flex-1 sm:flex-none">
              <Button variant="ghost" className="w-full">
                {tx('Zurück zum Dashboard')}
              </Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
