import { Event } from '../models/event';

export type Transformer = (event: Event) => Event;

export interface TransformRepo {
  [aggregate: string]: Transformer;
}
