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
  selector: 'app-grafico-barra-horizontal',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './grafico-barra-horizontal.component.html',
  styleUrls: ['./grafico-barra-horizontal.component.scss']
})
export class GraficoBarraHorizontalComponent implements OnDestroy {

  restaurantes = input<Restaurante[]>([]);

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvasHorizontal');

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
  // GRÁFICO — Barras horizontales: restaurantes por tipo de establecimiento
  //
  // TIPO: 'bar' con indexAxis: 'y'
  //   Por defecto las barras son verticales (indexAxis: 'x').
  //   Cambiando a indexAxis: 'y' los ejes se intercambian:
  //     · Eje Y → categorías (tipos de establecimiento), sin escala numérica.
  //     · Eje X → valores numéricos (cantidad de restaurantes).
  //   Las barras horizontales son más legibles cuando las etiquetas
  //   de categoría son largas y no caben en el eje X sin rotarlas.
  //
  // PREPARACIÓN DE DATOS:
  //   Un Map<tipo, conteo> agrupa los restaurantes por tipo y el resultado
  //   se ordena de mayor a menor para que la barra más larga quede arriba.
  //
  // ESCALAS:
  //   · scales.x → eje de valores (beginAtZero: true, stepSize: 1)
  //   · scales.y → eje de categorías, sin cuadrícula.
  // borderRadius: 6 → redondea el extremo derecho de cada barra.
  //   En modo horizontal, borderSkipped no es necesario porque el redondeo
  //   solo afecta al extremo libre (el opuesto a la base).
  // *************************************************************************
  private render(data: Restaurante[], canvas: HTMLCanvasElement) {
    // ANTES DE VOLVER A PINTAR, LIBERA LA INSTANCIA ANTERIOR DEL CANVAS.
    this.chart?.destroy();

    // AGRUPA LOS RESTAURANTES POR TIPO DE ESTABLECIMIENTO.
    const counts = new Map<string, number>();
    data.forEach(r => {
      const tipo = r.restorationType?.trim() || 'Desconocido';
      counts.set(tipo, (counts.get(tipo) ?? 0) + 1);
    });

    // ORDENA DE MAYOR A MENOR PARA COLOCAR LAS BARRAS MÁS IMPORTANTES ARRIBA.
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([tipo]) => tipo);
    const values = sorted.map(([, cantidad]) => cantidad);
    const backgroundColor = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length] + 'bb');
    const borderColor = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);

    this.chart = new Chart(canvas, {
      type: 'bar',
      // PONE LAS BARRAS EN ORIENTACIÓN HORIZONTAL.
      data: {
        labels,
        datasets: [{
          label: 'Restaurantes',
          data: values,
          backgroundColor,
          borderColor,
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Tipos de establecimiento',
            font: { size: 15, weight: 'bold' },
            color: '#333',
            padding: { bottom: 14 }
          },
          tooltip: {
            callbacks: {
              // MUESTRA LA CANTIDAD DEL EJE HORIZONTAL EN EL TOOLTIP.
              label: ctx => ` ${ctx.parsed.x} restaurantes`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#555' },
            grid: { color: 'rgba(0,0,0,0.06)' }
          },
          y: {
            ticks: { color: '#555' },
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
