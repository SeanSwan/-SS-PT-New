import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { loadModel, detectObjects } from './objectDetection';
// import detectionSound from './assets/detection.mp3'; // Make sure this path is correct
import moment from 'moment'; // For timestamp formatting

const colors = {
  gold: '#FFD700',
  black: '#000000',
  white: '#FFFFFF',
  background: '#1a1a1a',
  text: '#FFD700',
};

// Styled Components (including LoadingSpinner)
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: ${colors.background};
  color: ${colors.white};
  font-family: 'Arial', sans-serif;
  text-align: center;
  min-height: 100vh;
`;

const Title = styled.h1`
  margin: 20px 0;
  font-size: 2.5rem;
  color: ${colors.gold};
`;

const VideoContainer = styled.div`
  position: relative;
  width: 80%;
  max-width: 800px;
  border: 1px solid ${colors.gold};
  border-radius: 10px;
  overflow: hidden;
  background: ${colors.black};
`;

const StyledVideo = styled.video`
  width: 100%;
  height: auto;
  border-radius: 10px;
`;

const StyledCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
`;

const ControlsContainer = styled.div`
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
`;

const Button = styled.button`
  padding: 10px 20px;
  font-size: 1rem;
  color: ${colors.black};
  background: ${colors.gold};
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background: ${colors.text};
  }
`;

const SliderContainer = styled.div`
  margin-top: 20px;
  color: ${colors.gold};
  display: flex;
  flex-direction: column;
  align-items: center;

  input {
    width: 200px;
  }
`;

const ErrorContainer = styled.div`
  color: red;
  margin-top: 20px;
`;

const LogsContainer = styled.div`
  margin-top: 30px;
  width: 80%;
  max-width: 800px;
  color: ${colors.white};
`;

const LogItem = styled.div`
  padding: 5px;
  border-bottom: 1px solid ${colors.gold};
`;

const GalleryContainer = styled.div`
  margin-top: 30px;
  width: 80%;
  max-width: 800px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Screenshot = styled.img`
  width: 150px;
  height: auto;
  border: 1px solid ${colors.gold};
  border-radius: 5px;
`;

const LoadingSpinner = styled.div`
  border: 8px solid ${colors.white};
  border-top: 8px solid ${colors.gold};
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 2s linear infinite;
  margin-top: 20px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ObjectDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [threshold, setThreshold] = useState(0.5);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [detectionInterval, setDetectionInterval] = useState(500); // in milliseconds

  useEffect(() => {
    async function setupModel() {
      try {
        const loadedModel = await loadModel();
        setModel(loadedModel);
      } catch (err) {
        console.error('Error loading model:', err);
        setError('Failed to load model');
      } finally {
        setIsLoading(false);
      }
    }
    setupModel();
  }, []);

  const startVideo = () => {
    setError(null);
    if (videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsVideoPlaying(true);
        })
        .catch((err) => {
          console.error('Error accessing camera:', err);
          setError('Failed to access camera');
        });
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();

      tracks.forEach((track) => {
        track.stop();
      });

      videoRef.current.srcObject = null;
      setIsVideoPlaying(false);
    }
  };

  const takeScreenshot = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'detection.png';
      link.click();
    }
  };

  const playDetectionSound = () => {
    const audio = new Audio(detectionSound);
    audio.play();
  };

  useEffect(() => {
    let intervalId;

    if (model && isVideoPlaying) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const detect = async () => {
        if (!isVideoPlaying) return;

        const predictions = await detectObjects(model, video);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        predictions
          .filter((prediction) => prediction.score >= threshold)
          .forEach((prediction) => {
            const [x, y, width, height] = prediction.bbox;
            ctx.strokeStyle = colors.gold;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            ctx.font = '18px Arial';
            ctx.fillStyle = colors.gold;
            ctx.fillText(
              `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
              x,
              y > 10 ? y - 5 : 10
            );

            // Play sound if a person is detected
            if (prediction.class === 'person') {
              playDetectionSound();
            }

            // Add to logs
            const timestamp = moment().format('HH:mm:ss');
            setLogs((prevLogs) => [
              { timestamp, object: prediction.class },
              ...prevLogs,
            ]);

            // Take a screenshot and add to gallery
            if (canvas) {
              const dataUrl = canvas.toDataURL('image/png');
              setGallery((prevGallery) => [dataUrl, ...prevGallery]);
            }
          });

        // Send detections to backend
        try {
          await axios.post('http://localhost:5000/api/detections', {
            objects: predictions,
          });
        } catch (error) {
          console.error('Error sending detections to backend:', error);
          setError('Failed to send detections to backend');
        }
      };

      const startDetection = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        intervalId = setInterval(detect, detectionInterval);
      };

      video.addEventListener('loadeddata', startDetection);

      return () => {
        clearInterval(intervalId);
        video.removeEventListener('loadeddata', startDetection);
      };
    }
  }, [model, isVideoPlaying, threshold, detectionInterval]);

  return (
    <Container>
      <Title>Real-time Object Detection</Title>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <VideoContainer>
            <StyledVideo ref={videoRef} autoPlay playsInline muted />
            <StyledCanvas ref={canvasRef} />
          </VideoContainer>
          <ControlsContainer>
            <Button onClick={isVideoPlaying ? stopVideo : startVideo}>
              {isVideoPlaying ? 'Stop Video' : 'Start Video'}
            </Button>
            {isVideoPlaying && (
              <>
                <Button onClick={takeScreenshot}>Take Screenshot</Button>
                <Button onClick={() => setLogs([])}>Clear Logs</Button>
                <Button onClick={() => setGallery([])}>Clear Gallery</Button>
              </>
            )}
          </ControlsContainer>
          {isVideoPlaying && (
            <>
              <SliderContainer>
                <label>
                  Confidence Threshold: {Math.round(threshold * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                />
              </SliderContainer>
              <SliderContainer>
                <label>
                  Detection Interval: {detectionInterval} ms
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={detectionInterval}
                  onChange={(e) =>
                    setDetectionInterval(parseInt(e.target.value))
                  }
                />
              </SliderContainer>
            </>
          )}
          {error && <ErrorContainer>{error}</ErrorContainer>}

          {logs.length > 0 && (
            <LogsContainer>
              <h2>Detection Logs</h2>
              {logs.map((log, index) => (
                <LogItem key={index}>
                  [{log.timestamp}] Detected: {log.object}
                </LogItem>
              ))}
            </LogsContainer>
          )}

          {gallery.length > 0 && (
            <GalleryContainer>
              <h2>Screenshot Gallery</h2>
              {gallery.map((image, index) => (
                <Screenshot
                  key={index}
                  src={image}
                  alt={`Screenshot ${index + 1}`}
                />
              ))}
            </GalleryContainer>
          )}
        </>
      )}
    </Container>
  );
};

export default ObjectDetection;