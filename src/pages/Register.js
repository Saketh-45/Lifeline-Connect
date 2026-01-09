import { useState } from "react";
import toast from "react-hot-toast";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import "../App.css";

function Register() {
  const navigate = useNavigate();

  // LEFT COLUMN
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [username, setUsername] = useState("");

  // RIGHT COLUMN
  const [bloodGroup, setBloodGroup] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const handleRegister = async () => {
    if (
      !fullName ||
      !email ||
      !password ||
      !dob ||
      !gender ||
      !bloodGroup ||
      !phone ||
      !state ||
      !city ||
      !address
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await setDoc(doc(db, "users", userCred.user.uid), {
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        dateOfBirth: dob,
        gender,
        bloodGroup: bloodGroup.toUpperCase(),
        phone: phone.trim(),
        alternatePhone: altPhone.trim(),
        state: state.toLowerCase(),
        city: city.toLowerCase(),
        address: address.trim(),
        availabilityToDonate: false,
        locationPermissionGranted: false,
        locationPermissionGranted: false,
        createdAt: new Date(),
      });

      // ✅ NOTIFICATION: Welcome
      await addDoc(collection(db, "notifications"), {
        toUserId: userCred.user.uid,
        message: `Welcome to Lifeline Connect, ${fullName}! We are glad to have you on board.`,
        status: "unread",
        createdAt: serverTimestamp(),
      });

      toast.success("Registration successful");
      navigate("/login");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="register-page" autoComplete="off">
      <div className="register-container">
        <BackButton />

        <div className="register-header">
          <h2 className="register-title">Join the <span>Lifeline</span></h2>
          <p>Complete your profile to start saving lives today.</p>
        </div>

        <div className="register-form-content">
          <div className="register-grid">
            {/* LEFT HALF */}
            <div className="register-column">
              <div className="login-field">
                <label>Full Name *</label>
                <div className="register-input-wrapper">
                  <input
                    placeholder="John Doe"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Email *</label>
                <div className="register-input-wrapper">
                  <input
                    placeholder="john@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Password *</label>
                <div className="register-input-wrapper">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Date of Birth *</label>
                <div className="register-input-wrapper">
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Gender *</label>
                <div className="register-input-wrapper">
                  <select value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="login-field">
                <label>Username</label>
                <div className="register-input-wrapper">
                  <input
                    placeholder="johndoe123"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT HALF */}
            <div className="register-column">
              <div className="login-field">
                <label>Blood Group *</label>
                <div className="register-input-wrapper">
                  <select
                    value={bloodGroup}
                    onChange={e => setBloodGroup(e.target.value)}
                  >
                    <option value="">Select Blood Group</option>
                    <option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option>
                    <option>O+</option><option>O-</option>
                    <option>AB+</option><option>AB-</option>
                  </select>
                </div>
              </div>

              <div className="login-field">
                <label>Mobile Number *</label>
                <div className="register-input-wrapper">
                  <input
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Alternate Mobile</label>
                <div className="register-input-wrapper">
                  <input
                    placeholder="Optional number"
                    value={altPhone}
                    onChange={e => setAltPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>State *</label>
                <div className="register-input-wrapper">
                  <input
                    placeholder="e.g. Maharashtra"
                    value={state}
                    onChange={e => setState(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>City *</label>
                <div className="register-input-wrapper">
                  <input
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Full Address *</label>
                <div className="register-input-wrapper">
                  <input
                    placeholder="Street, Building, Landmark"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <button className="primary-btn register-btn-submit" onClick={handleRegister}>
            Create Account
          </button>

          <p className="login-footer" style={{ textAlign: "center", marginTop: "30px" }}>
            Already have an account?{" "}
            <span onClick={() => navigate("/login")}>Login</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
