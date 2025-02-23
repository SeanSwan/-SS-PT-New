/**
 * UnifiedCalendar.tsx
 * A unified calendar component that uses react-big-calendar exclusively.
 * - Admins can create new session slots by clicking on an empty time slot.
 * - Clients can book sessions by clicking on an event.
 * The component fetches sessions from the API and updates automatically.
 */

import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "axios";
import Modal from "react-modal";
import { useAuth } from "../../context/AuthContext";

// Set up modal accessibility
Modal.setAppElement("#root");

// Set up the localizer using moment
const localizer = momentLocalizer(moment);

interface SessionEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
}

const CalendarComponent: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);

  /**
   * Fetch sessions from the API and format them for react-big-calendar.
   */
  const fetchSessions = async () => {
    try {
      const response = await axios.get("/api/sessions/available");
      const formattedSessions: SessionEvent[] = response.data.map((session: any) => ({
        id: session.id,
        title: session.status === "available" ? "Available Session" : "Booked",
        start: new Date(session.sessionDate),
        end: new Date(session.sessionDate),
        allDay: false,
      }));
      setEvents(formattedSessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  /**
   * For admin users: Create a new session slot by clicking on an empty slot.
   */
  const handleSelectSlot = async ({
    start,
  }: {
    start: Date;
    end: Date;
    slots: Date[];
  }) => {
    if (user?.role === "admin") {
      const sessionDate = start.toISOString();
      try {
        await axios.post("/api/sessions/admin/create", { sessionDate });
        fetchSessions();
      } catch (error) {
        console.error("Error creating session:", error);
      }
    }
  };

  /**
   * For client users: Open the booking modal when an event is clicked.
   */
  const handleSelectEvent = (event: SessionEvent) => {
    if (user?.role === "user") {
      setSelectedEvent(event);
      setModalIsOpen(true);
    }
  };

  /**
   * Confirm the booking for the selected session.
   */
  const confirmBooking = async () => {
    if (!selectedEvent || !user) return;
    try {
      await axios.post(`/api/sessions/book/${user.id}`, {
        sessionId: selectedEvent.id,
      });
      fetchSessions();
      setModalIsOpen(false);
    } catch (error) {
      console.error("Error booking session:", error);
    }
  };

  return (
    <div style={{ height: 500 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        views={["month", "week", "day"]}
      />
      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)}>
        <h2>Confirm Booking</h2>
        <p>Are you sure you want to book this session?</p>
        <button onClick={confirmBooking}>Yes, Book</button>
        <button onClick={() => setModalIsOpen(false)}>Cancel</button>
      </Modal>
    </div>
  );
};

export default CalendarComponent;
