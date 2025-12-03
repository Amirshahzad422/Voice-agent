import React from 'react';
import './MeetingCard.css';

const MeetingCard = ({ meeting, onEdit, onDelete, onReschedule }) => {
  const formatDate = (datetime) => {
    try {
      const date = new Date(datetime);
      return {
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' })
      };
    } catch (e) {
      return { date: datetime, time: '', dayOfWeek: '' };
    }
  };

  const { date, time, dayOfWeek } = formatDate(meeting.datetime);
  const isPast = new Date(meeting.datetime) < new Date();

  return (
    <div className={`meeting-card ${isPast ? 'past-meeting' : ''}`}>
      <div className="meeting-card-header">
        <div className="meeting-icon">
          {isPast ? '✓' : '📅'}
        </div>
        <div className="meeting-date-info">
          <div className="meeting-day">{dayOfWeek}</div>
          <div className="meeting-date">{date}</div>
          <div className="meeting-time">⏰ {time}</div>
        </div>
      </div>
      
      <div className="meeting-card-body">
        <h3 className="meeting-title">{meeting.title}</h3>
        <div className="meeting-duration">
          <span className="duration-icon">⏱️</span>
          {meeting.duration_minutes} minutes
        </div>
        {meeting.notes && (
          <div className="meeting-notes">
            <span className="notes-icon">📝</span>
            {meeting.notes}
          </div>
        )}
        {meeting.participants && meeting.participants.length > 0 && (
          <div className="meeting-participants">
            <span className="participants-icon">👥</span>
            {meeting.participants.join(', ')}
          </div>
        )}
        {meeting.category && (
          <div className={`meeting-category category-${meeting.category}`}>
            {meeting.category}
          </div>
        )}
      </div>

      {!isPast && (
        <div className="meeting-card-actions">
          <button 
            className="action-btn reschedule-btn"
            onClick={() => onReschedule && onReschedule(meeting)}
            title="Reschedule"
          >
            🔄
          </button>
          <button 
            className="action-btn edit-btn"
            onClick={() => onEdit && onEdit(meeting)}
            title="Edit"
          >
            ✏️
          </button>
          <button 
            className="action-btn delete-btn"
            onClick={() => onDelete && onDelete(meeting)}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

export default MeetingCard;

