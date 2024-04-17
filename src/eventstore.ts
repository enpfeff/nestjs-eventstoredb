import {
  AppendExpectedRevision,
  END,
  EventData,
  EventStoreDBClient,
  FORWARDS,
  jsonEvent,
  JSONType,
  NO_STREAM,
  ResolvedEvent,
  START,
} from '@eventstore/db-client';
import { Inject, Injectable, Logger, Type } from '@nestjs/common';
import { IEventPublisher, IMessageSource } from '@nestjs/cqrs';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { AggregateRoot, Event } from './domain';
import { Config } from './eventstore.config';
import { EVENTSTORE_SETTINGS_TOKEN } from './eventstore.constants';
import { EventStoreMapper } from './eventstore.mapper';

@Injectable()
export class EventStore
  implements IEventPublisher<Event>, IMessageSource<Event>
{
  private client: EventStoreDBClient;
  private readonly logger = new Logger(EventStore.name);

  constructor(
    @Inject(EVENTSTORE_SETTINGS_TOKEN) private readonly config: Config,
    private readonly mapper: EventStoreMapper,
  ) {
    this.client = EventStoreDBClient.connectionString(config.connection);
  }

  async bridgeEventsTo<T extends Event>(subject: Subject<T>) {
    const onEvent = async (resolvedEvent: ResolvedEvent) => {
      // these are internal system events
      if (resolvedEvent.event?.type.startsWith('$')) {
        return;
      }

      try {
        const domainEvent = this.mapper.resolveEventToDomainEvent(
          resolvedEvent,
        ) as T;
        if (!domainEvent) {
          return;
        }
        subject.next(domainEvent);
      } catch (e) {
        return;
      }
    };

    try {
      this.client.subscribeToAll({ fromPosition: END }).on('data', onEvent);
    } catch (e) {
      const error = e as Error;
      this.logger.error(`Error bridging events: ${error.message}`);
    }
  }

  async read<T extends AggregateRoot>(
    aggregate: Type<T>,
    id: string,
  ): Promise<T> | null {
    const streamName = `${aggregate.name}-${id}`;

    try {
      // we need to call new on an abstract class to get an instance of it, lets relflect construct it
      const entity = <T>Reflect.construct(aggregate, []);
      const resolvedEvents = this.client.readStream(streamName, {
        direction: FORWARDS,
        fromRevision: START,
      });
      const events = [] as Event[];

      for await (const event of resolvedEvents) {
        const mappedEvent = this.mapper.resolveEventToDomainEvent(event);
        if (!mappedEvent) {
          continue;
        }
        events.push(mappedEvent);
      }

      entity.loadFromHistory(events);
      return entity;
    } catch (e) {
      if (e?.type === 'stream-not-found') {
        return null;
      }
      this.logger.error(e);
    }

    return null;
  }

  async publish<T extends Event>(event: T) {
    const streamName = this.getStreamName(event);
    const expectedRevision = this.getExpectedRevision(event);

    const eventData = await this.createEventData(event);

    try {
      await this.client.appendToStream(streamName, eventData, {
        expectedRevision,
      });
    } catch (e) {
      const error = e as Error;
      this.logger.error(`Error publishing event`, error);
    }
  }

  private getStreamName<T extends Event>(event: T) {
    return `${event.stream}-${event.aggregateId}`;
  }

  private getExpectedRevision<T extends Event>(
    event: T,
  ): AppendExpectedRevision {
    return event.version <= 0 ? NO_STREAM : BigInt(event.version - 1);
  }

  private async createEventData<T extends Event>(event: T): Promise<EventData> {
    return jsonEvent({
      if: uuid(),
      type: event.eventType,
      data: event.payload as JSONType,
      metadata: event.metadata,
    });
  }
}
