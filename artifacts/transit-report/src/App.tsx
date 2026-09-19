import { type ChangeEvent, type FormEvent, type ReactNode, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  Activity, AlertCircle, ArrowRight, BadgeCheck, BusFront, CalendarDays, Check,
  ChevronDown, Clock3, FileText, Filter, ImagePlus, Info, Landmark, Loader2,
  MapPin, MessageSquare, Mic, Paperclip, RefreshCw, Search, Send, ShieldCheck,
  TicketCheck, UploadCloud, UserRound, X, Zap,
} from 'lucide-react';
import {
  getGetRecentReportActivityQueryKey, getGetReportQueryKey, getGetReportStatsQueryKey,
  getListReportsQueryKey, ReportCategory, ReportStatus, useCreateReport,
  useGetRecentReportActivity, useGetReport, useGetReportStats, useListReports,
  useUpdateReportStatus,
} from '@workspace/api-client-react';
import type { ReportAttachment, TransitReport } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const categories = [
  ['safety', 'Safety concern'], ['accessibility', 'Accessibility'], ['delay', 'Delay or service'],
  ['cleanliness', 'Cleanliness'], ['vehicle', 'Vehicle condition'], ['staff', 'Staff interaction'], ['other', 'Something else'],
] as const;
const statuses = [
  ['submitted', 'New'], ['reviewing', 'Reviewing'], ['assigned', 'Assigned'], ['resolved', 'Resolved'],
] as const;

type VoiceResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type VoiceRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: VoiceResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type VoiceRecognitionConstructor = new () => VoiceRecognition;
type VoiceWindow = Window & {
  SpeechRecognition?: VoiceRecognitionConstructor;
  webkitSpeechRecognition?: VoiceRecognitionConstructor;
};

function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="focus-ring flex items-center gap-3" data-testid="link-home">
    <span className="relative grid h-10 w-10 place-items-center rounded-[13px] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-[4px_4px_0_hsl(206_43%_17%)]">
      <BusFront size={22} strokeWidth={2.5} />
      <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[hsl(var(--sidebar))] bg-[hsl(168_52%_38%)]" />
    </span>
    {!compact && <span className="font-[var(--app-font-sans)] text-[1.08rem] font-bold tracking-[-.035em]">Transit<span className="text-[hsl(var(--accent))]">Report</span></span>}
  </Link>;
}

function StatusPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; cls: string }> = {
    submitted: { label: 'New', cls: 'bg-[hsl(42_82%_57%/.17)] text-[hsl(30_68%_31%)]' },
    reviewing: { label: 'Reviewing', cls: 'bg-[hsl(206_45%_73%/.28)] text-[hsl(206_43%_24%)]' },
    assigned: { label: 'Assigned', cls: 'bg-[hsl(16_81%_56%/.15)] text-[hsl(16_70%_39%)]' },
    resolved: { label: 'Resolved', cls: 'bg-[hsl(168_52%_38%/.16)] text-[hsl(171_41%_22%)]' },
  };
  const item = meta[status] ?? meta.submitted;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.08em] ${item.cls}`} data-testid={`status-${status}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />{item.label}
  </span>;
}

function Shell({ children, staff = false }: { children: ReactNode; staff?: boolean }) {
  const [location] = useLocation();
  return <div className="noise min-h-[100dvh] bg-[hsl(var(--background))]">
    <header className={`${staff ? 'bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]' : 'bg-[hsl(var(--card))]'} border-b border-[hsl(var(--border))]`}>
      <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <Logo />
        <div className="flex items-center gap-4">
          {staff ? <span className="hidden items-center gap-2 rounded-full border border-[hsl(var(--sidebar-border))] px-3 py-1.5 text-xs text-[hsl(var(--sidebar-foreground)/.72)] sm:flex"><Landmark size={14} /> Department workspace</span> : <span className="hidden items-center gap-2 text-xs font-medium text-[hsl(var(--muted-foreground))] sm:flex"><ShieldCheck size={15} className="text-[hsl(var(--chart-2))]" /> Your report helps improve the ride</span>}
          <Link href={staff ? '/' : '/staff'} className={`${staff ? 'border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'} focus-ring rounded-full border px-3 py-2 text-xs font-bold transition-colors`} data-testid={staff ? 'link-rider-view' : 'link-staff-view'}>
            {staff ? 'Rider view' : 'Staff sign in'}
          </Link>
        </div>
      </div>
    </header>
    <main>{children}</main>
    {location === '/' && <footer className="mx-auto flex max-w-[1240px] items-center justify-between border-t border-[hsl(var(--border))] px-5 py-8 text-xs text-[hsl(var(--muted-foreground))] lg:px-8"><span className="font-mono">TRANSIT / REPORT / 01</span><span>Built for the moments that should not be ignored.</span></footer>}
  </div>;
}

function Field({ label, hint, children, required = false }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return <label className="block space-y-2"><span className="flex items-baseline justify-between text-sm font-bold text-[hsl(var(--foreground))]"><span>{label}{required && <b className="ml-1 text-[hsl(var(--accent))]">*</b>}</span>{hint && <small className="font-normal text-[hsl(var(--muted-foreground))]">{hint}</small>}</span>{children}</label>;
}

const inputClass = 'focus-ring w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition-[border,box-shadow] placeholder:text-[hsl(var(--muted-foreground)/.75)] focus:border-[hsl(var(--accent))]';

function RiderHome() {
  const createReport = useCreateReport();
  const [sent, setSent] = useState<TransitReport | null>(null);
  const [files, setFiles] = useState<ReportAttachment[]>([]);
  const [form, setForm] = useState({ title: '', description: '', category: '', route: '', location: '', happenedAt: '', reporterName: '', reporterContact: '' });
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const voiceRef = useRef<VoiceRecognition | null>(null);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const toggleVoiceTranscription = () => {
    if (isListening) {
      voiceRef.current?.stop();
      setIsListening(false);
      return;
    }
    const voiceWindow = window as VoiceWindow;
    const Recognition = voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError('Voice transcription is not available in this browser. You can still type or attach an audio recording.');
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length - event.resultIndex },
        (_, index) => event.results[event.resultIndex + index]?.[0]?.transcript ?? '',
      ).join(' ').trim();
      if (transcript) {
        setForm((current) => ({
          ...current,
          description: `${current.description}${current.description ? ' ' : ''}${transcript}`.slice(0, 500),
        }));
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setError('We could not hear that. Please check microphone access and try again.');
    };
    recognition.onend = () => setIsListening(false);
    voiceRef.current = recognition;
    setError('');
    setIsListening(true);
    recognition.start();
  };
  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []).slice(0, 3);
    const loaded = await Promise.all(selected.map(file => new Promise<ReportAttachment>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: `${file.name}-${file.lastModified}`, kind: file.type.startsWith('audio') ? 'audio' : 'image', name: file.name, mimeType: file.type, dataUrl: String(reader.result) });
      reader.onerror = () => reject(new Error('Could not read attachment'));
      reader.readAsDataURL(file);
    })));
    setFiles(loaded);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!form.title || form.title.length < 3 || !form.description || form.description.length < 10 || !form.category || !form.route || !form.location || !form.happenedAt || form.reporterName.length < 2) {
      setError('Please fill in the required fields so the department has enough to act.'); return;
    }
    createReport.mutate({ data: { ...form, category: form.category as typeof ReportCategory[keyof typeof ReportCategory], reporterContact: form.reporterContact || null, attachments: files } }, {
      onSuccess: (report) => { setSent(report); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      onError: () => setError('We could not send that just now. Please try again.'),
    });
  };
  if (sent) return <Shell><div className="civic-grid mx-auto min-h-[calc(100dvh-76px)] max-w-[1240px] px-5 py-14 lg:px-8 lg:py-20"><div className="mx-auto max-w-2xl animate-rise">
    <div className="relative overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[0_20px_60px_hsl(206_43%_17%/.09)] sm:p-12">
      <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[80px] bg-[hsl(168_31%_91%)]" />
      <div className="relative"><div className="mb-7 grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(var(--chart-2))] text-[hsl(var(--card))] shadow-[5px_5px_0_hsl(206_43%_17%)]"><Check size={32} strokeWidth={3} /></div>
        <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--chart-2))]">In the right hands</p>
        <h1 className="max-w-lg font-[var(--app-font-sans)] text-4xl font-bold tracking-[-.055em] text-[hsl(var(--foreground))] sm:text-5xl">Thanks for speaking up.</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">Your report is now with the transit team. It has a reference number, a timestamp, and a person who can start the next step.</p>
        <div className="my-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[hsl(var(--muted))] p-4"><span className="text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Reference</span><span className="font-mono text-lg font-bold text-[hsl(var(--foreground))]" data-testid="text-reference">{sent.reference}</span></div>
        <div className="flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => { setSent(null); setForm({ title: '', description: '', category: '', route: '', location: '', happenedAt: '', reporterName: '', reporterContact: '' }); setFiles([]); }} className="focus-ring flex-1 rounded-xl border border-[hsl(var(--border))] px-5 py-3.5 text-sm font-bold transition-colors hover:bg-[hsl(var(--muted))]" data-testid="button-new-report">Send another report</button><Link href="/staff" className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5" data-testid="link-report-status">View report desk <ArrowRight size={16} /></Link></div>
      </div>
    </div>
  </div></div></Shell>;
  return <Shell><div className="mx-auto max-w-[1240px] px-5 pb-16 pt-10 lg:px-8 lg:pb-24 lg:pt-16">
    <section className="grid items-end gap-9 lg:grid-cols-[1fr_390px]">
      <div className="animate-rise"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.13em] text-[hsl(var(--chart-2))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" /> Open to every rider</div>
        <h1 className="max-w-3xl font-[var(--app-font-sans)] text-[clamp(3.25rem,8vw,7.1rem)] font-bold leading-[.9] tracking-[-.075em] text-[hsl(var(--foreground))]">Tell us what happened.<span className="text-[hsl(var(--accent))]"> We’ll help.</span></h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">A broken lift, a dangerous platform, a bus that never arrived — give the transit team a clear signal and a chance to make the next ride better.</p>
      </div>
      <div className="animate-rise animate-rise-delay-1 relative hidden min-h-[230px] overflow-hidden rounded-[28px] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] lg:block"><div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border-[22px] border-[hsl(var(--accent))]" /><div className="absolute bottom-0 right-10 h-24 w-1 bg-[hsl(var(--primary-foreground)/.18)]" /><div className="absolute bottom-0 right-20 h-36 w-1 bg-[hsl(var(--primary-foreground)/.18)]" /><span className="relative font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary-foreground)/.64)]">Your message matters</span><p className="relative mt-16 max-w-[210px] text-2xl font-bold leading-7 tracking-[-.04em]">Good transit is built one honest report at a time.</p></div>
    </section>
    <div className="my-14 flex items-center gap-4"><div className="animate-line h-px flex-1 bg-[hsl(var(--border))]" /><span className="font-mono text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">01 / Report a moment</span><div className="h-px w-12 bg-[hsl(var(--accent))]" /></div>
    <form onSubmit={submit} className="grid gap-7 lg:grid-cols-[1fr_310px]">
      <div className="space-y-7">
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_10px_30px_hsl(206_43%_17%/.04)] sm:p-8 animate-rise animate-rise-delay-1">
          <div className="mb-7 flex items-start justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]">The basics</p><h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">What should we know?</h2></div><FileText className="text-[hsl(var(--muted-foreground)/.45)]" size={22} /></div>
          <div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Give it a short title" hint="3+ characters" required><input className={inputClass} value={form.title} onChange={e => update('title', e.target.value)} placeholder="The lift at Central is out" data-testid="input-title" /></Field></div>
            <Field label="What kind of issue?" required><select className={inputClass} value={form.category} onChange={e => update('category', e.target.value)} data-testid="select-category"><option value="">Choose one</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Route or line" hint="If known"><input className={inputClass} value={form.route} onChange={e => update('route', e.target.value)} placeholder="Route 14, Green line..." data-testid="input-route" /></Field>
            <Field label="Where did this happen?" required><div className="relative"><MapPin size={17} className="absolute left-4 top-3.5 text-[hsl(var(--muted-foreground))]" /><input className={`${inputClass} pl-11`} value={form.location} onChange={e => update('location', e.target.value)} placeholder="Stop, station, or street" data-testid="input-location" /></div></Field>
            <Field label="When did it happen?" required><div className="relative"><CalendarDays size={17} className="absolute left-4 top-3.5 text-[hsl(var(--muted-foreground))]" /><input type="datetime-local" className={`${inputClass} pl-11`} value={form.happenedAt} onChange={e => update('happenedAt', e.target.value)} data-testid="input-happened-at" /></div></Field>
            <div className="sm:col-span-2"><Field label="Tell us what you saw" hint={`${form.description.length}/500`} required><div className="relative"><textarea className={`${inputClass} min-h-[145px] resize-y leading-6 pr-14`} maxLength={500} value={form.description} onChange={e => update('description', e.target.value)} placeholder="A few clear details help the right person act: what happened, what was affected, and what you needed." data-testid="textarea-description" /><button type="button" onClick={toggleVoiceTranscription} className={`focus-ring absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-xl transition-colors ${isListening ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'}`} aria-label={isListening ? 'Stop voice transcription' : 'Start voice transcription'} title={isListening ? 'Stop listening' : 'Speak to add text'} data-testid="button-voice-transcription"><Mic size={17} className={isListening ? 'animate-pulse' : ''} /></button></div><p className="mt-2 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]"><Mic size={12} /> {isListening ? 'Listening — speak naturally, then tap the microphone to stop.' : 'Prefer to speak? Tap the microphone and your words will be added here.'}</p></Field></div>
          </div>
        </div>
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_10px_30px_hsl(206_43%_17%/.04)] sm:p-8 animate-rise animate-rise-delay-2">
          <div className="mb-7 flex items-start justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]">Useful context</p><h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">Add a photo or recording</h2></div><Paperclip className="text-[hsl(var(--muted-foreground)/.45)]" size={22} /></div>
          <label className="focus-ring flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--input))] bg-[hsl(var(--muted)/.55)] px-5 py-8 text-center transition-colors hover:border-[hsl(var(--accent))] hover:bg-[hsl(var(--muted))]"><UploadCloud size={26} className="mb-3 text-[hsl(var(--accent))]" /><span className="text-sm font-bold">Choose up to 3 files</span><span className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Images or audio, 10 MB each</span><input type="file" accept="image/*,audio/*" multiple className="sr-only" onChange={onFiles} data-testid="input-attachments" /></label>
          {files.length > 0 && <div className="mt-4 space-y-2">{files.map(file => <div className="flex items-center justify-between rounded-xl bg-[hsl(var(--muted))] px-3 py-2 text-sm" key={file.id} data-testid={`text-attachment-${file.id}`}><span className="flex items-center gap-2 truncate"><ImagePlus size={15} className="text-[hsl(var(--chart-2))]" />{file.name}</span><button type="button" onClick={() => setFiles(files.filter(item => item.id !== file.id))} className="focus-ring rounded-full p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" data-testid={`button-remove-attachment-${file.id}`}><X size={15} /></button></div>)}</div>}
        </div>
      </div>
      <aside className="space-y-5 animate-rise animate-rise-delay-2"><div className="rounded-[24px] bg-[hsl(var(--secondary))] p-6"><div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--card))] text-[hsl(var(--chart-2))]"><ShieldCheck size={19} /></div><h3 className="text-lg font-bold tracking-[-.03em]">A little about you</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--secondary-foreground)/.75)]">We ask for your name so the team can understand the report. Contact details are optional and never shown publicly.</p><div className="mt-5 space-y-5"><Field label="Your name" required><div className="relative"><UserRound size={16} className="absolute left-4 top-3.5 text-[hsl(var(--muted-foreground))]" /><input className={`${inputClass} border-[hsl(var(--secondary-border))] pl-10`} value={form.reporterName} onChange={e => update('reporterName', e.target.value)} placeholder="First and last name" data-testid="input-reporter-name" /></div></Field><Field label="Email or phone" hint="Optional"><input className={`${inputClass} border-[hsl(var(--secondary-border))]`} value={form.reporterContact} onChange={e => update('reporterContact', e.target.value)} placeholder="How can we follow up?" data-testid="input-reporter-contact" /></Field></div></div>
        {error && <div className="flex gap-3 rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-4 text-sm leading-5 text-[hsl(var(--destructive))]" role="alert" data-testid="status-form-error"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
        <button type="submit" disabled={createReport.isPending} className="focus-ring group flex w-full items-center justify-between rounded-2xl bg-[hsl(var(--primary))] px-5 py-4 text-left text-[hsl(var(--primary-foreground))] shadow-[5px_5px_0_hsl(var(--accent))] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70" data-testid="button-submit-report"><span><span className="block text-sm font-bold">{createReport.isPending ? 'Sending your report...' : 'Send report'}</span><span className="mt-0.5 block text-xs text-[hsl(var(--primary-foreground)/.65)]">You’ll get a reference number right away</span></span>{createReport.isPending ? <Loader2 className="animate-spin" size={22} /> : <Send className="transition-transform group-hover:translate-x-1" size={21} />}</button>
        <p className="flex gap-2 px-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]"><Info size={14} className="mt-0.5 shrink-0" />For immediate danger, call your local emergency service. This form is for transit service issues.</p></aside>
    </form>
  </div></Shell>;
}

function StaffSkeleton() { return <div className="space-y-3">{[1,2,3,4].map(item => <div className="skeleton h-[92px] rounded-2xl" key={item} />)}</div>; }

function ReportDetail({ report, onClose, onStatus }: { report: TransitReport; onClose: () => void; onStatus: (status: typeof ReportStatus[keyof typeof ReportStatus]) => void }) {
  const { data, isLoading, isError } = useGetReport(report.id, { query: { queryKey: getGetReportQueryKey(report.id), enabled: Boolean(report.id) } });
  const detail = data ?? report;
  return <div className="fixed inset-0 z-40 flex justify-end bg-[hsl(206_43%_17%/.35)] backdrop-blur-[2px]" onClick={onClose}><section className="h-full w-full max-w-[560px] overflow-y-auto bg-[hsl(var(--card))] p-5 shadow-[-20px_0_60px_hsl(206_43%_17%/.15)] sm:p-8" onClick={event => event.stopPropagation()}><div className="mb-8 flex items-center justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]">{detail.reference}</p><h2 className="mt-2 max-w-sm text-2xl font-bold leading-tight tracking-[-.04em]">{detail.title}</h2></div><button type="button" onClick={onClose} className="focus-ring rounded-full p-2 hover:bg-[hsl(var(--muted))]" data-testid="button-close-detail"><X size={20} /></button></div>
    {isLoading && <div className="mb-5 h-2 w-full skeleton rounded-full" data-testid="status-detail-loading" />}{isError && <div className="mb-5 rounded-xl bg-[hsl(var(--destructive)/.08)] p-3 text-sm text-[hsl(var(--destructive))]" data-testid="status-detail-error">Live details unavailable; showing the list snapshot.</div>}
    <div className="mb-7 flex items-center justify-between"><StatusPill status={detail.status} /><span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{new Date(detail.createdAt).toLocaleString()}</span></div>
    <div className="grid grid-cols-2 gap-3 border-y border-[hsl(var(--border))] py-5 text-sm"><div><span className="block text-xs text-[hsl(var(--muted-foreground))]">Location</span><span className="mt-1 block font-medium">{detail.location}</span></div><div><span className="block text-xs text-[hsl(var(--muted-foreground))]">Route</span><span className="mt-1 block font-medium">{detail.route || 'Not provided'}</span></div><div><span className="block text-xs text-[hsl(var(--muted-foreground))]">Happened</span><span className="mt-1 block font-medium">{new Date(detail.happenedAt).toLocaleString()}</span></div><div><span className="block text-xs text-[hsl(var(--muted-foreground))]">Reporter</span><span className="mt-1 block font-medium">{detail.reporterName}</span></div></div>
    <div className="py-7"><p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Rider description</p><p className="text-[15px] leading-7 text-[hsl(var(--foreground)/.82)]">{detail.description}</p></div>
    {detail.reporterContact && <div className="mb-7 rounded-xl bg-[hsl(var(--secondary))] p-4 text-sm"><span className="block text-xs text-[hsl(var(--secondary-foreground)/.7)]">Follow-up contact</span><span className="mt-1 block font-bold">{detail.reporterContact}</span></div>}
    {detail.attachments.length > 0 && <div className="mb-7"><p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Attachments</p><div className="space-y-2">{detail.attachments.map(file => <div key={file.id} className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] p-3 text-sm"><Paperclip size={15} />{file.name}</div>)}</div></div>}
    <div className="border-t border-[hsl(var(--border))] pt-6"><p className="mb-3 text-xs font-bold text-[hsl(var(--muted-foreground))]">Update workflow</p><div className="grid grid-cols-2 gap-2">{statuses.map(([value, label]) => <button key={value} type="button" disabled={detail.status === value} onClick={() => onStatus(value as typeof ReportStatus[keyof typeof ReportStatus])} className={`focus-ring rounded-xl border px-3 py-3 text-left text-xs font-bold transition-colors ${detail.status === value ? 'border-[hsl(var(--chart-2)/.35)] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--accent))]'}`} data-testid={`button-status-${value}`}><span className="block">{label}</span><span className="mt-1 block font-normal text-[hsl(var(--muted-foreground))]">{detail.status === value ? 'Current status' : `Move to ${label.toLowerCase()}`}</span></button>)}</div></div>
  </section></div>;
}

function StaffHome() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TransitReport | null>(null);
  const [toast, setToast] = useState('');
  const params = useMemo(() => ({ ...(status ? { status: status as typeof ReportStatus[keyof typeof ReportStatus] } : {}), ...(search ? { search } : {}) }), [status, search]);
  const reports = useListReports(params, { query: { queryKey: getListReportsQueryKey(params) } });
  const stats = useGetReportStats({ query: { queryKey: getGetReportStatsQueryKey() } });
  const activity = useGetRecentReportActivity({ query: { queryKey: getGetRecentReportActivityQueryKey() } });
  const updateStatus = useUpdateReportStatus();
  const refresh = () => { reports.refetch(); stats.refetch(); activity.refetch(); };
  const changeStatus = (next: typeof ReportStatus[keyof typeof ReportStatus]) => {
    if (!selected) return;
    updateStatus.mutate({ id: selected.id, data: { status: next } }, { onSuccess: (updated) => { setSelected(updated); setToast(`Moved ${updated.reference} to ${next}.`); queryClient.invalidateQueries({ queryKey: getListReportsQueryKey(params) }); queryClient.invalidateQueries({ queryKey: getGetReportStatsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetRecentReportActivityQueryKey() }); window.setTimeout(() => setToast(''), 3000); } });
  };
  const list = reports.data ?? [];
  const statCards = stats.data ? [{ label: 'All reports', value: stats.data.total, icon: FileText }, { label: 'This week', value: stats.data.thisWeek, icon: Zap }, { label: 'Needs review', value: stats.data.submitted + stats.data.reviewing, icon: Clock3 }, { label: 'Avg. response', value: `${stats.data.averageResponseHours}h`, icon: Activity }] : [];
  return <Shell staff><div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8 lg:py-12">
    <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="animate-rise"><p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Operations / live desk</p><h1 className="text-4xl font-bold tracking-[-.06em] text-[hsl(var(--foreground))] sm:text-5xl">Good morning, team.</h1><p className="mt-3 text-[hsl(var(--muted-foreground))]">A clear view of what riders need from you next.</p></div><button type="button" onClick={refresh} className="focus-ring flex items-center justify-center gap-2 self-start rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-sm font-bold transition-colors hover:bg-[hsl(var(--muted))] sm:self-auto" data-testid="button-refresh-dashboard"><RefreshCw size={16} className={reports.isFetching ? 'animate-spin' : ''} /> Refresh desk</button></div>
    {stats.isError && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-4 text-sm text-[hsl(var(--destructive))]" data-testid="status-stats-error"><AlertCircle size={18} />Stats could not load. <button className="underline" onClick={() => stats.refetch()} data-testid="button-retry-stats">Try again</button></div>}
    <div className="mb-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.isLoading ? [1,2,3,4].map(item => <div key={item} className="skeleton h-[112px] rounded-2xl" />) : statCards.map(({ label, value, icon: Icon }, index) => <div key={label} className={`animate-rise rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 ${index === 0 ? 'shadow-[inset_4px_0_hsl(var(--accent))]' : ''}`}><div className="mb-5 flex items-center justify-between"><span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</span><Icon size={17} className={index === 0 ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--chart-2))]'} /></div><span className="text-3xl font-bold tracking-[-.06em]" data-testid={`text-stat-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</span></div>)}</div>
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6"><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-bold tracking-[-.04em]">Incoming reports</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{reports.isLoading ? 'Checking the queue...' : `${list.length} report${list.length === 1 ? '' : 's'} in this view`}</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search size={15} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" /><input className={`${inputClass} h-10 py-2 pl-9 text-xs sm:w-[180px]`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports" data-testid="input-search-reports" /></label><label className="relative"><Filter size={14} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" /><select className={`${inputClass} h-10 appearance-none py-2 pl-9 pr-8 text-xs`} value={status} onChange={e => setStatus(e.target.value)} data-testid="select-status-filter"><option value="">All statuses</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-[hsl(var(--muted-foreground))]" /></label></div></div>
        {reports.isLoading ? <StaffSkeleton /> : reports.isError ? <div className="rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.07)] p-8 text-center"><AlertCircle className="mx-auto mb-3 text-[hsl(var(--destructive))]" /><p className="text-sm font-bold">Reports could not load.</p><button onClick={() => reports.refetch()} className="mt-3 text-xs font-bold underline" data-testid="button-retry-reports">Try again</button></div> : list.length === 0 ? <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-12 text-center"><TicketCheck className="mx-auto mb-3 text-[hsl(var(--chart-2))]" /><p className="font-bold">Nothing matches this view.</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Try clearing the search or status filter.</p></div> : <div className="space-y-2">{list.map(report => <button type="button" key={report.id} onClick={() => setSelected(report)} className="focus-ring group grid w-full gap-3 rounded-2xl border border-transparent p-4 text-left transition-[background,border,transform] hover:-translate-y-0.5 hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.6)] sm:grid-cols-[1fr_auto] sm:items-center" data-testid={`card-report-${report.id}`}><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-bold text-[hsl(var(--accent))]">{report.reference}</span><StatusPill status={report.status} /></div><h3 className="truncate text-sm font-bold">{report.title}</h3><p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[hsl(var(--muted-foreground))]"><MapPin size={12} />{report.location}<span className="mx-1 text-[hsl(var(--border))]">/</span>{report.route || 'No route'}</p></div><div className="flex items-center justify-between gap-4 sm:block sm:text-right"><span className="block text-xs font-medium text-[hsl(var(--muted-foreground))]">{new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><ArrowRight size={16} className="mt-2 ml-auto text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-1" /></div></button>)}</div>}</section>
      <aside className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6"><div className="mb-6 flex items-start justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]">The paper trail</p><h2 className="mt-1 text-xl font-bold tracking-[-.04em]">Recent activity</h2></div><MessageSquare size={19} className="text-[hsl(var(--muted-foreground)/.55)]" /></div>{activity.isLoading ? <div className="space-y-4">{[1,2,3].map(item => <div className="skeleton h-12 rounded-xl" key={item} />)}</div> : activity.isError ? <div className="rounded-xl bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]" data-testid="status-activity-error">Activity is temporarily unavailable.</div> : activity.data?.length ? <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-[hsl(var(--border))]">{activity.data.slice(0, 7).map(item => <div className="relative flex gap-3" key={item.id} data-testid={`activity-${item.id}`}><span className="relative mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--accent))] ring-4 ring-[hsl(var(--card))]" /><div className="min-w-0"><p className="text-xs font-bold leading-5">{item.action}</p><p className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">{item.reference} · {item.detail}</p><p className="mt-1 font-mono text-[9px] uppercase text-[hsl(var(--muted-foreground)/.7)]">{new Date(item.createdAt).toLocaleDateString()}</p></div></div>)}</div> : <div className="rounded-xl bg-[hsl(var(--muted))] p-5 text-center text-sm text-[hsl(var(--muted-foreground))]">No activity yet.</div>}</aside>
    </div>
  </div>{selected && <ReportDetail report={selected} onClose={() => setSelected(null)} onStatus={changeStatus} />}{toast && <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-[0_10px_30px_hsl(206_43%_17%/.25)] animate-rise" role="status" data-testid="status-update-success"><BadgeCheck size={17} className="text-[hsl(var(--accent))]" />{toast}</div>}</Shell>;
}

function Router() {
  return <Switch><Route path="/" component={RiderHome} /><Route path="/staff" component={StaffHome} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><Router /></QueryClientProvider>;
}