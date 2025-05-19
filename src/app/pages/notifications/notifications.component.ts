import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/authentication.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  userId: string | null = null;
  currentPage: number = 0;
  pageSize: number = 10;
  hasMoreNotifications: boolean = true;
  totalPages: number = 0;
  totalElements: number = 0;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener el ID del usuario actual
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.userId = currentUser.id;
      this.loadNotifications();
    } else {
      this.authService.getUserInfo().subscribe({
        next: (userInfo) => {
          if (userInfo && userInfo.id) {
            this.userId = userInfo.id;
            this.loadNotifications();
          }
        },
        error: (err) => {
          console.error('Error al obtener información del usuario:', err);
          this.error = 'No se pudo cargar la información del usuario';
          this.loading = false;
        }
      });
    }
  }

  loadNotifications(loadMore: boolean = false): void {
    if (!this.userId) return;
    
    if (loadMore) {
      this.currentPage++;
    } else {
      this.loading = true;
      this.notifications = [];
      this.currentPage = 0;
    }

    this.notificationService.getNotificaciones(
      this.userId, 
      undefined, 
      this.currentPage, 
      this.pageSize
    ).subscribe({
      next: (response: any) => {
        const newNotifications = response.content || [];
        
        if (loadMore) {
          this.notifications = [...this.notifications, ...newNotifications];
        } else {
          this.notifications = newNotifications;
        }
        
        // Actualizar información de paginación
        this.totalPages = response.totalPages || 0;
        this.totalElements = response.totalElements || 0;
        this.hasMoreNotifications = !response.last;
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar notificaciones:', err);
        this.error = err.userMessage || 'No se pudieron cargar las notificaciones';
        this.loading = false;
      }
    });
  }

  markAsRead(notificationId: string): void {
    this.notificationService.marcarComoLeida(notificationId).subscribe({
      next: (response) => {
        // Actualizar el estado localmente
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.leido = true;
        }
      },
      error: (err) => {
        console.error('Error al marcar notificación como leída:', err);
      }
    });
  }

  loadMore(): void {
    if (this.hasMoreNotifications && !this.loading) {
      this.loadNotifications(true);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return this.calculateTimeAgo(date);
  }

  private calculateTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 60) {
      return `hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
    }
  }

  refreshNotifications(): void {
    this.loadNotifications();
  }
}