import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { RaeumeUndOrte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { RaeumeUndOrteDialog } from '@/components/dialogs/RaeumeUndOrteDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/RaeumeUndOrte';
import { evalComputed } from '@/config/form-enhancements/types';

export default function RaeumeUndOrteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<RaeumeUndOrte | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const list = await LivingAppsService.getRaeumeUndOrte();
      setRecord(list.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: RaeumeUndOrte['fields']) {
    if (!record) return;
    await LivingAppsService.updateRaeumeUndOrteEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteRaeumeUndOrteEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/raeume-und-orte');
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/raeume-und-orte')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/raeume-und-orte')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.raumname ?? 'Räume und Orte'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
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
        <RecordField label="Name des Raums/Orts" value={record.fields.raumname} format="text" />
        <RecordField label="Straße" value={record.fields.strasse} format="text" />
        <RecordField label="Hausnummer" value={record.fields.hausnummer} format="text" />
        <RecordField label="PLZ" value={record.fields.plz} format="text" />
        <RecordField label="Stadt" value={record.fields.stadt} format="text" />
        <RecordField label="Maximale Personenzahl" value={record.fields.kapazitaet} format="text" />
        <RecordField label="Ausstattung" value={record.fields.ausstattung} format="longtext" className="md:col-span-2" />
        <RecordField label="Typ" value={record.fields.raum_typ} format="pill" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
        <RecordField label="Online-Raum" value={record.fields.online_raum} format="pill" />
        <RecordField label="Online-Link" value={record.fields.online_link} format="url" />
        <RecordField label="Bemerkung" value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.RAEUME_UND_ORTE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <RaeumeUndOrteDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['RaeumeUndOrte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['RaeumeUndOrte']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Räume und Orte löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
