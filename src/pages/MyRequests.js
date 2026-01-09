import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { auth, db } from "../services/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import "../App.css";

/* ================= COMPONENT ================= */

function MyRequests() {
  const navigate = useNavigate();
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }

    const qSent = query(
      collection(db, "requests"),
      where("requestedBy", "==", user.uid)
    );

    const unsubSent = onSnapshot(qSent, (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setSentRequests(list.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    });

    return () => unsubSent();
  }, [navigate]);

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "requests", selectedId));
      toast.success("Record deleted successfully");
      setShowDeleteConfirm(false);
    } catch (err) {
      toast.error("Failed to delete record");
    }
  };

  const handleMarkFulfilled = async (id) => {
    try {
      await updateDoc(doc(db, "requests", id), {
        status: "fulfilled"
      });
      toast.success("Request marked as fulfilled. Glad we could help!");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="history-page">
        <div className="pulse-loader"></div>
        <p>Retrieving your requests...</p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-container">
        <BackButton />

        <div className="dashboard-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 className="dashboard-title">My Blood Requests</h2>
          <p className="dashboard-subtitle">A detailed record of all your emergency broadcasts.</p>
        </div>

        {sentRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No requests found</h3>
            <p>Your blood request history will appear here once you raise one.</p>
          </div>
        ) : (
          sentRequests.map(req => (
            <div key={req.id} className="history-card">
              <div className="history-card-header">
                <div className="history-type-badge type-sent">Case #{req.id.slice(-6).toUpperCase()}</div>
                <div className={`status-pill ${req.status?.toLowerCase()}`}>
                  {req.status}
                </div>
              </div>

              <div className="history-card-body">
                <div className="history-info-item">
                  <span className="label">Purpose</span>
                  <span className="value">{req.purpose}</span>
                </div>
                <div className="history-info-item">
                  <span className="label">Blood Group</span>
                  <span className="value" style={{ color: 'var(--primary-red)', fontSize: '18px' }}>{req.bloodGroup}</span>
                </div>
                <div className="history-info-item">
                  <span className="label">Patient Name</span>
                  <span className="value">{req.patientName}</span>
                </div>
                <div className="history-info-item">
                  <span className="label">Patient Age</span>
                  <span className="value">{req.patientAge || 'N/A'}</span>
                </div>
                <div className="history-info-item">
                  <span className="label">Units Required</span>
                  <span className="value">{req.bloodUnits} Units</span>
                </div>
                <div className="history-info-item">
                  <span className="label">Required Date</span>
                  <span className="value">{req.requiredDate}</span>
                </div>
                <div className="history-info-item">
                  <span className="label">Hospital</span>
                  <span className="value">{req.hospitalName}</span>
                </div>
                <div className="history-info-item">
                  <span className="label">Contact</span>
                  <span className="value">{req.mobileNumber}</span>
                </div>
                <div className="history-info-item">
                  <span className="label">Email</span>
                  <span className="value">{req.email || 'N/A'}</span>
                </div>
                <div className="history-info-item">
                  <span className="label">Location</span>
                  <span className="value">{req.city}, {req.state}</span>
                </div>
                <div className="history-info-item" style={{ gridColumn: 'span 2' }}>
                  <span className="label">Detailed Address</span>
                  <span className="value">{req.address || 'N/A'}</span>
                </div>
              </div>

              <div className="history-card-footer">
                <button
                  className="delete-history-btn"
                  onClick={() => {
                    setSelectedId(req.id);
                    setShowDeleteConfirm(true);
                  }}
                >
                  Delete Request
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Custom Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="success-overlay" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
          <div className="success-card" style={{ background: 'white', borderRadius: '24px' }}>
            <div className="success-icon-lottie" style={{ background: '#ffebee', color: '#d32f2f' }}>🗑️</div>
            <h2 style={{ fontSize: '22px' }}>Delete Request?</h2>
            <p>
              Are you sure you want to delete this case record? <br />
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="success-dashboard-btn"
                onClick={() => setShowDeleteConfirm(false)}
                style={{ background: '#f5f5f5', color: '#333', boxShadow: 'none' }}
              >
                No, Keep it
              </button>
              <button
                className="success-dashboard-btn"
                style={{ background: '#d32f2f' }}
                onClick={handleDelete}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyRequests;
