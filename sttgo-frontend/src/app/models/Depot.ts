export interface Depot {
  id?: number;
  nom: string;
  localisation: string;
  produit?: string;
  ordre?: number;
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  temperature?: number;
  humidity?: number;
  alerteTemp?: boolean;
}
