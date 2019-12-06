import { Expose, Deserializable } from './deserialize';

export class StationModel extends Deserializable {
  @Expose broadcasting: boolean;
  @Expose id: string;
  @Expose listeners: Array<string>;
  @Expose owner: string;
}
