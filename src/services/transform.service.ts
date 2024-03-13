import { ResolvedEvent } from '@eventstore/db-client';
import { Injectable } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';

import { Transformer, TransformRepo } from '../domain';

export const EVENT_STORE_TRANSFORMER = 'EVENT_STORE_TRANSFORMER';

@Injectable()
export class TransformService {
  private readonly repo: TransformRepo;

  constructor(private readonly modules: ModulesContainer) {
    const transformers = [...this.modules.values()]
      .flatMap((module) => [...module.providers.values()])
      .filter(({ name }) => name === EVENT_STORE_TRANSFORMER)
      .flatMap(({ instance }) =>
        Object.entries(instance as unknown as TransformRepo),
      );

    this.repo = Object.fromEntries(transformers) as TransformRepo;
  }

  public getTransformerToEvent(resolvedEvent: ResolvedEvent): Transformer {
    const type = resolvedEvent.event?.type;

    if (!type) {
      throw new Error('No event type found');
    }

    const transformer = this.repo[type];
    if (!transformer) {
      throw new Error(`No transformer found for event type ${type}`);
    }
    return transformer;
  }
}
