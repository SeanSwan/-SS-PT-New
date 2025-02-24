/**
 * Schedule.tsx
 * A unified schedule view showing booked and available sessions using react-big-calendar.
 * Users can click on an available session to reserve it. Additionally, clicking on an empty slot
 * will prompt the user to request a session.
 * A ParallaxSection is added at the bottom and the page layout pushes the footer to the very bottom.
 */

import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer, SlotInfo } from "react-big-calendar";
import moment from "moment";
import axios from "axios";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useAuth } from "../../context/AuthContext";
import styled from "styled-components";
import ParallaxSection from "../ParallaxSection/ParallaxSection";

// Using global type declarations or casting as any if needed:
const SCHEDULE_URL =
  (import.meta as any).env.VITE_SCHEDULE_API_URL || "http://localhost:5000/api/schedule";

const localizer = momentLocalizer(moment);

interface SessionEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  status: string; // "available" or "booked"
}

/* ========== Styled Containers ========== */

// PageWrapper: Ensures the page takes at least the full viewport height.
const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

// ContentWrapper: Main content that grows to push footer down.
const ContentWrapper = styled.div`
  flex: 1;
  padding: 1rem;
`;

// CalendarContainer: Styles the calendar area.
const CalendarContainer = styled.div`
  height: 500px;
  background: var(--background);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
`;

// ModalOverlay: Used for both booking and request modals.
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// ModalContainer: Container for modal content.
const ModalContainer = styled.div`
  background: var(--light-bg);
  padding: 2rem;
  border-radius: 10px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
`;

// ModalButton: Styled button used in modals.
const ModalButton = styled.button`
  background: var(--primary-color);
  color: var(--text-dark);
  border: none;
  border-radius: 5px;
  padding: 0.75rem 1.5rem;
  margin: 0.5rem;
  cursor: pointer;
  transition: background 0.3s ease;
  &:hover {
    background: var(--secondary-color);
  }
`;

/* ========== Schedule Component ========== */
const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [error, setError] = useState<string>("");
  
  // For booking an existing session.
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // For requesting a session on an empty slot.
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * fetchSessions:
   * Fetches session data from the backend and formats it for react-big-calendar.
   */
  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No token found. Please log in again.");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(SCHEDULE_URL, { headers });
      console.log("Schedule fetch response:", response.data);
      const formatted: SessionEvent[] = response.data.map((session: any) => ({
        id: session.id,
        title: session.status === "available" ? "Available" : "Booked",
        start: new Date(session.sessionDate),
        end: new Date(session.sessionDate),
        allDay: false,
        status: session.status,
      }));
      setEvents(formatted);
      setError("");
    } catch (err: any) {
      console.error("Error fetching schedule:", err);
      if (err.response && err.response.status === 401) {
        setError("Unauthorized. Please ensure you are logged in.");
      } else {
        setError("Could not fetch schedule. Check console for details.");
      }
    }
  };

  /**
   * handleSelectEvent:
   * When a user clicks an event, if it’s available, open the booking modal.
   */
  const handleSelectEvent = (event: SessionEvent) => {
    if (event.status === "available") {
      setSelectedEvent(event);
      setShowBookingModal(true);
    } else {
      alert("This session is already booked.");
    }
  };

  /**
   * handleSelectSlot:
   * When a user clicks on an empty slot, open a modal to request a session.
   */
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot(slotInfo);
    setShowRequestModal(true);
  };

  /**
   * bookSession:
   * Sends a POST request to book an available session.
   */
  const bookSession = async () => {
    if (!selectedEvent || !user) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${SCHEDULE_URL}/book`, { sessionId: selectedEvent.id }, { headers });
      alert("Session booked successfully!");
      fetchSessions();
      setShowBookingModal(false);
      setSelectedEvent(null);
    } catch (err: any) {
      console.error("Error booking session:", err);
      alert("Error booking session. Please try again.");
    }
  };

  /**
   * requestSession:
   * Sends a POST request to request a session for an empty slot.
   */
  const requestSession = async () => {
    if (!selectedSlot || !user) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${SCHEDULE_URL}/request`, { start: selectedSlot.start, end: selectedSlot.end }, { headers });
      alert("Session request submitted!");
      fetchSessions();
      setShowRequestModal(false);
      setSelectedSlot(null);
    } catch (err: any) {
      console.error("Error requesting session:", err);
      alert("Error requesting session. Please try again.");
    }
  };

  return (
    <PageWrapper>
      <ContentWrapper>
        <h2 style={{ color: "var(--primary-color)", marginBottom: "1rem" }}>My Schedule</h2>
        {!user && <p>Please log in to view your schedule.</p>}
        {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}
        {user && !error && (
          <CalendarContainer>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              views={["month", "week", "day"]}
              selectable
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              style={{ height: "100%" }}
            />
          </CalendarContainer>
        )}
        {/* Parallax Section at the bottom */}
        <ParallaxSection />
      </ContentWrapper>

      {/* Booking Confirmation Modal */}
      {showBookingModal && selectedEvent && (
        <ModalOverlay>
          <ModalContainer>
            <h3>Book Session</h3>
            <p>
              Do you want to reserve the session on {selectedEvent.start.toLocaleString()}?
            </p>
            <div>
              <ModalButton onClick={bookSession}>Yes, Book</ModalButton>
              <ModalButton onClick={() => { setShowBookingModal(false); setSelectedEvent(null); }}>
                Cancel
              </ModalButton>
            </div>
          </ModalContainer>
        </ModalOverlay>
      )}

      {/* Request Session Modal */}
      {showRequestModal && selectedSlot && (
        <ModalOverlay>
          <ModalContainer>
            <h3>Request Session</h3>
            <p>
              No session exists at {selectedSlot.start.toLocaleString()}. Would you like to request a session for this time slot?
            </p>
            <div>
              <ModalButton onClick={requestSession}>Yes, Request</ModalButton>
              <ModalButton onClick={() => { setShowRequestModal(false); setSelectedSlot(null); }}>
                Cancel
              </ModalButton>
            </div>
          </ModalContainer>
        </ModalOverlay>
      )}
    </PageWrapper>
  );
};

export default Schedule;
