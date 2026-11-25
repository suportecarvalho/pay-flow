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
  shared_with?: string | null;
  owner_email?: string | null;
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
    sharedWith: row.shared_with ?? undefined,
    ownerEmail: row.owner_email ?? undefined,
  };
}

export async function fetchUserBoletos(
  userId: string,
  userEmail?: string
): Promise<Boleto[]> {
  if (!supabase) {
    return loadLocalBoletos(userId);
  }

  let query = supabase
    .from('boletos')
    .select(
      'id, user_id, name, due_date, value, barcode, paid, recurring, shared_with, owner_email'
    )
    .order('created_at', { ascending: false });

  const normalizedEmail = userEmail?.trim().toLowerCase();
  if (normalizedEmail) {
    query = query.or(
      `user_id.eq.${userId},shared_with.eq.${normalizedEmail}`
    );
  } else {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

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
    sharedWith?: string;
    ownerEmail?: string;
  }
): Promise<Boleto> {
  const normalizedShared = input.sharedWith?.trim().toLowerCase() || null;

  if (!supabase) {
    return {
      id: String(Date.now()),
      name: input.name,
      dueDate: input.dueDate,
      value: input.value,
      barcode: input.barcode,
      paid: false,
      recurring: Boolean(input.recurring),
      sharedWith: normalizedShared ?? undefined,
      ownerEmail: input.ownerEmail,
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
      shared_with: normalizedShared,
      owner_email: input.ownerEmail?.trim().toLowerCase() ?? null,
    })
    .select(
      'id, user_id, name, due_date, value, barcode, paid, recurring, shared_with, owner_email'
    )
    .single();

  if (error || !data) {
    console.error('Supabase insert error:', error);
    throw new Error(
      error?.message || 'Não foi possível salvar o boleto no Supabase.'
    );
  }

  return mapRowToBoleto(data as BoletoRow);
}

export async function updateUserBoleto(
  boletoId: string,
  input: {
    name: string;
    dueDate: string;
    value: number;
    barcode?: string;
    recurring: boolean;
    sharedWith?: string;
  }
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('boletos')
    .update({
      name: input.name,
      due_date: input.dueDate,
      value: input.value,
      barcode: input.barcode ?? null,
      recurring: input.recurring,
      shared_with: input.sharedWith?.trim().toLowerCase() || null,
    })
    .eq('id', boletoId);

  if (error) {
    throw new Error(error.message || 'Erro ao atualizar boleto.');
  }
}

export async function setBoletoPaidStatus(
  boletoId: string,
  paid: boolean
): Promise<void> {
  if (!supabase) return;

  await supabase.from('boletos').update({ paid }).eq('id', boletoId);
}

export async function deleteUserBoleto(boletoId: string): Promise<void> {
  if (!supabase) return;

  await supabase.from('boletos').delete().eq('id', boletoId);
}
