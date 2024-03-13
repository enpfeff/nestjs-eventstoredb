import { Type } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';

import { AggregateRoot, Event, Id } from './domain';
import { EventStore } from './eventstore';

export class AggregateRepository<T extends AggregateRoot, U extends Id> {
  constructor(
    private readonly Aggregate: Type<T>,
    private readonly eventStore: EventStore,
    private readonly publisher: EventPublisher<Event>,
  ) {}

  public async find(id: U): Promise<T> | null {
    return this.eventStore.read<T>(this.Aggregate, id.value);
  }

  public save(entity: T) {
    entity = this.publisher.mergeObjectContext<any>(entity);
    entity.commit();
  }

  public async delete(entity: T): Promise<void> {
    this.save(entity);
  }
}
