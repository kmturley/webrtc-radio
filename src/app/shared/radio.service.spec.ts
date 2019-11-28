import { TestBed } from '@angular/core/testing';

import { RadioService } from './radio.service';

describe('RadioService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RadioService = TestBed.get(RadioService);
    expect(service).toBeTruthy();
  });
});
