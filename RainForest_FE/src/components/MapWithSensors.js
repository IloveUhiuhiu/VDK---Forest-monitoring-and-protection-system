import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import locationSafetyIcon from '../assets/location-safety.png';
import { API_URL } from '../config';

function MapWithSensors() {
  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyD12xOlRsgiR3z-sk8NSjvoVbstwDsdiOM',
  });
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensors, setSensors] = useState([]);

  useEffect(() => {
    // Fetch sensor locations from API
    fetch(`${API_URL}/gps/all-locations/`)
      .then(res => res.json())
      .then(data => {
        // Chuyển đổi dữ liệu API về dạng [{id, position: {lat, lng}}]
        setSensors(
          data.map(item => ({
            id: item.device_id,
            position: { lat: item.latitude, lng: item.longitude },
            updated_at: item.updated_at
          }))
        );
      })
      .catch(err => {
        setSensors([]);
      });
  }, []);

  const handleSelectSensor = (id) => {
    setSelectedSensor(id);
    setTimeout(() => {
      window.dispatchEvent(new Event('sensor-chart-open'));
    }, 0);
    navigate(`/sensor/${id}`);
  };

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col">
      <h2 className="text-center text-cyan-700 mt-4 mb-4 font-bold text-3xl tracking-wide drop-shadow-md">
        Bản đồ cảm biến môi trường
      </h2>
      <div className="flex-1 rounded-t-2xl m-4 shadow-lg border-t-2 border-sky-400 overflow-hidden relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={{ lat: 16.075331, lng: 108.152326 }}
          zoom={15}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: false,
            styles: [
              { elementType: 'geometry', stylers: [{ color: '#e0f2fe' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#f1f5f9' }] },
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#38bdf8' }] },
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f1f5f9' }] },
              { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'off' }] },
              { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#bae6fd' }] },
            ],
          }}
        >
          {sensors.map(sensor => (
            <Marker
              key={sensor.id}
              position={sensor.position}
              onClick={() => handleSelectSensor(sensor.id)}
              icon={{
                url: locationSafetyIcon,
                scaledSize: { width: selectedSensor === sensor.id ? 54 : 44, height: selectedSensor === sensor.id ? 54 : 44 },
              }}
              animation={selectedSensor === sensor.id ? window.google && window.google.maps ? window.google.maps.Animation.BOUNCE : undefined : undefined}
            />
          ))}
        </GoogleMap>
      </div>
    </div>
  );
}

export default MapWithSensors;
