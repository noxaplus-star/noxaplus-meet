import { findDueDate } from './dates';
import { createId } from './ids';
import { analysisSignature } from './model';
import { hashText, normalizeForCompare, normalizeForMatch, truncate, uniqueBy } from './normalize';
import { parseTranscript, UNKNOWN_SPEAKER } from './transcript';
import type {
  ActionItem,
  AnalysisResult,
  Confidence,
  Decision,
  Minutes,
  QuestionItem,
  Risk,
  SummaryLine,
  TopicItem,
  TranscriptSentence,
} from './types';

export const ENGINE_VERSION = 1;

const DECISION_RE =
  /(?:^|\s)(?:تصمیم\s*(?:گرفتیم|گرفته شد|شد|کردیم)|مقرر\s*(?:شد|گردید)|قرار\s*(?:شد|گذاشتیم|گرفت)|توافق\s*(?:شد|کردیم)|مصوب\s*(?:شد|گردید)|نهایی\s*(?:شد|کردیم)|به\s*این\s*نتیجه\s*رسیدیم|پذیرفتیم|تایید\s*(?:شد|کردیم)|برقرار\s*شد)(?=\s|$|[،,:؛])/;

const ACTION_VERB_RE =
  /(?:بررسی|ارسال|اماده|تهیه|اصلاح|تکمیل|هماهنگ|تماس|پیگیری|جمع\s*اوری|جمع\s*بندی|تدوین|ارایه|اجرا|اطلاع\s*رسانی|اطلاع|اعلام|ثبت|بازنویسی|تست|پایش|راه\s*اندازی|به\s*روزرسانی|بروزرسانی|رفع|نصب|اموزش|برنامه\s*ریزی|درخواست|تایید|گزارش|مستندسازی|تعیین|شفاف\s*سازی|ادامه|بازبینی|بهبود|انتشار)/;

const COMPLETION_RE =
  /(?:کند|کنند|کنم|کنیم|کنید|کن|نماید|نمایند|شود|شوند|دهد|دهند|خواهم\s*کرد|خواهد\s*کرد|می\s*کنم|می\s*کنیم|می\s*کند|می\s*کنند|کرده)/;

const RISK_RE = /(?:ریسک|خطر|نگرانی|مشکل|مانع|وابستگی|تاخیر|کمبود|بحران|تهدید|پرتگاه)/;

const QUESTION_START_RE = /^(?:ایا|چرا|چطور|چگونه|چه\s*زمانی|چه\s*کسی|کجا|کی)\b/;

const PREFIX_RE = /^(?:تصمیم|اقدام|ریسک|پرسش|سوال|سؤال|موضوع|نکته|جمع\s*بندی)\s*[:：]\s*/;

const LEADING_DECISION_RE =
  /^(?:(?:مقرر|قرار|مصوب)\s*شد|تصمیم\s*گرفتیم|توافق\s*کردیم|نهایی\s*شد)\s*(?:که\s*)?/;

const GENERIC_OWNERS = new Set([
  'ما',
  'شما',
  'من',
  'همه',
  'هستم',
  'هستید',
  'هستند',
  'تیم',
  'شرکت',
  'سازمان',
  'مدیریت',
  'کاربران',
  'مشتریان',
  'ان',
  'این',
  'این کار',
  'وی',
  'او',
  'انها',
]);

const OWNER_STOPWORDS = new Set([
  ...GENERIC_OWNERS,
  'باید',
  'نباید',
  'می',
  'لطفا',
  'تا',
  'از',
  'به',
  'در',
  'برای',
  'با',
  'بر',
  'که',
  'را',
  'و',
  'یا',
  'مسیول',
  'مسیولیت',
  'مالک',
  'اقدام',
  'موضوع',
  'جلسه',
  'روز',
  'هفته',
  'ماه',
  'ساعت',
  'دقیقه',
  'درصد',
  'تومان',
  'میلیون',
  'هزار',
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'ابان',
  'اذر',
  'دی',
  'بهمن',
  'اسفند',
  'ارسال',
  'گزارش',
  'بررسی',
  'تهیه',
  'اصلاح',
  'تکمیل',
  'هماهنگی',
  'تماس',
  'پیگیری',
  'جمع',
  'بندی',
  'تدوین',
  'ارایه',
  'اجرا',
  'اطلاع',
  'رسانی',
  'اعلام',
  'ثبت',
  'بازنویسی',
  'تست',
  'پایش',
  'راه',
  'اندازی',
  'روزرسانی',
  'رفع',
  'نصب',
  'اموزش',
  'برنامه',
  'ریزی',
  'درخواست',
  'تایید',
  'مستندسازی',
  'تعیین',
  'شفاف',
  'سازی',
  'ادامه',
  'بازبینی',
  'بهبود',
  'انتشار',
]);

function cleanSentence(text: string): string {
  return text
    .replace(PREFIX_RE, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([،,.؛:!؟?])/g, '$1')
    .trim();
}

function cleanActionText(text: string): string {
  return cleanSentence(text)
    .replace(LEADING_DECISION_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isQuestion(text: string): boolean {
  const normalized = normalizeForMatch(text);
  return /؟\s*$/.test(normalized) || QUESTION_START_RE.test(normalized);
}

function hasDecisionCue(text: string): boolean {
  return DECISION_RE.test(normalizeForMatch(text));
}

function hasActionCue(text: string): boolean {
  const normalized = normalizeForMatch(text);
  if (/^(?:اقدام|اکشن|todo|task)\s*:/.test(normalized)) return true;
  if (/(?:پیشنهاد\s*(?:می\s*)?کنم|موافقم|به\s*نظر\s*من)(?=\s|$|[،,.:])/.test(normalized)) return false;
  const explicit = /(?:^|\s)(?:مسیولیت|مالک)\s*[:：]/.test(normalized);
  const verbAndCompletion =
    ACTION_VERB_RE.test(normalized) &&
    new RegExp(`${ACTION_VERB_RE.source}[^.!؟?]{0,28}?${COMPLETION_RE.source}`).test(normalized);
  const obligation = /(?:^|\s)(?:باید|می\s*بایست|لازم\s*است|ضروری\s*است|نیاز\s*است)(?=\s)/.test(normalized);
  const responsibility = /(?:مسیول(?:یت)?|مالک)\s*(?:ان|این)?\s*[آ-ی]/.test(normalized);
  return verbAndCompletion || (obligation && ACTION_VERB_RE.test(normalized)) || explicit || responsibility;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function looksLikePerson(value: string): boolean {
  const text = value
    .replace(/^(?:ان|این|همان|همین)\s+/, '')
    .replace(/\s+(?:است|هست|باشد|را|هم|نیز)$/, '')
    .trim();
  if (!text || text.length > 32) return false;
  const tokens = text.split(/\s+/);
  if (tokens.length > 3) return false;
  if (!tokens.every((token) => /^[آ-ی]{2,}$/.test(token) && !OWNER_STOPWORDS.has(token))) {
    return false;
  }
  return true;
}

function matchParticipant(value: string, participants: string[]): string {
  const target = normalizeForCompare(value);
  if (!target) return '';
  const exact = participants.find((participant) => normalizeForCompare(participant) === target);
  if (exact) return exact;
  const targetTokens = target.split(' ').filter(Boolean);
  const partial = participants.filter((participant) =>
    normalizeForCompare(participant).split(' ').some((token) => token && targetTokens.includes(token)),
  );
  return partial.length === 1 ? partial[0] : '';
}

function trailingPersonName(value: string): string {
  const text = normalizeForMatch(value)
    .replace(/\s+(?:است|هست|هستم|هستید|هستند|باشد)$/, '')
    .replace(/[،,.؛:]+$/g, '')
    .trim();
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return '';
  const last = tokens[tokens.length - 1];
  if (!/^[آ-ی]{2,}$/.test(last) || OWNER_STOPWORDS.has(last)) return '';
  if (!tokens.slice(0, -1).some((token) => OWNER_STOPWORDS.has(token))) return '';
  return last;
}

function normalizeOwner(value: string, participants: string[]): string {
  const text = normalizeForMatch(value)
    .replace(/^(?:ان|این|همان|همین)\s+/, '')
    .replace(/^(?:با|به|برای|از|در|بر)\s+/, '')
    .replace(/\s+(?:است|هست|باشد|را|هم|نیز|هستم|هستید|هستند|ایم|اند)$/, '')
    .replace(/^[،,:؛\s]+|[،,:؛\s]+$/g, '')
    .trim();
  if (!text) return '';
  const participant = matchParticipant(text, participants);
  if (participant) return participant;
  return looksLikePerson(text) ? text : '';
}

function findParticipantMention(text: string, participants: string[]): string {
  const names = participants.map((participant) => {
    const normalized = normalizeForMatch(participant);
    const tokens = normalized.split(/\s+/).filter((token) => token.length >= 2);
    return { participant, normalized, tokens };
  });
  for (const exact of [true, false]) {
    let best: { index: number; participant: string } | null = null;
    for (const name of names) {
      if (!name.normalized) continue;
      const variants = exact
        ? [name.normalized]
        : name.tokens.filter((token) => names.filter((candidate) => candidate.tokens.includes(token)).length === 1);
      for (const variant of variants) {
        const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(variant)}(?=\\s|$|[،,.؛:!؟])`);
        const match = pattern.exec(text);
        if (match && match.index <= 48 && (!best || match.index < best.index)) {
          best = { index: match.index, participant: name.participant };
        }
      }
    }
    if (best) return best.participant;
  }
  return '';
}

function speakerOwner(sentence: TranscriptSentence, text: string): string {
  if (!sentence.speaker || sentence.speaker === UNKNOWN_SPEAKER) return '';
  const normalized = normalizeForMatch(text);
  if (/(?:می\s*کنیم|کنیم|خواهیم\s*کرد)(?=\s|$|[،,.؛])/.test(normalized)) return '';
  return sentence.speaker;
}

interface OwnerOptions {
  allowSpeakerFallback?: boolean;
}

function extractOwner(
  sentence: TranscriptSentence,
  participants: string[],
  options: OwnerOptions = {},
): string {
  const { allowSpeakerFallback = true } = options;
  const text = normalizeForMatch(sentence.text)
    .replace(PREFIX_RE, '')
    .replace(LEADING_DECISION_RE, '')
    .trim();

  const direct = /(?:مسیول(?:یت)?|مالک|owner)\s*[:：]?\s*(.+?)(?=[،,.؛:]|$)/.exec(text);
  if (direct) {
    const owner =
      normalizeOwner(direct[1], participants) ||
      normalizeOwner(trailingPersonName(direct[1]), participants);
    if (owner) return owner;
  }

  const responsibility = /(?:بر\s*عهده|با)\s+([آ-ی][آ-ی\s]{1,30}?)\s+(?:است|باشد|هست|پیگیری|بررسی|هماهنگ|تماس|ارسال|تهیه|اماده|اصلاح|تکمیل)/.exec(
    text,
  );
  if (responsibility) {
    const owner = normalizeOwner(responsibility[1], participants);
    if (owner) return owner;
  }

  const mention = findParticipantMention(text, participants);
  if (mention) return mention;

  const leadingName = /^([آ-ی]{2,})\s+(?:تا|باید|لطفا|می)(?=\s)/.exec(text);
  if (leadingName) {
    const owner = normalizeOwner(leadingName[1], participants);
    if (owner) return owner;
  }

  const start = /^([آ-ی][آ-ی\s]{1,28}?)\s*(?:،|,|:)\s+/.exec(text);
  if (start) {
    const owner = normalizeOwner(start[1], participants);
    if (owner) return owner;
  }

  const honorific = /(?:^|\s)(?:اقای|خانم|مهندس|دکتر)\s+([آ-ی]+(?:\s+[آ-ی]+){0,2})/.exec(text);
  if (honorific) {
    const owner = normalizeOwner(honorific[0], participants);
    if (owner) return owner;
  }

  return allowSpeakerFallback ? speakerOwner(sentence, sentence.text) : '';
}

function cleanTopic(value: string): string {
  return truncate(value.replace(/[.،,؛:]+$/g, '').trim(), 90);
}

function extractTopics(sentences: TranscriptSentence[], metaTitle: string): TopicItem[] {
  const topics: TopicItem[] = [];
  for (const sentence of sentences) {
    const text = sentence.text;
    const normalized = normalizeForMatch(text);

    const explicit = /^(?:موضوع|دستور\s*جلسه|بند)\s*[:：]\s*(.+)$/.exec(normalized);
    if (explicit) {
      topics.push({
        id: createId('topic'),
        title: cleanTopic(text.replace(/^[^:：]+[:：]\s*/, '')),
        source: sentence.index,
      });
      continue;
    }

    const agenda = /دستور\s*جلسه[^:：]*[:：]\s*(.+)$/.exec(normalized);
    if (agenda) {
      topics.push({
        id: createId('topic'),
        title: cleanTopic(text.replace(/^.*?[:：]\s*/, '')),
        source: sentence.index,
      });
      continue;
    }

    const about = /(?:در\s*مورد|درخصوص|در\s*خصوص|درباره|راجع\s*به)\s+(.+?)(?:[،,.]|$)/.exec(normalized);
    if (about && about[1].split(/\s+/).length >= 2) {
      const raw = /(?:در\s*مورد|درخصوص|در\s*خصوص|درباره|راجع\s*به)\s+(.+?)(?:[،,.]|$)/.exec(text);
      topics.push({
        id: createId('topic'),
        title: cleanTopic((raw?.[1] ?? about[1]).trim()),
        source: sentence.index,
      });
    }
  }

  const deduped = uniqueBy(topics, (topic) => normalizeForCompare(topic.title));
  if (deduped.length === 0 && metaTitle) {
    return [{ id: createId('topic'), title: metaTitle, source: 0 }];
  }
  return deduped.slice(0, 8);
}

function buildSummary(
  sentences: TranscriptSentence[],
  decisions: Decision[],
  actions: ActionItem[],
  risks: Risk[],
  topics: TopicItem[],
): SummaryLine[] {
  const bySource = new Map<number, string>();
  for (const sentence of sentences) bySource.set(sentence.index, sentence.text);

  const candidates = new Map<number, { text: string; score: number }>();
  const add = (source: number, text: string, score: number) => {
    const clean = cleanSentence(text);
    if (clean.length < 12) return;
    const words = normalizeForMatch(clean).split(/\s+/).length;
    if (words < 3 || words > 70) return;
    const previous = candidates.get(source);
    if (!previous || previous.score < score) candidates.set(source, { text: truncate(clean, 260), score });
  };

  for (const decision of decisions) add(decision.source, decision.text, 4);
  for (const action of actions) add(action.source, action.text, 3);
  for (const risk of risks) add(risk.source, risk.text, 2.6);
  for (const topic of topics) add(topic.source, topic.title, 2);

  for (const sentence of sentences) {
    const normalized = normalizeForMatch(sentence.text);
    if (/^(?:سلام|خوش\s*امدید|ممنون|متشکرم|وقت\s*بخیر)/.test(normalized)) continue;
    const words = normalized.split(/\s+/).length;
    if (words >= 8 && words <= 45) add(sentence.index, sentence.text, 0.8);
  }

  const chosen = [...candidates.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5)
    .sort((a, b) => a[0] - b[0]);

  return chosen.map(([source, item]) => ({
    id: createId('summary'),
    text: item.text,
    source,
  }));
}

function confidenceFor(explicit: boolean, owner: string, due: string | null, cueStrong: boolean): Confidence {
  if (explicit || (owner && due) || cueStrong) return 'high';
  return 'medium';
}

export function analyzeTranscript(
  transcript: string,
  meetingDate: string,
  participants: string[],
): AnalysisResult {
  const parsed = parseTranscript(transcript);
  const allParticipants = uniqueBy(
    [...participants, ...parsed.metadata.participants, ...parsed.speakers]
      .map((name) => name.trim())
      .filter(Boolean),
    (name) => normalizeForCompare(name),
  );

  const decisions: Decision[] = [];
  const actions: ActionItem[] = [];
  const questions: QuestionItem[] = [];
  const risks: Risk[] = [];
  const topics = extractTopics(parsed.sentences, parsed.metadata.title ?? '');

  for (const sentence of parsed.sentences) {
    const text = sentence.text;
    const normalized = normalizeForMatch(text);
    const decision = hasDecisionCue(text) || /^تصمیم\s*[:：]/.test(normalized);
    const action = hasActionCue(text) && !QUESTION_START_RE.test(normalized);
    const question = isQuestion(text);
    const risk = RISK_RE.test(normalized) && !question;

    if (decision) {
      decisions.push({
        id: createId('decision'),
        text: truncate(cleanSentence(text), 320),
        source: sentence.index,
        confidence: 'high',
      });
    }

    if (action) {
      const explicit =
        /^(?:اقدام|اکشن|todo|task)/i.test(normalized) ||
        /(?:مسیول(?:یت)?|مالک)\s*[:：]/.test(normalized);
      const owner = extractOwner(sentence, allParticipants, {
        allowSpeakerFallback: !decision,
      });
      const due = findDueDate(text, meetingDate);
      if (!(decision && !explicit && !owner)) {
        actions.push({
          id: createId('action'),
          text: truncate(cleanActionText(text), 320),
          owner,
          due: due?.key ?? null,
          status: 'open',
          source: sentence.index,
          confidence: confidenceFor(explicit, owner, due?.key ?? null, !decision && Boolean(owner)),
        });
      }
    }

    if (question) {
      questions.push({
        id: createId('question'),
        text: truncate(cleanSentence(text), 320),
        askedBy: sentence.speaker === UNKNOWN_SPEAKER ? '' : sentence.speaker,
        source: sentence.index,
        confidence: 'high',
      });
    }

    if (risk) {
      risks.push({
        id: createId('risk'),
        text: truncate(cleanSentence(text), 320),
        source: sentence.index,
        confidence: /(?:ریسک|خطر)/.test(normalized) ? 'high' : 'medium',
      });
    }
  }

  const minutes: Minutes = {
    summary: buildSummary(parsed.sentences, decisions, actions, risks, topics),
    decisions: uniqueBy(decisions, (item) => normalizeForCompare(item.text)),
    actions: uniqueBy(actions, (item) => normalizeForCompare(item.text)),
    questions: uniqueBy(questions, (item) => normalizeForCompare(item.text)),
    risks: uniqueBy(risks, (item) => normalizeForCompare(item.text)),
    topics,
  };

  const wordCount = parsed.sentences.reduce(
    (sum, sentence) => sum + normalizeForMatch(sentence.text).split(/\s+/).filter(Boolean).length,
    0,
  );

  return {
    minutes,
    speakers: parsed.speakers,
    metadata: parsed.metadata,
    warnings: parsed.warnings,
    stats: {
      chars: transcript.length,
      words: wordCount,
      sentences: parsed.sentences.length,
      speakers: parsed.speakers.length,
      readingMinutes: Math.max(1, Math.ceil(wordCount / 180)),
      analyzedAt: Date.now(),
      signature: hashText(analysisSignature(transcript, meetingDate, participants)),
      engineVersion: ENGINE_VERSION,
    },
  };
}
