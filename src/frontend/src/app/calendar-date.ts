export const calendarDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

export function calendarMonth(day: string) {
  return new Date(day.slice(0, 7) + '-01T12:00:00Z');
}
