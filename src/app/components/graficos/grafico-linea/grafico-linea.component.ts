// *****************************************************************************
// IMPORTS
// *****************************************************************************
import { Component, input, effect, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Chart } from 'chart.js';
import { Restaurante } from '../../../interface/restaurante';
import '../utils/chart-setup';

@Component({
  selector: 'app-grafico-linea',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './grafico-linea.component.html',
  styleUrls: ['./grafico-linea.component.scss']
})
export class GraficoLineaComponent implements OnDestroy {

  restaurantes = input<Restaurante[]>([]);

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvasLinea');

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
  // GRÁFICO — Línea: distinciones gastronómicas por territorio
  //
  // TIPO: 'line' (líneas que unen los puntos de datos de cada serie)
  //
  // PREPARACIÓN DE DATOS:
  //   Recorremos el array y acumulamos en un Map<territorio, {michelin, repsol}>
  //   el total de estrellas Michelin y soles Repsol de cada territorio.
  //   Después filtramos los territorios sin ninguna distinción para no
  //   mostrar entradas vacías, y ordenamos alfabéticamente para que las
  //   etiquetas del eje X sean consistentes entre filtrados.
  //
  // DOS DATASETS (dos líneas):
  //   · dataset[0] → estrellas Michelin  (rojo #eb445a)
  //   · dataset[1] → soles Repsol        (amarillo #ffc409)
  //
  // fill: true → rellena el área bajo la línea con el mismo color al 13%
  //   de opacidad (sufijo '22' en hex), dando profundidad visual sin tapar
  //   la segunda línea.
  //
  // tension: 0.4 → suaviza la línea con curvas Bézier cúbicas.
  //   0 = línea recta entre puntos; 1 = curva muy pronunciada.
  //
  // pointRadius / pointHoverRadius: tamaño del círculo en cada punto de dato.
  //   Al pasar el ratón el radio aumenta para mejorar la interactividad.
  //
  // LEYENDA (display: true):
  //   Con dos series es imprescindible mostrar la leyenda para distinguirlas.
  //   usePointStyle: true dibuja el marcador con la misma forma que los puntos
  //   de la línea en lugar de un rectángulo.
  // *************************************************************************
  private render(data: Restaurante[], canvas: HTMLCanvasElement) {
    // ANTES DE VOLVER A PINTAR, LIBERA LA INSTANCIA ANTERIOR DEL CANVAS.
    this.chart?.destroy();

    // ACUMULA ESTRELLAS MICHELIN Y SOLES REPSOL POR TERRITORIO.
    const mapa = new Map<string, { michelin: number; repsol: number }>();
    data.forEach(r => {
      const territorio = r.territory?.trim() || 'Desconocido';
      const actual = mapa.get(territorio) ?? { michelin: 0, repsol: 0 };
      const estrellas = Number(String(r.michelinStar ?? '').trim()) || 0;
      const soles = Number(String(r.repsolSun ?? '').trim()) || 0;
      mapa.set(territorio, {
        michelin: actual.michelin + estrellas,
        repsol: actual.repsol + soles
      });
    });

    // DESCARTA TERRITORIOS SIN DISTINCIONES Y ORDENA LAS ETIQUETAS ALFABÉTICAMENTE.
    const entries = Array.from(mapa.entries())
      .filter(([, valores]) => valores.michelin > 0 || valores.repsol > 0)
      .sort((a, b) => a[0].localeCompare(b[0], 'es'));

    const labels = entries.map(([territorio]) => territorio);
    const michelin = entries.map(([, valores]) => valores.michelin);
    const repsol = entries.map(([, valores]) => valores.repsol);

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        // CONFIGURA LOS PUNTOS, COLORES Y SERIES DE DATOS.
        datasets: [
          {
            label: '⭐ Estrellas Michelin',
            data: michelin,
            borderColor: '#eb445a',
            backgroundColor: '#eb445a22',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 7
          },
          {
            label: '☀️ Soles Repsol',
            data: repsol,
            borderColor: '#ffc409',
            backgroundColor: '#ffc40922',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600 },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#333', usePointStyle: true } },
          title: {
            display: true,
            text: 'Distinciones gastronómicas por territorio',
            font: { size: 15, weight: 'bold' },
            color: '#333',
            padding: { bottom: 14 }
          },
          tooltip: {
            callbacks: {
              // INCLUYE EL NOMBRE DE LA SERIE Y EL VALOR DEL PUNTO.
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0, color: '#555' },
            grid: { color: 'rgba(0,0,0,0.06)' },
            title: { display: true, text: 'Cantidad de distinciones', color: '#555' }
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
