import { Component, OnInit } from '@angular/core';

import { RadioService } from '../shared/services/radio.service';

@Component({
  selector: 'app-listeners',
  templateUrl: './listeners.component.html',
  styleUrls: ['./listeners.component.scss']
})
export class ListenersComponent implements OnInit {

  constructor(
    public radio: RadioService,
  ) { }

  ngOnInit() {
  }

}
