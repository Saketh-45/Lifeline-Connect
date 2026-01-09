import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BloodRequest from "./pages/BloodRequest";
import DonorRequests from "./pages/DonorRequests";
import Navbar from "./components/Navbar";
import AuthGate from "./components/AuthGate";
import DonorMatches from "./pages/DonorMatches";
import DonorViewRequest from "./pages/DonorViewRequest";
import ReceiverMatchSuccess from "./pages/ReceiverMatchSuccess";
import MyRequests from "./pages/MyRequests";
import ReceiverViewRequest from "./pages/ReceiverViewRequest";
import AvailableDonors from "./pages/AvailableDonors";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          className: 'hot-toast-premium',
          duration: 4000,
          style: {
            fontFamily: "'Inter', sans-serif",
          },
        }}
      />
      <AuthGate>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/request-blood" element={<BloodRequest />} />
          <Route path="/donor-requests" element={<DonorRequests />} />
          <Route path="/my-requests" element={<MyRequests />} />
          <Route path="/donor-matches" element={<DonorMatches />} />
          <Route path="/receiver-view-request/:requestId" element={<ReceiverViewRequest />} />
          <Route path="/receiver-match-success/:requestId" element={<ReceiverMatchSuccess />} />
          <Route path="/donor-view-request/:requestId" element={<DonorViewRequest />} />
          <Route path="/request/:requestId/donors" element={<AvailableDonors />} />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  );
}
export default App;
