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


// Add Worker
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
      res.json({ message: " Worker added successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

//  Fetch worker by ID
app.get("/api/workers/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM workers WHERE worker_id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result[0]) return res.status(404).json({ error: "Worker not found" });
    res.json(result[0]);
  });
});

//  Attendance: Check-in / Check-out
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
      res.json({ message: " Check-in successful!" });
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
      console.error(" Check-out error:", err);
      return res.status(500).json({ message: "DB error" });
    }
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "No check-in found for today" });
    res.json({ message: " Check-out successful!" });
  });
  }
});

app.put("/api/update-workers/:id", (req, res) => {
  const { id } = req.params;
  const { name, site, role, status } = req.body;

  const sql = "UPDATE workers SET name=?, site=?, role=?, status=? WHERE worker_id=?";
  db.query(sql, [name, site, role, status, id], (err, result) => {
    if (err) {
      console.error(" Update SQL Error:", err);
      return res.status(500).json({ message: "DB error", error: err.message });
    }

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Worker not found" });

    res.json({ message: "Worker updated successfully!" });
  });
});


//  Fetch attendance history
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
    
    const query = "SELECT worker_id,name,pin_hash FROM workers WHERE name = ?";
    db.query(query, [name], (err, result) => {
  if (err) return res.status(500).json({ error: err.message });
  if (!result[0]) return res.status(404).json({ error: "Worker not found" });

  const storedHash = result[0].pin_hash;
  bcrypt.compare(pin, storedHash)
    .then(isMatch => {
      if (isMatch) {
        res.status(200).json({ 
          message: " Login successful" ,
        worker:{
          id:result[0].worker_id,
          emp_name:result[0].name,
        },
      });
    }else res.status(401).json({ error: " Invalid PIN" });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
app.get("/get-workers", (req, res) => {
  const sql = "SELECT worker_id, name, employee_code, site, role, status FROM workers";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


//  DELETE WORKER
app.delete("/delete-worker/:id", (req, res) => {
  const { id } = req.params;

  console.log(" Delete request received for worker_id:", id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing worker ID" });
  }

  const sql = "DELETE FROM workers WHERE worker_id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error(" Delete SQL Error:", err);
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      console.warn(" Worker not found:", id);
      return res.status(404).json({ message: "Worker not found" });
    }

    console.log(" Worker deleted successfully:", id);
    res.json({ message: "Worker deleted successfully" });
  });
});

app.get("/superadmin/attendance", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Date required" });

  const sql = `
    SELECT 
      w.name AS worker_name,
      w.role,
      w.site,
      a.checkin_time,
      a.checkout_time
    FROM attendance a
    JOIN workers w ON a.worker_id = w.worker_id
    WHERE DATE(a.date) = ?
  `;

  db.query(sql, [date], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
app.get("/global-attendance", (req, res) => {
  const sql = `
    SELECT w.name, w.site, a.checkin_time, a.checkout_time, a.date
    FROM attendance a
    JOIN workers w ON a.worker_id = w.worker_id
    ORDER BY a.date DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//  ATTENDANCE REPORT (by date)
app.get("/superadmin/attendance", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Date required" });

  const sql = `
    SELECT 
      w.name AS worker_name,
      w.role,
      w.site,
      a.checkin_time,
      a.checkout_time
    FROM attendance a
    JOIN workers w ON a.worker_id = w.worker_id
    WHERE DATE(a.date) = ?
  `;

  db.query(sql, [date], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//  Default route

const superAdminRouter = express.Router();

// Add Admin
superAdminRouter.post("/add-admin", async (req, res) => {
  const { adminName, adminEmail, adminPass } = req.body;
  if (!adminName || !adminEmail || !adminPass) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const hash = await bcrypt.hash(adminPass, 10);
    const sql = "INSERT INTO admins (username, email_id, password) VALUES (?, ?, ?)";
    db.query(sql, [adminName, adminEmail, hash], (err) => {
      if (err) {
        // Duplicate entry (username or email)
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "Admin already exists with that username or email" });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Admin added successfully!" });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//  Get all pending workers
app.get("/pending-approvals", (req, res) => {
  db.query("SELECT * FROM workers WHERE status = 'Pending'", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//  Approve worker
app.put("/approve-worker/:id", (req, res) => {
  const { id } = req.params;
  db.query("UPDATE workers SET status = 'Active' WHERE worker_id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Worker not found" });
    res.json({ message: " Worker approved successfully" });
  });
});

//  Reject worker
app.put("/reject-worker/:id", (req, res) => {
  const { id } = req.params;
  db.query("UPDATE workers SET status = 'Inactive' WHERE worker_id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Worker not found" });
    res.json({ message: " Worker rejected" });
  });
});

// View Admins
superAdminRouter.get("/admins", (req, res) => {
  const sql = "SELECT admin_id, username, email_id, created_at FROM admins ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Add Site
superAdminRouter.post("/add-site", (req, res) => {
  const { site_name, location } = req.body;
  if (!site_name) return res.status(400).json({ error: "Site name is required" });

  const sql = "INSERT INTO sites (site_name, location) VALUES (?, ?)";
  db.query(sql, [site_name, location || null], (err) => {
    if (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        return res.status(500).json({ error: "Sites table not found. Create the table using the SQL provided." });
      }
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "Site already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: " Site added successfully!" });
  });
});

// Global Attendance by Date
superAdminRouter.get("/attendance", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Date is required" });

  const sql = `
    SELECT 
      a.attendance_id,
      w.name AS worker_name,
      w.role,
      w.site AS site_name,
      a.checkin_time AS check_in,
      a.checkout_time AS check_out,
      CASE 
        WHEN a.checkout_time IS NULL THEN 'Present'
        ELSE 'Completed'
      END AS status
    FROM attendance a
    JOIN workers w ON a.worker_id = w.worker_id
    WHERE DATE(a.checkin_time) = ?
    ORDER BY a.checkin_time DESC
  `;

  db.query(sql, [date], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});
//  Dashboard Stats API
app.get("/dashboard-stats", (req, res) => {
  const stats = {};

  //  Total Workers
  const totalQuery = "SELECT COUNT(*) AS totalWorkers FROM workers";

  //  Present Today
  const presentQuery = `
    SELECT COUNT(DISTINCT worker_id) AS presentToday
    FROM attendance
    WHERE DATE(checkin_time) = CURDATE()
  `;

  //  Pending Approvals (from workers.status = 'Pending')
  const pendingQuery = `
    SELECT COUNT(*) AS pendingApprovals
    FROM workers
    WHERE status = 'Pending'
  `;

  db.query(totalQuery, (err, totalResult) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.totalWorkers = totalResult[0].totalWorkers;

    db.query(presentQuery, (err, presentResult) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.presentToday = presentResult[0].presentToday;

      db.query(pendingQuery, (err, pendingResult) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.pendingApprovals = pendingResult[0].pendingApprovals;

        //  Absent = Total Active Workers - Present
        const activeQuery = "SELECT COUNT(*) AS activeWorkers FROM workers WHERE status = 'Active'";
        db.query(activeQuery, (err, activeResult) => {
          if (err) return res.status(500).json({ error: err.message });
          const activeWorkers = activeResult[0].activeWorkers;
          stats.absentToday = activeWorkers - stats.presentToday;

          res.json(stats);
        });
      });
    });
  });
});


//  Mount router
app.use("/superadmin", superAdminRouter);


app.listen(3000, () => {
  console.log(' Server is running on http://localhost:3000');
});