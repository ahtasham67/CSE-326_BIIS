import { useState, useEffect } from 'react';
import api from '../../api';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [seatChanges, setSeatChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('applications');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [appRes, scRes] = await Promise.all([
        api.get('/applications'),
        api.get('/seat-changes')
      ]);
      setApplications(appRes.data.applications);
      setSeatChanges(scRes.data.seatChanges);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>My Applications</h1>
        <p>Track the status of your seat applications and change requests</p>
      </div>

      <div className="filters-bar">
        <button
          className={`btn ${tab === 'applications' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('applications')}
        >
          📝 Seat Applications ({applications.length})
        </button>
        <button
          className={`btn ${tab === 'changes' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('changes')}
        >
          🔄 Seat Changes ({seatChanges.length})
        </button>
      </div>

      {tab === 'applications' && (
        <>
          {applications.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📝</div>
              <h3>No applications yet</h3>
              <p>Apply for a seat to see your applications here</p>
            </div>
          ) : (
            applications.map(app => (
              <div key={app.id} className="application-card">
                <div className="application-header">
                  <div className="applicant-info">
                    <h3>{app.hall_name}</h3>
                    <p>
                      {app.room_number ? `Room ${app.room_number} (Floor ${app.floor})` : 'No room preference'}
                      {' · '}
                      {new Date(app.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`badge badge-${app.status}`}>
                    {app.status.toUpperCase()}
                  </span>
                </div>

                <div className="reason-text">{app.reason}</div>

                {app.document_url && (
                  <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                    📎 <a href={app.document_url} target="_blank" rel="noopener noreferrer">View attached document</a>
                  </p>
                )}

                {app.ai_recommendation && (
                  <div className="ai-section">
                    <div className="ai-label">🤖 AI Analysis</div>
                    <p className="ai-summary">{app.ai_summary}</p>
                    <span className={`badge badge-${app.ai_recommendation}`} style={{ marginTop: '8px' }}>
                      {app.ai_recommendation.toUpperCase()} recommendation
                    </span>
                  </div>
                )}

                {app.feedback && (
                  <div className="feedback-section">
                    <label>Provost Feedback</label>
                    <p>{app.feedback}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}

      {tab === 'changes' && (
        <>
          {seatChanges.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔄</div>
              <h3>No seat change requests</h3>
              <p>Request a seat change if you're a current resident</p>
            </div>
          ) : (
            seatChanges.map(sc => (
              <div key={sc.id} className="application-card">
                <div className="application-header">
                  <div className="applicant-info">
                    <h3>Seat Change Request</h3>
                    <p>
                      {sc.current_room ? `Current: Room ${sc.current_room}` : ''}
                      {sc.preferred_room ? ` → Preferred: Room ${sc.preferred_room}` : ''}
                      {' · '}
                      {new Date(sc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`badge badge-${sc.status}`}>
                    {sc.status.toUpperCase()}
                  </span>
                </div>
                <div className="reason-text">{sc.reason}</div>

                {sc.feedback && (
                  <div className="feedback-section">
                    <label>Provost Feedback</label>
                    <p>{sc.feedback}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
