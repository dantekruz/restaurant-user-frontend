import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
  const [cart, setCart] = useState(() =>
    JSON.parse(localStorage.getItem("cart") || "[]"),
  );
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

  useEffect(() => {
    axios
      .get(`/api/menu?category=${activeCategory}`)
      .then((r) => setMenuItems(r.data))
      .catch(() => {
        // Mock data
        setMenuItems([
          {
            _id: "1",
            name: "Capricciosa",
            price: 200,
            category: activeCategory,
            image: "",
          },
          {
            _id: "2",
            name: "Sicilian",
            price: 150,
            category: activeCategory,
            image: "",
          },
          {
            _id: "3",
            name: "Marinara",
            price: 90,
            category: activeCategory,
            image: "",
          },
          {
            _id: "4",
            name: "Pepperoni",
            price: 300,
            category: activeCategory,
            image: "",
          },
        ]);
      });
  }, [activeCategory]);

  const addToCart = (item) => {
    const existing = cart.find((c) => c._id === item._id);
    let newCart;
    if (existing) {
      newCart = cart.map((c) =>
        c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c,
      );
    } else {
      newCart = [...cart, { ...item, quantity: 1, size: '14"' }];
    }
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const filtered = menuItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

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
            onClick={() => setActiveCategory(cat.label)}
          >
            <span className="cat-icon">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="section-title">{activeCategory}</div>

      <div className="food-grid">
        {filtered.map((item) => (
          <div
            className="food-card"
            key={item._id}
            onClick={() => addToCart(item)}
          >
            <div className="food-card-img-wrapper">
              {item.image ? (
                <img
                  className="food-card-img"
                  src={`http://localhost:5000${item.image}`}
                  alt={item.name}
                />
              ) : (
                <div className="food-card-img-placeholder">🍕</div>
              )}
            </div>
            <div className="food-card-body">
              <div>
                <div className="food-card-name">{item.name}</div>
                <div className="food-card-price">₹ {item.price}</div>
              </div>
              <button
                className="add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(item);
                }}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button className="bottom-nav-item active">
          <span className="bottom-nav-icon">🏠</span>
          <span>Home</span>
        </button>
        <button
          className="bottom-nav-item"
          onClick={() => navigate("/cart")}
          style={{ position: "relative" }}
        >
          <span className="bottom-nav-icon">🛒</span>
          {cartCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 2,
                right: 14,
                background: "red",
                color: "white",
                borderRadius: "50%",
                width: 16,
                height: 16,
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {cartCount}
            </span>
          )}
          <span>Cart</span>
        </button>
        <button className="bottom-nav-item" onClick={() => navigate("/orders")}>
          <span className="bottom-nav-icon">📋</span>
          <span>Orders</span>
        </button>
        <button
          className="bottom-nav-item"
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
        >
          <span className="bottom-nav-icon">👤</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
