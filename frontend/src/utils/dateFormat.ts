const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: userTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: 'numeric',
  minute: '2-digit',
});

const dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: userTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const chartDateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: userTimeZone,
  month: 'short',
  day: 'numeric',
});

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return dateTimeFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    if (ISO_DATE_RE.test(iso)) {
      const [y, m, d] = iso.split('-').map((v) => Number(v));
      return dateOnlyFormatter.format(new Date(y, m - 1, d));
    }
    return dateOnlyFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatChartDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return chartDateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function isISODateString(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return ISO_DATETIME_RE.test(val) || ISO_DATE_RE.test(val);
}

export function autoFormatCell(val: unknown): string {
  if (val == null) return '';
  if (isISODateString(val)) {
    return ISO_DATETIME_RE.test(val) ? formatDateTime(val) : formatDate(val);
  }
  return String(val);
}
