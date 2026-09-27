import { Link } from 'wouter';
import { AlertCircle, Clock3, ImagePlus, Inbox, RefreshCw } from 'lucide-react';
import { useListSubmissions } from '@workspace/api-client-react';
import type { RiderSubmission } from '@workspace/api-client-react';
import type { Language } from '@/App';

const content = {
  vi: {
    eyebrow: 'NHẬT KÝ BÁO CÁO',
    title: 'Các báo cáo đã lưu',
    introduction: 'Các báo cáo mới nhất được hiển thị trước, cùng với nội dung đã gửi và phản hồi mẫu.',
    input: 'Nội dung đã gửi',
    response: 'Phản hồi đã lưu',
    dataSource: 'Nguồn dữ liệu',
    attachment: 'Hình ảnh đã chọn',
    language: 'Ngôn ngữ',
    loading: 'Đang tải các báo cáo…',
    error: 'Không thể tải báo cáo. Vui lòng thử lại.',
    retry: 'Thử lại',
    refresh: 'Làm mới',
    empty: 'Chưa có báo cáo nào.',
    emptyHelp: 'Gửi báo cáo đầu tiên để xem tại đây.',
    back: 'Báo cáo vấn đề',
    note: 'Hình ảnh chỉ được giữ trong trình duyệt; cơ sở dữ liệu chỉ lưu tên tệp. Phản hồi là nội dung mẫu, không phải do AI tạo ra.',
  },
  en: {
    eyebrow: 'REPORT HISTORY',
    title: 'Saved reports',
    introduction: 'Newest reports appear first, with the submitted input and saved prototype response.',
    input: 'Submitted input',
    response: 'Saved response',
    dataSource: 'Data source',
    attachment: 'Selected image',
    language: 'Language',
    loading: 'Loading reports…',
    error: 'Could not load reports. Please try again.',
    retry: 'Try again',
    refresh: 'Refresh',
    empty: 'No reports yet.',
    emptyHelp: 'Send the first report to see it here.',
    back: 'Report an issue',
    note: 'Images stay in the browser; the database stores only their filenames. Responses are prototype text, not AI-generated.',
  },
  es: {
    eyebrow: 'HISTORIAL DE REPORTES',
    title: 'Reportes guardados',
    introduction: 'Los reportes más recientes aparecen primero, con el contenido enviado y la respuesta de ejemplo guardada.',
    input: 'Contenido enviado',
    response: 'Respuesta guardada',
    dataSource: 'Origen de datos',
    attachment: 'Imagen seleccionada',
    language: 'Idioma',
    loading: 'Cargando reportes…',
    error: 'No se pudieron cargar los reportes. Inténtelo de nuevo.',
    retry: 'Reintentar',
    refresh: 'Actualizar',
    empty: 'Aún no hay reportes.',
    emptyHelp: 'Envíe el primer reporte para verlo aquí.',
    back: 'Reportar un problema',
    note: 'Las imágenes permanecen en el navegador; la base de datos solo guarda sus nombres. Las respuestas son de ejemplo, no generadas por IA.',
  },
  pa: {
    eyebrow: 'ਰਿਪੋਰਟਾਂ ਦਾ ਇਤਿਹਾਸ',
    title: 'ਸੰਭਾਲੀਆਂ ਰਿਪੋਰਟਾਂ',
    introduction: 'ਨਵੀਆਂ ਰਿਪੋਰਟਾਂ ਸਭ ਤੋਂ ਉੱਪਰ ਹਨ, ਨਾਲ ਭੇਜਿਆ ਵੇਰਵਾ ਅਤੇ ਸੰਭਾਲਿਆ ਨਮੂਨਾ ਜਵਾਬ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
    input: 'ਭੇਜਿਆ ਵੇਰਵਾ',
    response: 'ਸੰਭਾਲਿਆ ਜਵਾਬ',
    dataSource: 'ਡੇਟਾ ਸਰੋਤ',
    attachment: 'ਚੁਣੀ ਹੋਈ ਤਸਵੀਰ',
    language: 'ਭਾਸ਼ਾ',
    loading: 'ਰਿਪੋਰਟਾਂ ਲੋਡ ਹੋ ਰਹੀਆਂ ਹਨ…',
    error: 'ਰਿਪੋਰਟਾਂ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕੀਆਂ। ਕਿਰਪਾ ਕਰਕੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    retry: 'ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
    refresh: 'ਤਾਜ਼ਾ ਕਰੋ',
    empty: 'ਅਜੇ ਕੋਈ ਰਿਪੋਰਟ ਨਹੀਂ ਹੈ।',
    emptyHelp: 'ਇੱਥੇ ਵੇਖਣ ਲਈ ਪਹਿਲੀ ਰਿਪੋਰਟ ਭੇਜੋ।',
    back: 'ਸਮੱਸਿਆ ਦੀ ਰਿਪੋਰਟ ਕਰੋ',
    note: 'ਤਸਵੀਰਾਂ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਹੀ ਰਹਿੰਦੀਆਂ ਹਨ; ਡੇਟਾਬੇਸ ਸਿਰਫ਼ ਫ਼ਾਈਲਾਂ ਦੇ ਨਾਮ ਸੰਭਾਲਦਾ ਹੈ। ਜਵਾਬ ਨਮੂਨੇ ਹਨ, AI ਵੱਲੋਂ ਨਹੀਂ ਬਣਾਏ ਗਏ।',
  },
} as const;

const locale: Record<Language, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  es: 'es-US',
  pa: 'pa-IN',
};

const inputLanguages: Record<Language, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  es: 'Español',
  pa: 'ਪੰਜਾਬੀ',
};

function SubmissionCard({ submission, language }: { submission: RiderSubmission; language: Language }) {
  const t = content[language];
  return (
    <article className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_10px_24px_hsl(216_61%_20%/.05)] sm:p-7" data-testid={`card-submission-${submission.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[hsl(var(--border))] pb-4">
        <div>
          <p className="font-mono text-sm font-bold text-[hsl(var(--primary))]" data-testid={`text-reference-${submission.id}`}>{submission.reference}</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{t.language}: {inputLanguages[submission.language]}</p>
          <p className="mt-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]" data-testid={`text-data-source-${submission.id}`}>{t.dataSource}: {submission.dataSource}</p>
        </div>
        <time dateTime={submission.submittedAt} className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]" data-testid={`text-submitted-at-${submission.id}`}>
          <Clock3 size={15} />
          {new Intl.DateTimeFormat(locale[language], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(submission.submittedAt))}
        </time>
      </div>
      <div className="mt-5">
        <h2 className="text-xs font-bold uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]">{t.input}</h2>
        {submission.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7" data-testid={`text-input-${submission.id}`}>{submission.description}</p>}
        {submission.imageName && (
          <p className="mt-3 flex items-center gap-2 break-all text-xs font-semibold text-[hsl(var(--primary))]" data-testid={`text-image-name-${submission.id}`}>
            <ImagePlus size={16} className="shrink-0" />{t.attachment}: {submission.imageName}
          </p>
        )}
      </div>
      <div className="mt-5 rounded-2xl border border-[hsl(var(--accent)/.6)] bg-[hsl(var(--accent)/.15)] p-4">
        <h2 className="text-xs font-bold uppercase tracking-[.08em] text-[hsl(var(--primary))]">{t.response}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6" data-testid={`text-response-${submission.id}`}>{submission.assistantResponse}</p>
      </div>
    </article>
  );
}

export default function RecordsPage({ language }: { language: Language }) {
  const t = content[language];
  const { data, isLoading, isError, refetch, isFetching } = useListSubmissions();

  return (
    <div className="mx-auto max-w-2xl" data-testid="screen-records">
      <div className="mb-8">
        <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">{t.eyebrow}</p>
        <h1 className="text-4xl font-bold tracking-[-.06em] sm:text-5xl" data-testid="text-records-title">{t.title}</h1>
        <p className="mt-4 text-base leading-7 text-[hsl(var(--muted-foreground))]">{t.introduction}</p>
      </div>
      <div className="mb-5 flex justify-end">
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="focus-ring flex min-h-11 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-sm font-bold text-[hsl(var(--primary))] disabled:opacity-60" data-testid="button-refresh-records">
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />{t.refresh}
        </button>
      </div>
      {isLoading ? (
        <p className="rounded-2xl bg-[hsl(var(--card))] p-6 text-sm" role="status" data-testid="status-records-loading">{t.loading}</p>
      ) : isError ? (
        <div className="rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--card))] p-6 text-sm" role="alert" data-testid="status-records-error">
          <p className="flex items-center gap-2 text-[hsl(var(--destructive))]"><AlertCircle size={18} />{t.error}</p>
          <button type="button" onClick={() => refetch()} className="focus-ring mt-3 font-bold underline" data-testid="button-retry-records">{t.retry}</button>
        </div>
      ) : data?.length ? (
        <div className="space-y-4" data-testid="list-records">
          {data.map((submission) => <SubmissionCard key={submission.id} submission={submission} language={language} />)}
        </div>
      ) : (
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center" data-testid="status-records-empty">
          <Inbox size={34} className="mx-auto text-[hsl(var(--primary))]" />
          <h2 className="mt-4 text-xl font-bold">{t.empty}</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{t.emptyHelp}</p>
          <Link href="/" className="focus-ring mt-5 inline-flex min-h-11 items-center rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-create-first-report">{t.back}</Link>
        </div>
      )}
      <p className="mt-6 text-xs leading-6 text-[hsl(var(--muted-foreground))]">{t.note}</p>
    </div>
  );
}