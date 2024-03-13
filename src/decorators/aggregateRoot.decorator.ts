import { Inject, Type } from '@nestjs/common';

export const getRepositoryToken = (aggregate: Type<unknown>): string =>
  `${aggregate.name}AggregateRepository`;

export const InjectAggregateRoot = (
  aggregate: Type<unknown>,
): ParameterDecorator => Inject(getRepositoryToken(aggregate));
