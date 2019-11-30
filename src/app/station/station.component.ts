import { ActivatedRoute } from '@angular/router';
import { Component, OnDestroy, OnInit } from '@angular/core';

import { RadioService } from '../shared/radio.service';
import { StationService } from '../shared/station.service';

@Component({
  selector: 'app-station',
  templateUrl: './station.component.html',
  styleUrls: ['./station.component.scss']
})
export class StationComponent implements OnDestroy, OnInit {
  myStation: StationService;
  stationId: string;

  constructor(
    public radio: RadioService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.stationId = params.get('id');
      this.radio.join(this.stationId);
      console.log(this.radio);
    });
  }

  async start() {
    this.myStation = new StationService(this.radio.context, this.radio.outgoing);
    await this.myStation.start();
    this.radio.start(this.stationId);
  }

  stop() {
    this.myStation.stop();
    this.myStation = null;
    this.radio.stop(this.stationId);
  }

  ngOnDestroy() {
    this.radio.leave(this.stationId);
    this.radio.remove(this.stationId);
  }
}
