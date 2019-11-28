import { Component } from '@angular/core';

import { RadioService } from './shared/radio.service';
import { StationService } from './shared/station.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  stationId = 'test';
  title = 'webrtc-audio-broadcast';

  constructor(
    public radio: RadioService
  ) { }

  async create() {
    const station = new StationService(this.radio.context, this.radio.outgoing);
    await station.start();
    this.join();
  }

  join() {
    this.radio.leaveAll();
    this.radio.join(this.stationId);
  }
}
