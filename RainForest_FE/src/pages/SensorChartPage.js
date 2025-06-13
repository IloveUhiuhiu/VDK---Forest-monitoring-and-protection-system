import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SensorChart from '../components/SensorChart';
import SensorAudioButton from '../components/SensorAudioButton';

function SensorChartPage() {
  const { sensorId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="h-full bg-gradient-to-br from-slate-100 to-green-100 flex flex-col items-center py-4 px-1 overflow-hidden">
      <div className="w-full flex flex-col gap-4">
        <div className="flex justify-center">
          <div className="w-full md:w-2/3 bg-white rounded-2xl shadow-2xl p-4 border border-cyan-200 animate-slide-down relative">
            <button
              className="absolute top-3 left-3 px-3 py-1.5 bg-cyan-600 text-white rounded-lg shadow hover:bg-cyan-700 transition z-10 text-sm"
              onClick={() => navigate(-1)}
            >
              ← Quay lại bản đồ
            </button>
            <h2 className="text-xl font-bold text-cyan-700 mb-2 text-center tracking-wide drop-shadow">Biểu đồ realtime cảm biến</h2>
            <SensorChart sensorId={sensorId} onClose={() => navigate(-1)} />
            
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-green-200 animate-slide-down flex flex-col items-center">
          <SensorAudioButton sensorId={sensorId} />
        </div>
      </div>
    </div>
  );
}

export default SensorChartPage;
