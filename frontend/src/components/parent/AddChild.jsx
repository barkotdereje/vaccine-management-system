import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addChild } from '../../services/parentService';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AddChild = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vaccines, setVaccines] = useState([]);
  const [vaccineError, setVaccineError] = useState('');
  const [vaccineLoading, setVaccineLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: 'Male',
    blood_type: '',
    delivery_type: 'Normal',
    birth_place: '',
    allergies: '',
    birth_weight: '',
    historical_vaccines: [],
  });

  useEffect(() => {
    const fetchVaccines = async () => {
      setVaccineLoading(true);
      try {
        const res = await api.get('/vaccines');
        console.log('VACCINE FULL RESPONSE:', res);
        console.log('DATA KEY:', res.data);
        // The backend returns { success: true, data: [...] }
        const vaccineArray = res.data?.data || [];
        setVaccines(Array.isArray(vaccineArray) ? vaccineArray : []);
        setVaccineError('');
      } catch (err) {
        console.error('VACCINE REQUEST FAILED', err);
        setVaccineError('Could not load vaccine list. Please try again.');
      } finally {
        setVaccineLoading(false);
      }
    };
    fetchVaccines();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleHistoricalChange = (vaccineId) => {
    setFormData(prev => {
      const current = prev.historical_vaccines || [];
      return {
        ...prev,
        historical_vaccines: current.includes(vaccineId)
          ? current.filter(id => id !== vaccineId)
          : [...current, vaccineId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = { ...formData, parent_id: user.id };
      await addChild(formData);
      setSuccess('Child registration submitted. Please wait for nurse approval.');
      setTimeout(() => navigate('/parent'), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="card shadow">
        <div className="card-header bg-primary text-white">
          <h4>Register New Child</h4>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="mb-3">
            <label className="form-label">Linking child to existing parent with phone</label>
            <input type="text" className="form-control" value={user?.phone || 'N/A'} readOnly disabled />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label>Child Name *</label>
                <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="col-md-6 mb-3">
                <label>Date of Birth *</label>
                <input type="date" name="dob" className="form-control" value={formData.dob} onChange={handleChange} required />
              </div>
            </div>
            <div className="row">
              <div className="col-md-4 mb-3">
                <label>Gender</label>
                <select name="gender" className="form-select" value={formData.gender} onChange={handleChange}>
                  <option>Male</option><option>Female</option>
                </select>
              </div>
              <div className="col-md-4 mb-3">
                <label>Blood Type</label>
                <select name="blood_type" className="form-select" value={formData.blood_type} onChange={handleChange}>
                  <option value="">Select</option>
                  <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                  <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                </select>
              </div>
              <div className="col-md-4 mb-3">
                <label>Birth Weight (kg)</label>
                <input type="number" step="0.01" name="birth_weight" className="form-control" value={formData.birth_weight} onChange={handleChange} />
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label>Delivery Type</label>
                <select name="delivery_type" className="form-select" value={formData.delivery_type} onChange={handleChange}>
                  <option>Normal</option><option>C-Section</option>
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label>Birth Place *</label>
                <input type="text" name="birth_place" className="form-control" placeholder="Hospital name or 'Home'" value={formData.birth_place} onChange={handleChange} required />
              </div>
            </div>
            <div className="mb-3">
              <label>Allergies (if any)</label>
              <textarea name="allergies" className="form-control" rows="2" value={formData.allergies} onChange={handleChange} />
            </div>

            {/* Historical Vaccines */}
            <div className="mb-3">
              <label className="form-label">Historical Vaccines (already taken at other hospitals)</label>
              {vaccineLoading ? (
                <div className="text-muted">Loading vaccine list...</div>
              ) : vaccineError ? (
                <div className="alert alert-warning">{vaccineError}</div>
              ) : vaccines.length === 0 ? (
                <div className="alert alert-info">No vaccines found in the system. You can still register the child.</div>
              ) : (
                <div className="row">
                  {vaccines.map(vaccine => (
                    <div className="col-md-3" key={vaccine.id}>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`hist-${vaccine.id}`}
                          checked={formData.historical_vaccines.includes(vaccine.id)}
                          onChange={() => handleHistoricalChange(vaccine.id)}
                        />
                        <label className="form-check-label" htmlFor={`hist-${vaccine.id}`}>
                          {vaccine.name}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <small className="text-muted">Select only vaccines already given elsewhere</small>
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Submitting...' : 'Register Child'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/parent')}>Back</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddChild;