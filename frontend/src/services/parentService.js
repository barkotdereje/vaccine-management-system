import api from './api';
/**
 * Get all children for the authenticated parent
 * @returns {Promise} Axios response with children array
 */
import { useAuth } from '../contexts/AuthContext'; // may not be usable in service, better to pass ID from component

// Better: export a function that takes userId
export const getMyChildren = (parentId) => {
  return api.get(`/parent/children?parent_id=${parentId}`);
};

export const addChild = (childData) => {
  // childData now includes parent_id
  return api.post('/parent/child', childData);
};
/**
 * Get vaccination schedule for a specific child
 * @param {number} childId - Child ID
 * @returns {Promise} Axios response with schedule data
 */

export const getChildSchedule = (childId, parentId) => {
  return api.get(`/parent/child/${childId}/schedule?parent_id=${parentId}`);
};

/**
 * Request reschedule for an appointment (parent action)
 * @param {number} appointmentId - Appointment ID
 * @param {string} newDate - New date (YYYY-MM-DD)
 * @returns {Promise} Axios response
 */
export const requestReschedule = (appointmentId, newDate) => {
  return api.post(`/parent/appointment/${appointmentId}/reschedule`, { new_date: newDate });
};

/**
 * Download vaccination certificate for a child
 * @param {number} childId - Child ID
 * @returns {Promise} Axios response with blob data
 */
export const downloadCertificate = (childId) => {
  return api.get(`/parent/child/${childId}/certificate`, { responseType: 'blob' });
};

/**
 * Get all notifications for the parent
 * @param {number} limit - Pagination limit (default 50)
 * @param {number} offset - Pagination offset (default 0)
 * @returns {Promise} Axios response with notifications
 */
export const getNotifications = (limit = 50, offset = 0) => {
  return api.get(`/parent/notifications?limit=${limit}&offset=${offset}`);
};

/**
 * Mark a specific notification as read
 * @param {number} notificationId - Notification ID
 * @returns {Promise} Axios response
 */
export const markNotificationRead = (notificationId) => {
  return api.post(`/parent/notifications/${notificationId}/read`);
};

/**
 * Get upcoming appointments for the parent (next 30 days)
 * @returns {Promise} Axios response with appointments
 */
export const getUpcomingAppointments = () => {
  return api.get('/parent/upcoming-appointments');
};