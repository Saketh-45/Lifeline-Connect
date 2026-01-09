import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { auth, db } from "../services/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import "../App.css";

function SettingsModal({ onClose }) {
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    mobile: "",
    altMobile: "",
    state: "",
    city: "",
    address: "",
    email: "",
  });

  const [activeSection, setActiveSection] = useState(null);
  const [myRequests, setMyRequests] = useState([]);

  // ✅ ADDED (delete confirmation states)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setFormData(snap.data());
      } catch {
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  /* ================= PROFILE ================= */
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), formData);

      // ✅ NOTIFICATION: Profile Updated
      await addDoc(collection(db, "notifications"), {
        toUserId: auth.currentUser.uid,
        message: "Your profile information has been updated successfully.",
        status: "unread",
        createdAt: serverTimestamp(),
      });

      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    }
  };



  if (loading) {
    return (
      <div className="about-overlay">
        <div className="settings-modal">Loading...</div>
      </div>
    );
  }

  return (
    <div className="about-overlay">
      <div className={`settings-modal ${activeSection === "profile" ? "wide" : ""}`}>
        <div className="about-header">
          <h2>Settings</h2>
          <span className="close-icon" onClick={onClose}>✕</span>
        </div>

        {/* ================= MAIN SETTINGS MENU ================= */}
        {activeSection === null && (
          <div className="settings-menu-vertical">
            <button className="settings-menu-btn" onClick={() => setActiveSection("profile")}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Edit Profile Information
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Placeholder for future settings to show list arrangement */}
            <button className="settings-menu-btn" style={{ opacity: 0.6, cursor: "not-allowed" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Notifications (Coming Soon)
              </div>
            </button>
          </div>
        )}

        {/* ================= PROFILE ================= */}
        {activeSection === "profile" && (
          <>
            <div className="settings-content">

              <div className="settings-split-layout">

                {/* === LEFT CARD: Identity & Medical === */}
                <div className="profile-card">
                  <div className="profile-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Identity & Medical
                  </div>

                  <div className="form-item">
                    <label className="input-label">Full Name</label>
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" />
                  </div>

                  <div className="form-item">
                    <label className="input-label">Date of Birth</label>
                    <input
                      type="text"
                      name="dob"
                      value={formData.dob}
                      placeholder="DD/MM/YYYY"
                      onFocus={(e) => (e.target.type = "date")}
                      onBlur={(e) => !e.target.value && (e.target.type = "text")}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-item">
                    <label className="input-label">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange}>
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="form-item">
                    <label className="input-label" style={{ color: 'var(--primary-red)' }}>Blood Group</label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      style={{ borderColor: 'var(--primary-red)', fontWeight: '600' }}
                    >
                      <option value="">Select Group</option>
                      <option>A+</option><option>A-</option>
                      <option>B+</option><option>B-</option>
                      <option>AB+</option><option>AB-</option>
                      <option>O+</option><option>O-</option>
                    </select>
                  </div>

                  <div className="form-item">
                    <label className="input-label">Donor Status</label>
                    <div style={{ padding: '12px', background: '#e8f5e9', borderRadius: '12px', fontWeight: '800', color: '#2e7d32', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', background: '#2e7d32', borderRadius: '50%' }}></span>
                      ACTIVE
                    </div>
                  </div>
                </div>

                {/* === RIGHT CARD: Contact & Location === */}
                <div className="profile-card">
                  <div className="profile-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Contact & Location
                  </div>

                  <div className="form-item">
                    <label className="input-label">Email (Read-Only)</label>
                    <input value={formData.email} disabled className="input-disabled" />
                  </div>

                  <div className="form-grid-2col">
                    <div className="form-item">
                      <label className="input-label">Mobile</label>
                      <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Primary" />
                    </div>
                    <div className="form-item">
                      <label className="input-label">Alt Mobile</label>
                      <input name="altMobile" value={formData.altMobile} onChange={handleChange} placeholder="Secondary" />
                    </div>
                  </div>

                  <div className="form-grid-2col">
                    <div className="form-item">
                      <label className="input-label">State</label>
                      <input name="state" value={formData.state} onChange={handleChange} placeholder="State" />
                    </div>
                    <div className="form-item">
                      <label className="input-label">City</label>
                      <input name="city" value={formData.city} onChange={handleChange} placeholder="City" />
                    </div>
                  </div>

                  <div className="form-item">
                    <label className="input-label">Full Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter complete residential address..."
                      rows="4"
                    />
                  </div>
                </div>
              </div>

              <div className="settings-footer-action">
                <button className="save-action-btn" onClick={handleSave}>
                  Save Changes
                </button>
              </div>
            </div>


          </>
        )}

        {/* ================= MY REQUESTS ================= */}
        {activeSection === "requests" && (
          <div className="settings-content">

            {/* ✅ ADDED BACK BUTTON */}
            <button className="back-btn" onClick={() => setActiveSection(null)}>
              ← Back
            </button>

            <h3>My Blood Requests</h3>

            {myRequests.length === 0 ? (
              <p>No blood requests found.</p>
            ) : (
              myRequests.map(req => (
                <div key={req.id} className="request-box">
                  <p><strong>Purpose:</strong> {req.purpose}</p>
                  <p><strong>Blood Group:</strong> {req.bloodGroup}</p>
                  <p><strong>Units:</strong> {req.bloodUnits}</p>
                  <p><strong>Required Date:</strong> {req.requiredDate}</p>
                  <p><strong>Hospital:</strong> {req.hospitalName}</p>
                  <p><strong>Patient:</strong> {req.patientName}</p>
                  <p><strong>Contact:</strong> {req.mobileNumber}</p>
                  <p><strong>Location:</strong> {req.city}, {req.state}</p>
                  <p><strong>Status:</strong> {req.status}</p>

                  {/* ✅ UPDATED DELETE BUTTON */}
                  <button
                    className="logout-confirm"
                    onClick={() => {
                      setSelectedRequestId(req.id);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    Delete Request
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ✅ DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && (
          <div className="about-overlay">
            <div className="logout-modal">
              <h3>Delete Blood Request</h3>
              <p>Are you sure you want to delete this request?</p>

              <div className="logout-actions">
                <button
                  className="logout-cancel"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>

                <button
                  className="logout-confirm"
                  onClick={async () => {
                    await deleteDoc(doc(db, "requests", selectedRequestId));
                    setMyRequests(prev =>
                      prev.filter(r => r.id !== selectedRequestId)
                    );
                    setShowDeleteConfirm(false);
                  }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default SettingsModal;
