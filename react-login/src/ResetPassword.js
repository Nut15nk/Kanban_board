import React, { useState } from "react";
import axios from "axios";
import "./ResetPassword.css";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleRequestResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:3333/request-reset-password", { email });
      setMessage(res.data.message || "Reset link sent to your email.");
    } catch (error) {
      setMessage("Error: " + (error.response?.data?.message || "Something went wrong"));
    }
  };

  return (
    <div className="reset-password-container">
      <h2>Reset Password</h2>
      <form onSubmit={handleRequestResetPassword}>
        <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit">Send Reset Link</button>
      </form>
      {message && <p className={message.startsWith('Error') ? 'error-message' : 'success-message'}>{message}</p>}
    </div>
  );
};

export default ResetPassword;
