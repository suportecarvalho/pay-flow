export interface Boleto {
  id: string;
  name: string;
  dueDate: string; // DD/MM/YY
  value: number;
  barcode?: string;
  paid: boolean;
  recurring?: boolean;
  sharedWith?: string;
  ownerEmail?: string;
}
