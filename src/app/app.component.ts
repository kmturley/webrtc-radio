import { Component } from '@angular/core';

import { RadioService } from './shared/radio.service';
import { StationService } from './shared/station.service';

declare var window: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  station: StationService;
  stationId = 'test';

  constructor(
    public radio: RadioService
  ) {}

  async create(stationId: string) {
    this.station = new StationService(this.radio.context, this.radio.outgoing);
    await this.station.start();
    this.radio.add(stationId);
    this.radio.join(stationId);
  }

  remove(stationId: string) {
    this.station.stop();
    this.station = null;
    this.radio.remove(stationId);
  }
}
