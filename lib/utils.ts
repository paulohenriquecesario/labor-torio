import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(digits)}%`;
}

export function formatRoas(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(2)}x`;
}

export function statusPerformance(roas: number | null | undefined): 'lucro' | 'atencao' | 'prejuizo' {
  if (roas === null || roas === undefined) return 'atencao';
  if (roas >= 2) return 'lucro';
  if (roas >= 1) return 'atencao';
  return 'prejuizo';
}
