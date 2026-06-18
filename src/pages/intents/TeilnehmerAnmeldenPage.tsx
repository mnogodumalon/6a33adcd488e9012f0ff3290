import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Kurse, Teilnehmer, Kurstermine } from '@/types/app';
import {
  IconUser,
  IconBook,
  IconCalendar,
  IconMapPin,
  IconWifi,
  IconCheck,
  IconCircleCheck,
  IconArrowRight,
  IconRefresh,
  IconUsers,
  IconChevronRight,
  IconChevronLeft,
  IconClock,
} from '@tabler/icons-react';

export default function TeilnehmerAnmeldenPage() {
  const { kurse, trainer, teilnehmer, kurstermine, anmeldungen, loading, error, fetchAll } = useDashboardData();
  const [searchParams, setSearchParams] = useSearchParams();

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedTeilnehmer, setSelectedTeilnehmer] = useState<Teilnehmer | null>(null);
  const [selectedKurs, setSelectedKurs] = useState<Kurse | null>(null);
  const [selectedTermin, setSelectedTermin] = useState<Kurstermine | null>(null);
  const [bemerkung, setBemerkung] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdAnmeldungId, setCreatedAnmeldungId] = useState<string | null>(null);

  // Deep-linking: read initial state from URL params on mount
  useEffect(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    const teilnehmerId = searchParams.get('teilnehmerId');
    const kursId = searchParams.get('kursId');
    const terminId = searchParams.get('terminId');

    if (!loading) {
      if (teilnehmerId) {
        const found = teilnehmer.find(t => t.record_id === teilnehmerId);
        if (found) setSelectedTeilnehmer(found);
      }
      if (kursId) {
        const found = kurse.find(k => k.record_id === kursId);
        if (found) setSelectedKurs(found);
      }
      if (terminId) {
        const found = kurstermine.find(t => t.record_id === terminId);
        if (found) setSelectedTermin(found);
      }
      if (urlStep >= 1 && urlStep <= 4) {
        setStep(urlStep);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Sync step + selections to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (step > 1) params.set('step', String(step));
    if (selectedTeilnehmer) params.set('teilnehmerId', selectedTeilnehmer.record_id);
    if (selectedKurs) params.set('kursId', selectedKurs.record_id);
    if (selectedTermin) params.set('terminId', selectedTermin.record_id);
    setSearchParams(params, { replace: true });
  }, [step, selectedTeilnehmer, selectedKurs, selectedTermin, setSearchParams]);

  // Compute counts of Anmeldungen per Kurstermin
  const anmeldungenByTermin = useMemo(() => {
    const map = new Map<string, number>();
    anmeldungen.forEach(a => {
      const terminId = extractRecordId(a.fields.kurstermin);
      if (terminId) {
        map.set(terminId, (map.get(terminId) ?? 0) + 1);
      }
    });
    return map;
  }, [anmeldungen]);

  // Trainer map by record id for name lookup
  const trainerById = useMemo(() => {
    const m = new Map<string, string>();
    trainer.forEach(t => {
      m.set(t.record_id, `${t.fields.vorname ?? ''} ${t.fields.nachname ?? ''}`.trim());
    });
    return m;
  }, [trainer]);

  // Filter Kurstermine by selected Kurs (matching applookup URL)
  const filteredTermine = useMemo(() => {
    if (!selectedKurs) return [];
    const kursUrl = createRecordUrl(APP_IDS.KURSE, selectedKurs.record_id);
    const now = new Date();
    return kurstermine.filter(t => {
      if (t.fields.kurs !== kursUrl) return false;
      // Only future termine
      if (!t.fields.startdatum) return false;
      try {
        const start = parseISO(t.fields.startdatum);
        if (!isAfter(start, now)) return false;
      } catch {
        return false;
      }
      // Only bookable statuses
      const statusKey = t.fields.status?.key;
      if (statusKey === 'abgesagt' || statusKey === 'durchgefuehrt') return false;
      return true;
    });
  }, [kurstermine, selectedKurs]);

  // Compute free spots for a termin
  function freeSpotsForTermin(termin: Kurstermine): number {
    const max = termin.fields.max_teilnehmer_abweichend
      ?? (selectedKurs?.fields.max_teilnehmer)
      ?? 0;
    const booked = anmeldungenByTermin.get(termin.record_id) ?? 0;
    return Math.max(0, max - booked);
  }

  // Format datetime for display
  function formatDatetime(dt?: string): string {
    if (!dt) return '–';
    try {
      return format(parseISO(dt), 'dd. MMM yyyy, HH:mm', { locale: de });
    } catch {
      return dt;
    }
  }

  function formatDateOnly(dt?: string): string {
    if (!dt) return '–';
    try {
      return format(parseISO(dt), 'dd. MMM yyyy', { locale: de });
    } catch {
      return dt;
    }
  }

  // Handle step navigation
  function handleSelectTeilnehmer(id: string) {
    const found = teilnehmer.find(t => t.record_id === id);
    if (found) {
      setSelectedTeilnehmer(found);
      setStep(2);
    }
  }

  function handleSelectKurs(kurs: Kurse) {
    setSelectedKurs(kurs);
    setSelectedTermin(null);
  }

  function handleSelectTermin(termin: Kurstermine) {
    setSelectedTermin(termin);
  }

  async function handleSubmit() {
    if (!selectedTeilnehmer || !selectedKurs || !selectedTermin) return;
    setSubmitting(true);
    setSubmitError(null);

    const firstStatusKey = (LOOKUP_OPTIONS['anmeldungen']?.['status'] ?? [])[0]?.key ?? 'vorgemerkt';

    try {
      const result = await LivingAppsService.createAnmeldungenEntry({
        kurstermin: createRecordUrl(APP_IDS.KURSTERMINE, selectedTermin.record_id),
        kurs: createRecordUrl(APP_IDS.KURSE, selectedKurs.record_id),
        teilnehmer: createRecordUrl(APP_IDS.TEILNEHMER, selectedTeilnehmer.record_id),
        anmeldedatum: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        status: firstStatusKey,
        bemerkung: bemerkung || undefined,
      });
      // Extract created record id
      const newId = result?.record_id ?? (result ? Object.keys(result)[0] : null);
      setCreatedAnmeldungId(newId ?? null);
      await fetchAll();
      setStep(4);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Fehler beim Speichern der Anmeldung.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetForNextTeilnehmer() {
    setSelectedTeilnehmer(null);
    setBemerkung('');
    setSubmitError(null);
    setCreatedAnmeldungId(null);
    setStep(1);
  }

  // Count of anmeldungen for current termin (after refetch)
  const terminAnmeldungenCount = selectedTermin
    ? (anmeldungenByTermin.get(selectedTermin.record_id) ?? 0)
    : 0;

  // Sort teilnehmer: active first
  const sortedTeilnehmer = useMemo(() => {
    return [...teilnehmer].sort((a, b) => {
      const aActive = a.fields.aktiv_status?.key === 'aktiv' ? 0 : 1;
      const bActive = b.fields.aktiv_status?.key === 'aktiv' ? 0 : 1;
      return aActive - bActive;
    });
  }, [teilnehmer]);

  return (
    <IntentWizardShell
      title="Teilnehmer anmelden"
      subtitle="Melde einen Teilnehmer in 3 Schritten für einen Kurs an."
      steps={[
        { label: 'Teilnehmer' },
        { label: 'Kurs & Termin' },
        { label: 'Bestätigen' },
        { label: 'Fertig' },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ───────────── STEP 1: Teilnehmer auswählen ───────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Teilnehmer auswählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle den Teilnehmer aus, der angemeldet werden soll.
            </p>
          </div>
          <EntitySelectStep
            items={sortedTeilnehmer.map(t => ({
              id: t.record_id,
              title: `${t.fields.vorname ?? ''} ${t.fields.nachname ?? ''}`.trim() || '(Kein Name)',
              subtitle: t.fields.email ?? undefined,
              status: t.fields.aktiv_status
                ? { key: t.fields.aktiv_status.key, label: t.fields.aktiv_status.label }
                : undefined,
              stats: [
                ...(t.fields.firma_abteilung ? [{ label: 'Firma/Abt.', value: t.fields.firma_abteilung }] : []),
                ...(t.fields.rolle ? [{ label: 'Rolle', value: t.fields.rolle }] : []),
              ],
              icon: <IconUser size={20} className="text-primary" />,
            }))}
            onSelect={handleSelectTeilnehmer}
            searchPlaceholder="Teilnehmer suchen..."
            emptyIcon={<IconUser size={32} />}
            emptyText="Keine Teilnehmer gefunden."
          />
        </div>
      )}

      {/* ───────────── STEP 2: Kurs & Termin auswählen ───────────── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Context header */}
          {selectedTeilnehmer && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <IconUser size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Teilnehmer</p>
                <p className="font-semibold text-sm truncate">
                  {`${selectedTeilnehmer.fields.vorname ?? ''} ${selectedTeilnehmer.fields.nachname ?? ''}`.trim()}
                </p>
                {selectedTeilnehmer.fields.email && (
                  <p className="text-xs text-muted-foreground truncate">{selectedTeilnehmer.fields.email}</p>
                )}
              </div>
              <button
                onClick={() => { setStep(1); }}
                className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground underline"
              >
                Ändern
              </button>
            </div>
          )}

          {/* Phase A: Kurs auswählen */}
          <div>
            <h2 className="text-lg font-semibold">Kurs auswählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Klicke auf einen Kurs, um die verfügbaren Termine zu sehen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kurse.map(k => {
              const isSelected = selectedKurs?.record_id === k.record_id;
              return (
                <button
                  key={k.record_id}
                  onClick={() => handleSelectKurs(k)}
                  className={`text-left p-4 rounded-xl border transition-all overflow-hidden ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-accent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      <IconBook size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{k.fields.kurstitel ?? '(Kein Titel)'}</p>
                      {k.fields.kategorie && (
                        <p className="text-xs text-muted-foreground mt-0.5">{k.fields.kategorie.label}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {k.fields.max_teilnehmer != null && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <IconUsers size={12} />
                            Max. {k.fields.max_teilnehmer}
                          </span>
                        )}
                        {k.fields.status && (
                          <StatusBadge statusKey={k.fields.status.key} label={k.fields.status.label} />
                        )}
                      </div>
                    </div>
                    {isSelected && <IconCheck size={18} className="text-primary shrink-0 mt-0.5" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Phase B: Termine für gewählten Kurs */}
          {selectedKurs && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <p className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Termine für „{selectedKurs.fields.kurstitel}"
                </p>
                <div className="h-px flex-1 bg-border" />
              </div>

              {filteredTermine.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <IconCalendar size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Keine offenen Termine für diesen Kurs.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTermine.map(termin => {
                    const isSelected = selectedTermin?.record_id === termin.record_id;
                    const freeSpots = freeSpotsForTermin(termin);
                    const isOnline = !!termin.fields.online_link;
                    const trainerName = termin.fields.trainer
                      ? trainerById.get(extractRecordId(termin.fields.trainer) ?? '') ?? null
                      : null;

                    return (
                      <button
                        key={termin.record_id}
                        onClick={() => handleSelectTermin(termin)}
                        className={`w-full text-left p-4 rounded-xl border transition-all overflow-hidden ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                          }`}>
                            <IconCalendar size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{formatDatetime(termin.fields.startdatum)}</span>
                              {termin.fields.status && (
                                <StatusBadge statusKey={termin.fields.status.key} label={termin.fields.status.label} />
                              )}
                            </div>
                            {termin.fields.enddatum && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                bis {formatDatetime(termin.fields.enddatum)}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {isOnline ? <IconWifi size={12} /> : <IconMapPin size={12} />}
                                {isOnline ? 'Online' : (termin.fields.ort ?? '–')}
                              </span>
                              {trainerName && (
                                <span className="flex items-center gap-1">
                                  <IconUser size={12} />
                                  {trainerName}
                                </span>
                              )}
                              <span className={`flex items-center gap-1 font-medium ${
                                freeSpots === 0 ? 'text-destructive' : freeSpots <= 3 ? 'text-amber-600' : 'text-green-600'
                              }`}>
                                <IconUsers size={12} />
                                {freeSpots === 0 ? 'Voll' : `Noch ${freeSpots} Platz${freeSpots === 1 ? '' : 'plätze'} frei`}
                              </span>
                              {termin.fields.anmeldefrist && (
                                <span className="flex items-center gap-1">
                                  <IconClock size={12} />
                                  Frist: {formatDateOnly(termin.fields.anmeldefrist)}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected
                            ? <IconCheck size={18} className="text-primary shrink-0 mt-0.5" />
                            : <IconChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
                          }
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
              <IconChevronLeft size={16} />
              Zurück
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!selectedKurs || !selectedTermin}
              className="gap-1.5"
            >
              Weiter
              <IconChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ───────────── STEP 3: Anmeldung bestätigen ───────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Anmeldung bestätigen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Prüfe die Daten und schließe die Anmeldung ab.
            </p>
          </div>

          {/* Summary card */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Teilnehmer */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconUser size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Teilnehmer</p>
                  <p className="font-semibold text-sm truncate">
                    {`${selectedTeilnehmer?.fields.vorname ?? ''} ${selectedTeilnehmer?.fields.nachname ?? ''}`.trim()}
                  </p>
                  {selectedTeilnehmer?.fields.email && (
                    <p className="text-xs text-muted-foreground truncate">{selectedTeilnehmer.fields.email}</p>
                  )}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Kurs */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconBook size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Kurs</p>
                  <p className="font-semibold text-sm truncate">{selectedKurs?.fields.kurstitel ?? '–'}</p>
                  {selectedKurs?.fields.kategorie && (
                    <Badge variant="secondary" className="text-xs mt-0.5">
                      {selectedKurs.fields.kategorie.label}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Termin */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconCalendar size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Termin</p>
                  <p className="font-semibold text-sm">{formatDatetime(selectedTermin?.fields.startdatum)}</p>
                  {selectedTermin?.fields.enddatum && (
                    <p className="text-xs text-muted-foreground">
                      bis {formatDatetime(selectedTermin.fields.enddatum)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {selectedTermin && (
                      <span className="flex items-center gap-1">
                        {selectedTermin.fields.online_link
                          ? <><IconWifi size={12} /> Online</>
                          : <><IconMapPin size={12} /> {selectedTermin.fields.ort ?? '–'}</>
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bemerkung */}
          <div className="space-y-1.5">
            <Label htmlFor="bemerkung" className="text-sm font-medium">
              Bemerkung <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bemerkung"
              placeholder="Zusätzliche Hinweise zur Anmeldung..."
              value={bemerkung}
              onChange={e => setBemerkung(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5" disabled={submitting}>
              <IconChevronLeft size={16} />
              Zurück
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <IconRefresh size={16} className="animate-spin" />
                  Anmeldung wird gespeichert...
                </>
              ) : (
                <>
                  Jetzt anmelden
                  <IconArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ───────────── STEP 4: Erfolgsmeldung ───────────── */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Success hero */}
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <IconCircleCheck size={36} className="text-green-600" stroke={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Anmeldung erfolgreich!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Die Anmeldung wurde erfolgreich gespeichert.
              </p>
            </div>
          </div>

          {/* Details */}
          <Card className="overflow-hidden">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <IconUser size={16} className="text-muted-foreground shrink-0" />
                <span className="font-medium">
                  {`${selectedTeilnehmer?.fields.vorname ?? ''} ${selectedTeilnehmer?.fields.nachname ?? ''}`.trim()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <IconBook size={16} className="text-muted-foreground shrink-0" />
                <span className="truncate">{selectedKurs?.fields.kurstitel ?? '–'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <IconCalendar size={16} className="text-muted-foreground shrink-0" />
                <span>{formatDatetime(selectedTermin?.fields.startdatum)}</span>
              </div>
              {selectedTermin && (
                <div className="flex items-center gap-2 text-sm">
                  {selectedTermin.fields.online_link
                    ? <IconWifi size={16} className="text-muted-foreground shrink-0" />
                    : <IconMapPin size={16} className="text-muted-foreground shrink-0" />
                  }
                  <span className="truncate">
                    {selectedTermin.fields.online_link ? 'Online' : (selectedTermin.fields.ort ?? '–')}
                  </span>
                </div>
              )}

              <div className="h-px bg-border" />

              {/* Live counter */}
              <div className="flex items-center gap-2 text-sm">
                <IconUsers size={16} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  Anmeldungen für diesen Termin:
                </span>
                <span className="font-semibold text-primary">
                  {terminAnmeldungenCount}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleResetForNextTeilnehmer}
              className="flex-1 gap-1.5"
            >
              <IconRefresh size={16} />
              Weiteren Teilnehmer anmelden
            </Button>
            <a href="#/" className="flex-1">
              <Button variant="default" className="w-full gap-1.5">
                Zurück zum Dashboard
                <IconArrowRight size={16} />
              </Button>
            </a>
          </div>

          {createdAnmeldungId && (
            <p className="text-xs text-center text-muted-foreground">
              Anmeldungs-ID: {createdAnmeldungId}
            </p>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
