import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { RadioService } from '../shared/services/radio.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {
  currentUrl = '';

  constructor(
    public radio: RadioService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects;
        console.log('currentUrl', this.currentUrl);
      }
    });
  }

  isActive(url: string) {
    return this.currentUrl.startsWith(url);
  }

}
