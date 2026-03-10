import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/login`, form);
      localStorage.setItem('userToken', res.data.token);
      localStorage.setItem('userInfo', JSON.stringify(res.data.user));
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🍽️</div>
        <h1 className="auth-title">Good to see you!</h1>
        <p className="auth-subtitle">Login to place your order</p>
      </div>
      <form onSubmit={handleLogin}>
        <input className="auth-input" name="email" type="email" placeholder="Email address" value={form.email} onChange={update} required />
        <div className="pwd-field">
          <input name="password" type={showPwd ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={update} required />
          <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>{showPwd ? '🙈' : '👁️'}</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="auth-btn" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14 }} onClick={() => navigate('/forgot-password')}>Forgot Password?</button>
      </div>
      <div className="auth-link">Don't have an account? <button onClick={() => navigate('/register')}>Sign Up</button></div>
    </div>
  );
};

export default Login;