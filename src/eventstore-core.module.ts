import {
  DynamicModule,
  Global,
  Module,
  OnModuleInit,
  Provider,
} from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { ExplorerService } from '@nestjs/cqrs/dist/services/explorer.service';

import { ConfigService, Event, EventStoreModuleAsyncOptions } from './domain';
import { EventStore } from './eventstore';
import { Config } from './eventstore.config';
import { EVENTSTORE_SETTINGS_TOKEN } from './eventstore.constants';
import { EventStoreMapper } from './eventstore.mapper';
import { EventStoreRestoreCommand } from './eventstore.restore';
import { ProjectionService, TransformService } from './services';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [
    EventStore,
    EventStoreMapper,
    EventStoreRestoreCommand,
    ExplorerService,
    ProjectionService,
    TransformService,
  ],
  exports: [EventStore],
})
export class EventStoreCoreModule implements OnModuleInit {
  constructor(
    private readonly event$: EventBus<Event>,
    private readonly eventStore: EventStore,
  ) {}

  public static forRoot(config: Config): DynamicModule {
    return {
      module: EventStoreCoreModule,
      providers: [{ provide: EVENTSTORE_SETTINGS_TOKEN, useValue: config }],
      exports: [EventStore],
    };
  }

  public static forRootAsync(
    options: EventStoreModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: EventStoreCoreModule,
      providers: [this.createAsyncProvider(options)],
    };
  }

  onModuleInit() {
    this.eventStore.bridgeEventsTo(this.event$.subject$);
    this.event$.publisher = this.eventStore;
  }

  private static createAsyncProvider(
    options: EventStoreModuleAsyncOptions,
  ): Provider {
    if ('useFactory' in options) {
      return {
        provide: EVENTSTORE_SETTINGS_TOKEN,
        ...options,
      };
    }

    return {
      provide: EVENTSTORE_SETTINGS_TOKEN,
      useFactory: async (optionsFactory: ConfigService) =>
        optionsFactory.createEventStoreConfig(),
      ...('useClass' in options
        ? { inject: [options.useClass], scope: options.scope }
        : { inject: [options.useExisting] }),
    };
  }
}
