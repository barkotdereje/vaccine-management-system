import api from './api';

export const getMyChildren = (parentId) => {
  return api.get(`/parent/children?parent_id=${parentId}`);
};

export const addChild = (childData) => {
  return api.post('/parent/child', childData);
};

export const getChildSchedule = (childId, parentId) => {
  return api.get(`/parent/child/${childId}/schedule?parent_id=${parentId}`);
};

export const requestReschedule = (appointmentId, newDate) => {
  return api.post(`/parent/appointment/${appointmentId}/reschedule`, { new_date: newDate });
};

export const downloadCertificate = (childId) => {
  return api.get(`/parent/child/${childId}/certificate`, { responseType: 'blob' });
};

export const getNotificationHistory = (parentId) => {
  return api.get(`/parent/notification-history?parent_id=${parentId}`);
};

export const getNotifications = (limit = 50, offset = 0) => {
  return api.get(`/parent/notifications?limit=${limit}&offset=${offset}`);
};

export const markNotificationRead = (notificationId) => {
  return api.post(`/parent/notifications/${notificationId}/read`);
};

export const getUpcomingAppointments = () => {
  return api.get('/parent/upcoming-appointments');
};