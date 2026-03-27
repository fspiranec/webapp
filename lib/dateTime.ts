const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return DATE_TIME_FORMAT.format(date);
}

export function formatDateRange(start: string | Date | null | undefined, end: string | Date | null | undefined) {
  const startText = formatDateTime(start);
  if (!startText) return "";
  const endText = formatDateTime(end);
  return endText ? `${startText} - ${endText}` : startText;
}
