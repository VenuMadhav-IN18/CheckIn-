require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const connectDB = require("./config/db");

const Admin = require("./model/Admin");
const Worker = require("./model/Worker");
const Site = require("./model/Site");
const Attendance = require("./model/Attendence");

const app = express();

// ✅ Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ Health check (for Railway)
app.get("/health", (req, res) => {
  res.status(200).send("✅ CheckIn backend is alive and running!");
});

// ✅ Root route (temporary check)
app.get("/", (req, res) => {
  res.status(200).send("✅ Root route working fine!");
});


// Add these routes to handle .html requests
app.get("/super-admin-login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "SuperAdminLogin.html"));
});

app.get("/admin-login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "AdminLogin.html"));
});

app.get("/worker-login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "WorkerLogin.html"));
});
app.get("/worker-dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "workerdashboard.html"));
});

app.get("/attendance-history.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "attendance-history.html"));
});

// ✅ Add Worker
app.post("/superadmin/add-admin", async (req, res) => {
  const { adminName, adminEmail, adminPass } = req.body;
  console.log("Incoming admin data:", req.body); // ✅ Add this

  if (!adminName || !adminEmail || !adminPass) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const hash = await bcrypt.hash(adminPass, 10);

    const admin = new Admin({
      username: adminName,
      email_id: adminEmail,
      password: hash
    });

    await admin.save();
    res.json({ message: "Admin added successfully!" });
  } catch (error) {
    console.error("❌ Error adding admin:", error); // ✅ Add this
    if (error.code === 11000) {
      return res.status(400).json({ error: "Admin username or email already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// ✅ Worker Login
app.post("/api/loginForm", async (req, res) => {
  const { name, pin } = req.body;
  
  if (!name || !pin) {
    return res.status(400).json({ message: "Name and PIN are required" });
  }

  try {
    const worker = await Worker.findOne({ name, status: 'Active' });
    
    if (!worker) {
      return res.status(404).json({ message: "Worker not found or inactive" });
    }
    
    const isMatch = await bcrypt.compare(pin.toString(), worker.pin_hash);
    
    if (isMatch) {
      res.json({ 
        message: "Login successful", 
        worker: {
          id: worker._id,
          emp_name: worker.name,
          employee_code: worker.employee_code,
          role: worker.role,
          site: worker.site
        }
      });
    } else {
      res.status(401).json({ message: "Invalid PIN" });
    }
  } catch (error) {
    res.status(500).json({ error: "Authentication error: " + error.message });
  }
});

// ✅ Admin Login (updated for email)
app.post("/api/adminlogin", async (req, res) => {
  const { email, password } = req.body;  // Change from 'name' to 'email'
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const admin = await Admin.findOne({ email_id: email });  // Search by email
    
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    
    if (isMatch) {
      res.status(200).json({ 
        message: "Login success",
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email_id
        }
      });
    } else {
      res.status(401).json({ message: "Invalid password" });
    }
  } catch (error) {
    res.status(500).json({ error: "Authentication error: " + error.message });
  }
});
// ✅ Fetch All Workers
app.get("/get-workers", async (req, res) => {
  try {
    const workers = await Worker.find({})
      .select('name employee_code mobile site role status created_at')
      .sort({ created_at: -1 });
    res.json(workers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Fetch Worker by ID
app.get("/api/workers/:id", async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }
    
    res.json(worker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update Worker
app.put("/api/workers/:id", async (req, res) => {
  try {
    const { name, site, role, status } = req.body;
    
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { name, site, role, status },
      { new: true, runValidators: true }
    );
    
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }
    
    res.json({ message: "Worker updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Delete Worker
app.delete("/delete-worker/:id", async (req, res) => {
  try {
    // Delete attendance records first
    await Attendance.deleteMany({ worker_id: req.params.id });
    
    // Then delete the worker
    const worker = await Worker.findByIdAndDelete(req.params.id);
    
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    
    res.json({ message: "Worker deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Attendance Check-in / Check-out
app.post("/api/attendance", async (req, res) => {
  const { worker_id, action, latitude, longitude } = req.body;
  
  if (!worker_id || !latitude || !longitude) {
    return res.status(400).json({ message: "Missing required data" });
  }

  try {
    // Check if worker exists and is active
    const worker = await Worker.findById(worker_id);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    if (worker.status !== 'Active') {
      return res.status(400).json({ message: "Worker account is not active" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (action === "checkin") {
      // Check if already checked in today
      const existingCheckin = await Attendance.findOne({
        worker_id: worker_id,
        checkin_time: { $gte: today, $lt: tomorrow },
        checkout_time: null
      });

      if (existingCheckin) {
        return res.status(400).json({ message: "Already checked in for today" });
      }

      const attendance = new Attendance({
        worker_id: worker_id,
        checkin_time: new Date(),
        latitude,
        longitude
      });

      await attendance.save();
      res.json({ message: "Check-in successful!" });
    } else if (action === "checkout") {
      const attendance = await Attendance.findOne({
        worker_id: worker_id,
        checkin_time: { $gte: today, $lt: tomorrow },
        checkout_time: null
      }).sort({ checkin_time: -1 });

      if (!attendance) {
        return res.status(404).json({ message: "No active check-in found for today" });
      }

      attendance.checkout_time = new Date();
      await attendance.save();
      res.json({ message: "Check-out successful!" });
    } else {
      res.status(400).json({ message: "Invalid action" });
    }
  } catch (error) {
    res.status(500).json({ message: "Database error: " + error.message });
  }
});

// ✅ Get Worker Attendance History
app.get("/api/attendance/:workerId", async (req, res) => {
  try {
    const attendance = await Attendance.find({ worker_id: req.params.workerId })
      .populate('worker_id', 'name employee_code')
      .sort({ checkin_time: -1 })
      .limit(30);

    const formattedAttendance = attendance.map(record => ({
      date: record.checkin_time.toISOString().split('T')[0],
      checkin_time: record.checkin_time.toTimeString().split(' ')[0],
      checkout_time: record.checkout_time ? record.checkout_time.toTimeString().split(' ')[0] : null,
      latitude: record.latitude,
      longitude: record.longitude
    }));

    res.json(formattedAttendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔹 SUPER ADMIN ROUTES

// ✅ Add Admin
app.post("/superadmin/add-admin", async (req, res) => {
  const { adminName, adminEmail, adminPass } = req.body;

  if (!adminName || !adminEmail || !adminPass) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const hash = await bcrypt.hash(adminPass, 10);
    
    const admin = new Admin({
      username: adminName,
      email_id: adminEmail,
      password: hash
    });

    await admin.save();
    res.json({ message: "Admin added successfully!" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Admin username or email already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get All Admins
app.get("/superadmin/admins", async (req, res) => {
  try {
    const admins = await Admin.find({})
      .select('username email_id created_at')
      .sort({ created_at: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Add Site
app.post("/superadmin/add-site", async (req, res) => {
  const { site_name, location } = req.body;
  
  if (!site_name) {
    return res.status(400).json({ error: "Site name is required" });
  }

  try {
    const site = new Site({
      site_name,
      location
    });

    await site.save();
    res.json({ message: "Site added successfully!" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Site name already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get All Sites
app.get("/superadmin/sites", async (req, res) => {
  try {
    const sites = await Site.find({}).sort({ site_name: 1 });
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get Global Attendance
app.get("/superadmin/attendance", async (req, res) => {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ error: "Date parameter is required" });
  }

  try {
    const selectedDate = new Date(date);
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const workers = await Worker.find({ status: 'Active' });
    const attendance = await Attendance.find({
      checkin_time: { $gte: selectedDate, $lt: nextDate }
    }).populate('worker_id');

    const result = workers.map(worker => {
      const workerAttendance = attendance.find(a => a.worker_id._id.toString() === worker._id.toString());
      
      return {
        worker_name: worker.name,
        role: worker.role,
        site: worker.site,
        checkin_time: workerAttendance ? workerAttendance.checkin_time : null,
        checkout_time: workerAttendance ? workerAttendance.checkout_time : null,
        latitude: workerAttendance ? workerAttendance.latitude : null,
        longitude: workerAttendance ? workerAttendance.longitude : null,
        status: workerAttendance ? 
          (workerAttendance.checkout_time ? 'Completed' : 'Checked In') : 
          'Absent'
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get Dashboard Statistics
app.get("/api/dashboard-stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalWorkers = await Worker.countDocuments({ status: 'Active' });
    
    const presentToday = await Attendance.distinct('worker_id', {
      checkin_time: { $gte: today, $lt: tomorrow }
    });

    const stats = {
      totalWorkers,
      presentToday: presentToday.length,
      absentToday: totalWorkers - presentToday.length
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve HTML files directly
app.get("/super-admin-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "SuperAdminLogin.html"));
});

app.get("/admin-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "AdminLogin.html"));
});

app.get("/worker-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "WorkerLogin.html"));
});
// Add this route to check all admins
app.get("/debug-admins", async (req, res) => {
  try {
    const admins = await Admin.find({});
    console.log("All admins:", admins);
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ✅ ADD WORKER ROUTE

app.post("/add-worker", async (req, res) => {
  const { name, employee_code, mobile, site, role, pin } = req.body;

  if (!name || !employee_code || !site || !role || !pin) {
    return res.status(400).json({ error: "All required fields must be filled" });
  }

  try {
    const existing = await Worker.findOne({ employee_code });
    if (existing) {
      return res.status(400).json({ error: "Employee code already exists" });
    }

    const pin_hash = await bcrypt.hash(pin.toString(), 10);

    const worker = new Worker({
      name,
      employee_code,
      mobile,
      site,
      role,
      pin_hash,
      status: "Active"
    });

    await worker.save();
    console.log("✅ Worker saved:", worker);

    // 🔹 Send full worker object in response
    res.status(201).json({
      message: "Worker added successfully!",
      worker: {
        id: worker._id.toString(),
        code: worker.code,
        name: worker.name,
        employee_code: worker.employee_code,
        site: worker.site,
        role: worker.role,
        status: worker.status
      }
    });
  } catch (error) {
    console.error("❌ Error adding worker:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});


// ✅ Start server FIRST
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// ✅ Connect to MongoDB AFTER server starts
connectDB();

// 🧠 Example simple test route
app.get("/test", (req, res) => {
  res.json({ message: "Server is up and MongoDB connected!" });
});

// ✅ Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});