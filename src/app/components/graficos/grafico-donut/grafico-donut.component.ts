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
  selector: 'app-grafico-donut',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './grafico-donut.component.html',
  styleUrls: ['./grafico-donut.component.scss']
})
export class GraficoDonutComponent implements OnDestroy {

  restaurantes = input<Restaurante[]>([]);

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvasDonut');

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
  // GRÁFICO — Donut: top 10 localidades con más restaurantes
  //
  // TIPO: 'doughnut' (donut = variante del gráfico de sectores/pie con hueco)
  //   · 'pie' rellena todo el círculo.
  //   · 'doughnut' deja un hueco en el centro (visualmente más limpio).
  //   · NO usa escalas (scales), porque no hay ejes X/Y.
  //   · La leyenda es especialmente importante aquí porque los colores son
  //     la única forma de identificar cada sector.
  //
  // PREPARACIÓN DE DATOS:
  //   1. Contamos restaurantes por localidad con un Map.
  //   2. Convertimos a array, ordenamos de mayor a menor y tomamos los 10 primeros.
  //   3. Asignamos un color distinto a cada localidad recorriendo la paleta
  //      cuando hay más localidades que colores disponibles CHART_PALETTE[i % 10].
  //
  // TOOLTIP CON PORCENTAJE:
  //   Calculamos el total sumando todos los valores del dataset y dividimos
  //   el valor del sector entre el total para obtener el porcentaje.
  //
  // LEYENDA A LA DERECHA (position: 'right'):
  //   Con 10 etiquetas, colocarla abajo ocuparía demasiado espacio vertical.
  //   A la derecha aprovecha el ancho de pantalla y el donut queda centrado.
  //
  // hoverOffset: cuando el usuario pone el cursor sobre un sector, éste se
  //   desplaza hacia afuera N píxeles, dando retroalimentación visual clara.
  // *************************************************************************
  private render(data: Restaurante[], canvas: HTMLCanvasElement) {
    // ANTES DE VOLVER A PINTAR, LIBERA LA INSTANCIA ANTERIOR DEL CANVAS.
    this.chart?.destroy();

    // AGRUPA LOS RESTAURANTES POR LOCALIDAD.
    const counts = new Map<string, number>();
    data.forEach(r => {
      const loc = r.locality?.trim() || 'Desconocido';
      counts.set(loc, (counts.get(loc) ?? 0) + 1);
    });

    // LIMITA LA REPRESENTACIÓN A LAS DIEZ LOCALIDADES MÁS FRECUENTES.
    const top10 = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const labels = top10.map(([loc]) => loc);
    const values = top10.map(([, cantidad]) => cantidad);
    const backgroundColor = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length] + 'bb');
    const borderColor = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);

    this.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor,
          borderColor,
          borderWidth: 2,
          // hoverOffset: desplaza el sector N px hacia afuera al pasar el ratón
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        animation: { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600 },
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: { color: '#333', usePointStyle: true, padding: 12, boxWidth: 10 }
          },
          title: {
            display: true,
            text: 'Top 10 localidades',
            font: { size: 15, weight: 'bold' },
            color: '#333',
            padding: { bottom: 14 }
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                // CALCULA EL PORCENTAJE REPRESENTADO POR EL SECTOR SELECCIONADO.
                const total = ctx.dataset.data
                  .map(value => Number(value))
                  .reduce((sum, value) => sum + value, 0);
                const porcentaje = total > 0 ? (Number(ctx.parsed) / total) * 100 : 0;
                return ` ${ctx.label}: ${ctx.parsed} restaurantes (${porcentaje.toFixed(1)}%)`;
              }
            }
          }
        }
        // Los gráficos doughnut/pie no usan la propiedad 'scales'
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
