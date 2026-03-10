import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'));
  const [orderType, setOrderType] = useState('Dine In');
  const [showModal, setShowModal] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [swipeX, setSwipeX] = useState(0);
  const swipeRef = useRef(null);
  const maxSwipe = 260;

  // ALL hooks above — no early returns before this line
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  const updateQty = (id, delta) => {
    const newCart = cart.map(i => i._id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (id) => {
    const newCart = cart.filter(i => i._id !== id);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const itemTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryCharge = orderType === 'Take Away' ? 50 : 0;
  const taxes = Math.round(itemTotal * 0.025);
  const grandTotal = itemTotal + deliveryCharge + taxes;

  const placeOrder = async () => {
    if (cart.length === 0 || loading) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const items = cart.map(i => ({
        menuItem: i._id,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        size: i.size || '14"'
      }));
      await axios.post('/api/orders', {
        items,
        orderType,
        userName: userInfo.name,
        userPhone: userInfo.phone,
        address: userInfo.address,
        tableNumber: 1,
        deliveryCharge,
        grandTotal
      }, { headers: { Authorization: `Bearer ${token}` } });
      localStorage.setItem('cart', '[]');
      setCart([]);
      setSuccess('Order placed successfully! 🎉');
      setTimeout(() => navigate('/orders'), 2000);
    } catch (err) {
      alert('Failed to place order. Please try again.');
      setSwipeX(0);
    }
    setLoading(false);
  };

  const handleDragStart = (e) => {
    const startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    let completed = false;

    const handleMove = (moveEvent) => {
      const currentX = moveEvent.type === 'touchmove'
        ? moveEvent.touches[0].clientX
        : moveEvent.clientX;
      const diff = Math.min(Math.max(currentX - startX, 0), maxSwipe);
      setSwipeX(diff);

      if (diff >= maxSwipe - 10 && !completed) {
        completed = true;
        cleanup();
        handleComplete();
      }
    };

    const handleUp = () => {
      if (!completed) setSwipeX(0);
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
  };

  const handleComplete = async () => {
    setSwipeX(maxSwipe);
    await placeOrder();
    setSwipeX(0);
  };

  // Early returns AFTER all hooks
  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Order Placed!</h2>
        <p style={{ color: '#888' }}>{success}</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="user-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <div>
          <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}</h1>
          <p>Place you order here</p>
        </div>
      </div>

      <div className="search-bar" style={{ margin: '12px 16px' }}>
        <span>🔍</span>
        <input placeholder="Search" readOnly />
      </div>

      <div className="order-page">
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
            <div>Your cart is empty</div>
            <button className="auth-btn" style={{ marginTop: 20, maxWidth: 200 }} onClick={() => navigate('/home')}>Browse Menu</button>
          </div>
        ) : (
          <>
            {cart.map(item => (
              <div className="selected-item-card" key={item._id}>
                {item.image
                  ? <img className="selected-item-img" src={`http://localhost:5000${item.image}`} alt={item.name} />
                  : <div className="selected-item-img" style={{ background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🍕</div>
                }
                <div className="selected-item-info">
                  <div className="selected-item-name">{item.name}</div>
                  <div className="selected-item-price">₹ {item.price}</div>
                  <div className="size-qty-row">
                    <span className="size-label">{item.size || '14"'}</span>
                    <div className="qty-stepper">
                      <button className="qty-btn" onClick={() => updateQty(item._id, -1)}>−</button>
                      <span className="qty-num">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQty(item._id, 1)}>+</button>
                    </div>
                  </div>
                  <span className="cooking-link" onClick={() => { setShowModal(true); }}>
                    Add cooking instructions (optional)
                  </span>
                </div>
                <button className="remove-btn" onClick={() => removeItem(item._id)}>✕</button>
              </div>
            ))}

            <div className="order-type-toggle">
              <button className={`toggle-btn ${orderType === 'Dine In' ? 'active' : ''}`} onClick={() => setOrderType('Dine In')}>Dine In</button>
              <button className={`toggle-btn ${orderType === 'Take Away' ? 'active' : ''}`} onClick={() => setOrderType('Take Away')}>Take Away</button>
            </div>

            <div className="bill-summary">
              <div className="bill-row"><span>Item Total</span><span>₹{itemTotal}.00</span></div>
              <div className="bill-row"><span className="delivery-underline">Delivery Charge</span><span>₹{deliveryCharge}</span></div>
              <div className="bill-row"><span>Taxes</span><span>₹{taxes}.00</span></div>
              <div className="bill-row grand"><span>Grand Total</span><span>₹{grandTotal}.00</span></div>
            </div>

            <div className="user-details">
              <h4>Your details</h4>
              <p>{userInfo.name}, {userInfo.phone}</p>
              <div className="delivery-info">
                <span>📍</span>
                <span>Delivery at Home - {userInfo.address || 'Add your address'}</span>
              </div>
              <div className="delivery-info">
                <span>🟢</span>
                <span>Delivery in <strong>42 mins</strong></span>
              </div>
            </div>

            {/* Swipe to Order */}
            <div className="swipe-btn-wrapper" ref={swipeRef}>
              <div
                className="swipe-circle"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.3s ease' : 'none' }}
              >
                {loading ? '⏳' : '→'}
              </div>
              <span className="swipe-label" style={{ opacity: 1 - swipeX / maxSwipe }}>
                Swipe to Order
              </span>
            </div>
          </>
        )}
      </div>

      {/* Cooking Instructions Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%' }}>
            <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            <div className="modal-sheet">
              <h2 className="modal-title">Add Cooking instructions</h2>
              <textarea
                className="modal-textarea"
                placeholder="E.g. less spicy, no onions..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
              />
              <p className="modal-disclaimer">The restaurant will try its best to follow your request. However, refunds or cancellations in this regard won't be possible</p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-next" onClick={() => setShowModal(false)}>Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button className="bottom-nav-item" onClick={() => navigate('/home')}><span className="bottom-nav-icon">🏠</span><span>Home</span></button>
        <button className="bottom-nav-item active"><span className="bottom-nav-icon">🛒</span><span>Cart</span></button>
        <button className="bottom-nav-item" onClick={() => navigate('/orders')}><span className="bottom-nav-icon">📋</span><span>Orders</span></button>
        <button className="bottom-nav-item" onClick={() => { localStorage.clear(); navigate('/login'); }}><span className="bottom-nav-icon">👤</span><span>Logout</span></button>
      </div>
    </div>
  );
};

export default Cart;