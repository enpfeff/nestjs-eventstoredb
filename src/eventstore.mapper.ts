import { JSONType, ResolvedEvent } from '@eventstore/db-client';
import { Injectable, Logger } from '@nestjs/common';

import { Event, Metadata } from './domain';
import { TransformService } from './services/transform.service';

@Injectable()
export class EventStoreMapper {
  logger: Logger = new Logger(EventStoreMapper.name);
  constructor(private readonly transformers: TransformService) {}

  public resolveEventToDomainEvent(resolvedEvent: ResolvedEvent): Event | null {
    const { event } = resolvedEvent;
    if (event === undefined || event.type.startsWith('$')) {
      return null;
    }

    const metadata = event.metadata as unknown as Metadata;
    const payload = this.extractPayload(resolvedEvent);
    try {
      const transformer =
        this.transformers.getTransformerToEvent(resolvedEvent);
      return transformer?.(
        new Event(metadata.aggregateId, payload),
      ).withMetadata(metadata);
    } catch (e) {
      this.logger.warn(`Failed to transform event ${event.type}`);
      return null;
    }
  }

  private extractPayload(event: ResolvedEvent): JSONType {
    if (event.event === undefined) {
      throw new Error('Event is undefined in extract payload');
    }
    return event.event.data as JSONType;
  }
}
