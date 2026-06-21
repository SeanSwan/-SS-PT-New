const padDatePart = (value: number): string => String(value).padStart(2, '0');

export const formatLocalCalendarDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  return `${year}-${month}-${day}`;
};

export const getLocalCalendarDateDaysAgo = (daysAgo: number, fromDate: Date = new Date()): string => {
  const localDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  localDate.setDate(localDate.getDate() - daysAgo);
  return formatLocalCalendarDate(localDate);
};

export const toLocalNutritionDate = formatLocalCalendarDate;
