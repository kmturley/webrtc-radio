import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SlugifyPipe } from 'angular-pipes';

import { RadioService } from '../shared/services/radio.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {
  currentUrl = '';
  urlStart = '';
  urlEnd = '';
  inputMessage = 'House';

  constructor(
    public radio: RadioService,
    private router: Router,
    private slugifyPipe: SlugifyPipe
  ) { }

  ngOnInit() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects;
        this.urlStart = window.location.protocol + '//';
        this.urlEnd = ':' + window.location.port + window.location.pathname;
      }
    });
  }

  isActive(url: string) {
    return this.currentUrl.startsWith(url);
  }

  async create(input: string) {
    const stationId = this.slugifyPipe.transform(input);
    this.radio.add(stationId, input);
    this.router.navigate([`/stations/${stationId}`], { queryParams: {create: true} });
  }

}
