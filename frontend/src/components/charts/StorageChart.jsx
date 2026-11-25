import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { CATEGORY_COLORS, formatBytes } from '../../utils/format';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function StorageChart({ storageByCategory = {} }) {
  const labels = Object.keys(storageByCategory);
  const values = Object.values(storageByCategory);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Storage',
        data: values,
        backgroundColor: labels.map((l) => CATEGORY_COLORS[l] || CATEGORY_COLORS.other),
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => formatBytes(ctx.raw),
        },
      },
    },
    scales: {
      x: { ticks: { color: '#66748e' }, grid: { display: false } },
      y: {
        ticks: {
          color: '#66748e',
          callback: (v) => formatBytes(v),
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
  };

  if (!labels.length) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="empty-state-icon">
            <div className="w-2 h-2 rounded-full bg-surface-500" />
          </div>
          <p className="text-xs text-surface-500">No storage data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-56">
      <Bar data={chartData} options={options} />
    </div>
  );
}
