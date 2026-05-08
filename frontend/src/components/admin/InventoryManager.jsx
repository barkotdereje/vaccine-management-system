import React, { useState, useEffect } from 'react';
import { getInventory, addInventoryBatch, updateInventoryBatch, deleteInventoryBatch } from '../../services/adminService';
import { getVaccines } from '../../services/adminService';  // need vaccine list for dropdown
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const InventoryManager = () => {
  const [batches, setBatches] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    vaccine_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: '',
    registration_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadData();
    loadVaccines();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getInventory();
      setBatches(res.data?.data || []);
    } catch (err) {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadVaccines = async () => {
    try {
      const res = await getVaccines();
      setVaccines(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error('Failed to load vaccines for dropdown');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const payload = {
      vaccine_id: parseInt(formData.vaccine_id, 10),
      batch_number: formData.batch_number.trim(),
      expiry_date: formData.expiry_date,
      quantity: parseInt(formData.quantity, 10),
      registration_date: formData.registration_date,
      notes: formData.notes.trim(),
    };

    if (!payload.vaccine_id || !payload.batch_number || !payload.expiry_date || isNaN(payload.quantity) || payload.quantity <= 0) {
      setError('All required fields must be filled correctly');
      return;
    }

    try {
      if (editingId) {
        await updateInventoryBatch(editingId, payload);
        setSuccess('Batch updated');
      } else {
        await addInventoryBatch(payload.vaccine_id, payload.batch_number, payload.expiry_date, payload.quantity, payload.registration_date, payload.notes);
        setSuccess('Batch added');
      }
      setEditingId(null);
      resetForm();
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (batch) => {
    setEditingId(batch.id);
    setFormData({
      vaccine_id: batch.vaccine_id,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      quantity: batch.quantity,
      registration_date: batch.registration_date,
      notes: batch.notes || '',
    });
  };

  const handleDelete = async (batch) => {
    if (!window.confirm(`Delete batch ${batch.batch_number}?`)) return;
    try {
      await deleteInventoryBatch(batch.id);
      loadData();
      setSuccess('Batch deleted');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Deletion failed');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      vaccine_id: '',
      batch_number: '',
      expiry_date: '',
      quantity: '',
      registration_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  // Chart data: aggregate quantity per vaccine
  const chartData = (() => {
    if (!batches.length) return null;
    const labelMap = {};
    batches.forEach(b => {
      if (!labelMap[b.vaccine_name]) labelMap[b.vaccine_name] = 0;
      labelMap[b.vaccine_name] += parseInt(b.quantity, 10);
    });
    const labels = Object.keys(labelMap);
    const data = labels.map(k => labelMap[k]);
    return {
      labels,
      datasets: [{
        label: 'Total Doses',
        data,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      }],
    };
  })();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Stock Levels by Vaccine' },
    },
    scales: { y: { beginAtZero: true } },
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;

  return (
    <div className="container-fluid mt-4">
      <h4>Vaccine Inventory & Expiry Tracker</h4>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Add / Edit Form */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">{editingId ? 'Edit Batch' : 'Add New Batch'}</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleAddOrUpdate}>
            <div className="row">
              <div className="col-md-3 mb-3">
                <label>Vaccine *</label>
                <select name="vaccine_id" className="form-select" value={formData.vaccine_id} onChange={handleChange} required>
                  <option value="">Select vaccine</option>
                  {vaccines.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="col-md-2 mb-3">
                <label>Batch No. *</label>
                <input type="text" name="batch_number" className="form-control" value={formData.batch_number} onChange={handleChange} required />
              </div>
              <div className="col-md-2 mb-3">
                <label>Expiry Date *</label>
                <input type="date" name="expiry_date" className="form-control" value={formData.expiry_date} onChange={handleChange} required />
              </div>
              <div className="col-md-1 mb-3">
                <label>Quantity *</label>
                <input type="number" name="quantity" className="form-control" min="1" value={formData.quantity} onChange={handleChange} required />
              </div>
              <div className="col-md-2 mb-3">
                <label>Reg. Date</label>
                <input type="date" name="registration_date" className="form-control" value={formData.registration_date} onChange={handleChange} />
              </div>
              <div className="col-md-2 mb-3">
                <label>Notes / Allergies</label>
                <input type="text" name="notes" className="form-control" value={formData.notes} onChange={handleChange} placeholder="Expected allergies, etc." />
              </div>
            </div>
            <button type="submit" className="btn btn-success">{editingId ? 'Update' : 'Add'}</button>
            {editingId && <button type="button" className="btn btn-secondary ms-2" onClick={resetForm}>Cancel</button>}
          </form>
        </div>
      </div>

      {/* Stock Level Chart */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-dark text-white"><h5>Current Stock Levels</h5></div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                {chartData ? <Bar data={chartData} options={chartOptions} /> : <div className="alert alert-info">No inventory data</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="card shadow-sm">
        <div className="card-header bg-secondary text-white"><h5>All Batches</h5></div>
        <div className="card-body">
          {batches.length === 0 ? (
            <div className="alert alert-info">No batches registered.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Vaccine</th><th>Batch No.</th><th>Expiry Date</th><th>Qty</th><th>Reg. Date</th><th>Notes</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(batch => {
                    const isExpired = new Date(batch.expiry_date) < new Date();
                    const isLow = batch.quantity < 100;
                    return (
                      <tr key={batch.id} className={isExpired ? 'table-danger' : isLow ? 'table-warning' : ''}>
                        <td>{batch.vaccine_name}</td>
                        <td>{batch.batch_number}</td>
                        <td>{batch.expiry_date}</td>
                        <td>{batch.quantity}</td>
                        <td>{batch.registration_date}</td>
                        <td>{batch.notes || '-'}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleEdit(batch)}>Edit</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(batch)}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;