import type { Boleto } from '../types/boleto';
import { supabase } from './supabase';

interface BoletoRow {
  id: string;
  user_id: string;
  name: string;
  due_date: string;
  value: number | string;
  barcode: string | null;
  paid: boolean;
  recurring?: boolean;
}

function getLocalKey(userId: string): string {
  return `payflow_boletos_v1_${userId}`;
}

export function loadLocalBoletos(userId: string): Boleto[] {
  try {
    const saved = localStorage.getItem(getLocalKey(userId));
    if (saved) return JSON.parse(saved) as Boleto[];
  } catch {
    // Ignore storage errors
  }
  return [];
}

export function saveLocalBoletos(userId: string, boletos: Boleto[]): void {
  try {
    localStorage.setItem(getLocalKey(userId), JSON.stringify(boletos));
  } catch {
    // Ignore storage errors
  }
}

function mapRowToBoleto(row: BoletoRow): Boleto {
  return {
    id: row.id,
    name: row.name,
    dueDate: row.due_date,
    value: Number(row.value),
    barcode: row.barcode ?? undefined,
    paid: row.paid,
    recurring: Boolean(row.recurring),
  };
}

export async function fetchUserBoletos(userId: string): Promise<Boleto[]> {
  if (!supabase) {
    return loadLocalBoletos(userId);
  }

  const { data, error } = await supabase
    .from('boletos')
    .select('id, user_id, name, due_date, value, barcode, paid, recurring')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return loadLocalBoletos(userId);
  }

  const mapped = (data as BoletoRow[]).map(mapRowToBoleto);
  saveLocalBoletos(userId, mapped);
  return mapped;
}

export async function createUserBoleto(
  userId: string,
  input: {
    name: string;
    dueDate: string;
    value: number;
    barcode?: string;
    recurring?: boolean;
  }
): Promise<Boleto> {
  if (!supabase) {
    return {
      id: String(Date.now()),
      name: input.name,
      dueDate: input.dueDate,
      value: input.value,
      barcode: input.barcode,
      paid: false,
      recurring: Boolean(input.recurring),
    };
  }

  const { data, error } = await supabase
    .from('boletos')
    .insert({
      user_id: userId,
      name: input.name,
      due_date: input.dueDate,
      value: input.value,
      barcode: input.barcode ?? null,
      paid: false,
      recurring: Boolean(input.recurring),
    })
    .select('id, user_id, name, due_date, value, barcode, paid, recurring')
    .single();

  if (error || !data) {
    console.error('Supabase insert error:', error);
    throw new Error(
      error?.message || 'Não foi possível salvar o boleto no Supabase.'
    );
  }

  return mapRowToBoleto(data as BoletoRow);
}

export async function setBoletoPaidStatus(
  userId: string,
  boletoId: string,
  paid: boolean
): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('boletos')
    .update({ paid })
    .eq('id', boletoId)
    .eq('user_id', userId);
}

export async function deleteUserBoleto(
  userId: string,
  boletoId: string
): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('boletos')
    .delete()
    .eq('id', boletoId)
    .eq('user_id', userId);
}
