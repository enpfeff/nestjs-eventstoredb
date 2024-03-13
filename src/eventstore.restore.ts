import { EventStoreDBClient, FORWARDS, START } from '@eventstore/db-client';
import { Inject, Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';

import { Event } from './domain';
import { Config } from './eventstore.config';
import { EVENTSTORE_SETTINGS_TOKEN } from './eventstore.constants';
import { EventStoreMapper } from './eventstore.mapper';
import { ProjectionService } from './services/projection.service';

@Command({
  name: 'eventstore:readmodel:restore',
  description: 'Restore Read Model',
})
export class EventStoreRestoreCommand extends CommandRunner {
  private readonly client: EventStoreDBClient;
  private readonly logger = new Logger(EventStoreRestoreCommand.name);
  private readonly eventHandlers;

  constructor(
    private readonly mapper: EventStoreMapper,
    projection: ProjectionService,
    @Inject(EVENTSTORE_SETTINGS_TOKEN) config: Config,
  ) {
    super();
    this.client = EventStoreDBClient.connectionString(config.connection);
    this.eventHandlers = projection.eventHandlers();
  }

  async run() {
    const resolvedEvents = this.client.readAll({
      direction: FORWARDS,
      fromPosition: START,
      resolveLinkTos: false,
    });

    for await (const resolvedEvent of resolvedEvents) {
      if (resolvedEvent.event?.type.startsWith('$')) {
        continue;
      }

      const event = this.mapper.resolveEventToDomainEvent(resolvedEvent);
      if (!event) continue;

      this.handleEvent(event);
    }

    this.logger.log('Read model restored');
    process.exit(0);
  }

  private async handleEvent(event: Event) {
    const key = event.constructor.name;
    for (const eventHandler of this.eventHandlers[key]) {
      await eventHandler.handle(event);
    }
  }
}
