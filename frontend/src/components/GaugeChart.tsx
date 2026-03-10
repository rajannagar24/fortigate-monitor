interface GaugeProps {
  value: number;
  max?: number;
  label: string;
  color?: string;
  size?: number;
}

export default function GaugeChart({
  value,
  max = 100,
  label,
  color = "#3b82f6",
  size = 120,
}: GaugeProps) {
  const pct = Math.min(value / max, 1);
  const radius = (size - 16) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference * (1 - pct);

  const getColor = () => {
    if (value > 90) return "#ef4444";
    if (value > 70) return "#f59e0b";
    return color;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Background arc */}
        <path
          d={`M 8 ${size / 2 + 8} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2 + 8}`}
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-800"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M 8 ${size / 2 + 8} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2 + 8}`}
          fill="none"
          stroke={getColor()}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        {/* Value text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          className="fill-gray-900 dark:fill-gray-100 text-xl font-bold"
          fontSize="20"
          fontWeight="bold"
        >
          {Math.round(value)}%
        </text>
      </svg>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-1">{label}</p>
    </div>
  );
}
