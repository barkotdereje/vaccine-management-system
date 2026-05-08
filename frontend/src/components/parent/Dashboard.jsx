import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getMyChildren,
  getChildSchedule,
  requestReschedule,
  downloadCertificate,
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

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadSchedule(selectedChild.id);
      checkCertificateStatus(selectedChild.id);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    setLoading(true);
    setError('');
    try {
      const userId = user?.id;
      const res = await getMyChildren(userId);
      const childrenArray = res.data?.data || res.data || [];
      let childrenList = Array.isArray(childrenArray) ? childrenArray : [];

      childrenList = childrenList.map(child => ({
        ...child,
        assigned_nurse: child.nurse_id
          ? {
              id: child.nurse_id,
              name: child.nurse_name || 'Unknown',
              phone: child.nurse_phone || '',
              email: child.nurse_email || '',
            }
          : null,
      }));

      setChildren(childrenList);
      if (childrenList.length > 0) {
        setSelectedChild(childrenList[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async (childId) => {
    setLoading(true);
    try {
      const res = await getChildSchedule(childId, user.id);
      setSchedule(res.data.data.schedule || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vaccination schedule');
    } finally {
      setLoading(false);
    }
  };

  const checkCertificateStatus = async (childId) => {
    try {
      const res = await api.get(`/certificates/child/${childId}`);
      const data = res.data?.data || res.data;
      setCertStatus(data);
    } catch {
      setCertStatus(null);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!selectedChild) return;
    setError('');
    setSuccessMessage('');
    try {
      const res = await downloadCertificate(selectedChild.id);
      const blob = new Blob([res.data], { type: 'text/html' }); // backend returns HTML
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${selectedChild.unique_child_id}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Certificate downloaded successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Certificate not available yet. Please wait for nurse and admin approval.');
    }
  };

  const handleReschedule = async (appointmentId, newDate) => {
    // ... (keep existing reschedule logic)
  };

  if (loading && children.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
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
                  <button
                    key={child.id}
                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedChild?.id === child.id ? 'active' : ''}`}
                    onClick={() => setSelectedChild(child)}
                  >
                    <div>
                      <strong>{child.name}</strong>
                      <br />
                      <small>ID: {child.unique_child_id}</small>
                    </div>
                    <span className="badge bg-secondary rounded-pill">{child.vaccine_progress || 0}%</span>
                  </button>
                ))}
              </div>
              <div className="card-footer">
                <Link to="/parent/add-child" className="btn btn-sm btn-success w-100">+ Register New Child</Link>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            {selectedChild && (
              <>
                <ChildProfile child={selectedChild} />

                {selectedChild.assigned_nurse && (
                  <div className="alert alert-info d-flex justify-content-between align-items-center mt-3">
                    <div>
                      <strong>👩‍⚕️ Assigned Nurse:</strong> {selectedChild.assigned_nurse.name}
                      <br />
                      <small>📞 {selectedChild.assigned_nurse.phone} | ✉️ {selectedChild.assigned_nurse.email}</small>
                    </div>
                  </div>
                )}

                <div className="card shadow-sm mt-4">
                  <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Vaccination Roadmap</h5>
                    {/* Certificate status & download */}
                    <span className="d-flex align-items-center gap-2">
                      {certStatus ? (
                        certStatus.is_fully_approved ? (
                          <>
                            <span className="text-white small">✅ Approved</span>
                            <button className="btn btn-sm btn-light" onClick={handleDownloadCertificate}>
                              📄 Download Certificate
                            </button>
                          </>
                        ) : (
                          <span className="text-white small">
                            ⏳ Pending {!certStatus.is_approved_by_nurse ? 'nurse' : 'admin'} approval
                          </span>
                        )
                      ) : (
                        <span className="text-white small">Certificate not requested</span>
                      )}
                    </span>
                  </div>
                  <div className="card-body">
                    <VaccineTable schedule={schedule} onReschedule={handleReschedule} />
                  </div>
                </div>

                {schedule.filter(s => s.status === 'pending' && new Date(s.scheduled_date) >= new Date()).length > 0 && (
                  <div className="alert alert-warning mt-3">
                    <strong>Next Appointment:</strong>{' '}
                    {schedule.find(s => s.status === 'pending' && new Date(s.scheduled_date) >= new Date())?.scheduled_date}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;