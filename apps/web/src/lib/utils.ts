import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatDate(value?: string | Date | null) {
  if (!value) return '';
  return format(new Date(value), 'MMM d, yyyy');
}

export function formatRelative(value?: string | Date | null) {
  if (!value) return '';
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}
