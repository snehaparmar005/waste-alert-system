# ♻️ Click-2-Clean — Smart Community Waste Management Platform

**Click-2-Clean** is a full-stack web application that empowers citizens to report street waste with photo evidence and live GPS coordinates, enabling **Nagar Nigam (Municipal)** teams and **System Administrators** to track, assign, and resolve cleanup operations efficiently.

---

## 🚀 Key Features by Role

### 🌐 Public Access
* **Landing Page**: Project overview and quick navigation to report waste or sign in.
* **Unified Authentication**: Role-based login and citizen registration with automatic dashboard routing.

### 👤 Citizen Role
* **Report Waste**: Upload waste photos, select waste category & ward, capture live GPS coordinates, and submit complaints.
* **My Reports Timeline**: Real-time tracking of submitted reports (*Pending*, *Assigned*, *Cleaned*) with a detailed inspection modal.
* **Profile Management**: Update display name and account password.

### 🏛️ Government Role (Nagar Nigam)
* **Live Area Dashboard**: Summary metrics and an interactive **Leaflet** map displaying pinned waste locations.
* **Area Reports Table**: Searchable and filterable list of municipal complaints by category and status.
* **Report Action View**: View uploaded waste evidence on a map and update cleanup status to **Assigned** or **Cleaned**.

### 🛡️ Admin Role
* **Master Control Center**: City-wide cleanup statistics and a master ward map.
* **System Reports Manager**: Full oversight to edit statuses or remove invalid reports.
* **User & Officer Management**: Add accounts, remove users, or change access roles (`Citizen`, `Gov`, `Admin`).
* **Ward & Alert Contacts**: Configure municipal wards with official emails and Telegram alert handles.
* **Alert Delivery Logs**: Audit trail of automated notifications sent to ward authorities.

---

## 🛠️ Tech Stack
* **Frontend**: React, Vite, Tailwind CSS, React Router, React Leaflet
* **Backend**: Python, FastAPI, Uvicorn, Pydantic
* **Database & Storage**: SQLite (`click2clean.db`), Local Static File Storage (`/uploads`)

---

## ⚙️ How to Run Locally

### 1. Start the Backend (FastAPI)
```bash
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload
```
*Backend runs at: `http://127.0.0.1:8000`*

### 2. Start the Frontend (React + Vite)
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at: `http://localhost:5173`*

---

## 🔑 Demo Login Credentials
*(Password for all demo accounts: **`password123`**)*

| Role | Email |
| :--- | :--- |
| **Citizen** | `citizen@test.com` |
| **Nagar Nigam Officer** | `officer@nagarnigam.gov.in` |
| **System Admin** | `admin@nagarnigam.gov.in` |
