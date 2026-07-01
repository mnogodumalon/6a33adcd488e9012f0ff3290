import type { RaeumeUndOrte } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface RaeumeUndOrteViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: RaeumeUndOrte | null;
  onEdit: (record: RaeumeUndOrte) => void;
}

export function RaeumeUndOrteViewDialog({ open, onClose, record, onEdit }: RaeumeUndOrteViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Räume und Orte anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name des Raums/Orts</Label>
            <p className="text-sm">{record.fields.raumname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Straße</Label>
            <p className="text-sm">{record.fields.strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hausnummer</Label>
            <p className="text-sm">{record.fields.hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">PLZ</Label>
            <p className="text-sm">{record.fields.plz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stadt</Label>
            <p className="text-sm">{record.fields.stadt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Maximale Personenzahl</Label>
            <p className="text-sm">{record.fields.kapazitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausstattung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.ausstattung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Typ</Label>
            <Badge variant="secondary">{record.fields.raum_typ?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Online-Raum</Label>
            <Badge variant="secondary">{record.fields.online_raum?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Online-Link</Label>
            <p className="text-sm">{record.fields.online_link ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkung ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.RAEUME_UND_ORTE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}