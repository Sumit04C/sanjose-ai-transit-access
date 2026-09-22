import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BusFront,
  Check,
  ImagePlus,
  Languages,
  Loader2,
  MapPin,
  Mic,
  Paperclip,
  Send,
  ShieldCheck,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';

type Language = 'vi' | 'en';

type ImageAttachment = {
  name: string;
  dataUrl: string;
};

type VoiceResult = {
  isFinal: boolean;
  0?: { transcript: string };
};

type VoiceResultEvent = {
  resultIndex: number;
  results: ArrayLike<VoiceResult>;
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

const copy = {
  vi: {
    languageName: 'Tiếng Việt',
    languageOther: 'English',
    eyebrow: 'HỖ TRỢ HÀNH KHÁCH VTA',
    title: 'Báo cáo vấn đề giao thông VTA',
    instruction: 'Hãy mô tả vấn đề bạn gặp phải khi sử dụng phương tiện giao thông công cộng.',
    privacy: 'Thông tin của bạn chỉ được dùng để giúp VTA xử lý báo cáo.',
    stepOne: 'Bước 1 / 2',
    describeHeading: 'Điều gì đã xảy ra?',
    describeLabel: 'Mô tả vấn đề',
    describeHint: 'Bạn có thể viết bằng tiếng Việt hoặc tiếng Anh',
    placeholder: 'Ví dụ: Xe buýt của tôi bị trễ…',
    voiceLabel: 'Speak',
    voiceStart: 'Nhấn để nói bằng tiếng Việt',
    voiceStop: 'Đang lắng nghe — nhấn để dừng',
    voiceUnavailable: 'Trình duyệt này không hỗ trợ nhập bằng giọng nói. Bạn có thể nhập bằng bàn phím.',
    voiceError: 'Không thể nghe rõ. Vui lòng kiểm tra quyền sử dụng micrô và thử lại.',
    voiceTranscript: 'Nội dung đang nhận dạng',
    imageHeading: 'Thêm hình ảnh (không bắt buộc)',
    imageDescription: 'Hình ảnh có thể giúp VTA hiểu rõ hơn về vấn đề.',
    chooseImage: 'Chọn một hình ảnh',
    imageHint: 'Trạm xe hư hỏng, biển báo bị thiếu, lối đi bị chặn…',
    removeImage: 'Xóa hình ảnh',
    selectedImage: 'Hình ảnh đã chọn',
    send: 'Gửi báo cáo',
    sending: 'Đang gửi báo cáo…',
    sendHint: 'Báo cáo sẽ được chuyển đến bộ phận VTA.',
    requiredError: 'Vui lòng mô tả vấn đề hoặc thêm một hình ảnh trước khi gửi.',
    imageError: 'Vui lòng chọn một tệp hình ảnh.',
    secureNote: 'Không tải hình ảnh lên dịch vụ bên ngoài. Hình ảnh chỉ được giữ trong trình duyệt cho bản thử nghiệm này.',
    stepTwo: 'Bước 2 / 2',
    successEyebrow: 'ĐÃ TIẾP NHẬN BÁO CÁO',
    successTitle: 'Cảm ơn bạn đã lên tiếng.',
    successBody: 'Báo cáo của bạn đã được tạo và mô phỏng gửi đến bộ phận giao thông VTA.',
    responseHeading: 'Phản hồi từ VTA',
    response: 'Cảm ơn bạn đã giúp chúng tôi cải thiện dịch vụ. Nhân viên VTA sẽ xem xét vấn đề này và chuyển đến nhóm phù hợp.',
    reportHeading: 'Báo cáo đã tạo',
    reportContent: 'Nội dung báo cáo',
    reportImage: 'Có hình ảnh đính kèm',
    reportNoImage: 'Không có hình ảnh đính kèm',
    reportReference: 'Mã báo cáo',
    referenceHint: 'Dùng mã này nếu bạn cần hỏi về báo cáo.',
    newReport: 'Tạo báo cáo mới',
    safety: 'Nếu bạn đang gặp nguy hiểm ngay lập tức, hãy gọi 911.',
    readAloud: 'Đọc phản hồi',
  },
  en: {
    languageName: 'English',
    languageOther: 'Tiếng Việt',
    eyebrow: 'VTA RIDER SUPPORT',
    title: 'Report a VTA Transit Issue',
    instruction: 'Describe the problem you experienced while using public transportation.',
    privacy: 'Your information is only used to help VTA review your report.',
    stepOne: 'Step 1 / 2',
    describeHeading: 'What happened?',
    describeLabel: 'Describe the problem',
    describeHint: 'You can write in Vietnamese or English',
    placeholder: 'For example: My bus was late…',
    voiceLabel: 'Speak',
    voiceStart: 'Tap to speak in Vietnamese',
    voiceStop: 'Listening — tap to stop',
    voiceUnavailable: 'Voice input is not supported in this browser. You can type your report instead.',
    voiceError: 'We could not hear that. Please check microphone access and try again.',
    voiceTranscript: 'Live transcript',
    imageHeading: 'Add an image (optional)',
    imageDescription: 'An image can help VTA understand the problem more clearly.',
    chooseImage: 'Choose one image',
    imageHint: 'A damaged stop, missing sign, blocked ramp…',
    removeImage: 'Remove image',
    selectedImage: 'Selected image',
    send: 'Send report',
    sending: 'Sending report…',
    sendHint: 'Your report will be sent to the VTA transit department.',
    requiredError: 'Please describe the problem or add an image before sending.',
    imageError: 'Please choose an image file.',
    secureNote: 'Images are not uploaded to an external service. They stay in this browser for this prototype.',
    stepTwo: 'Step 2 / 2',
    successEyebrow: 'REPORT RECEIVED',
    successTitle: 'Thank you for speaking up.',
    successBody: 'Your report was created and simulated as sent to the VTA transit department.',
    responseHeading: 'A response from VTA',
    response: 'Thank you for helping us improve transit service. A VTA staff member will review this issue and route it to the right team.',
    reportHeading: 'Report created',
    reportContent: 'Report description',
    reportImage: 'Image attached',
    reportNoImage: 'No image attached',
    reportReference: 'Report number',
    referenceHint: 'Use this number if you need to ask about your report.',
    newReport: 'Create a new report',
    safety: 'If you are in immediate danger, call 911.',
    readAloud: 'Read response aloud',
  },
} as const;

function Header({ language, onLanguageChange }: { language: Language; onLanguageChange: () => void }) {
  const t = copy[language];
  return (
    <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.92)]">
      <div className="mx-auto flex min-h-[76px] max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3" data-testid="brand-vta">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[4px_4px_0_hsl(var(--accent))]">
            <BusFront size={24} strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-base font-bold tracking-[-.03em]">VTA</p>
            <p className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">Transit support</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLanguageChange}
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-xs font-bold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--secondary))]"
          aria-label={`Switch language to ${t.languageOther}`}
          data-testid="button-language-toggle"
        >
          <Languages size={16} />
          <span>{t.languageName}</span>
        </button>
      </div>
    </header>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <label className="text-base font-bold text-[hsl(var(--foreground))]">{children}</label>
      {hint && <span className="text-xs text-[hsl(var(--muted-foreground))]">{hint}</span>}
    </div>
  );
}

function AttachmentPreview({
  image,
  language,
  onRemove,
}: {
  image: ImageAttachment;
  language: Language;
  onRemove: () => void;
}) {
  const t = copy[language];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--accent)/.75)] bg-[hsl(var(--card))]" data-testid="preview-image">
      <img src={image.dataUrl} alt={t.selectedImage} className="max-h-72 w-full object-contain bg-[hsl(var(--secondary))]" />
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <ImagePlus size={16} className="shrink-0 text-[hsl(var(--primary))]" />
          <span className="truncate">{image.name}</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="focus-ring inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]"
          aria-label={t.removeImage}
          data-testid="button-remove-image"
        >
          <Trash2 size={15} />
          <span className="hidden sm:inline">{t.removeImage}</span>
        </button>
      </div>
    </div>
  );
}

function ReportForm({
  language,
  onSubmitted,
}: {
  language: Language;
  onSubmitted: (description: string, image: ImageAttachment | null) => void;
}) {
  const t = copy[language];
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [error, setError] = useState('');
  const [voiceMessage, setVoiceMessage] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const voiceRef = useRef<VoiceRecognition | null>(null);

  const toggleVoice = () => {
    if (isListening) {
      voiceRef.current?.stop();
      setIsListening(false);
      return;
    }

    const voiceWindow = window as VoiceWindow;
    const Recognition = voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceMessage(t.voiceUnavailable);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'vi-VN';
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index]?.[0]?.transcript?.trim() ?? '';
        if (event.results[index]?.isFinal) finalText += `${transcript} `;
        else interimText += `${transcript} `;
      }
      if (finalText.trim()) {
        const spokenText = finalText.trim();
        setDescription((current) => `${current}${current ? ' ' : ''}${spokenText}`.slice(0, 1000));
        setVoiceTranscript(spokenText);
      } else if (interimText.trim()) {
        setVoiceTranscript(interimText.trim());
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setVoiceMessage(t.voiceError);
    };
    recognition.onend = () => setIsListening(false);
    voiceRef.current = recognition;
    setError('');
    setVoiceMessage('');
    setVoiceTranscript('');
    setIsListening(true);
    recognition.start();
  };

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setError(t.imageError);
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage({ name: selected.name, dataUrl: String(reader.result) });
    reader.onerror = () => setError(t.imageError);
    reader.readAsDataURL(selected);
    setError('');
    event.target.value = '';
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!description.trim() && !image) {
      setError(t.requiredError);
      return;
    }
    setIsSending(true);
    window.setTimeout(() => {
      onSubmitted(description.trim(), image);
    }, 650);
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <section className="rounded-[26px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_14px_32px_hsl(216_61%_20%/.06)] sm:p-8">
        <div className="mb-7 flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
            <Volume2 size={20} />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-[-.035em]">{t.describeHeading}</h2>
            <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{t.instruction}</p>
          </div>
        </div>

        <FieldLabel hint={t.describeHint}>{t.describeLabel}</FieldLabel>
        <div className="relative">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 1000))}
            className="focus-ring min-h-[180px] w-full resize-y rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-4 pb-16 text-base leading-7 text-[hsl(var(--foreground))] outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground)/.8)] focus:border-[hsl(var(--primary))]"
            placeholder={t.placeholder}
            aria-label={t.describeLabel}
            data-testid="textarea-description"
          />
          <button
            type="button"
            onClick={toggleVoice}
            className={`focus-ring absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${isListening ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))] hover:brightness-95'}`}
            aria-label={isListening ? t.voiceStop : t.voiceStart}
            data-testid="button-voice"
          >
            <Mic size={18} className={isListening ? 'animate-pulse' : ''} />
            <span>{t.voiceLabel}</span>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1.5">
            <Mic size={14} />
            {isListening ? t.voiceStop : t.voiceStart}
          </span>
          <span>{description.length}/1000</span>
        </div>
        {voiceTranscript && (
          <div className="mt-4 rounded-xl border border-[hsl(var(--accent)/.7)] bg-[hsl(var(--accent)/.18)] p-3 text-sm text-[hsl(var(--foreground))]" role="status" data-testid="status-voice-transcript">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[.08em] text-[hsl(var(--primary))]">{t.voiceTranscript}</span>
            “{voiceTranscript}”
          </div>
        )}
        {voiceMessage && <p className="mt-3 text-sm leading-6 text-[hsl(var(--destructive))]" role="alert" data-testid="status-voice-message">{voiceMessage}</p>}
      </section>

      <section className="rounded-[26px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_14px_32px_hsl(216_61%_20%/.06)] sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
            <ImagePlus size={20} />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-[-.035em]">{t.imageHeading}</h2>
            <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{t.imageDescription}</p>
          </div>
        </div>
        {image ? (
          <AttachmentPreview image={image} language={language} onRemove={() => setImage(null)} />
        ) : (
          <label className="focus-ring flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[hsl(var(--input))] bg-[hsl(var(--secondary)/.5)] px-5 py-9 text-center transition-colors hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))]">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--card))] text-[hsl(var(--primary))]">
              <Paperclip size={22} />
            </span>
            <span className="text-base font-bold text-[hsl(var(--primary))]">{t.chooseImage}</span>
            <span className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{t.imageHint}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={selectImage} data-testid="input-image" />
          </label>
        )}
        <p className="mt-4 flex gap-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
          {t.secureNote}
        </p>
      </section>

      {error && (
        <div className="flex gap-3 rounded-2xl border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.08)] p-4 text-sm leading-6 text-[hsl(var(--destructive))]" role="alert" data-testid="status-form-error">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSending}
        className="focus-ring flex min-h-[60px] w-full items-center justify-between gap-4 rounded-2xl bg-[hsl(var(--primary))] px-5 text-left text-[hsl(var(--primary-foreground))] shadow-[5px_5px_0_hsl(var(--accent))] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-75 sm:px-7"
        data-testid="button-submit-report"
      >
        <span>
          <span className="block text-base font-bold">{isSending ? t.sending : t.send}</span>
          <span className="mt-1 block text-xs text-[hsl(var(--primary-foreground)/.72)]">{t.sendHint}</span>
        </span>
        {isSending ? <Loader2 size={23} className="animate-spin" /> : <Send size={22} />}
      </button>
    </form>
  );
}

function SubmittedReport({
  language,
  description,
  image,
  onNewReport,
}: {
  language: Language;
  description: string;
  image: ImageAttachment | null;
  onNewReport: () => void;
}) {
  const t = copy[language];
  const [reference] = useState(() => `VTA-${Math.floor(100000 + Math.random() * 900000)}`);

  const speakResponse = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(t.response);
    utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6" data-testid="screen-submitted">
      <section className="overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_14px_32px_hsl(216_61%_20%/.07)]">
        <div className="bg-[hsl(var(--primary))] px-5 py-8 text-[hsl(var(--primary-foreground))] sm:px-9 sm:py-10">
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))] shadow-[4px_4px_0_hsl(var(--primary-foreground)/.18)]">
            <Check size={30} strokeWidth={3} />
          </div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]">{t.successEyebrow}</p>
          <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-[-.055em] sm:text-4xl">{t.successTitle}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[hsl(var(--primary-foreground)/.8)]">{t.successBody}</p>
        </div>

        <div className="space-y-6 p-5 sm:p-9">
          <div className="rounded-2xl border border-[hsl(var(--accent)/.65)] bg-[hsl(var(--accent)/.16)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[hsl(var(--primary))]">{t.responseHeading}</p>
                <p className="mt-2 text-sm leading-7 text-[hsl(var(--foreground))]">{t.response}</p>
              </div>
              <button
                type="button"
                onClick={speakResponse}
                className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[hsl(var(--card))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))]"
                aria-label={t.readAloud}
                title={t.readAloud}
                data-testid="button-read-response"
              >
                <Volume2 size={18} />
              </button>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{t.reportHeading}</p>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
              <p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">{t.reportContent}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7" data-testid="text-report-description">{description || t.reportImage}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[hsl(var(--primary))]" data-testid="status-report-image">
                <ImagePlus size={15} />
                {image ? t.reportImage : t.reportNoImage}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[hsl(var(--secondary))] p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">{t.reportReference}</p>
              <p className="mt-1 font-mono text-lg font-bold text-[hsl(var(--primary))]" data-testid="text-report-reference">{reference}</p>
            </div>
            <p className="max-w-[220px] text-right text-xs leading-5 text-[hsl(var(--muted-foreground))]">{t.referenceHint}</p>
          </div>

          <button
            type="button"
            onClick={onNewReport}
            className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[hsl(var(--primary))] px-5 text-sm font-bold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--secondary))]"
            data-testid="button-new-report"
          >
            <ArrowLeft size={17} />
            {t.newReport}
          </button>
        </div>
      </section>
      <p className="flex items-center justify-center gap-2 px-3 text-center text-xs leading-5 text-[hsl(var(--muted-foreground))]" data-testid="text-safety-note">
        <MapPin size={14} className="shrink-0" />
        {t.safety}
      </p>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>('vi');
  const [submitted, setSubmitted] = useState<{ description: string; image: ImageAttachment | null } | null>(null);
  const t = copy[language];

  return (
    <div className="noise min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <Header language={language} onLanguageChange={() => setLanguage((current) => (current === 'vi' ? 'en' : 'vi'))} />
      <main className="civic-grid mx-auto min-h-[calc(100dvh-76px)] max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--primary))]" data-testid="text-step">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
              {submitted ? t.stepTwo : t.stepOne}
            </span>
            <span className="hidden items-center gap-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] sm:flex">
              <ShieldCheck size={15} className="text-[hsl(var(--primary))]" />
              {t.privacy}
            </span>
          </div>

          {!submitted ? (
            <>
              <div className="mb-9">
                <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">{t.eyebrow}</p>
                <h1 className="max-w-2xl text-4xl font-bold leading-[.98] tracking-[-.065em] sm:text-6xl" data-testid="text-page-title">{t.title}</h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-[hsl(var(--muted-foreground))]">{t.instruction}</p>
              </div>
              <ReportForm language={language} onSubmitted={(description, image) => setSubmitted({ description, image })} />
            </>
          ) : (
            <SubmittedReport language={language} description={submitted.description} image={submitted.image} onNewReport={() => setSubmitted(null)} />
          )}
        </div>
      </main>
      <footer className="border-t border-[hsl(var(--border))] px-5 py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        VTA Transit Support · San José
      </footer>
    </div>
  );
}