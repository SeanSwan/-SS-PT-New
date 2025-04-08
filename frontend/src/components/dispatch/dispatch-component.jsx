import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const socket = io('http://localhost:5000');

// Styled components for pixel-perfect styling
const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 3fr;
  grid-gap: 20px;
  padding: 20px;
`;

const Sidebar = styled.div`
  background: #f4f4f4;
  padding: 20px;
  border-radius: 8px;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Title = styled.h1`
  font-size: 2em;
  text-align: center;
  color: #333;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  background: #007bff;
  color: white;
  padding: 10px;
  border: 1px solid #ddd;
`;

const Td = styled.td`
  padding: 10px;
  border: 1px solid #ddd;
  text-align: center;
`;

const Button = styled.button`
  padding: 10px 20px;
  background: #007bff;
  color: #fff;
  border: none;
  cursor: pointer;
  &:hover {
    background: #0056b3;
  }
`;

const DigitalClock = styled.div`
  font-size: 2em;
  text-align: center;
  background: #000;
  color: #fff;
  padding: 20px;
  border-radius: 8px;
`;

const GuardCard = styled.div`
  background: #f4f4f4;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const GuardImage = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-bottom: 10px;
`;

const MapSection = styled.div`
  height: 400px;
  margin-top: 20px;
`;

const Dispatch = () => {
  const [guards, setGuards] = useState([]);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [guardLocations, setGuardLocations] = useState([]);

  useEffect(() => {
    const fetchGuards = async () => {
      try {
        const response = await axios.get('/api/checkin');
        setGuards(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching guards:', error);
        setGuards([]); // Set guards to empty array in case of error
      }
    };

    fetchGuards();

    socket.on('guard-update', (updatedGuard) => {
      setGuards((prevGuards) =>
        prevGuards.map((guard) =>
          guard.id === updatedGuard.id ? updatedGuard : guard
        )
      );
    });

    socket.on('new-location', (location) => {
      setGuardLocations((prevLocations) => [...prevLocations, location]);
    });

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      socket.off('guard-update');
      socket.off('new-location');
      clearInterval(timer);
    };
  }, []);

  const sendReminder = async (guard) => {
    try {
      await axios.post('/api/reminder', { guardId: guard.id });
      alert('Reminder sent');
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  return (
    <Container>
      <Sidebar>
        <DigitalClock>{currentTime.toLocaleTimeString()}</DigitalClock>
        {selectedGuard && (
          <GuardCard>
            <GuardImage src={selectedGuard.image_url || 'default-image-url.jpg'} alt={selectedGuard.name} />
            <h2>{selectedGuard.name}</h2>
            <p>Rating: {selectedGuard.rating}</p>
            <p>Seniority: {selectedGuard.seniority} years</p>
            <p>Phone: {selectedGuard.number}</p>
            <p>Address: {selectedGuard.address}</p>
            <p>Coverage: {selectedGuard.cover_percentage}%</p>
            <p>Rank: {selectedGuard.rank}</p>
          </GuardCard>
        )}
      </Sidebar>
      <MainContent>
        <Title>Security Dispatch</Title>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Last Check-In Time</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {guards.map((guard) => (
              <tr key={guard.id} onClick={() => setSelectedGuard(guard)}>
                <Td>{guard.name}</Td>
                <Td>{new Date(guard.checkInTime).toLocaleString()}</Td>
                <Td>
                  <Button onClick={() => sendReminder(guard)}>
                    Send Reminder
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <MapSection>
          <MapContainer 
            center={[34.0522, -118.2437]} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {guardLocations.map((location, index) => (
              <Marker key={index} position={[location.lat, location.lng]}>
                <Popup>{location.name}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </MapSection>
      </MainContent>
    </Container>
  );
};

export default Dispatch;