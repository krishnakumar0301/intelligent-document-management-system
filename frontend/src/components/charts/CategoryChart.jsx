import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { CATEGORY_COLORS } from '../../utils/format';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryChart({ categories = {} }) {
  const labels = Object.keys(categories);
  const data = Object.values(categories);

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: labels.map((l) => CATEGORY_COLORS[l] || CATEGORY_COLORS.other),
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#66748e', boxWidth: 12 },
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
          <p className="text-xs text-surface-500">No data yet — scan a folder to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-56">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
