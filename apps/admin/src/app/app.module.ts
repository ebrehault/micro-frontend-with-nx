import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { RouterModule } from '@angular/router';
import { AdminPanelModule } from './admin-panel/admin-panel.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    RouterModule.forRoot([], { initialNavigation: 'enabled' }),
    AdminPanelModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
