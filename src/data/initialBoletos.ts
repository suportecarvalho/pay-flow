import type { Boleto } from '../types/boleto';

export const INITIAL_BOLETOS: Boleto[] = [
  {
    id: '1',
    name: 'Tia maria',
    dueDate: '16/03/21',
    value: 2131.33,
    barcode: '23793.38128 60000.000003 00000.000400 1 84340000213133',
    paid: false,
  },
  {
    id: '2',
    name: 'Monitor Dell',
    dueDate: '02/05/21',
    value: 1764.9,
    barcode: '34191.79001 01043.510047 91020.150008 8 86080000176490',
    paid: false,
  },
  {
    id: '3',
    name: 'League of Legends',
    dueDate: '09/08/21',
    value: 64.0,
    barcode: '00190.00009 02749.261006 00000.011700 4 87070000006400',
    paid: false,
  },
  {
    id: '4',
    name: 'Aluguel de Julho',
    dueDate: '09/08/21',
    value: 5531.0,
    barcode: '10498.12345 67890.123456 78901.234567 2 87070000553100',
    paid: false,
  },
  {
    id: '5',
    name: 'Boteco da Vó',
    dueDate: '16/03/21',
    value: 14.0,
    barcode: '03399.12345 67890.123456 78901.234567 5 85610000001400',
    paid: false,
  },
  {
    id: '6',
    name: 'Aleatório',
    dueDate: '02/05/21',
    value: 880.0,
    barcode: '23791.23456 78901.234567 89012.345678 9 86080000088000',
    paid: false,
  },
];

export function formatCurrencyBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
