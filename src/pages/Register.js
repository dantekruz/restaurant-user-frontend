import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/register`, form);
      localStorage.setItem('userToken', res.data.token);
      localStorage.setItem('userInfo', JSON.stringify(res.data.user));
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <h1 className="auth-title">Create Account</h1>
      <p className="auth-subtitle">Join us and start ordering!</p>
      <form onSubmit={handleRegister}>
        <input className="auth-input" name="name" placeholder="Full Name" value={form.name} onChange={update} required />
        <input className="auth-input" name="email" type="email" placeholder="Email address" value={form.email} onChange={update} required />
        <input className="auth-input" name="phone" placeholder="Phone number" value={form.phone} onChange={update} />
        <input className="auth-input" name="address" placeholder="Delivery address" value={form.address} onChange={update} />
        <div className="pwd-field">
          <input name="password" type={showPwd ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={update} required />
          <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>{showPwd ? '🙈' : '👁️'}</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="auth-btn" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Sign Up'}</button>
      </form>
      <div className="auth-link">Already have an account? <button onClick={() => navigate('/login')}>Login</button></div>
    </div>
  );
};

export default Register;