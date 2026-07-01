import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Kurstermine, RaeumeUndOrte, Kurse, Trainer } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { KurstermineDialog } from '@/components/dialogs/KurstermineDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Kurstermine';
import { evalComputed } from '@/config/form-enhancements/types';

export default function KurstermineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Kurstermine | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [raeumeUndOrteList, setRaeumeUndOrteList] = useState<RaeumeUndOrte[]>([]);
  const [kurseList, setKurseList] = useState<Kurse[]>([]);
  const [trainerList, setTrainerList] = useState<Trainer[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, raeumeUndOrteData, kurseData, trainerData] = await Promise.all([
        LivingAppsService.getKurstermine(),
        LivingAppsService.getRaeumeUndOrte(),
        LivingAppsService.getKurse(),
        LivingAppsService.getTrainer(),
      ]);
      setRaeumeUndOrteList(raeumeUndOrteData);
      setKurseList(kurseData);
      setTrainerList(trainerData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Kurstermine['fields']) {
    if (!record) return;
    await LivingAppsService.updateKurstermineEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteKurstermineEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/kurstermine');
  }

  function getRaeumeUndOrteDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return raeumeUndOrteList.find(r => r.record_id === refId)?.fields.raumname ?? '—';
  }

  function getKurseDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return kurseList.find(r => r.record_id === refId)?.fields.kurstitel ?? '—';
  }

  function getTrainerDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return trainerList.find(r => r.record_id === refId)?.fields.vorname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/kurstermine')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/kurstermine')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.ort ?? 'Kurstermine'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          raum: raeumeUndOrteList,
          kurs: kurseList,
          trainer: trainerList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Raum/Ort" value={getRaeumeUndOrteDisplayName(record.fields.raum)} format="text" />
        <RecordField label="Kurs" value={getKurseDisplayName(record.fields.kurs)} format="text" />
        <RecordField label="Startdatum und -uhrzeit" value={record.fields.startdatum} format="datetime" />
        <RecordField label="Enddatum und -uhrzeit" value={record.fields.enddatum} format="datetime" />
        <RecordField label="Ort (Freitext)" value={record.fields.ort} format="text" />
        <RecordField label="Online-Link" value={record.fields.online_link} format="url" />
        <RecordField label="Anmeldefrist" value={record.fields.anmeldefrist} format="date" />
        <RecordField label="Trainer" value={getTrainerDisplayName(record.fields.trainer)} format="text" />
        <RecordField label="Maximale Teilnehmerzahl (abweichend vom Kurs)" value={record.fields.max_teilnehmer_abweichend} format="text" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.KURSTERMINE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <KurstermineDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        raeumeUndOrteList={raeumeUndOrteList}
        kurseList={kurseList}
        trainerList={trainerList}
        enablePhotoScan={AI_PHOTO_SCAN['Kurstermine']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kurstermine']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Kurstermine löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
