import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_URL, WS_URL } from '../config';

// Không dùng dayjs, chỉ dùng Date gốc
const getToday = () => {
  const d = new Date();
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD theo local time
};

function SensorChart({ sensorId, onClose }) {
  const [data, setData] = useState([]);
  const [ws, setWs] = useState(null);
  const [pumpState, setPumpState] = useState('close'); 
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(false); // Thêm state bật/tắt âm thanh cảnh báo
  const alertTimeout = useRef(null);
  const audioAlertRef = useRef(null); // Thêm ref cho audio cảnh báo

  // Hàm lấy dữ liệu lịch sử qua HTTP
  const fetchHistory = async (date) => {
    let url = `${API_URL}/api/sensor-history?deviceId=${sensorId}&date=${date}`;
    const res = await fetch(url);
    const arr = await res.json();
    setData(arr.map(msg => ({
      ...msg,
      humidity: msg.humidity,
      temperature: msg.temperature,
      timestamp: msg.timestamp || Date.now(),
      sensorId: msg.device_id || msg.sensorId || sensorId,
    })));
  };

  // Phát âm thanh cảnh báo nếu alertSoundEnabled
  const playAlertSound = useCallback(() => {
    if (!alertSoundEnabled) return;
    if (audioAlertRef.current) {
      audioAlertRef.current.currentTime = 0;
      audioAlertRef.current.play().catch(err => {
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
          const tryPlay = () => {
            audioAlertRef.current.currentTime = 0;
            audioAlertRef.current.play().finally(() => {
              window.removeEventListener('click', tryPlay);
            });
          };
          window.addEventListener('click', tryPlay);
          window.alert('Trình duyệt đã chặn phát âm thanh cảnh báo. Hãy click vào trang để bật âm thanh cảnh báo!');
        } else {
          console.error('[AUDIO] Lỗi phát âm thanh cảnh báo:', err);
        }
      });
    }
  }, [alertSoundEnabled]);

  useEffect(() => {
    setData([]);
    if (selectedDate === getToday()) { 
      const wsInstance = new WebSocket(`${WS_URL}/sensor/?deviceId=${sensorId}`);
      wsInstance.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('Received message:', msg, msg.temperature, msg.humidity, typeof msg.temperature, typeof msg.humidity);
          if (
            msg.temperature !== undefined &&
            msg.humidity !== undefined &&
            !isNaN(parseFloat(msg.temperature)) &&
            !isNaN(parseFloat(msg.humidity)) &&
            parseFloat(msg.temperature) > 40 &&
            parseFloat(msg.humidity) < 35
          ) {
            setPumpState('open');
            if (!alertTimeout.current) {
              alert('Cảnh báo: Nhiệt độ quá cao và độ ẩm quá thấp! Bơm nước đã được bật.');
              // Phát âm thanh cảnh báo nếu được bật
              playAlertSound();
              alertTimeout.current = setTimeout(() => {
                alertTimeout.current = null;
              }, 10000);
            }
          }
          setData(prev => [
            ...prev.slice(-19),
            {
              ...msg,
              humidity: msg.humidity,
              temperature: msg.temperature,
              timestamp: msg.timestamp || Date.now(),
              sensorId: msg.device_id || msg.sensorId || sensorId,
            }
          ]);
        } catch (e) {
          // Nếu nhận được chuỗi 'open' hoặc 'close' thì cập nhật trạng thái bơm
          if (event.data === 'open' || event.data === 'close') {
            setPumpState(event.data);
          }
        }
      };
      setWs(wsInstance);
      return () => wsInstance.close();
    } else {
      // Lấy dữ liệu lịch sử qua HTTP
      fetchHistory(selectedDate);
      setWs(null);
    }
  }, [sensorId, selectedDate, playAlertSound]);

  useEffect(() => {
    return () => {
      if (alertTimeout.current) clearTimeout(alertTimeout.current);
    };
  }, []);

  const handlePump = () => {
    if (ws && ws.readyState === 1) {
      const nextState = pumpState === 'open' ? 'close' : 'open';
      ws.send(nextState);
      setPumpState(nextState);
      alert(`Đã gửi lệnh ${nextState === 'open' ? 'bật' : 'tắt'} bơm nước thành công!`);
    } else {
      alert('WebSocket chưa kết nối!');
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-2 justify-between items-center">
        <button
          className={`px-3 py-1 rounded font-semibold shadow border flex items-center gap-1 text-sm ${alertSoundEnabled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setAlertSoundEnabled(v => !v)}
          title="Bật/Tắt âm thanh cảnh báo"
        >
          {alertSoundEnabled ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6.828a2 2 0 0 1 .586-1.414l1-1a2 2 0 0 1 2.828 0l1 1A2 2 0 0 1 15 6.828V19m-6 0h6" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6.828a2 2 0 0 1 .586-1.414l1-1a2 2 0 0 1 2.828 0l1 1A2 2 0 0 1 15 6.828V19m-6 0h6M3 3l18 18" /></svg>
          )}
          {alertSoundEnabled ? 'Âm thanh cảnh báo: Bật' : 'Âm thanh cảnh báo: Tắt'}
        </button>
        <input
          type="date"
          className="px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={selectedDate}
          max={getToday()}
          onChange={e => setSelectedDate(e.target.value)}
        />
      </div>
      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginTop: 10 }}>
        <h3>Realtime Độ ẩm & Nhiệt độ </h3>
        <div style={{ overflowX: 'auto' }}>
          <ResponsiveContainer width={Math.max(800, data.length * 40)} height={350}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tickFormatter={t => {
                if (!t) return '';
                const d = typeof t === 'string' ? new Date(t) : new Date(Number(t));
                if (isNaN(d.getTime())) return '';
                return d.toLocaleTimeString();
              }} allowDataOverflow={true} />
              <YAxis label={{ value: 'Giá trị', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="temperature"
                name="Nhiệt độ (°C)"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                stroke="#FF6600"
              />
              <Line
                type="monotone"
                dataKey="humidity"
                name="Độ ẩm (%)"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                stroke="#3399CC"
              />
              {/* Đường ngang cảnh báo nhiệt độ > 40 */}
              <Line
                type="linear"
                dataKey={() => 40}
                name="Ngưỡng nhiệt độ cảnh báo (40°C)"
                stroke="#EF4444"
                strokeDasharray="6 3"
                dot={false}
                isAnimationActive={false}
                legendType="plainline"
              />
              {/* Đường ngang cảnh báo độ ẩm < 35 */}
              <Line
                type="linear"
                dataKey={() => 35}
                name="Ngưỡng độ ẩm cảnh báo (35%)"
                stroke="#0EA5E9"
                strokeDasharray="6 3"
                dot={false}
                isAnimationActive={false}
                legendType="plainline"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex justify-center">
        {selectedDate === getToday() && (
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold flex items-center gap-2 text-base"
            onClick={handlePump}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {pumpState === 'open' ? 'Tắt bơm nước' : 'Bật bơm nước'}
          </button>
        )}
      </div>
      <audio ref={audioAlertRef} src={require('../assets/alert.mp3')} preload="auto" />
     </div>
  );
}

export default SensorChart;
