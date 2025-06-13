import './App.css';
import MapWithSensors from './components/MapWithSensors';
import SensorChartPage from './pages/SensorChartPage';
import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Custom animation for fade-in-up and pop-in
// You can move these to index.css if you want
const style = document.createElement('style');
style.innerHTML = `
@keyframes fade-in-up {
  0% { opacity: 0; transform: translateY(40px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.5s cubic-bezier(0.4,0,0.2,1);
}
@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
}
.animate-pop-in {
  animation: pop-in 0.4s cubic-bezier(0.4,0,0.2,1);
}
@keyframes slide-down {
  0% { opacity: 0; transform: translateY(-60px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-slide-down {
  animation: slide-down 0.5s cubic-bezier(0.4,0,0.2,1);
}
`;
document.head.appendChild(style);

function App() {
  const chartRef = useRef(null);

  useEffect(() => {
    // Lắng nghe sự kiện custom khi chọn sensor để scroll xuống
    const handler = () => {
      setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100); // delay để modal render xong
    };
    window.addEventListener('sensor-chart-open', handler);
    return () => window.removeEventListener('sensor-chart-open', handler);
  }, []);

  return (
    <Router>
      <div className="App overflow-hidden">
        <h2>Bản đồ cảm biến (Sensor Map)</h2>
        <Routes>
          <Route path="/" element={<MapWithSensors chartRef={chartRef} />} />
          <Route path="/sensor/:sensorId" element={<SensorChartPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
