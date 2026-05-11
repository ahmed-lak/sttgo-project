import { Depot } from './Depot';

export interface Citerne {
  id: number;
  nom: string;
  produit: string;
  type: 'HORIZONTAL' | 'VERTICAL';
  capaciteMax: number;
  depot?: Depot | null;
}