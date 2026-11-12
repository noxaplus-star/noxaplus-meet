export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export type Theme = 'light' | 'dark';

export type Confidence = 'high' | 'medium';

export type ActionStatus = 'open' | 'done';

export interface MeetingMeta {
  title: string;
  /** Jalali calendar key, e.g. 1405-08-21. */
  date: string;
  startTime: string;
  durationMins: number | null;
  participants: string[];
  chair: string;
}

export interface SourceItem {
  id: string;
  text: string;
  source: number;
  confidence: Confidence;
}

export interface ActionItem extends SourceItem {
  owner: string;
  /** Jalali calendar key or null when no date was found. */
  due: string | null;
  status: ActionStatus;
}

export type Decision = SourceItem;

export type Risk = SourceItem;

export interface QuestionItem extends SourceItem {
  askedBy: string;
}

export interface TopicItem {
  id: string;
  title: string;
  source: number;
}

export interface SummaryLine {
  id: string;
  text: string;
  source: number;
}

export interface Minutes {
  summary: SummaryLine[];
  decisions: SourceItem[];
  actions: ActionItem[];
  questions: QuestionItem[];
  risks: SourceItem[];
  topics: TopicItem[];
}

export interface AnalysisStats {
  chars: number;
  words: number;
  sentences: number;
  speakers: number;
  readingMinutes: number;
  analyzedAt: number;
  /** Hash of transcript + meeting date so the UI can detect stale results. */
  signature: string;
  engineVersion: number;
}

export interface Meeting {
  id: string;
  createdAt: number;
  updatedAt: number;
  meta: MeetingMeta;
  transcript: string;
  minutes: Minutes;
  stats: AnalysisStats | null;
}

export interface MeetSettings {
  theme: Theme;
  autoAnalyze: boolean;
}

export interface MeetState {
  version: 1;
  meetings: Meeting[];
  activeId: string | null;
  settings: MeetSettings;
  updatedAt: number;
}

export interface BackupFile {
  app: 'NoxaPlus Meet';
  version: 1;
  exportedAt: string;
  state: MeetState;
}

export interface ParsedMetadata {
  title: string | null;
  date: string | null;
  startTime: string | null;
  durationMins: number | null;
  participants: string[];
  chair: string | null;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  line: number;
  start: number;
  end: number;
}

export interface TranscriptSentence {
  index: number;
  speaker: string;
  text: string;
  start: number;
  end: number;
  segmentIndex: number;
}

export interface ParsedTranscript {
  metadata: ParsedMetadata;
  segments: TranscriptSegment[];
  sentences: TranscriptSentence[];
  speakers: string[];
  warnings: string[];
}

export interface DueDate {
  key: string;
  label: string;
  kind: 'explicit' | 'relative' | 'weekday' | 'period';
}

export interface ExtractionOptions {
  /** Jalali key of the meeting date, used to resolve relative deadlines. */
  meetingDate: string;
  participants: string[];
}

export interface AnalysisResult {
  minutes: Minutes;
  stats: AnalysisStats;
  speakers: string[];
  metadata: ParsedMetadata;
  warnings: string[];
}
