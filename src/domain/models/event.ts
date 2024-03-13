import { IEvent } from '@nestjs/cqrs';
import { cloneDeep } from 'lodash';
import * as uuid from 'uuid';

export interface Metadata {
  stream?: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredOn: number;
}

export class Event<P = unknown> implements IEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  private _payload: P;
  private _metadata: Metadata;

  constructor(aggregateId: string, payload?: P) {
    this.eventId = uuid.v4();
    this._payload = { ...payload };
    this.eventType = Object.getPrototypeOf(this).constructor.name;
    this._metadata = {
      aggregateId,
      aggregateVersion: -2,
      occurredOn: Date.now(),
    };
  }

  get payload(): Readonly<P> {
    return this._payload;
  }

  get stream(): string {
    return this._metadata.stream;
  }

  get aggregateId(): Readonly<string> {
    return this._metadata.aggregateId;
  }

  get version(): number {
    return this._metadata.aggregateVersion;
  }

  get metadata(): Readonly<Metadata> {
    return this._metadata;
  }

  withMetadata(metadata: Metadata): Event<P> {
    const event = cloneDeep(this);
    event._metadata = {
      ...metadata,
    };

    return event;
  }

  withPayload(payload: P): Event {
    const event = cloneDeep(this);
    event._payload = {
      ...payload,
    };

    return event;
  }

  withStream(stream: string): Event<P> {
    const event = cloneDeep(this);
    event._metadata = {
      ...this._metadata,
      stream: stream,
    };

    return event;
  }

  withVersion(version: number): Event<P> {
    const event = cloneDeep(this);
    event._metadata = {
      ...this._metadata,
      aggregateVersion: version,
    };

    return event;
  }
}
