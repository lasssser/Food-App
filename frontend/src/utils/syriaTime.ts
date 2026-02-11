/**
 * Convert UTC date string to Syria timezone (UTC+3)
 * Backend stores dates in UTC, this adds 3 hours for Syria
 */
export const toSyriaDate = (dateString: string): Date => {
  const date = new Date(dateString);
  // If the date string doesn't have timezone info, treat as UTC and add 3 hours
  if (!dateString.includes('+') && !dateString.includes('Z')) {
    date.setHours(date.getHours() + 3);
  } else {
    // Has timezone info - just add 3 hours from UTC
    const utcMs = date.getTime();
    return new Date(utcMs + 3 * 60 * 60 * 1000);
  }
  return date;
};

/**
 * Format date for display in Arabic - Syria timezone
 */
export const formatSyriaDate = (dateString: string): string => {
  const date = toSyriaDate(dateString);
  const day = date.getDate();
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${hours}:${minutes}`;
};

/**
 * Format relative time (e.g., "منذ 5 دقائق") - Syria timezone
 */
export const formatSyriaRelative = (dateString: string): string => {
  const date = toSyriaDate(dateString);
  const now = new Date();
  // Adjust 'now' to Syria timezone too
  const syriaOffset = 3 * 60 * 60 * 1000;
  const nowUtc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const syriaNow = new Date(nowUtc + syriaOffset);
  
  const diff = syriaNow.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7) return `منذ ${days} يوم`;
  return formatSyriaDate(dateString);
};
