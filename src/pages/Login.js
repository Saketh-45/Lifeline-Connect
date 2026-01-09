import { useState } from "react";
import toast from "react-hot-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore"; // ✅ ADDED
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import BackButton from "../components/BackButton";
import "../App.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Enter email and password");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // ✅ NOTIFICATION: Login Success
      if (auth.currentUser) {
        await addDoc(collection(db, "notifications"), {
          toUserId: auth.currentUser.uid,
          message: "Welcome back! You have successfully logged in.",
          status: "unread",
          createdAt: serverTimestamp(),
        });
      }

      navigate("/dashboard");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="login-page">
      {/* LEFT SIDE */}
      <div className="login-left">
        <div className="login-logo-container">
          <img src={logo} alt="Lifeline Connect" className="login-logo" />
        </div>

        <h1>Welcome Back</h1>

        <p className="login-tagline">
          Access Lifeline Connect — a real-time blood donor & receiver platform.
        </p>

        <p className="login-description">
          Secure • Fast • Location-based matching
          <br />
          Because every drop of blood matters.
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div className="login-right">
        <div className="login-form-content">
          <BackButton />

          <h2 className="login-title">Login</h2>

          {/* EMAIL */}
          <div className="login-field">
            <label>Email</label>
            <div className="input-signal-container">
              <input
                type="email"
                placeholder="Enter your email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="login-field">
            <label>Password</label>
            <div className="input-signal-container">
              <input
                type="password"
                placeholder="Enter your password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* BUTTON */}
          <button className="primary-btn login-btn" onClick={handleLogin}>
            Sign in now
          </button>

          {/* REGISTER */}
          <p className="login-footer">
            New to Lifeline Connect?{" "}
            <span onClick={() => navigate("/register")}>Register</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
