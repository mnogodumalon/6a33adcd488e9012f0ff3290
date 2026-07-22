import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a33ac97f71b811034a5f224';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormKurse() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Kurse — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="kurstitel">Kurstitel *</Label>
            <Input
              id="kurstitel"
              placeholder=""
              value={fields.kurstitel ?? ''}
              onChange={e => setFields(f => ({ ...f, kurstitel: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kurzbeschreibung">Kurzbeschreibung *</Label>
            <Textarea
              id="kurzbeschreibung"
              placeholder=""
              value={fields.kurzbeschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, kurzbeschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detaillierte_beschreibung">Detaillierte Beschreibung</Label>
            <Textarea
              id="detaillierte_beschreibung"
              placeholder=""
              value={fields.detaillierte_beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, detaillierte_beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kategorie">Kategorie *</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'fachlich'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'fachlich' ? undefined : 'fachlich') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'fachlich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Fachlich
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'soft_skills'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'soft_skills' ? undefined : 'soft_skills') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'soft_skills'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Soft Skills
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'it'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'it' ? undefined : 'it') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'it'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                IT
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'sonstiges'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'sonstiges' ? undefined : 'sonstiges') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'sonstiges'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstiges
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dauer_anzahl">Dauer (Anzahl) *</Label>
            <Input
              id="dauer_anzahl"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.dauer_anzahl ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, dauer_anzahl: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dauer_einheit">Dauer (Einheit) *</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.dauer_einheit) === 'stunden'}
                onClick={() => setFields(f => ({ ...f, dauer_einheit: (lookupKey(f.dauer_einheit) === 'stunden' ? undefined : 'stunden') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.dauer_einheit) === 'stunden'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Stunden
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.dauer_einheit) === 'tage'}
                onClick={() => setFields(f => ({ ...f, dauer_einheit: (lookupKey(f.dauer_einheit) === 'tage' ? undefined : 'tage') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.dauer_einheit) === 'tage'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Tage
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zielgruppe">Zielgruppe</Label>
            <Input
              id="zielgruppe"
              placeholder=""
              value={fields.zielgruppe ?? ''}
              onChange={e => setFields(f => ({ ...f, zielgruppe: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_teilnehmer">Maximale Teilnehmerzahl *</Label>
            <Input
              id="max_teilnehmer"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.max_teilnehmer ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, max_teilnehmer: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
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
                aria-checked={lookupKey(fields.status) === 'aktiv'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'aktiv' ? undefined : 'aktiv') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'aktiv'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Aktiv
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'inaktiv'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'inaktiv' ? undefined : 'inaktiv') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'inaktiv'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Inaktiv
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'archiviert'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'archiviert' ? undefined : 'archiviert') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'archiviert'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Archiviert
              </button>
            </div>
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
