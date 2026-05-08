import React, { useState, useEffect } from 'react';
import { getPendingChildren, approveChild, rejectChild } from '../../services/nurseService';

const PendingChildren = ({ onProcessed }) => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPending = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPendingChildren();
      console.log('FULL PENDING RESPONSE:', res);
      console.log('res.data:', res.data);
      // Extract array based on backend response format
      const childrenList = Array.isArray(res.data)
        ? res.data
        : (res.data?.data && Array.isArray(res.data.data) ? res.data.data : []);
      console.log('final childrenList:', childrenList);
      setChildren(childrenList);
    } catch (err) {
      console.error('ERROR loading pending children:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load pending children');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (childId) => {
    try {
      await approveChild(childId);
      setSuccess('Child approved');
      loadPending();
      if (onProcessed) onProcessed();
    } catch (err) {
      setError(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async (childId) => {
    if (!window.confirm('Reject this child?')) return;
    try {
      await rejectChild(childId);
      setSuccess('Child rejected');
      loadPending();
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed');
    }
  };

  if (loading) return <div className="text-center py-4"><div className="spinner-border text-primary" /></div>;

  return (
    <div>
      <h4 className="mb-3">Pending Child Registrations</h4>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {children.length === 0 ? (
        <div className="alert alert-info">No pending child registrations.</div>
      ) : (
        <table className="table table-bordered table-hover">
          <thead className="table-light">
            <tr>
              <th>Child Name</th>
              <th>Unique ID</th>
              <th>DOB</th>
              <th>Parent Name</th>
              <th>Parent Phone</th>
              <th>Historical Vaccines</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {children.map(child => (
              <tr key={child.id}>
                <td>{child.name}</td>
                <td>{child.unique_child_id}</td>
                <td>{child.dob}</td>
                <td>{child.parent_name}</td>
                <td>{child.parent_phone}</td>
                <td>{child.pending_historical_vaccines || 'None'}</td>
                <td>
                  <button className="btn btn-success btn-sm me-2" onClick={() => handleApprove(child.id)}>Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleReject(child.id)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PendingChildren;