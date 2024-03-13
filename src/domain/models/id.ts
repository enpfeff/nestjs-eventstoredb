import { ValueObject } from './valueObject';

interface Props {
  value: string;
}

export class Id extends ValueObject<Props> {
  constructor(id: string) {
    super({ value: id });
  }

  get value(): string {
    return this.props.value;
  }
}
