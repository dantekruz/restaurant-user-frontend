import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ─── Status helpers ───────────────────────────────────────────────
const DINE_IN_STEPS   = ['Processing', 'Ready', 'Served'];
const TAKE_AWAY_STEPS = ['Processing', 'Ready', 'Out for Delivery', 'Delivered'];

// Normalize whatever string DB sends → our canonical step label
const normalizeStatus = (s = '') => {
  const map = {
    'processing':        'Processing',
    'ready':             'Ready',
    'done':              'Ready',
    'order done':        'Ready',
    'served':            'Served',
    'out for delivery':  'Out for Delivery',
    'delivered':         'Delivered',
    'received':          'Received',
    'not picked up':     'Delivered',
  };
  return map[s.toLowerCase()] || s;
};

const statusColor = (s) => ({
  Processing:          '#FF9800',
  Ready:               '#3B82F6',
  'Out for Delivery':  '#8B5CF6',
  Served:              '#22C55E',
  Delivered:           '#22C55E',
  Received:            '#22C55E',
}[s] || '#ccc');

const statusBg = (s) => ({
  Processing:          '#FFF7ED',
  Ready:               '#EFF6FF',
  'Out for Delivery':  '#F5F3FF',
  Served:              '#F0FDF4',
  Delivered:           '#F0FDF4',
  Received:            '#F0FDF4',
}[s] || '#F5F5F5');

const statusEmoji = (s) => ({
  Processing:          '⏳',
  Ready:               '✅',
  'Out for Delivery':  '🚴',
  Served:              '🍽️',
  Delivered:           '📦',
  Received:            '🎉',
}[s] || '');

// ─── Component ────────────────────────────────────────────────────
// Countdown hook — shows minutes remaining, never shows 0 while Processing
const useCountdown = (estimatedReadyAt, prepTime) => {
  const [secsLeft, setSecsLeft] = useState(() => {
    if (!estimatedReadyAt) return (prepTime || 15) * 60;
    return Math.max(0, Math.round((new Date(estimatedReadyAt) - Date.now()) / 1000));
  });

  useEffect(() => {
    const getRemaining = () => {
      if (!estimatedReadyAt) return (prepTime || 15) * 60;
      return Math.max(0, Math.round((new Date(estimatedReadyAt) - Date.now()) / 1000));
    };
    setSecsLeft(getRemaining());
    const id = setInterval(() => setSecsLeft(getRemaining()), 1000);
    return () => clearInterval(id);
  }, [estimatedReadyAt, prepTime]);

  const totalSecs = (prepTime || 15) * 60;
  const pct      = totalSecs > 0 ? Math.min(100, Math.round(((totalSecs - secsLeft) / totalSecs) * 100)) : 100;
  const minsLeft = Math.ceil(secsLeft / 60);
  const label    = minsLeft > 0 ? `${minsLeft} min` : `${prepTime || 15} min`;
  return { secsLeft, pct, label };
};

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [notification, setNotification] = useState(null);
  const esRef = useRef(null);

  // ── Fetch orders ──
  const fetchOrders = async () => {
    const token = localStorage.getItem('userToken');
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/orders/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error('fetchOrders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // ── SSE real-time updates ──
  useEffect(() => {
    const raw = localStorage.getItem('userInfo');
    if (!raw) return;
    let userId;
    try {
      const parsed = JSON.parse(raw);
      userId = parsed.id || parsed._id;  // handle both formats
    } catch { return; }
    if (!userId) return;

    const connect = () => {
      if (esRef.current) esRef.current.close();
      // Always use full URL for SSE — proxy doesn't work with EventSource
      const es = new EventSource(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/orders/stream/${userId}`);

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'ORDER_UPDATED' || data.type === 'ORDER_STATUS_CHANGED') {
            const norm = normalizeStatus(data.status);
            setOrders(prev => prev.map(o =>
              o._id === data.orderId.toString() ? { ...o, status: norm } : o
            ));
            showToast(
              `Order #${data.orderNumber} is now ${norm}! ${statusEmoji(norm)}`,
              statusColor(norm)
            );
          }
        } catch {}
      };

      es.onerror = () => { es.close(); setTimeout(connect, 5000); };
      esRef.current = es;
    };

    connect();
    return () => { if (esRef.current) esRef.current.close(); };
  }, []);

  // ── Toast ──
  const showToast = (message, color = '#333') => {
    setNotification({ message, color });
    setTimeout(() => setNotification(null), 5000);
  };

  // ── Mark Received ──
  const handleMarkReceived = async (orderId, orderNumber) => {
    const token = localStorage.getItem('userToken');
    if (!token) { navigate('/login'); return; }
    try {
      // Use full URL — React proxy doesn't reliably forward PUT requests
      await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/orders/received/${orderId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
      );
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, status: 'Received' } : o
      ));
      showToast(`Order #${orderNumber} marked as received! 🎉`, '#22C55E');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Request failed';
      showToast(`⚠️ ${msg}`, '#EF4444');
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 80, background: '#F8F8F8', minHeight: '100vh' }}>

      {/* Toast */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, left: '50%',
          transform: 'translateX(-50%)',
          background: notification.color, color: 'white',
          padding: '12px 24px', borderRadius: 30,
          fontSize: 14, fontWeight: 600, zIndex: 999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap', animation: 'slideDown 0.3s ease'
        }}>
          {notification.message}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity:0; transform:translateX(-50%) translateY(-12px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: 'white', padding: '20px 16px 16px', borderBottom: '1px solid #F0F0F0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>My Orders</h1>
        <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>Track your orders here</p>
      </div>

      <div style={{ padding: '12px 16px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            Loading your orders...
          </div>
        )}

        {/* Empty */}
        {!loading && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No orders yet</div>
            <button
              className="auth-btn"
              style={{ maxWidth: 180, margin: '16px auto 0' }}
              onClick={() => navigate('/home')}
            >
              Order Now
            </button>
          </div>
        )}

        {/* Order cards */}
        {orders.map(order => {
          const status     = normalizeStatus(order.status);
          const isTakeAway = order.orderType === 'Take Away';
          const steps      = isTakeAway ? TAKE_AWAY_STEPS : DINE_IN_STEPS;
          const currentIdx = steps.indexOf(status);
          const totalMins  = isTakeAway
            ? (order.prepTime || 15) + (order.deliveryTime || 12)
            : (order.prepTime || 15);

          return (
            <div key={order._id} style={{
              background: 'white', borderRadius: 18,
              marginBottom: 16, overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              border: '1px solid #F0F0F0'
            }}>

              {/* Colored top strip */}
              <div style={{
                height: 4,
                background: statusColor(status),
                transition: 'background 0.4s ease'
              }} />

              <div style={{ padding: '14px 16px' }}>

                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Order #{order.orderNumber}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{
                    background: statusBg(status),
                    border: `1px solid ${statusColor(status)}44`,
                    color: statusColor(status),
                    borderRadius: 20, padding: '5px 12px',
                    fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.3s ease'
                  }}>
                    <span>{statusEmoji(status)}</span>
                    <span>{status}</span>
                  </div>
                </div>

                {/* Order type pill + timer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{
                    background: '#F5F5F5', color: '#555',
                    borderRadius: 20, padding: '3px 10px',
                    fontSize: 12, fontWeight: 500
                  }}>
                    {isTakeAway ? '🛵 Take Away' : '🪑 Dine In'}
                  </span>

                  {/* Live countdown — only shown while Processing */}
                  {status === 'Processing' && order.estimatedReadyAt && (() => {
                    // inline countdown component
                    const CountdownBadge = () => {
                      const { label, pct } = useCountdown(order.estimatedReadyAt, order.prepTime);
                      return (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: '#FFF7ED', border: '1px solid #FDBA74',
                          borderRadius: 20, padding: '4px 10px', fontSize: 12
                        }}>
                          <svg width="28" height="28" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                            <circle cx="14" cy="14" r="10" fill="none" stroke="#FED7AA" strokeWidth="3" />
                            <circle cx="14" cy="14" r="10" fill="none"
                              stroke="#FF9800" strokeWidth="3"
                              strokeDasharray={String(2 * Math.PI * 10)}
                              strokeDashoffset={String(((100 - pct) / 100) * 2 * Math.PI * 10)}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 1s linear' }}
                            />
                          </svg>
                          <span style={{ fontWeight: 700, color: '#FF9800' }}>{label} left</span>
                          <span style={{ color: '#aaa' }}>of ~{totalMins}m</span>
                        </div>
                      );
                    };
                    return <CountdownBadge />;
                  })()}
                </div>

                {/* Items + total */}
                <div style={{
                  background: '#FAFAFA', borderRadius: 10,
                  padding: '10px 12px', marginBottom: 14,
                  fontSize: 13, color: '#444'
                }}>
                  {order.items?.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between',
                      marginBottom: idx < order.items.length - 1 ? 5 : 0
                    }}>
                      <span>{item.quantity}x {item.name}</span>
                      <span style={{ color: '#888' }}>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div style={{
                    borderTop: '1px solid #EEEEEE',
                    marginTop: 8, paddingTop: 8,
                    display: 'flex', justifyContent: 'space-between',
                    fontWeight: 700, fontSize: 14
                  }}>
                    <span>Total</span>
                    <span>₹{order.grandTotal}</span>
                  </div>
                </div>

                {/* ── Progress bar ── */}
                {(() => {
                  // For 'Received', show all Take Away steps as fully complete
                  const displaySteps = steps;
                  const effectiveIdx = status === 'Received'
                    ? displaySteps.length - 1  // all filled
                    : currentIdx;

                  return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
                      {displaySteps.map((step, i) => {
                        const isPast    = effectiveIdx >= 0 && i <= effectiveIdx;
                        const isCurrent = i === effectiveIdx && status !== 'Received';
                        const col       = isPast ? statusColor(status) : '#E0E0E0';

                        return (
                          <React.Fragment key={step}>
                            <div style={{
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', gap: 6,
                              minWidth: isTakeAway ? 58 : 72, flexShrink: 0
                            }}>
                              {/* Dot */}
                              <div style={{
                                width: 16, height: 16, borderRadius: '50%',
                                background: col,
                                outline: isCurrent ? `3px solid ${statusColor(status)}33` : 'none',
                                outlineOffset: 2,
                                transition: 'all 0.4s ease',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                {isPast && (
                                  <svg width="8" height="8" viewBox="0 0 8 8">
                                    <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                  </svg>
                                )}
                              </div>
                              {/* Label */}
                              <span style={{
                                fontSize: 9, textAlign: 'center', lineHeight: 1.3,
                                fontWeight: isCurrent ? 700 : isPast ? 600 : 400,
                                color: isPast ? statusColor(status) : '#BBBBBB',
                                transition: 'color 0.4s ease'
                              }}>
                                {step}
                              </span>
                            </div>

                            {/* Connector */}
                            {i < displaySteps.length - 1 && (
                              <div style={{
                                flex: 1, height: 3, marginTop: 7, borderRadius: 2,
                                background: (effectiveIdx >= 0 && i < effectiveIdx)
                                  ? statusColor(status) : '#E0E0E0',
                                transition: 'background 0.4s ease'
                              }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* ── Status banners & actions ── */}

                {/* Dine In — Served */}
                {!isTakeAway && status === 'Served' && (
                  <div style={{
                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                    borderRadius: 12, padding: '12px 14px',
                    fontSize: 13, color: '#16A34A',
                    fontWeight: 500, textAlign: 'center'
                  }}>
                    🍽️ Your order has been served. Enjoy your meal!
                  </div>
                )}

                {/* Take Away — Out for Delivery */}
                {isTakeAway && status === 'Out for Delivery' && (
                  <div style={{
                    background: '#F5F3FF', border: '1px solid #DDD6FE',
                    borderRadius: 12, padding: '12px 14px',
                    fontSize: 13, color: '#7C3AED',
                    fontWeight: 500, textAlign: 'center'
                  }}>
                    🚴 Your order is on the way! Hang tight.
                  </div>
                )}

                {/* Take Away — Mark Received */}
                {isTakeAway && status === 'Delivered' && (
                  <button
                    onClick={() => handleMarkReceived(order._id, order.orderNumber)}
                    style={{
                      width: '100%', background: '#1a1a1a', color: 'white',
                      border: 'none', borderRadius: 14, padding: '14px',
                      fontSize: 15, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 8
                    }}
                  >
                    📦 I Received My Order
                  </button>
                )}

                {/* Received */}
                {status === 'Received' && (
                  <div style={{
                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                    borderRadius: 12, padding: '12px 14px',
                    fontSize: 13, color: '#16A34A',
                    fontWeight: 500, textAlign: 'center'
                  }}>
                    🎉 Order received! Thank you for choosing us.
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button className="bottom-nav-item" onClick={() => navigate('/home')}>
          <span className="bottom-nav-icon">🏠</span><span>Home</span>
        </button>
        <button className="bottom-nav-item" onClick={() => navigate('/cart')}>
          <span className="bottom-nav-icon">🛒</span><span>Cart</span>
        </button>
        <button className="bottom-nav-item active">
          <span className="bottom-nav-icon">📋</span><span>Orders</span>
        </button>
        <button className="bottom-nav-item" onClick={() => { localStorage.clear(); navigate('/login'); }}>
          <span className="bottom-nav-icon">👤</span><span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Orders;