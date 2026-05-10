/* Chart.js helpers — opinionated dark theme defaults */
window.charts = (function () {
  const T0 = '#E6E8EE', T1 = '#A0A6B8', T2 = '#6B7184';
  const GRID = 'rgba(255, 255, 255, 0.05)';
  const ACC = '#7C5CFF', ACC2 = '#22D3EE';

  function applyDefaults() {
    if (!window.Chart) return;
    Chart.defaults.color = T1;
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.borderColor = GRID;
    Chart.defaults.scale.grid.color = GRID;
    Chart.defaults.scale.ticks.color = T2;
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.legend.labels.font = { size: 11 };
    Chart.defaults.plugins.tooltip.backgroundColor = '#15182380';
    Chart.defaults.plugins.tooltip.borderColor = '#2A3040';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 8;
    Chart.defaults.plugins.tooltip.titleColor = T0;
    Chart.defaults.plugins.tooltip.bodyColor = T1;
  }

  function line(canvas, labels, data, label = '') {
    applyDefaults();
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
    grad.addColorStop(0, 'rgba(124, 92, 255, 0.45)');
    grad.addColorStop(1, 'rgba(124, 92, 255, 0)');
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label,
          data,
          borderColor: ACC,
          backgroundColor: grad,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: !!label } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }

  function bar(canvas, labels, data, opts = {}) {
    applyDefaults();
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: opts.label || '',
          data,
          backgroundColor: opts.colors || ACC,
          borderRadius: 4,
          barThickness: opts.barThickness || 'flex',
          maxBarThickness: 28,
        }],
      },
      options: {
        indexAxis: opts.horizontal ? 'y' : 'x',
        maintainAspectRatio: false,
        plugins: { legend: { display: !!opts.label } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }

  function doughnut(canvas, labels, data, colors) {
    applyDefaults();
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors || [
            ACC, ACC2, '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#F472B6',
          ],
          borderColor: '#0F1117',
          borderWidth: 2,
        }],
      },
      options: {
        cutout: '70%',
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 14 } },
        },
      },
    });
  }

  function groupedBar(canvas, labels, datasets) {
    applyDefaults();
    const palette = [ACC, ACC2, '#10B981', '#F59E0B', '#EF4444'];
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          ...ds,
          backgroundColor: ds.color || palette[i % palette.length],
          borderRadius: 4,
          maxBarThickness: 22,
        })),
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  return { line, bar, doughnut, groupedBar, applyDefaults };
})();
