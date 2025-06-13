import React, { useRef, useEffect, useState } from 'react';
import { WS_URL } from '../config';

function SensorAudioButton({ sensorId }) {
  const audioContextRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const wsRef = useRef(null);
  const audioBufferQueue = useRef([]);
  const isProcessing = useRef(false);

  // WebSocket cảnh báo luôn bật
  useEffect(() => {
    const wsWarning = new WebSocket(`${WS_URL}/sounds/?deviceId=${sensorId}`);
    wsWarning.onmessage = (event) => {
      if (typeof event.data === 'string' && event.data.trim() === '1') {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
      }
    };
    return () => {
      wsWarning.close();
    };
  }, [sensorId]);

  useEffect(() => {
    if (showAudio) {
      // Khởi tạo AudioContext
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000, // Phù hợp với tần số mẫu của server
      });

      // Khởi tạo WebSocket
      wsRef.current = new WebSocket(`${WS_URL}/sounds/?deviceId=${sensorId}`);
      wsRef.current.binaryType = 'arraybuffer';

      wsRef.current.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          try {
            // Chuyển ArrayBuffer thành Int32Array
            const int32Array = new Int32Array(event.data);
            // Chuyển Int32Array thành Float32Array, chuẩn hóa về [-1.0, 1.0]
            const float32Array = new Float32Array(int32Array.length);
            for (let i = 0; i < int32Array.length; i++) {
              float32Array[i] = int32Array[i] / 2147483647; // Chuẩn hóa: chia cho 2^31 - 1
            }

            // Tạo AudioBuffer
            const audioBuffer = audioContextRef.current.createBuffer(
              1, // Kênh đơn (mono)
              float32Array.length,
              audioContextRef.current.sampleRate
            );

            // Sao chép dữ liệu float32 vào buffer
            audioBuffer.getChannelData(0).set(float32Array);

            // Thêm vào hàng đợi
            audioBufferQueue.current.push(audioBuffer);

            // Xử lý hàng đợi nếu chưa xử lý
            if (!isProcessing.current) {
              isProcessing.current = true;
              await processAudioQueue();
            }
          } catch (e) {
            console.error('[AUDIO] Lỗi xử lý dữ liệu âm thanh:', e);
          }
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket đã đóng');
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WebSocket] Lỗi:', error);
      };
    }

    return () => {
      // Dọn dẹp
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      audioBufferQueue.current = [];
      isProcessing.current = false;
    };
  }, [sensorId, showAudio]);

  const processAudioQueue = async () => {
    while (audioBufferQueue.current.length > 0 && showAudio) {
      const buffer = audioBufferQueue.current.shift();
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);

      // Bắt đầu phát âm thanh
      source.start(audioContextRef.current.currentTime);
      source.onended = () => {
        source.disconnect();
      };

      // Chờ buffer phát xong
      await new Promise((resolve) => setTimeout(resolve, (buffer.length / audioContextRef.current.sampleRate) * 1000));
    }
    isProcessing.current = false;
  };

  const handleAudioClick = () => {
    if (showAudio) {
      setShowAudio(false);
      setPlaying(false);
    } else {
      setShowAudio(true);
      setPlaying(true);
      // Khôi phục AudioContext nếu bị tạm dừng
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  };

  return (
    <div className="bg-white p-2 animate-slide-down flex flex-col items-center relative">
      {showWarning && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-20 animate-bounce">
          Cảnh báo: Có tiếng cưa gỗ!
        </div>
      )}
      <div className="flex justify-center items-center gap-3">
        <button
          className={`flex items-center justify-center w-16 h-16 rounded-full bg-green-100 hover:bg-green-200 border-2 border-green-400 transition-all shadow-lg ${
            playing ? 'ring-2 ring-green-400 scale-105' : ''
          }`}
          onClick={handleAudioClick}
          aria-label={showAudio ? 'Tắt âm thanh cảm biến' : 'Nghe âm thanh cảm biến'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8 text-green-600"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v6h4l5 5V4l-5 5H9z" />
            {playing && (
              <g>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12c0-1.657-1.343-3-3-3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12c0 1.657-1.343 3-3 3" />
              </g>
            )}
          </svg>
        </button>
        <div className="flex-1">
          <h3 className="text-base font-semibold mb-1 text-green-700 text-center">
            Nghe âm thanh trực tiếp từ cảm biến
          </h3>
          {showAudio && <p className="text-xs text-gray-500 text-center">Đang phát âm thanh...</p>}
          {!showAudio && (
            <p className="text-xs text-gray-500 text-center">
              Nhấn vào biểu tượng để nghe âm thanh trực tiếp. Nếu nghe thấy tiếng cưa gỗ hoặc âm thanh bất thường, hãy kiểm tra ngay!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SensorAudioButton;