import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { NgSlugifyPipeModule, SlugifyPipe } from 'angular-pipes';
import adapter from 'webrtc-adapter';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { StationComponent } from './station/station.component';
import { StationsComponent } from './stations/stations.component';

@NgModule({
  declarations: [
    AppComponent,
    StationComponent,
    StationsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    NgSlugifyPipeModule,
    AppRoutingModule
  ],
  providers: [SlugifyPipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
