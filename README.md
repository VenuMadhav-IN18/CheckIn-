# CheckIn+

**CheckIn+** is a smart attendance and workforce management system designed to simplify check-ins, track worker activity, and manage roles like Super Admin, Admin, and Workers.  
This version focuses on the **frontend and basic structure** using HTML, CSS, and JavaScript.
**Backend** using Node.js,Express.js **DataBase** Mysql.

---

##  Project Concept

The main goal of **CheckIn+** is to provide a digital platform where organizations can efficiently manage workers' attendance, assign tasks, and maintain records in a secure and user-friendly environment.  
It also lays the groundwork for backend integration with authentication, database management, and analytics.

---

## 🎨 Features Implemented (Frontend Version)

- **Role-based Interfaces**:  
  Separate dashboards and login pages for:
  - Super Admin  
  - Admin  
  - Workers

### Superadmin
The Superadmin is the highest-level user with full control over the system. Responsibilities include:
- Create, update, and delete **Admin accounts**.
- View all Admins, Workers, and their activity logs.
- Manage system settings and configurations.
- Access detailed reports of Check-In and Check-Out records.

### Admin
Admins manage the day-to-day operations. Responsibilities include:
- Registering and managing **Worker accounts**.
- Monitoring Check-In and Check-Out activities of workers.
- Updating worker details and resetting passwords if needed.
- Generating basic attendance reports for workers.

### Worker
Workers are regular users who interact with the system primarily to log their attendance. They can:
- Perform **Check-In** at the start of their workday.
- Perform **Check-Out** at the end of their workday.
- View their own attendance history.

## Check-In / Check-Out Workflow

1. **Worker Login**
   - Worker enters credentials to access the system.
   - After successful login, the system shows **Check-In** and **Check-Out** options.

2. **Check-In**
   - Workers click the **Check-In** button when they start their work.
   - The system records the **current date and time** for that worker.
   - Workers cannot Check-In multiple times on the same day.

3. **Check-Out**
   - At the end of the day, workers click the **Check-Out** button.
   - The system records the **current date and time** as the Check-Out time.
   - If a worker forgets to Check-Out, admins can update records manually.

4. **Attendance Logs**
   - Admins and Superadmins can view all Check-In and Check-Out records.
   - Logs include Worker name, Check-In time, Check-Out time, and total hours worked.

---

## Admin Login
- Admins log in with their credentials to access the Admin Dashboard.
- From the dashboard, admins can:
  - Manage workers
  - Monitor daily Check-In and Check-Out records
  - Generate reports
- Admins cannot create other Admins or access system-wide settings (Superadmin only).

---

## System Features
- Role-based access control
- Real-time Check-In/Check-Out logging
- Attendance history tracking
- Admin and Superadmin dashboards for easy management

- **User Authentication UI**:  
  Designed login forms for all roles with responsive layout.


- **Clean and Modern Design**:  
  Implemented using HTML, CSS, and lightweight JavaScript.

- **Assets and Icons**:  
  Custom visuals for each role (Admin, Super Admin, Workers) included under `/public/Assets/`.


## 🧩 Folder Structure

CheckIn+/
├── db/
│ └── db.js
├── public/
│ ├── css/
│ │ └── style.css
│ ├── Assets/
│ ├── AdminDashboard.html
│ ├── WorkerLogin.html
│ ├── SuperAdminLogin.html
│ ├── MainInterface.html
│ └── superadmindash.html
│ ├── SuperAdminLogin.html
│ ├── workerdashboard.html
│ └── WorkerLogin.html
├── server.js
└── README.md