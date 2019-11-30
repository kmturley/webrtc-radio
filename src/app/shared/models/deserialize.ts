import 'reflect-metadata';

const CUSTOM_PROPS = 'custom:properties';

export function Expose(target: any, key: string) {
  const properties = Reflect.getMetadata(CUSTOM_PROPS, target) || [];
  properties.push(key);
  Reflect.defineMetadata(CUSTOM_PROPS, properties, target);
}

export class Deserializable {
  deserialize(input: object): this {
    const properties = Reflect.getMetadata(CUSTOM_PROPS, this);
    properties.forEach(key => {
      this[key] = input[key];
    });
    return this;
  }
}
