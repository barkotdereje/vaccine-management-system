import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getMyChildren,
  getChildSchedule,
  requestReschedule,
  downloadCertificate,
  getNotificationHistory,
} from '../../services/parentService';
import api from '../../services/api';
import VaccineTable from './VaccineTable';
import ChildProfile from './ChildProfile';

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [certStatus, setCertStatus] = useState(null);
  const [vaccinesList, setVaccinesList] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [notifHistory, setNotifHistory] = useState([]);

  useEffect(() => {
    loadChildren();
    loadVaccines();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      if (selectedChild.status === 'approved') {
        loadSchedule(selectedChild.id);
        checkCertificateStatus(selectedChild.id);
      }
    }
  }, [selectedChild]);

  const loadVaccines = async () => {
    try {
      const res = await api.get('/vaccines');
      setVaccinesList(res.data?.data || []);
    } catch (err) { /* ignore */ }
  };

  const calculateNextFromDOB = (dob) => {
    if (!vaccinesList.length || !dob) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = vaccinesList
      .map(v => {
        const dueDate = new Date(dob);
        dueDate.setDate(dueDate.getDate() + parseInt(v.days_from_birth));
        return { name: v.name, dueDate: dueDate.toISOString().split('T')[0], dateObj: dueDate };
      })
      .filter(v => v.dateObj >= today)
      .sort((a, b) => a.dateObj - b.dateObj);
    if (upcoming.length === 0) return null;
    const firstDate = upcoming[0].dueDate;
    const vaccinesOnDate = upcoming.filter(v => v.dueDate === firstDate).map(v => v.name);
    return { date: firstDate, vaccines: vaccinesOnDate };
  };

  const loadChildren = async () => {
    setLoading(true);
    setError('');
    try {
      const userId = user?.id;
      if (!userId) return;
      const res = await getMyChildren(userId);
      const childrenArray = res.data?.data || res.data || [];
      let childrenList = Array.isArray(childrenArray) ? childrenArray : [];
      childrenList = childrenList.map(child => ({
        ...child,
        assigned_nurse: child.nurse_id
          ? { id: child.nurse_id, name: child.nurse_name || 'Unknown', phone: child.nurse_phone || '', email: child.nurse_email || '' }
          : null,
      }));
      setChildren(childrenList);
      if (childrenList.length > 0) setSelectedChild(childrenList[0]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load children');
    } finally { setLoading(false); }
  };

  const loadSchedule = async (childId) => {
    try {
      const res = await getChildSchedule(childId, user.id);
      setSchedule(res.data.data.schedule || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed to load vaccination schedule'); }
  };

  const checkCertificateStatus = async (childId) => {
    try {
      const res = await api.get(`/certificates/child/${childId}`);
      const data = res.data?.data || res.data;
      setCertStatus(data);
    } catch { setCertStatus(null); }
  };

  const handleDownloadCertificate = async () => {
    if (!selectedChild) return;
    setError(''); setSuccessMessage('');
    try {
      const res = await downloadCertificate(selectedChild.id);
      const blob = new Blob([res.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${selectedChild.unique_child_id}.html`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Certificate downloaded successfully.');
    } catch (err) { setError(err.response?.data?.message || 'Certificate not available yet.'); }
  };

  const handleReschedule = async (appointmentId, newDate) => {
    setError(''); setSuccessMessage('');
    try {
      await requestReschedule(appointmentId, newDate);
      setSuccessMessage('Reschedule request submitted.');
      if (selectedChild) loadSchedule(selectedChild.id);
    } catch (err) { setError(err.response?.data?.message || 'Failed to request reschedule'); }
  };

  const loadNotificationHistory = async () => {
    try {
      const res = await getNotificationHistory(user?.id);
      setNotifHistory(res.data?.data || []);
      setShowHistory(true);
    } catch { /* ignore */ }
  };

  if (loading && children.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Parent Dashboard</h2>
        <p className="text-muted mb-0">Welcome, {user?.name}</p>
      </div>

      {error && <div className="alert alert-danger alert-dismissible">{error}</div>}
      {successMessage && <div className="alert alert-success alert-dismissible">{successMessage}</div>}

      {children.length === 0 ? (
        <div className="card text-center">
          <div className="card-body py-5">
            <h4>No children registered yet</h4>
            <p>Click the button below to register your first child.</p>
            <Link to="/parent/add-child" className="btn btn-primary">Register a Child</Link>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-4 mb-4">
            <div className="card shadow-sm">
              <div className="card-header bg-primary text-white"><h5 className="mb-0">My Children</h5></div>
              <div className="list-group list-group-flush">
                {children.map(child => (
                  <button key={child.id} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedChild?.id === child.id ? 'active' : ''}`} onClick={() => setSelectedChild(child)}>
                    <div><strong>{child.name}</strong><br /><small>ID: {child.unique_child_id}</small></div>
                    <span className={`badge ${child.status === 'pending' ? 'bg-warning' : 'bg-success'}`}>
                      {child.status === 'pending' ? 'Pending' : 'Approved'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="card-footer">
                <Link to="/parent/add-child" className="btn btn-sm btn-success w-100">+ Register New Child</Link>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            {selectedChild && selectedChild.status === 'pending' && (
              <div className="card shadow-sm">
                <div className="card-header bg-warning text-white"><h5 className="mb-0">{selectedChild.name} — Pending Approval</h5></div>
                <div className="card-body">
                  <p><strong>Unique ID:</strong> {selectedChild.unique_child_id}</p>
                  <p><strong>Date of Birth:</strong> {selectedChild.dob}</p>
                  <p><strong>Gender:</strong> {selectedChild.gender}</p>
                  <p><strong>Blood Type:</strong> {selectedChild.blood_type || 'N/A'}</p>
                  <p><strong>Status:</strong> <span className="badge bg-warning">Waiting for Nurse Approval</span></p>
                  {(() => {
                    const nextInfo = calculateNextFromDOB(selectedChild.dob);
                    if (nextInfo) {
                      return (
                        <div className="alert alert-info mt-3">
                          <strong>📅 Estimated Next Appointment:</strong> {nextInfo.date}<br />
                          <strong>Expected Vaccines:</strong> {nextInfo.vaccines.join(', ')}<br />
                          <small className="text-muted mt-2 d-block">⚠️ This is an estimate. Exact date confirmed after nurse approval.</small>
                        </div>
                      );
                    }
                    return <div className="alert alert-secondary mt-3">No upcoming vaccines calculated.</div>;
                  })()}
                  <div className="alert alert-light mt-3 border">
                    <strong>📋 Registration Status:</strong> Your child's registration has been submitted. Please wait for a nurse to verify and approve it.
                  </div>
                </div>
              </div>
            )}

            {selectedChild && selectedChild.status === 'approved' && (
              <>
                <ChildProfile child={selectedChild} />
                {selectedChild.assigned_nurse && (
                  <div className="alert alert-info d-flex justify-content-between align-items-center mt-3">
                    <div>
                      <strong>👩‍⚕️ Assigned Nurse:</strong> {selectedChild.assigned_nurse.name}<br />
                      <small>📞 {selectedChild.assigned_nurse.phone} | ✉️ {selectedChild.assigned_nurse.email}</small>
                    </div>
                  </div>
                )}
                <div className="card shadow-sm mt-4">
                  <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Vaccination Roadmap</h5>
                    <span className="d-flex align-items-center gap-2">
                      {certStatus ? (
                        certStatus.is_fully_approved ? (
                          <>
                            <span className="text-white small">✅ Approved</span>
                            <button className="btn btn-sm btn-light" onClick={handleDownloadCertificate}>📄 Download Certificate</button>
                          </>
                        ) : (
                          <span className="text-white small">⏳ Pending {!certStatus.is_approved_by_nurse ? 'nurse' : 'admin'} approval</span>
                        )
                      ) : (
                        <>
                          <button className="btn btn-sm btn-warning" onClick={async () => {
                            try {
                              await api.post('/certificates/generate', { child_id: selectedChild.id });
                              setSuccessMessage('Certificate requested. Waiting for nurse & admin approval.');
                              checkCertificateStatus(selectedChild.id);
                            } catch (err) { setError(err.response?.data?.message || 'Could not request certificate'); }
                          }}>📄 Request Certificate</button>
                          <button className="btn btn-sm btn-outline-info" onClick={loadNotificationHistory}>📬 Notifications</button>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="card-body">
                    <VaccineTable schedule={schedule} onReschedule={handleReschedule} />
                  </div>
                </div>
                {schedule.filter(s => s.status === 'pending' && new Date(s.scheduled_date) >= new Date()).length > 0 && (
                  <div className="alert alert-warning mt-3">
                    <strong>Next Appointment:</strong> {schedule.find(s => s.status === 'pending' && new Date(s.scheduled_date) >= new Date())?.scheduled_date}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Notification History Modal */}
      {showHistory && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-primary text-white rounded-top-4">
                <h5 className="modal-title">📬 Notification History</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowHistory(false)}></button>
              </div>
              <div className="modal-body p-4">
                {notifHistory.length === 0 ? (
                  <div className="alert border-0 rounded-3 text-center py-4" style={{background:'#d8e6fb',color:'#1e5fbb'}}>No notifications sent yet.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead><tr><th>Type</th><th>Child</th><th>Vaccine</th><th>Appointment Date</th><th>Channel</th><th>Status</th><th>Sent At</th></tr></thead>
                      <tbody>
                        {notifHistory.map(n => (
                          <tr key={n.id}>
                            <td><span className={`badge ${n.notification_type==='reminder_dayof'?'bg-danger':'bg-primary'}`}>{n.notification_type==='reminder_dayof'?'Day-Of':'3-Day'}</span></td>
                            <td className="fw-semibold">{n.child_name}</td>
                            <td>{n.vaccine_name}</td>
                            <td>{n.scheduled_date}</td>
                            <td><span className={`badge ${n.channel==='email'?'bg-info':'bg-success'}`}>{n.channel}</span></td>
                            <td><span className={`badge ${n.status==='sent'?'bg-success':'bg-danger'}`}>{n.status}</span></td>
                            <td><small>{new Date(n.sent_at).toLocaleString()}</small></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary rounded-pill" onClick={() => setShowHistory(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;