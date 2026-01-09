import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";

function AuthGate({ children }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px", fontSize: "20px" }}>
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGate;
