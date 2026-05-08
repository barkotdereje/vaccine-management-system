import React, { useState, useEffect } from 'react';
import {
  getVaccines,
  addVaccine,
  updateVaccine,
  deleteVaccine,
  toggleVaccineActive,
} from '../../services/adminService';

const VaccineManager = () => {
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    days_from_birth: '',
    description: '',
  });

  useEffect(() => {
    loadVaccines();
  }, []);

  const loadVaccines = async () => {
    setLoading(true);
    try {
      const res = await getVaccines();
      // The endpoint returns plain array or {data: [...]}? Check format
      setVaccines(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (err) {
      setError('Failed to load vaccines');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const payload = {
      name: formData.name.trim(),
      days_from_birth: parseInt(formData.days_from_birth, 10),
      description: formData.description.trim(),
    };

    if (!payload.name || isNaN(payload.days_from_birth)) {
      setError('Name and valid days from birth required');
      return;
    }

    try {
      if (editingId) {
        await updateVaccine(editingId, payload.name, payload.days_from_birth, payload.description);
        setSuccess('Vaccine updated');
      } else {
        await addVaccine(payload.name, payload.days_from_birth, payload.description);
        setSuccess('Vaccine added');
      }
      setEditingId(null);
      setFormData({ name: '', days_from_birth: '', description: '' });
      loadVaccines();
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed';
      setError(msg);
    }
  };

  const handleEdit = (vaccine) => {
    setEditingId(vaccine.id);
    setFormData({
      name: vaccine.name,
      days_from_birth: vaccine.days_from_birth.toString(),
      description: vaccine.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', days_from_birth: '', description: '' });
  };

  const handleToggle = async (vaccine) => {
    try {
      await toggleVaccineActive(vaccine.id, !vaccine.is_active);
      loadVaccines();
      setSuccess(`Vaccine ${vaccine.is_active ? 'deactivated' : 'activated'}`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Toggle failed');
    }
  };

  const handleDelete = async (vaccine) => {
    if (!window.confirm(`Permanently delete ${vaccine.name}?`)) return;
    try {
      await deleteVaccine(vaccine.id);
      loadVaccines();
      setSuccess('Vaccine deleted');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Delete failed');
    }
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  return (
    <div className="container-fluid mt-4">
      <h4>Vaccine Management</h4>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Add / Edit Form */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">{editingId ? 'Edit Vaccine' : 'Add New Vaccine'}</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleAddOrUpdate}>
            <div className="row">
              <div className="col-md-4 mb-3">
                <label>Vaccine Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-3 mb-3">
                <label>Days from Birth *</label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  value={formData.days_from_birth}
                  onChange={e => setFormData({...formData, days_from_birth: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-5 mb-3">
                <label>Description (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success">
              {editingId ? 'Update Vaccine' : 'Add Vaccine'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary ms-2" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Vaccine List */}
      <div className="card shadow-sm">
        <div className="card-header bg-secondary text-white"><h5 className="mb-0">Vaccine List</h5></div>
        <div className="card-body">
          {vaccines.length === 0 ? (
            <div className="alert alert-info">No vaccines found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Days from Birth</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vaccines.map(v => (
                    <tr key={v.id} className={!v.is_active ? 'table-secondary' : ''}>
                      <td>{v.name}</td>
                      <td>{v.days_from_birth}</td>
                      <td>{v.description || '-'}</td>
                      <td>
                        <span className={`badge ${v.is_active ? 'bg-success' : 'bg-secondary'}`}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleEdit(v)}>Edit</button>
                        <button
                          className={`btn btn-sm me-1 ${v.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                          onClick={() => handleToggle(v)}
                        >
                          {v.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(v)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VaccineManager;