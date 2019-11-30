import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StationComponent } from './station/station.component';
import { StationsComponent } from './stations/stations.component';

const routes: Routes = [
  { path: '', component: StationsComponent },
  { path: 'stations/:id', component: StationComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
