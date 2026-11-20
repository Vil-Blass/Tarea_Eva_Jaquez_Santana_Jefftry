// *****************************************************************************
// IMPORTS
// *****************************************************************************
import { Component, input, effect, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Chart } from 'chart.js';
import { Restaurante } from '../../../interface/restaurante';
import { CHART_PALETTE } from '../utils/chart-colors';
import '../utils/chart-setup';

@Component({
  selector: 'app-grafico-barra-vertical',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './grafico-barra-vertical.component.html',
  styleUrls: ['./grafico-barra-vertical.component.scss']
})
export class GraficoBarraVerticalComponent implements OnDestroy {

  restaurantes = input<Restaurante[]>([]);

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvasVertical');

  private chart?: Chart;

  constructor() {
    effect(() => {
      const data = this.restaurantes();
      const c = this.canvas();
      if (!c) return;

      this.render(data, c.nativeElement);
    });
  }

  // *************************************************************************
  // GRÁFICO — Barras verticales: restaurantes por territorio
  //
  // TIPO: 'bar' (barras verticales por defecto)
  //
  // PREPARACIÓN DE DATOS:
  //   Usamos un Map<territorio, conteo> para agrupar y contar en una sola
  //   pasada por el array. Después convertimos el Map en un array de pares
  //   [territorio, cantidad] y lo ordenamos de mayor a menor.
  //
  // COLORES:
  //   El sufijo 'bb' en hex es el canal alpha (bb hex = ~73% opacidad),
  //   lo que da el efecto de relleno semitransparente con borde sólido.
  // *************************************************************************
  private render(data: Restaurante[], canvas: HTMLCanvasElement) {
    // ANTES DE VOLVER A PINTAR, LIBERA LA INSTANCIA ANTERIOR DEL CANVAS.
    this.chart?.destroy();

    // AGRUPA LOS RESTAURANTES POR TERRITORIO MEDIANTE UNA ESTRUCTURA MAP.
    const counts = new Map<string, number>();
    data.forEach(r => {
      const territorio = r.territory?.trim() || 'Desconocido';
      counts.set(territorio, (counts.get(territorio) ?? 0) + 1);
    });

    // ORDENA LAS CATEGORÍAS DE MAYOR A MENOR PARA COMPARARLAS MÁS RÁPIDAMENTE.
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([territorio]) => territorio);
    const values = sorted.map(([, cantidad]) => cantidad);
    const backgroundColor = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length] + 'bb');
    const borderColor = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Restaurantes',
          data: values,
          backgroundColor,
          borderColor,
          borderWidth: 2,
          // borderRadius: redondea las esquinas superiores de cada barra
          borderRadius: 8,
          // borderSkipped: false → redondea TODAS las esquinas, no solo la superior
          borderSkipped: false,
        }]
      },
      options: {
        // EL EJE NUMÉRICO COMIENZA EN CERO Y LAS DIVISIONES SON ENTERAS.
        // responsive: true → la gráfica se redimensiona al cambiar el contenedor
        responsive: true,
        // maintainAspectRatio: false → permite controlar la altura desde CSS
        maintainAspectRatio: false,
        animation: { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 },
        plugins: {
          // Ocultamos la leyenda porque el título y el eje X ya identifican los datos
          legend: { display: false },
          title: {
            display: true,
            text: 'Restaurantes por territorio',
            font: { size: 15, weight: 'bold' },
            color: '#333',
            padding: { bottom: 14 }
          },
          tooltip: {
            callbacks: {
              // Sobreescribimos el texto del tooltip para personalizar el mensaje
              label: ctx => ` ${ctx.parsed.y} restaurantes`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0, color: '#555' },
            grid: { color: 'rgba(0,0,0,0.06)' },
            title: { display: true, text: 'Cantidad de restaurantes', color: '#555' }
          },
          x: {
            ticks: {
              color: '#555',
              maxRotation: 45,
              minRotation: labels.length > 5 ? 45 : 0
            },
            grid: { display: false }
          }
        }
      }
    });
  }

  // *************************************************************************
  // ngOnDestroy — imprescindible destruir la instancia de Chart para liberar
  // el canvas, eliminar los event listeners internos y evitar memory leaks.
  // *************************************************************************
  ngOnDestroy() {
    this.chart?.destroy();
  }
}
