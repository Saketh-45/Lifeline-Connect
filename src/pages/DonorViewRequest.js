import { useEffect, useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import {
  doc,
  addDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Marker
} from "@react-google-maps/api";
import BackButton from "../components/BackButton";
import "../App.css";

const libraries = ['places', 'geometry'];

export default function DonorViewRequest() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);

  // Use env key or fallback
  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || " ";

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  });

  const [request, setRequest] = useState(null);
  // 🆕 confirmation modal
  const [showConfirmDonate, setShowConfirmDonate] = useState(false);

  const [donorLocation, setDonorLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Map settings
  const [map, setMap] = useState(null);
  const onLoad = useCallback((mapInstance) => setMap(mapInstance), []);
  const onUnmount = useCallback(() => setMap(null), []);
  const center = useMemo(() => ({ lat: 20.5937, lng: 78.9629 }), []);
  // ✅ STEP-1: Complete match after confirmation
  // ✅ STEP-2: Mark request as fulfilled
  const completeMatch = async () => {


    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const q = query(
        collection(db, "matches"),
        where("requestId", "==", requestId),
        where("donorId", "==", user.uid),
        where("status", "==", "accepted")
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error("No active match found to complete.");
        return;
      }

      const matchDoc = snap.docs[0];

      await updateDoc(matchDoc.ref, {
        status: "completed",
        completedAt: serverTimestamp()
      });

      setShowSuccess(true);
    } catch (error) {
      console.error("Error completing match:", error);
      toast.error("Something went wrong while completing donation.");
    }
  };
  const notifyReceiver = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !request) return;

      await addDoc(collection(db, "notifications"), {
        toUserId: request.requestedBy,   // receiver
        fromUserId: user.uid,             // donor
        requestId,
        type: "donation_completed",
        message: `Donor has completed donation for ${request.patientName}`,
        read: false,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Error notifying receiver:", error);
    }
  };


  useEffect(() => {
    let watchId;

    const fetchInitData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Get Request Details
      const snap = await getDoc(doc(db, "requests", requestId));
      if (snap.exists()) {
        setRequest(snap.data());
      }

      // 2. Start Live Tracking (Watch Position)
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            const newLoc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            };

            // Update Local State for Map
            setDonorLocation(newLoc);

            // Update Database for Receiver to see
            try {
              await updateDoc(doc(db, "users", user.uid), {
                location: {
                  ...newLoc,
                  updatedAt: serverTimestamp() // Track freshness
                }
              });
            } catch (err) {
              console.error("Error updating live location:", err);
            }
          },
          (err) => console.error("Tracking Error:", err),
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
            // Setting a distanceFilter could be good if supported in standard API? 
            // Standard Geolocation API doesn't support distanceFilter directly in all browsers easily, 
            // but we rely on browser default implementation.
          }
        );
      }
    };

    fetchInitData();

    // Cleanup: Stop tracking when component unmounts
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [requestId]);

  // Calculate Route
  useEffect(() => {
    if (isLoaded && donorLocation && request?.requestLocation) {
      const origin = { lat: donorLocation.lat, lng: donorLocation.lng };
      const destination = { lat: request.requestLocation.lat, lng: request.requestLocation.lng };

      const service = new window.google.maps.DirectionsService();
      service.route({
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          if (result.routes[0].legs[0]) {
            setDistance(result.routes[0].legs[0].distance.text);
            setDuration(result.routes[0].legs[0].duration.text);
          }
        }
      });
    }
  }, [isLoaded, donorLocation, request]);


  if (loadError) return <div className="error-screen">Map Error: {loadError.message}</div>;
  if (!isLoaded || !request) return <div className="loading-screen">Loading Navigation...</div>;

  return (
    <div className="tracking-page-container">
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
        <BackButton />
      </div>

      <div className="map-container-full">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={donorLocation ? { lat: donorLocation.lat, lng: donorLocation.lng } : center}
          zoom={14}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            disableDefaultUI: true,
            zoomControl: false,
            styles: [{ "featureType": "poi", "stylers": [{ "visibility": "off" }] }]
          }}
        >
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: false,
                preserveViewport: false,
                polylineOptions: { strokeColor: "#000000", strokeWeight: 5 }
              }}
            />
          )}

          {!directions && donorLocation && (
            <Marker position={{ lat: donorLocation.lat, lng: donorLocation.lng }} />
          )}
        </GoogleMap>
      </div>

      <motion.div
        className="tracking-bottom-sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 500 }}
        dragElastic={0.05}
        dragMomentum={false}
        style={{ touchAction: 'none' }}
      >
        {/* Drag Handle */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '15px' }}>
          <div style={{ width: '40px', height: '5px', background: '#ccc', borderRadius: '10px' }}></div>
        </div>

        <div className="sheet-header">
          <div className="status-text-block">
            <h2 className="status-title">Navigating to Hospital</h2>
            <span style={{ color: '#757575', fontSize: '14px', fontWeight: '500' }}>
              Destination: {request.hospitalName}
            </span>
          </div>
          <div className="time-badge">
            <span style={{ fontSize: '18px' }}>🏥</span>
            {duration || "Calculating..."}
          </div>
        </div>

        {/* Receiver / Patient Details Area */}
        <div className="driver-profile-section">
          <div className="driver-info-block" style={{ width: '100%' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <h3 className="driver-name">{request.patientName || "Patient"}</h3>
                <div className="driver-subtext">
                  Waiting for <span style={{ color: '#d32f2f', fontWeight: '800' }}>{request.bloodGroup}</span>
                </div>
              </div>
              <div className="trip-fare" style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#2e7d32' }}>{distance}</div>
                <div style={{ fontSize: '12px', color: '#757575' }}>Distance</div>
              </div>
            </div>

            <div className="vehicle-info" style={{ background: '#e3f2fd', color: '#0d47a1' }}>
              Location: {request.city}, {request.state}
            </div>
          </div>
        </div>

        {/* Polished Action Grid */}
        <div className="sheet-actions-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>

          {/* 1. Open Maps */}
          <button
            className="action-icon-btn"
            onClick={() => {
              const destination = `${request.requestLocation.lat},${request.requestLocation.lng}`;
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_black');
            }}
          >
            <div className="action-icon-circle" style={{ color: '#2e7d32' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </div>
            <span className="action-label">Navigate</span>
          </button>

          {/* 2. Call Receiver */}
          <button
            className="action-icon-btn"
            onClick={() => window.location.href = `tel:${request.mobileNumber}`}
          >
            <div className="action-icon-circle" style={{ color: '#000' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <span className="action-label">Call</span>
          </button>

          {/* 3. Details */}
          <button
            className="action-icon-btn"
            onClick={() => setShowDetailsModal(true)}
          >
            <div className="action-icon-circle" style={{ color: '#1976d2' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <span className="action-label">Receiver Details</span>
          </button>
        </div>

        {/* Primary Action */}
        <div style={{ paddingBottom: '20px' }}>
          <button className="primary-action-btn btn-red"
            onClick={() => setShowConfirmDonate(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            Mark as Donated
          </button>
        </div>
      </motion.div>

      {/* Details Modal */}
      {showDetailsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="settings-modal" style={{ width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="about-header" style={{ marginBottom: '20px' }}>
              <h2>Request Details</h2>
              <span className="close-icon" onClick={() => setShowDetailsModal(false)}>✕</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="detail-item">
                <label className="input-label">Patient Name</label>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{request.patientName}</div>
              </div>
              <div className="detail-item">
                <label className="input-label">Blood Group</label>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>{request.bloodGroup}</div>
              </div>
              <div className="detail-item">
                <label className="input-label">Hospital</label>
                <div style={{ fontSize: '15px' }}>{request.hospitalName}</div>
                <div style={{ fontSize: '13px', color: '#666' }}>{request.hospitalAddress}</div>
              </div>
              <div className="detail-item">
                <label className="input-label">Contact</label>
                <div style={{ fontSize: '15px' }}>{request.mobileNumber}</div>
              </div>
              {request.age && (
                <div className="detail-item">
                  <label className="input-label">Age</label>
                  <div style={{ fontSize: '15px' }}>{request.age}</div>
                </div>
              )}
              {request.reason && (
                <div className="detail-item">
                  <label className="input-label">Reason/Condition</label>
                  <div style={{ fontSize: '15px' }}>{request.reason}</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetailsModal(false)}
              style={{
                width: '100%', padding: '12px', marginTop: '25px',
                background: '#000', color: 'white', border: 'none',
                borderRadius: '12px', fontWeight: 'bold'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* 🆕 Confirm Donation Modal */}
      {showConfirmDonate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}
        >
          <div
            className="settings-modal"
            style={{
              width: "90%",
              maxWidth: "420px",
              borderRadius: "16px",
              padding: "20px"
            }}
          >
            <h2 style={{ marginBottom: "10px" }}>Confirm Donation</h2>

            <p style={{ fontSize: "15px", color: "#555", marginBottom: "20px" }}>
              Please confirm that you have successfully donated blood for
              <strong> {request.patientName || "the patient"}</strong>
              {" "}at<strong> {request.hospitalName}</strong>.
              <br />
              This action cannot be undone.
            </p>


            <div style={{ display: "flex", gap: "12px" }}>
              <button
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #ccc",
                  background: "#fff",
                  fontWeight: "600"
                }}
                onClick={() => setShowConfirmDonate(false)}
              >
                Cancel
              </button>

              <button
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: "none",
                  background: "#d32f2f",
                  color: "#fff",
                  fontWeight: "700"
                }}
                onClick={async () => {
                  setShowConfirmDonate(false);
                  await completeMatch();
                  await notifyReceiver();   // STEP-1
                }}
              >
                Yes, Confirm
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Success Screen Overlay */}
      {showSuccess && (
        <div className="success-overlay">
          <div className="success-card">
            <div className="success-icon-lottie">🎉</div>
            <h2>Donation Successfully Completed</h2>
            <p>
              Thank you for helping save a life.<br />
              Your donation has been successfully recorded.
            </p>
            <button
              className="success-dashboard-btn"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );

}
