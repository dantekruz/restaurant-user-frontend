import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=reset
  const [form, setForm] = useState({ email: '', otp: '', newPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  const sendOtp = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try { await axios.post('/api/auth/forgot-password', { email: form.email }); setStep(2); setSuccess('OTP sent!'); } catch (err) { setError(err.response?.data?.message || 'Error'); }
    setLoading(false);
  };

  const verifyOtp = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try { await axios.post('/api/auth/verify-otp', { email: form.email, otp: form.otp }); setStep(3); setSuccess(''); } catch (err) { setError(err.response?.data?.message || 'Invalid OTP'); }
    setLoading(false);
  };

  const resetPwd = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try { await axios.post('/api/auth/reset-password', { email: form.email, otp: form.otp, newPassword: form.newPassword }); navigate('/login'); } catch (err) { setError(err.response?.data?.message || 'Error'); }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', marginBottom: 20 }}>←</button>
      <h1 className="auth-title">{step === 1 ? 'Forgot Password' : step === 2 ? 'Enter OTP' : 'New Password'}</h1>
      <p className="auth-subtitle">{step === 1 ? 'Enter your email to receive OTP' : step === 2 ? `OTP sent to ${form.email}` : 'Create your new password'}</p>

      {step === 1 && <form onSubmit={sendOtp}><input className="auth-input" name="email" type="email" placeholder="Email address" value={form.email} onChange={update} required />{error && <div className="error-msg">{error}</div>}<button className="auth-btn" disabled={loading}>{loading ? 'Sending...' : 'Send OTP'}</button></form>}
      {step === 2 && <form onSubmit={verifyOtp}><input className="auth-input" name="otp" placeholder="6-digit OTP" value={form.otp} onChange={update} required maxLength={6} style={{ letterSpacing: 8, textAlign: 'center', fontSize: 22 }} />{success && <div className="success-msg">{success}</div>}{error && <div className="error-msg">{error}</div>}<button className="auth-btn" disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</button></form>}
      {step === 3 && <form onSubmit={resetPwd}><div className="pwd-field"><input name="newPassword" type={showPwd ? 'text' : 'password'} placeholder="New password" value={form.newPassword} onChange={update} required /><button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>{showPwd ? '🙈' : '👁️'}</button></div>{error && <div className="error-msg">{error}</div>}<button className="auth-btn" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button></form>}
    </div>
  );
};

export default ForgotPassword;
