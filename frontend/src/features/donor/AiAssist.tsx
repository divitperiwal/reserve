import { useEffect, useRef, useState } from 'react';
import { Mic, Sparkles, Square } from 'lucide-react';
import { Button, Segmented, useToast } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import type { DonationDraft } from '../../lib/types';
import s from './PostFood.module.css';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

const LANGS = [
  { value: 'en-IN', label: 'English' },
  { value: 'ta-IN', label: 'Tamil' },
  { value: 'hi-IN', label: 'Hindi' },
];
const FILLED = 'Filled in for you, check every field before posting';
const MIC_ERRORS: Record<string, string> = {
  'not-allowed': 'The microphone is blocked. Allow it in your browser settings.',
  'service-not-allowed': 'The microphone is blocked. Allow it in your browser settings.',
  'no-speech': 'Nothing was heard. Try again.',
};

function speechCtor() {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export default function AiAssist({ photoUrl, uploading, onDraft }: { photoUrl: string; uploading: boolean; onDraft: (d: DonationDraft) => void }) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [Speech] = useState(speechCtor);
  const [busy, setBusy] = useState<'photo' | 'voice' | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lang, setLang] = useState('en-IN');
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    let live = true;
    api.aiStatus().then((r) => live && setEnabled(r.enabled), () => {});
    return () => {
      live = false;
      if (rec.current) {
        rec.current.onend = null;
        rec.current.abort();
      }
    };
  }, []);

  async function draft(kind: 'photo' | 'voice', input: { photoUrl: string } | { text: string }) {
    setBusy(kind);
    try {
      onDraft(await api.aiDraft(input));
      toast(FILLED);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setEnabled(false);
      toast((e as Error).message, { error: true });
    } finally {
      setBusy(null);
    }
  }

  function listen() {
    if (!Speech) return;
    const r = new Speech();
    let text = '';
    let failure = '';
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      text = Array.from(e.results, (x) => x[0]!.transcript).join(' ').trim();
      setTranscript(text);
    };
    r.onerror = (e) => {
      failure = e.error;
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      if (failure && failure !== 'aborted') toast(MIC_ERRORS[failure] ?? 'Voice input did not work. Type it in instead.', { error: true });
      else if (text) draft('voice', { text: text.slice(0, 2000) });
      else toast('Nothing was heard. Try again.', { error: true });
    };
    rec.current = r;
    setTranscript('');
    setListening(true);
    r.start();
  }

  if (!enabled) return null;
  const showPhoto = !!photoUrl && !uploading;
  if (!showPhoto && !Speech) return null;
  return (
    <div className={s.ai}>
      <div className={s.aiRow}>
        {showPhoto && (
          <Button variant="secondary" size="sm" icon={<Sparkles size={16} strokeWidth={1.75} aria-hidden />} loading={busy === 'photo'} disabled={busy !== null || listening} onClick={() => draft('photo', { photoUrl })}>
            Fill from photo
          </Button>
        )}
        {Speech &&
          (listening ? (
            <Button variant="dark" size="sm" icon={<Square size={14} strokeWidth={2} aria-hidden />} onClick={() => rec.current?.stop()}>
              Done
            </Button>
          ) : (
            <Button variant="secondary" size="sm" icon={<Mic size={16} strokeWidth={1.75} aria-hidden />} loading={busy === 'voice'} disabled={busy !== null} onClick={listen}>
              Describe it
            </Button>
          ))}
      </div>
      {Speech && !listening && busy !== 'voice' && <Segmented label="Speaking language" value={lang} onChange={setLang} options={LANGS} />}
      {(listening || busy === 'voice') && (
        <p className={s.transcript} aria-live="polite">
          {transcript || 'Listening. Say what the food is, how much, and when it can be picked up.'}
        </p>
      )}
    </div>
  );
}
