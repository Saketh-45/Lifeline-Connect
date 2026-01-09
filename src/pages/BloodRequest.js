import { useState } from "react";
import toast from "react-hot-toast";
import { auth, db } from "../services/firebase";
import {
  collection,
  addDoc,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import "../App.css";

function BloodRequest() {
  const navigate = useNavigate();

  const [purpose, setPurpose] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [bloodUnits, setBloodUnits] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const handleSubmit = async () => {
    if (
      !purpose ||
      !bloodGroup ||
      !bloodUnits ||
      !requiredDate ||
      !hospitalName ||
      !patientName ||
      !mobileNumber ||
      !state ||
      !city
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error("Please login again");
      navigate("/login");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const requestLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };

        try {
          const docRef = await addDoc(collection(db, "requests"), {
            purpose,
            bloodGroup: bloodGroup.toUpperCase(),
            bloodUnits,
            requiredDate,
            hospitalName,
            patientName,
            patientAge,
            mobileNumber,
            email,
            state,
            city: city.trim().toLowerCase(),
            address,

            // ✅ FRESH & CORRECT LOCATION
            requestLocation,

            status: "Pending",
            requestedBy: user.uid,
            createdAt: Timestamp.now(),
          });

          // ✅ NOTIFICATION: Request Submitted
          await addDoc(collection(db, "notifications"), {
            toUserId: user.uid,
            message: "Your blood request has been submitted successfully. Donors will be notified.",
            status: "unread",
            createdAt: serverTimestamp(),
          });

          toast.success("Blood request submitted successfully");
          navigate(`/request/${docRef.id}/donors`);
        } catch (error) {
          console.error(error);
          toast.error("Error submitting request");
        }
      },
      (err) => {
        toast.error("Location permission denied");
        console.error(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };


  return (
    <div className="request-page">
      <div className="request-form-container">
        <BackButton />
        <h2 className="request-title">Emergency Blood Request</h2>

        <div className="request-sections">
          {/* Section 1: Emergency & Requirement */}
          <div className="request-group-card">
            <div className="group-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Requirements
            </div>
            <div className="form-grid-2col">
              <div className="form-item">
                <label>Purpose</label>
                <input
                  placeholder="e.g. Surgery, Accident"
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>Blood Group Needed</label>
                <select onChange={(e) => setBloodGroup(e.target.value)}>
                  <option value="">Select Group</option>
                  <option>A+</option><option>A-</option>
                  <option>B+</option><option>B-</option>
                  <option>O+</option><option>O-</option>
                  <option>AB+</option><option>AB-</option>
                </select>
              </div>
              <div className="form-item">
                <label>Units Required</label>
                <input
                  type="number"
                  placeholder="Number of units"
                  onChange={(e) => setBloodUnits(e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>Required Date</label>
                <input
                  type="date"
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Patient Information */}
          <div className="request-group-card">
            <div className="group-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Patient Information
            </div>
            <div className="form-grid-2col">
              <div className="form-item">
                <label>Patient Name</label>
                <input
                  placeholder="Enter full name"
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>Patient Age</label>
                <input
                  type="number"
                  placeholder="Enter age"
                  onChange={(e) => setPatientAge(e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>Mobile Number</label>
                <input
                  placeholder="Contact number"
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>Email Address (Optional)</label>
                <input
                  placeholder="Email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Hospital & Location */}
          <div className="request-group-card">
            <div className="group-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Hospital & Location
            </div>
            <div className="form-grid-2col">
              <div className="form-item" style={{ gridColumn: 'span 2' }}>
                <label>Hospital Name</label>
                <input
                  placeholder="Exact hospital name"
                  onChange={(e) => setHospitalName(e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>State</label>
                <input
                  placeholder="Required State"
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>City</label>
                <input
                  placeholder="Required City"
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="form-item" style={{ gridColumn: 'span 2' }}>
                <label>Complete Address</label>
                <textarea
                  placeholder="Hospital address or landmark"
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="submit-hub">
          <button className="request-btn-premium" onClick={handleSubmit}>
            Submit Emergency Request
          </button>
        </div>
      </div>
    </div>
  );
}

export default BloodRequest;
