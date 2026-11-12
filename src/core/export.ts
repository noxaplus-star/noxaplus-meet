import { formatJalaliKey, parseJalaliKey } from './jalali';
import { escapeHtml } from './normalize';
import { toPersianDigits } from './digits';
import type { ActionStatus, Confidence, Meeting } from './types';

export function actionStatusLabel(status: ActionStatus): string {
  return status === 'done' ? 'انجام‌شده' : 'باز';
}

export function confidenceLabel(confidence: Confidence): string {
  return confidence === 'high' ? 'اطمینان بالا' : 'نیازمند بازبینی';
}

function displayDate(key: string | null): string {
  if (!key) return '—';
  return formatJalaliKey(key, { style: 'long' });
}

function metaLines(meeting: Meeting): string[] {
  const { meta } = meeting;
  const lines: string[] = [`تاریخ: ${displayDate(meta.date)}`];
  if (meta.startTime) lines.push(`ساعت شروع: ${toPersianDigits(meta.startTime)}`);
  if (meta.durationMins) lines.push(`مدت: ${toPersianDigits(String(meta.durationMins))} دقیقه`);
  if (meta.chair) lines.push(`رئیس جلسه: ${meta.chair}`);
  if (meta.participants.length) lines.push(`حاضرین: ${meta.participants.join('، ')}`);
  return lines;
}

function tableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function minutesToMarkdown(meeting: Meeting): string {
  const { minutes, meta } = meeting;
  const out: string[] = [];

  out.push(`# ${meta.title}`, '');
  for (const line of metaLines(meeting)) out.push(`- ${line}`);
  out.push('');

  if (meeting.stats) {
    out.push(
      `> ${toPersianDigits(String(meeting.stats.words))} واژه، ${toPersianDigits(
        String(meeting.stats.speakers),
      )} گوینده، حدود ${toPersianDigits(String(meeting.stats.readingMinutes))} دقیقه مطالعه`,
      '',
    );
  }

  out.push('## خلاصهٔ مدیریتی', '');
  if (minutes.summary.length === 0) out.push('_خلاصه‌ای ثبت نشده است._');
  else for (const line of minutes.summary) out.push(`- ${line.text}`);
  out.push('');

  out.push('## تصمیم‌ها', '');
  if (minutes.decisions.length === 0) out.push('_تصمیمی ثبت نشده است._');
  else for (const item of minutes.decisions) out.push(`- ${item.text}`);
  out.push('');

  out.push('## اقدام‌ها', '');
  if (minutes.actions.length === 0) out.push('_اقدامی ثبت نشده است._');
  else {
    out.push('| # | اقدام | مسئول | مهلت | وضعیت |');
    out.push('| --- | --- | --- | --- | --- |');
    minutes.actions.forEach((action, index) => {
      out.push(
        `| ${toPersianDigits(String(index + 1))} | ${tableCell(action.text)} | ${
          tableCell(action.owner) || '—'
        } | ${displayDate(action.due)} | ${actionStatusLabel(action.status)} |`,
      );
    });
  }
  out.push('');

  out.push('## پرسش‌های باز', '');
  if (minutes.questions.length === 0) out.push('_پرسشی ثبت نشده است._');
  else {
    for (const item of minutes.questions) {
      const askedBy = item.askedBy ? ` — ${item.askedBy}` : '';
      out.push(`- ${item.text}${askedBy}`);
    }
  }
  out.push('');

  out.push('## ریسک‌ها', '');
  if (minutes.risks.length === 0) out.push('_ریسکی ثبت نشده است._');
  else for (const item of minutes.risks) out.push(`- ${item.text}`);
  out.push('');

  out.push('## موضوع‌های جلسه', '');
  if (minutes.topics.length === 0) out.push('_موضوعی ثبت نشده است._');
  else for (const topic of minutes.topics) out.push(`- ${topic.title}`);
  out.push('');

  out.push('---', '');
  out.push('تولیدشده با NoxaPlus Meet — صورت‌جلسهٔ محلی و خصوصی', '');
  out.push('ساختهٔ NoxaPlus · www.noxaplus.ir');

  return `${out.join('\n')}\n`;
}

function htmlList(items: string[], emptyText: string, className = ''): string {
  if (items.length === 0) return `<p class="empty">${escapeHtml(emptyText)}</p>`;
  const list = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<ul${className ? ` class="${className}"` : ''}>${list}</ul>`;
}

export function minutesToHtml(meeting: Meeting): string {
  const { minutes, meta } = meeting;
  const title = escapeHtml(meta.title);
  const date = parseJalaliKey(meta.date) ? formatJalaliKey(meta.date, { style: 'long' }) : meta.date;
  const participants = meta.participants.map((name) => escapeHtml(name)).join('، ');

  const facts: string[] = [
    `<div><dt>تاریخ</dt><dd>${escapeHtml(date)}</dd></div>`,
  ];
  if (meta.startTime) {
    facts.push(`<div><dt>ساعت شروع</dt><dd>${escapeHtml(toPersianDigits(meta.startTime))}</dd></div>`);
  }
  if (meta.durationMins) {
    facts.push(
      `<div><dt>مدت</dt><dd>${escapeHtml(toPersianDigits(String(meta.durationMins)))} دقیقه</dd></div>`,
    );
  }
  if (meta.chair) facts.push(`<div><dt>رئیس جلسه</dt><dd>${escapeHtml(meta.chair)}</dd></div>`);
  if (participants) facts.push(`<div class="wide"><dt>حاضرین</dt><dd>${participants}</dd></div>`);

  const actionsRows =
    minutes.actions.length === 0
      ? '<tr><td colspan="5" class="empty">اقدامی ثبت نشده است.</td></tr>'
      : minutes.actions
          .map(
            (action, index) => `<tr>
        <td class="num">${escapeHtml(toPersianDigits(String(index + 1)))}</td>
        <td>${escapeHtml(action.text)}</td>
        <td>${escapeHtml(action.owner) || '—'}</td>
        <td>${escapeHtml(displayDate(action.due))}</td>
        <td><span class="status status-${action.status}">${escapeHtml(
          actionStatusLabel(action.status),
        )}</span></td>
      </tr>`,
          )
          .join('');

  const questions =
    minutes.questions.length === 0
      ? '<p class="empty">پرسشی ثبت نشده است.</p>'
      : `<ul>${minutes.questions
          .map(
            (item) =>
              `<li>${escapeHtml(item.text)}${
                item.askedBy ? `<span class="asked"> — ${escapeHtml(item.askedBy)}</span>` : ''
              }</li>`,
          )
          .join('')}</ul>`;

  const stats = meeting.stats
    ? `<p class="stats">${escapeHtml(toPersianDigits(String(meeting.stats.words)))} واژه · ${escapeHtml(
        toPersianDigits(String(meeting.stats.speakers)),
      )} گوینده · حدود ${escapeHtml(toPersianDigits(String(meeting.stats.readingMinutes)))} دقیقه مطالعه</p>`
    : '';

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — صورت‌جلسه</title>
<style>
  :root { color-scheme: light; --ink: #17233d; --muted: #5c6577; --line: #dde2ea; --accent: #e4572e; --teal: #2a9d8f; --paper: #fffdf8; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 20px; background: #f2eee6; color: var(--ink); font-family: Vazirmatn, Tahoma, "Segoe UI", sans-serif; line-height: 1.85; }
  main { max-width: 900px; margin: 0 auto; background: var(--paper); border: 1px solid var(--line); border-radius: 18px; padding: 42px 46px; box-shadow: 0 20px 50px rgba(23,35,61,.08); }
  header { border-bottom: 3px solid var(--accent); padding-bottom: 20px; margin-bottom: 24px; }
  h1 { margin: 0 0 6px; font-size: 30px; line-height: 1.5; }
  .brand { color: var(--accent); font-size: 13px; font-weight: 700; letter-spacing: .02em; }
  .stats { color: var(--muted); font-size: 13px; margin: 6px 0 0; }
  dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 24px; margin: 18px 0 0; }
  dl div { display: flex; gap: 8px; border-bottom: 1px dashed var(--line); padding-bottom: 6px; }
  .wide { grid-column: 1 / -1; }
  dt { color: var(--muted); min-width: 72px; font-size: 13px; }
  dd { margin: 0; font-size: 14px; }
  h2 { font-size: 20px; margin: 34px 0 12px; padding-right: 12px; border-right: 4px solid var(--teal); }
  ul { margin: 0; padding-right: 22px; }
  li { margin-bottom: 6px; }
  li::marker { color: var(--accent); }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { border: 1px solid var(--line); padding: 9px 10px; text-align: right; vertical-align: top; }
  th { background: #f7f3ea; font-size: 13px; color: var(--muted); }
  td.num { width: 44px; text-align: center; color: var(--muted); }
  .status { display: inline-block; border-radius: 999px; padding: 1px 10px; font-size: 12px; white-space: nowrap; }
  .status-open { background: #fdeee8; color: #a53a1c; }
  .status-done { background: #e4f5f1; color: #1c6f65; }
  .empty { color: var(--muted); font-size: 14px; }
  .asked { color: var(--muted); font-size: 13px; }
  footer { margin-top: 38px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; display: flex; flex-wrap: wrap; gap: 6px 16px; justify-content: space-between; }
  @media (max-width: 640px) { body { padding: 12px; } main { padding: 26px 20px; border-radius: 12px; } dl { grid-template-columns: 1fr; } h1 { font-size: 24px; } }
  @media print {
    body { background: #fff; padding: 0; font-size: 12px; }
    main { border: none; box-shadow: none; padding: 0; max-width: none; }
    h2 { break-after: avoid; }
    tr, li { break-inside: avoid; }
    footer { margin-top: 24px; }
  }
</style>
</head>
<body>
<main>
  <header>
    <div class="brand">NoxaPlus Meet · صورت‌جلسه</div>
    <h1>${title}</h1>
    ${stats}
    <dl>${facts.join('')}</dl>
  </header>

  <h2>خلاصهٔ مدیریتی</h2>
  ${htmlList(minutes.summary.map((line) => line.text), 'خلاصه‌ای ثبت نشده است.')}

  <h2>تصمیم‌ها</h2>
  ${htmlList(minutes.decisions.map((item) => item.text), 'تصمیمی ثبت نشده است.')}

  <h2>اقدام‌ها</h2>
  <table>
    <thead><tr><th>#</th><th>اقدام</th><th>مسئول</th><th>مهلت</th><th>وضعیت</th></tr></thead>
    <tbody>${actionsRows}</tbody>
  </table>

  <h2>پرسش‌های باز</h2>
  ${questions}

  <h2>ریسک‌ها</h2>
  ${htmlList(minutes.risks.map((item) => item.text), 'ریسکی ثبت نشده است.')}

  <h2>موضوع‌های جلسه</h2>
  ${htmlList(minutes.topics.map((topic) => topic.title), 'موضوعی ثبت نشده است.')}

  <footer>
    <span>تولیدشده با NoxaPlus Meet — صورت‌جلسهٔ محلی و خصوصی</span>
    <span>ساختهٔ NoxaPlus · www.noxaplus.ir</span>
  </footer>
</main>
</body>
</html>
`;
}

export function suggestedFilename(meeting: Meeting, extension: string): string {
  const base = `${meeting.meta.title}-${meeting.meta.date}`
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${base || 'meeting-minutes'}.${extension}`;
}
