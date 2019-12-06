import { Component, OnInit } from '@angular/core';
import { SlugifyPipe } from 'angular-pipes';
import { Router } from '@angular/router';

import { RadioService } from '../shared/services/radio.service';

@Component({
  selector: 'app-stations',
  templateUrl: './stations.component.html',
  styleUrls: ['./stations.component.scss']
})
export class StationsComponent implements OnInit {
  inputMessage = 'test';

  constructor(
    public radio: RadioService,
    private router: Router,
    private slugifyPipe: SlugifyPipe
  ) { }

  ngOnInit() {
  }

  async create(input: string) {
    const stationId = this.slugifyPipe.transform(input);
    this.radio.add(stationId);
    this.router.navigate([`/stations/${stationId}`]);
  }
}
