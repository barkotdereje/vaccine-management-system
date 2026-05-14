const [reportType, setReportType] = useState('weekly');
const [challenges, setChallenges] = useState('');
const [reportsHistory, setReportsHistory] = useState([]);

const loadNurseReports = async () => {
  try {
    const res = await api.get(`/nurse/reports?nurse_id=${user?.id}`);
    setReportsHistory(res.data?.data || []);
  } catch (err) {}
};

const handleGenerateReport = async () => {
  let start, end;
  const today = new Date();
  if (reportType === 'weekly') {
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    start = monday.toISOString().split('T')[0];
    end = sunday.toISOString().split('T')[0];
  } else {
    start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  }
  try {
    await generateReport(reportType, start, end, user?.id, challenges);
    setMsg({ type: 'success', text: 'Detailed report sent to admin' });
    setChallenges('');
    loadNurseReports();
  } catch (err) {
    setMsg({ type: 'error', text: 'Report failed' });
  }
};

const commonChallenges = [
  'Vaccine shortage / stock‑out',
  'High number of missed appointments',
  'Cold chain equipment failure',
  'Adverse events (AEFI) observed',
  'Staff shortage / high workload',
  'Difficulties reaching defaulters',
  'Incomplete vaccination records',
  'Community resistance / misinformation',
  'Other (describe below)',
];

<li className="nav-item">
  <button className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
    Reports
  </button>
</li>

{activeTab === 'reports' && (
  <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
    <div className="card-header bg-white border-bottom"><h5 className="fw-bold mb-0">Reports</h5></div>
    <div className="card-body p-4">
      <div className="row">
        <div className="col-md-5">
          <div className="mb-2">
            <label className="form-label fw-semibold small">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)} className="form-select rounded-3">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold small">Common Challenges</label>
            <div className="row">
              {commonChallenges.map((issue, idx) => (
                <div className="col-md-6" key={idx}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`challenge-${idx}`}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setChallenges(prev => prev.includes(issue) ? prev : prev + (prev ? '\n' : '') + issue);
                        } else {
                          setChallenges(prev => prev.replace(issue + '\n', '').replace(issue, '').trim());
                        }
                      }}
                    />
                    <label className="form-check-label small" htmlFor={`challenge-${idx}`}>{issue}</label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold small">Additional Details</label>
            <textarea className="form-control rounded-3" rows="3" value={challenges} onChange={e => setChallenges(e.target.value)} />
          </div>
          <button className="btn btn-primary rounded-pill w-100 fw-bold" onClick={handleGenerateReport}>
            📤 Generate & Send to Admin
          </button>
        </div>
        <div className="col-md-7">
          <h6 className="fw-bold">Previously Sent Reports</h6>
          {reportsHistory.length === 0 ? (
            <div className="alert border-0 rounded-3" style={{background:'#d8e6fb',color:'#1e5fbb'}}>No reports submitted yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover">
                <thead><tr><th>Type</th><th>Period</th><th>Date</th><th>Details</th></tr></thead>
                <tbody>
                  {reportsHistory.map(r => (
                    <tr key={r.id}>
                      <td>{r.type}</td>
                      <td>{r.period_start} → {r.period_end}</td>
                      <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-outline-primary btn-sm rounded-pill" onClick={() => {
                          const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
                          alert(JSON.stringify(data, null, 2));
                        }}>View</button>
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
  </div>
)}