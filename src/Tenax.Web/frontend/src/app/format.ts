export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export const formatRelativeTime = (isoDateTime: string) => {
  const date = new Date(isoDateTime);
  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);

  const absSeconds = Math.abs(diffSeconds);
  if (absSeconds < 60) {
    return relativeTimeFormat.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormat.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormat.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return relativeTimeFormat.format(diffDays, "day");
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return relativeTimeFormat.format(diffMonths, "month");
  }

  const diffYears = Math.round(diffMonths / 12);
  return relativeTimeFormat.format(diffYears, "year");
};
