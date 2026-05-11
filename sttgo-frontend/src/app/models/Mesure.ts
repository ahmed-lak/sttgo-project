import { Citerne } from "./Citerne";

export interface Mesure {
  id: number;
  citerne: Citerne;
  niveau: number;
  volume: number;
  pourcentage: number;
  dateMesure: string;
}