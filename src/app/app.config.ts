import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes'; // Importamos las rutas
import { ReCaptcha2Component } from "ngx-captcha";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes) // Agregamos el enrutador
  ]
};
