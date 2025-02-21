import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Register.css";

const Register = () => {
  const [formData, setFormData] = useState({ fname: "", lname: "", email: "", password: "", cPassword: "" });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.cPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await axios.post("http://localhost:3333/register", formData);
      if (res.status === 201) {
        setSuccessMessage("Registration successful. Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (error) {
      setError("Error: " + (error.response?.data?.message || "Please try again"));
    }
  };

  return (
    <div className="registration-container">
      <form onSubmit={handleRegister}>
        <h2>Sign Up</h2>
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
        <input type="text" name="fname" placeholder="First Name" value={formData.fname} onChange={handleChange} required />
        <input type="text" name="lname" placeholder="Last Name" value={formData.lname} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
        <input type="password" name="cPassword" placeholder="Confirm Password" value={formData.cPassword} onChange={handleChange} required />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default Register;
