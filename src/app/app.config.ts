import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes'; // Importamos las rutas

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes) // Agregamos el enrutador
  ]
};
