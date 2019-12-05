import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';

import { RadioService } from '../shared/services/radio.service';

@Component({
  selector: 'app-listener',
  templateUrl: './listener.component.html',
  styleUrls: ['./listener.component.scss']
})
export class ListenerComponent implements OnInit {
  inputName = '';
  userId: string;

  constructor(
    public radio: RadioService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.userId = params.get('id');
      console.log(this.userId);
    });
  }

  save(input: string) {
    this.radio.updateName(input);
  }

}
