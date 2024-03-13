import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';

import { AggregateRepository } from './aggregate.repository';
import { getRepositoryToken } from './decorators';
import {
  AggregateRoot,
  Event,
  EventStoreModuleAsyncOptions,
  TransformRepo,
} from './domain';
import { EventStore } from './eventstore';
import { EventStoreCoreModule } from './eventstore-core.module';
import { EVENT_STORE_TRANSFORMER } from './services';

@Module({})
export class EventStoreModule {
  public static forRoot(): DynamicModule {
    return {
      module: EventStoreModule,
      imports: [],
    };
  }

  public static forRootAsync(
    options: EventStoreModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: EventStoreModule,
      imports: [CqrsModule, EventStoreCoreModule.forRootAsync(options)],
    };
  }

  public static forFeature(
    aggregateRoots: Array<Type<AggregateRoot>>,
    transformer: TransformRepo,
  ): DynamicModule {
    const aggregateProviders =
      this.createAggregateRepositoryProviders(aggregateRoots);

    const transformProvider = {
      provide: EVENT_STORE_TRANSFORMER,
      useValue: transformer,
    };

    return {
      module: EventStoreModule,
      imports: [CqrsModule],
      providers: [transformProvider, ...aggregateProviders],
      exports: [transformProvider, ...aggregateProviders],
    };
  }

  private static createAggregateRepositoryProviders(
    aggregateRoots: Array<Type<AggregateRoot>>,
  ): Provider[] {
    return aggregateRoots.map((aggregateRoot) => ({
      provide: getRepositoryToken(aggregateRoot),
      useFactory: (eventStore: EventStore, publisher: EventPublisher<Event>) =>
        new AggregateRepository(aggregateRoot, eventStore, publisher),
      inject: [EventStore, EventPublisher],
    }));
  }
}
