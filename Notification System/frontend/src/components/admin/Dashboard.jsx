import { getNurseReports } from '../../services/adminService';

const [nurseReports, setNurseReports] = useState([]);

const loadNurseReports = async () => {
  try {
    const res = await getNurseReports();
    setNurseReports(res.data?.data || []);
  } catch (err) {
    setError('Failed to load reports');
  }
};
useEffect(() => {
  if (activeTab === 'nurse-reports') loadNurseReports();
}, [activeTab]);
<li className="nav-item">
  <button className={`nav-link ${activeTab === 'nurse-reports' ? 'active' : ''}`} onClick={() => setActiveTab('nurse-reports')}>
    📁 Nurse Reports
  </button>
</li>
{activeTab === 'nurse-reports' && (
  <div>
    <h5 className="fw-bold mb-3">All Nurse Reports</h5>
    {nurseReports.length === 0 ? (
      <div className="alert border-0 rounded-3 text-center py-4" style={{background:'#d8e6fb',color:'#1e5fbb'}}>
        No reports submitted by nurses.
      </div>
    ) : (
      nurseReports.map(report => {
        let data = {};
        try {
          data = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
        } catch (e) {}
        return (
          <div key={report.id} className="card border-0 shadow-sm mb-3 rounded-4 overflow-hidden" style={{borderLeft:'4px solid #0d7c9e'}}>
            <div className="card-header bg-white border-bottom d-flex justify-content-between">
              <span><strong>{report.nurse_name}</strong> — {report.type?.toUpperCase()} REPORT</span>
              <span className="text-muted small">{report.period_start} → {report.period_end} | {new Date(report.created_at).toLocaleString()}</span>
            </div>
            <div className="card-body p-4">
              <div className="row">
                <div className="col-md-6">
                  <p className="fw-bold small">📊 Vaccination Summary</p>
                  <ul className="list-unstyled ms-3 small">
                    <li>Children vaccinated: {data.vaccination_summary?.total_children_vaccinated ?? '—'}</li>
                    <li>New registrations: {data.vaccination_summary?.new_registrations ?? '—'}</li>
                    <li>Follow‑ups: {data.vaccination_summary?.follow_ups ?? '—'}</li>
                    <li>Doses per vaccine:
                      <ul>
                        {data.vaccination_summary?.doses_per_vaccine?.map((v, i) => (
                          <li key={i}>{v.name}: {v.count}</li>
                        )) || <li>No data</li>}
                      </ul>
                    </li>
                  </ul>
                  <p className="fw-bold small">📅 Appointment Tracking</p>
                  <ul className="list-unstyled ms-3 small">
                    <li>Completed: {data.appointment_tracking?.completed_appointments ?? '—'}</li>
                    <li>Defaulters: {data.appointment_tracking?.defaulters?.length ? data.appointment_tracking.defaulters.map(d => `${d.child_name} (${d.parent_phone})`).join(', ') : 'None'}</li>
                    <li>Reschedule requests: {data.appointment_tracking?.pending_reschedule_requests ?? 0}/{data.appointment_tracking?.approved_reschedule_requests ?? 0}</li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <p className="fw-bold small">📦 Inventory & Wastage</p>
                  <ul className="list-unstyled ms-3 small">
                    <li>Doses used: {data.inventory_wastage?.doses_used ?? '—'}</li>
                    <li>Closing stock:
                      <ul>
                        {data.inventory_wastage?.closing_stock?.map((s, i) => (
                          <li key={i}>{s.name}: {s.total_qty}</li>
                        )) || <li>No data</li>}
                      </ul>
                    </li>
                  </ul>
                  <p className="fw-bold small">🏥 Health & Safety</p>
                  <ul className="list-unstyled ms-3 small">
                    <li>AEFI cases: {data.health_safety?.aefi_cases?.length || 0}</li>
                    <li>Challenges: {data.health_safety?.challenges || 'None'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
)}