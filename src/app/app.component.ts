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
  joined = false;
  owner = false;
  stationId = 'test';

  constructor(
    public radio: RadioService
  ) {
    window.radio = this.radio;
  }

  async create() {
    const station = new StationService(this.radio.context, this.radio.outgoing);
    await station.start();
    this.owner = true;
    this.join(this.stationId);
  }

  join(id: string) {
    this.joined = true;
    this.radio.leaveAll();
    this.radio.join(id);
    this.stationId = id;
  }
}
