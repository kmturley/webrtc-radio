import { TestBed } from '@angular/core/testing';

import { ListenerService } from './listener.service';

describe('ListenerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ListenerService = TestBed.get(ListenerService);
    expect(service).toBeTruthy();
  });
});
