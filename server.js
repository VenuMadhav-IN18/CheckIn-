const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const db = require("./db/db");
const bcrypt = require("bcrypt");
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json())
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "MainInterface.html"));
});


// ✅ Add Worker
app.post("/add-worker", async (req, res) => {
  const { name, employee_code, mobile, site, role, pin } = req.body;
  try {
    const pin_hash = await bcrypt.hash(pin, 10);
    const sql = `
      INSERT INTO workers (name, employee_code, mobile, site, role, pin_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [name, employee_code, mobile, site, role, pin_hash], (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "✅ Worker added successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Fetch worker by ID
app.get("/api/workers/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM workers WHERE worker_id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result[0]) return res.status(404).json({ error: "Worker not found" });
    res.json(result[0]);
  });
});

// ✅ Attendance: Check-in / Check-out
app.post("/api/attendance", (req, res) => {
  const { worker_id, action, latitude, longitude } = req.body;
  if (!worker_id || !latitude || !longitude)
    return res.status(400).json({ message: "Missing data" });

  if (action === "checkin") {
    const sql = `
      INSERT INTO attendance (worker_id, checkin_time, latitude, longitude)
      VALUES (?, NOW(), ?, ?)
    `;
    db.query(sql, [worker_id, latitude, longitude], (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "✅ Check-in successful!" });
    });
  } else if (action === "checkout") {
  const sql = `
    UPDATE attendance
    SET checkout_time = NOW()
    WHERE worker_id = ?
      AND checkout_time IS NULL
    ORDER BY checkin_time DESC
    LIMIT 1
  `;
  db.query(sql, [worker_id], (err, result) => {
    if (err) {
      console.error("❌ Check-out error:", err);
      return res.status(500).json({ message: "DB error" });
    }
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "No check-in found for today" });
    res.json({ message: "✅ Check-out successful!" });
  });
  }
});

// ✅ Fetch attendance history
app.get("/api/attendance/:worker_id", (req, res) => {
  const { worker_id } = req.params;
  const sql = `
    SELECT 
      DATE(checkin_time) AS date,
      TIME(checkin_time) AS checkin_time,
      TIME(checkout_time) AS checkout_time,
      latitude,
      longitude
    FROM attendance
    WHERE worker_id = ?
    ORDER BY checkin_time DESC
  `;
  db.query(sql, [worker_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
app.post("/api/loginForm", async (req, res) => {
  const { name, pin } = req.body;

  try {
    // 1️⃣ Fetch the stored hash from DB
    const query = "SELECT worker_id,name,pin_hash FROM workers WHERE name = ?";
    db.query(query, [name], (err, result) => {
  if (err) return res.status(500).json({ error: err.message });
  if (!result[0]) return res.status(404).json({ error: "Worker not found" });

  const storedHash = result[0].pin_hash;
  bcrypt.compare(pin, storedHash)
    .then(isMatch => {
      if (isMatch) {
        res.status(200).json({ 
          message: "✅ Login successful" ,
        worker:{
          id:result[0].worker_id,
          emp_name:result[0].name,
        },
      });
    }else res.status(401).json({ error: "❌ Invalid PIN" });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/register', (req, res) => {
  const { adminName, adminPass } = req.body;
  console.log("📥 Received:", req.body);

  bcrypt.hash(adminPass, 10, (err, hashedPassword) => {
    if (err) return res.status(500).json({ error: 'Hashing failed' });

    const query = "INSERT INTO admins (username, password) VALUES (?, ?)";

    db.query(query, [adminName, hashedPassword], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(400).json({ error: "User already exists" });
      }
      res.json({ message: "User registered successfully!" });
    });
  });
});
app.post("/api/adminlogin",(req,res)=>{
  const {name,password}=req.body;
  const query="select password from admins where username=?";
  db.query(query,[name],(err,result)=>{
    if(err) return res.status(404).json({error:err.message});
    const storedHash=result[0].password;
    const isMatch=bcrypt.compare(password,storedHash);
    if(isMatch){
      res.status(200).json({message:"login success"});
    }else{
      res.status(404).json({message:"login Failed"});
    }
  })
})
app.listen(3000, () => {
  console.log('🚀 Server is running on http://localhost:3000');
});