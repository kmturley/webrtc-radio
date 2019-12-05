import { Component, OnInit } from '@angular/core';

import { RadioService } from '../shared/services/radio.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {

  constructor(
    public radio: RadioService,
  ) { }

  ngOnInit() {
  }

}