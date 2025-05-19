import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/authentication.service';

@Component({
  selector: 'app-notification-badge',
  templateUrl: './notification-badge.component.html',
  styleUrls: ['./notification-badge.component.css'],
  standalone: true,
  imports: [CommonModule, RouterLink]
})
export class NotificationBadgeComponent implements OnInit, OnDestroy {
  noLeidasCount = 0;
  isLoading = false;
  error: string | null = null;
  private userId: string | null = null;
  private refreshSubscription: Subscription | null = null;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener el ID del usuario actual o suscribirse para conseguirlo
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.userId = currentUser.id;
      this.cargarConteo();
      this.iniciarActualizacionAutomatica();
    } else {
      this.authService.getUserInfo().subscribe({
        next: (userInfo) => {
          if (userInfo && userInfo.id) {
            this.userId = userInfo.id;
            this.cargarConteo();
            this.iniciarActualizacionAutomatica();
          }
        },
        error: (error) => {
          console.error('Error al obtener información del usuario:', error);
          this.error = 'No se pudo cargar las notificaciones';
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  cargarConteo(): void {
    if (!this.userId) return;
    
    this.isLoading = true;
    this.notificationService.contarNoLeidas(this.userId).subscribe({
      next: (res: any) => {
        this.noLeidasCount = res.count || 0;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar conteo de notificaciones:', error);
        this.isLoading = false;
        // No mostrar error en la interfaz para evitar distracciones al usuario
      }
    });
  }

  private iniciarActualizacionAutomatica(): void {
    if (!this.userId) return;
    
    // Actualizar automáticamente cada 30 segundos
    this.refreshSubscription = interval(30000).pipe(
      switchMap(() => this.notificationService.contarNoLeidas(this.userId!))
    ).subscribe({
      next: (res: any) => {
        this.noLeidasCount = res.count || 0;
      },
      error: (error) => {
        console.error('Error en actualización automática de notificaciones:', error);
        // No cancelamos la suscripción para que siga intentando
      }
    });
  }
}