interface ValueObjectProps {
  [index: string]: any;
}

export abstract class ValueObject<T extends ValueObjectProps> {
  public readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  public equals(other: ValueObject<T>): boolean {
    if (this.constructor !== other.constructor) {
      return false;
    }

    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
