import { useState, useEffect } from 'react';

export default function useGeolocation() {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    const success = (position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    };

    const failure = (err) => {
      setError(err.message);
    };

    navigator.geolocation.getCurrentPosition(success, failure);
  }, []);

  return { ...location, error };
}
