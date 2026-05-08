import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAdminStats,
  getLowStock,
  getExpiringBatches,
  getNurses,
  createNurse,
  deleteNurse,
  getPendingCertificates,
  approveCertificateAdmin,
  updateNurse,
  getAuditLogs,
  getNurseReports,
} from '../../services/adminService';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import VaccineManager from './VaccineManager';
import InventoryManager from './InventoryManager';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalChildren: 0,
    monthlyVaccinations: 0,
    totalNurses: 0,
    totalParents: 0,
    vaccineLabels: [],
    vaccineCounts: [],
    recentActivities: [],
  });
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [pendingCerts, setPendingCerts] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newNurse, setNewNurse] = useState({
    name: '',
    email: '',
    phone: '',
    education_level: '',
    certificate: '',
    work_experience: '',
    username: '',
    password: '',
  });
  const [editingNurse, setEditingNurse] = useState(null);

  const [auditLogs, setAuditLogs] = useState([]);
  const [nurseReports, setNurseReports] = useState([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, lowRes, expRes, nursesRes, certsRes] = await Promise.all([
        getAdminStats(),
        getLowStock(),
        getExpiringBatches(),
        getNurses(),
        getPendingCertificates(),
      ]);
      setStats(statsRes.data);
      setLowStock(lowRes.data || []);
      setExpiring(expRes.data || []);
      setNurses(nursesRes.data || []);
      setPendingCerts(certsRes.data?.data || []);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await getAuditLogs({ limit: 100 });
      setAuditLogs(res.data?.data || []);
    } catch (err) {
      setError('Failed to load audit logs');
    }
  };

  const loadNurseReports = async () => {
    try {
      const res = await getNurseReports();
      setNurseReports(res.data?.data || []);
    } catch (err) {
      setError('Failed to load reports');
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') loadAuditLogs();
    if (activeTab === 'nurse-reports') loadNurseReports();
  }, [activeTab]);

  const handleApproveCertificate = async (certId) => {
    try {
      await approveCertificateAdmin(certId);
      setPendingCerts(prev => prev.filter(c => c.id !== certId));
      setSuccess('Certificate approved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Approval failed');
    }
  };

  const handleAddNurse = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createNurse(
        newNurse.name,
        newNurse.email,
        newNurse.phone,
        newNurse.education_level,
        newNurse.certificate,
        newNurse.work_experience,
        newNurse.username,
        newNurse.password
      );
      setNewNurse({ name: '', email: '', phone: '', education_level: '', certificate: '', work_experience: '', username: '', password: '' });
      setSuccess('Nurse added');
      setTimeout(() => setSuccess(''), 3000);
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add nurse');
    }
  };

  const handleDeleteNurse = async (nurseId) => {
    if (!window.confirm('Revoke this nurse?')) return;
    try {
      await deleteNurse(nurseId);
      setNurses(prev => prev.filter(n => n.id !== nurseId));
      setSuccess('Nurse revoked');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to revoke nurse');
    }
  };

  const chartData = stats.vaccineLabels.length > 0 ? {
    labels: stats.vaccineLabels,
    datasets: [{
      label: 'Vaccinations (Last 30 Days)',
      data: stats.vaccineCounts,
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Vaccination Distribution by Type' },
    },
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Admin Dashboard</h2>
        <p className="text-muted">Welcome, {user?.name}</p>
      </div>
      {error && <div className="alert alert-danger alert-dismissible">{error}</div>}
      {success && <div className="alert alert-success alert-dismissible">{success}</div>}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'certificates' ? 'active' : ''}`} onClick={() => setActiveTab('certificates')}>📜 Certificates ({pendingCerts.length})</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'nurses' ? 'active' : ''}`} onClick={() => setActiveTab('nurses')}>👩‍⚕️ Nurses ({nurses.length})</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'vaccines' ? 'active' : ''}`} onClick={() => setActiveTab('vaccines')}>💉 Vaccines</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>📦 Inventory</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>📋 Activity Logs</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'nurse-reports' ? 'active' : ''}`} onClick={() => setActiveTab('nurse-reports')}>📁 Nurse Reports</button>
        </li>
      </ul>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <div className="card text-white bg-primary h-100">
                <div className="card-body"><h5>Total Children</h5><h2>{stats.totalChildren}</h2></div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card text-white bg-success h-100">
                <div className="card-body"><h5>Monthly Vaccinations</h5><h2>{stats.monthlyVaccinations}</h2></div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card text-white bg-info h-100">
                <div className="card-body"><h5>Total Nurses</h5><h2>{stats.totalNurses}</h2></div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card text-white bg-warning h-100">
                <div className="card-body"><h5>Total Parents</h5><h2>{stats.totalParents}</h2></div>
              </div>
            </div>
          </div>

          {lowStock.length > 0 && (
            <div className="alert alert-warning">
              <strong>⚠️ Low Stock:</strong>
              <ul className="mb-0 mt-2">
                {lowStock.map(item => (
                  <li key={item.batch_number}>{item.vaccine_name} Batch {item.batch_number}: {item.quantity} doses</li>
                ))}
              </ul>
            </div>
          )}
          {expiring.length > 0 && (
            <div className="alert alert-danger">
              <strong>⚠️ Expiring Soon:</strong>
              <ul className="mb-0 mt-2">
                {expiring.map(item => (
                  <li key={item.batch_number}>{item.vaccine_name} Batch {item.batch_number} expires {item.expiry_date}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-header bg-primary text-white"><h5>Vaccination Distribution</h5></div>
                <div className="card-body">
                  <div style={{ height: '400px' }}>
                    {chartData ? <Bar data={chartData} options={chartOptions} /> : <div className="alert alert-info">No data</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-header bg-secondary text-white"><h5>Recent Vaccinations</h5></div>
                <div className="card-body">
                  {stats.recentActivities.length > 0 ? (
                    <table className="table table-sm table-bordered">
                      <thead><tr><th>Child</th><th>Vaccine</th><th>Given Date</th><th>Batch</th></tr></thead>
                      <tbody>
                        {stats.recentActivities.map((a, idx) => (
                          <tr key={idx}><td>{a.child_name}</td><td>{a.vaccine_name}</td><td>{a.given_date}</td><td>{a.batch_number || '-'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <div className="alert alert-info">No recent activities</div>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Certificate Approvals Tab */}
      {activeTab === 'certificates' && (
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white"><h5>Pending Certificate Approvals</h5></div>
          <div className="card-body">
            {pendingCerts.length === 0 ? (
              <div className="alert alert-info">No certificates waiting for approval.</div>
            ) : (
              <table className="table table-bordered table-hover">
                <thead className="table-light">
                  <tr><th>Child Name</th><th>Unique ID</th><th>Parent</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {pendingCerts.map(cert => (
                    <tr key={cert.id}>
                      <td>{cert.child_name}</td>
                      <td>{cert.unique_child_id}</td>
                      <td>{cert.parent_name}</td>
                      <td>
                        <button className="btn btn-success btn-sm" onClick={() => handleApproveCertificate(cert.id)}>
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Nurse Management Tab */}
      {activeTab === 'nurses' && (
        <div className="row">
          <div className="col-md-5 mb-4">
            <div className="card shadow-sm">
              <div className="card-header bg-primary text-white">
                <h5>{editingNurse ? 'Edit Nurse' : 'Add Nurse'}</h5>
              </div>
              <div className="card-body">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const data = { ...newNurse };
                    if (editingNurse) {
                      updateNurse(editingNurse.id, data)
                        .then(() => {
                          setSuccess('Nurse updated');
                          setEditingNurse(null);
                          setNewNurse({ name: '', email: '', phone: '', education_level: '', certificate: '', work_experience: '', username: '', password: '' });
                          loadAllData();
                        })
                        .catch(err => setError(err.response?.data?.message || 'Update failed'));
                    } else {
                      handleAddNurse(e);
                    }
                  }}>
                  <div className="row">
                    <div className="col-md-6 mb-3"><label>Full Name *</label><input type="text" className="form-control" value={newNurse.name} onChange={e => setNewNurse({...newNurse, name: e.target.value})} required /></div>
                    <div className="col-md-6 mb-3"><label>Phone *</label><input type="text" className="form-control" placeholder="0911XXXXXX" value={newNurse.phone} onChange={e => setNewNurse({...newNurse, phone: e.target.value})} required /></div>
                  </div>
                  <div className="mb-3"><label>Email</label><input type="email" className="form-control" value={newNurse.email} onChange={e => setNewNurse({...newNurse, email: e.target.value})} /></div>
                  <div className="mb-3"><label>Username *</label><input type="text" className="form-control" value={newNurse.username} onChange={e => setNewNurse({...newNurse, username: e.target.value})} required /></div>
                  <div className="mb-3"><label>Password {editingNurse ? '(leave blank to keep)' : ''}</label><input type="password" className="form-control" value={newNurse.password} onChange={e => setNewNurse({...newNurse, password: e.target.value})} /></div>
                  <div className="mb-3"><label>Education Level</label><input type="text" className="form-control" value={newNurse.education_level} onChange={e => setNewNurse({...newNurse, education_level: e.target.value})} /></div>
                  <div className="mb-3"><label>Certificate</label><input type="text" className="form-control" value={newNurse.certificate} onChange={e => setNewNurse({...newNurse, certificate: e.target.value})} /></div>
                  <div className="mb-3"><label>Work Experience (optional)</label><textarea className="form-control" rows="2" value={newNurse.work_experience} onChange={e => setNewNurse({...newNurse, work_experience: e.target.value})} /></div>
                  <button type="submit" className="btn btn-success w-100">{editingNurse ? 'Update Nurse' : 'Create Nurse'}</button>
                  {editingNurse && <button type="button" className="btn btn-secondary w-100 mt-2" onClick={() => { setEditingNurse(null); setNewNurse({ name: '', email: '', phone: '', education_level: '', certificate: '', work_experience: '', username: '', password: '' }); }}>Cancel</button>}
                </form>
              </div>
            </div>
          </div>
          <div className="col-md-7">
            <div className="card shadow-sm">
              <div className="card-header bg-secondary text-white"><h5>Nurse List</h5></div>
              <div className="card-body">
                {nurses.length === 0 ? <div className="alert alert-info">No nurses found.</div> : (
                  <table className="table table-bordered table-hover">
                    <thead><tr><th>Name</th><th>Phone</th><th>Username</th><th>Education</th><th>Actions</th></tr></thead>
                    <tbody>
                      {nurses.map(nurse => (
                        <tr key={nurse.id}>
                          <td>{nurse.name}</td>
                          <td>{nurse.phone}</td>
                          <td>{nurse.username}</td>
                          <td>{nurse.education_level || '-'}</td>
                          <td>
                            <button className="btn btn-sm btn-primary me-1" onClick={() => {
                              setEditingNurse(nurse);
                              setNewNurse({
                                name: nurse.name,
                                email: nurse.email,
                                phone: nurse.phone,
                                education_level: nurse.education_level || '',
                                certificate: nurse.certificate || '',
                                work_experience: nurse.work_experience || '',
                                username: nurse.username || '',
                                password: '',
                              });
                            }}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteNurse(nurse.id)}>Revoke</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vaccines Tab */}
      {activeTab === 'vaccines' && <VaccineManager />}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && <InventoryManager />}

      {/* Activity Logs Tab */}
      {activeTab === 'audit' && (
        <div className="card shadow-sm">
          <div className="card-header bg-dark text-white"><h5>Activity Logs</h5></div>
          <div className="card-body">
            {auditLogs.length === 0 ? <div className="alert alert-info">No logs recorded.</div> : (
              <table className="table table-sm table-striped">
                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Description</th></tr></thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td>{log.created_at}</td>
                      <td>{log.user_name || 'System'}</td>
                      <td>{log.action}</td>
                      <td>{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Nurse Reports Tab */}
      {activeTab === 'nurse-reports' && (
        <div className="card shadow-sm">
          <div className="card-header bg-info text-white"><h5>Nurse Reports</h5></div>
          <div className="card-body">
            {nurseReports.length === 0 ? <div className="alert alert-info">No reports submitted by nurses.</div> : (
              <table className="table table-bordered">
                <thead><tr><th>Nurse</th><th>Type</th><th>Period</th><th>Content</th><th>Date</th></tr></thead>
                <tbody>
                  {nurseReports.map(r => (
                    <tr key={r.id}>
                      <td>{r.nurse_name}</td>
                      <td>{r.report_type}</td>
                      <td>{r.period_start} to {r.period_end}</td>
                      <td>{r.content}</td>
                      <td>{r.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;