import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const CATEGORIES = [
  { label: "Burger", icon: "🍔" },
  { label: "Pizza", icon: "🍕" },
  { label: "Drink", icon: "🥤" },
  { label: "French fries", icon: "🍟" },
  { label: "Veggies", icon: "🥗" },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const Home = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("Pizza");
  const [menuItems, setMenuItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
    catch { return []; }
  });

  const userInfo = (() => {
    try { return JSON.parse(localStorage.getItem("userInfo") || "{}"); }
    catch { return {}; }
  })();

  useEffect(() => {
    setLoading(true);
    setMenuItems([]);
    const encoded = encodeURIComponent(activeCategory);
    axios
      .get(`${API}/api/menu?category=${encoded}`)
      .then((r) => setMenuItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMenuItems([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const addToCart = (item) => {
    const existing = cart.find((c) => c._id === item._id);
    const newCart = existing
      ? cart.map((c) => c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c)
      : [...cart, { ...item, quantity: 1, size: '14"' }];
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const filtered = (Array.isArray(menuItems) ? menuItems : []).filter((i) =>
    i.name?.toLowerCase().includes(search.toLowerCase())
  );

  const cartCount = cart.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="user-header">
        <h1>{getGreeting()}</h1>
        <p>Place you order here</p>
      </div>

      <div className="search-bar">
        <span>🔍</span>
        <input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            className={`cat-btn ${activeCategory === cat.label ? "active" : ""}`}
            onClick={() => { setActiveCategory(cat.label); setSearch(""); }}
          >
            <span className="cat-icon">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="section-title">{activeCategory}</div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa", fontSize: 14 }}>
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa", fontSize: 14 }}>
          {search ? "No items match your search" : "No items available"}
        </div>
      ) : (
        <div className="food-grid">
          {filtered.map((item) => (
            <div className="food-card" key={item._id} onClick={() => addToCart(item)}>
              <div className="food-card-img-wrapper">
                {item.image && item.image.trim() !== "" ? (
                  <img
                    className="food-card-img"
                    src={`${API}${item.image}`}
                    alt={item.name}
                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  />
                ) : null}
                <div
                  className="food-card-img-placeholder"
                  style={{ display: item.image && item.image.trim() !== "" ? "none" : "flex" }}
                >
                  🍕
                </div>
              </div>
              <div className="food-card-body">
                <div>
                  <div className="food-card-name">{item.name}</div>
                  <div className="food-card-price">₹ {item.price}</div>
                </div>
                <button
                  className="add-btn"
                  onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button className="bottom-nav-item active">
          <span className="bottom-nav-icon">🏠</span>
          <span>Home</span>
        </button>
        <button className="bottom-nav-item" onClick={() => navigate("/cart")} style={{ position: "relative" }}>
          <span className="bottom-nav-icon">🛒</span>
          {cartCount > 0 && (
            <span style={{ position: "absolute", top: 2, right: 14, background: "red", color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {cartCount}
            </span>
          )}
          <span>Cart</span>
        </button>
        <button className="bottom-nav-item" onClick={() => navigate("/orders")}>
          <span className="bottom-nav-icon">📋</span>
          <span>Orders</span>
        </button>
        <button className="bottom-nav-item" onClick={() => { localStorage.clear(); navigate("/login"); }}>
          <span className="bottom-nav-icon">👤</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Home;