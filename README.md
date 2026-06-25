<div align="center">
  <h1>🏛️ Gov Vision</h1>
  <p><strong>A Comprehensive Platform for Government Analytics, Risk Scoring, and AI-Driven Forecasting</strong></p>
</div>

<br />

## 📖 Introduction
**Gov Vision** is an advanced, full-stack application tailored for enterprise and government analytics. It integrates real-time event tracking, AI-powered anomaly detection, predictive forecasting, and automated risk scoring to deliver actionable insights. With a modern React frontend and a robust microservices backend (Node.js & Python ML), Gov Vision ensures high performance, scalability, and security to facilitate data-driven decision-making.

---

## ✨ Features
- **📊 Real-time Analytics Dashboard**: Interactive charts and rich data visualizations using Recharts and ECharts.
- **🤖 AI-Powered Insights**: Dedicated Machine Learning microservice for anomaly detection, risk scoring, and time-series forecasting (using Prophet & Scikit-Learn).
- **⚙️ Automated Jobs**: Scheduled background processes for report generation, model retraining, and scheduled risk assessments using `node-cron`.
- **🔐 Secure Authentication**: Robust Role-Based Access Control (RBAC), JWT authentication, and secure API rate limiting.
- **📄 Report Generation**: Automated generation and export of comprehensive PDF and CSV reports for compliance and auditing.
- **🚀 High Performance & Scalability**: Multi-service architecture leveraging Redis caching for fast data retrieval and MongoDB for flexible data storage.

---

## 📸 Screenshots

Here is a glimpse of Gov Vision in action:

| Dashboard | Decision Analytics |
| :---: | :---: |
| <img src="./WebAPP/1.%20Dashboard.png" alt="Dashboard" width="600" /> | <img src="./WebAPP/2.%20Decision%20analytics.png" alt="Decision Analytics" width="600" /> |

| Decision Details | Compliance |
| :---: | :---: |
| <img src="./WebAPP/3.%20Decision.png" alt="Decision Details" width="600" /> | <img src="./WebAPP/4.%20compliance.png" alt="Compliance" width="600" /> |

| Department Performance | Anomaly Detection 1 |
| :---: | :---: |
| <img src="./WebAPP/5.%20DEPARTMENT%20PERFORMANCE.png" alt="Department Performance" width="600" /> | <img src="./WebAPP/6.%20Anomaly%20detection.png" alt="Anomaly Detection 1" width="600" /> |

| Anomaly Detection 2 | Anomaly Detection 3 |
| :---: | :---: |
| <img src="./WebAPP/7.%20Anomaly%20detection.png" alt="Anomaly Detection 2" width="600" /> | <img src="./WebAPP/8.%20Anomaly%20detection.png" alt="Anomaly Detection 3" width="600" /> |

| Forecast | Delay Forecast |
| :---: | :---: |
| <img src="./WebAPP/9.%20Forecast.png" alt="Forecast" width="600" /> | <img src="./WebAPP/10.%20delay%20forecast.png" alt="Delay Forecast" width="600" /> |

| Risk Scoring | Risk Features |
| :---: | :---: |
| <img src="./WebAPP/11.%20risk%20scoring.png" alt="Risk Scoring" width="600" /> | <img src="./WebAPP/12.%20risk%20feature.png" alt="Risk Features" width="600" /> |

| Report Builder 1 | Report Builder 2 |
| :---: | :---: |
| <img src="./WebAPP/13%20report%20builder%201.png" alt="Report Builder 1" width="600" /> | <img src="./WebAPP/14%20report%20builder%202.png" alt="Report Builder 2" width="600" /> |

| Report Builder 3 | Report Builder 4 |
| :---: | :---: |
| <img src="./WebAPP/15%20report%20builder%203.png" alt="Report Builder 3" width="600" /> | <img src="./WebAPP/16%20report%20builder%204.png.png" alt="Report Builder 4" width="600" /> |

| Additional View 1 | Additional View 2 |
| :---: | :---: |
| <img src="./WebAPP/17%20.png" alt="Additional View 1" width="600" /> | <img src="./WebAPP/18.png" alt="Additional View 2" width="600" /> |

---

## 🛠️ Tech Stack & Libraries

We built Gov Vision using modern, reliable technologies and libraries to ensure an optimal developer and user experience.

### 💻 Frontend (Client)
<p>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</p>

* **Core**: React 19, TypeScript, Vite
* **Styling**: Tailwind CSS, PostCSS, clsx
* **Routing & State**: React Router DOM
* **Visualization**: ECharts, Recharts
* **Utilities**: Axios, HTML2Canvas, React Datepicker

### 🗄️ Backend (Node.js Server)
<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
</p>

* **Core**: Node.js, Express, TypeScript
* **Database & Caching**: MongoDB (Mongoose), Redis (ioredis)
* **Security**: JWT (jsonwebtoken), bcrypt, Helmet, CORS, Express Rate Limit
* **Utilities**: Node-cron (task scheduling), Nodemailer, Morgan (logging)
* **Reporting**: ExcelJS, jsPDF, json2csv

### 🧠 Machine Learning Service (Python)
<p>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/scikit_learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="scikit-learn" />
  <img src="https://img.shields.io/badge/pandas-150458?style=for-the-badge&logo=pandas&logoColor=white" alt="pandas" />
</p>

* **Core**: Python 3, FastAPI, Uvicorn
* **Data Science**: Scikit-Learn, Pandas, NumPy
* **Forecasting**: Prophet
* **Utilities**: Joblib, PyMongo, Python-dotenv

---

## 🏗️ Project Structure

```text
gov_vision/
├── client/         # React 19 Frontend application
├── server/         # Node.js/Express Backend API server
├── ml_service/     # Python/FastAPI Machine Learning service
├── contracts/      # Smart contracts (Blockchain integration)
├── config/         # Shared configuration files
└── documentation/  # Additional project documentation
```

---

## 🚦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Python](https://www.python.org/) (v3.9 or higher)
- [MongoDB](https://www.mongodb.com/) & [Redis](https://redis.io/)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/gov-vision.git
cd gov-vision
```

### 2. Start the Backend Server
```bash
cd server
npm install
npm run dev
```

### 3. Start the ML Service
```bash
cd ml_service
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Start the Client
```bash
cd client
npm install
npm run dev
```

---

