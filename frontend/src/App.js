import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Chats from "./pages/Chats";
import VerifyEmail from "./pages/VerifyEmail";
import AcceptInvite from "./pages/AcceptInvite";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/api/chats" element={<Chats />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
      </Routes>
    </div>
  );
}

export default App;
