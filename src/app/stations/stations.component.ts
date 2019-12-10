import { Component, OnInit } from '@angular/core';

import { RadioService } from '../shared/services/radio.service';

@Component({
  selector: 'app-stations',
  templateUrl: './stations.component.html',
  styleUrls: ['./stations.component.scss']
})
export class StationsComponent implements OnInit {

  constructor(
    public radio: RadioService
  ) { }

  ngOnInit() {
  }
}
