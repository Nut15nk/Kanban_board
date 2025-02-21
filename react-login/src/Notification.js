import React from 'react';
import './Notification.css';

function Notification({ notifications, onClose }) {
  return (
    <div className="notification-container">
      <h3>Notifications</h3>
      {notifications.length > 0 ? (
        notifications.map((notification) => (
          <div key={notification.id} className="notification-item">
            <span>{notification.message}</span>
            <button onClick={() => onClose(notification.id)} className="close-button">
              X
            </button>
          </div>
        ))
      ) : (
        <p>No new notifications</p>
      )}
    </div>
  );
}

export default Notification;