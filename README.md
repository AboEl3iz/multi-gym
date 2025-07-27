# Multi-Gym Management System

## Overview

The Multi-Gym Management System is a comprehensive platform designed to streamline the operations of multi-branch fitness centers and gyms. It provides a robust set of tools for administrators, trainers, and members to efficiently manage gym activities, class schedules, bookings, user engagement, and business analytics—all accessible via a modern dashboard with both branch and global (super admin) insights.

---

## Project Goals

- **Centralize and automate gym branch management**
- **Enable data-driven decision making via analytics dashboards**
- **Increase user engagement and operational efficiency**
- **Provide a scalable and secure solution for multi-branch gyms**

---

## Problem Solving Approach

Managing multiple gym branches involves complex challenges such as class scheduling, trainer assignments, booking management, attendance tracking, reporting, and revenue analysis. This project solves these challenges by:

- **Automating scheduling & conflict detection:** Ensures trainers and rooms are never double-booked.
- **Providing real-time analytics:** Dashboards deliver instant insights into membership growth, class popularity, trainer performance, and revenue.
- **Supporting granular access control:** Role-based permissions for SuperAdmin, BranchAdmin, Trainers, and Members.
- **Centralizing communication:** Built-in chat and notification systems.

---

## Key Features

### 1. **Branch and Global Dashboards**
- **Branch Admin Dashboard:** Visualizes branch-specific stats (members, trainers, bookings, schedules, attendance, revenue, top classes/trainers, member growth, churn rate, average attendance).
- **SuperAdmin Dashboard:** Provides aggregated insights across all branches (total members, trainers, bookings, global revenue, growth trends, top performers).

### 2. **Role-Based Authentication & Authorization**
- Secure login via JWT
- Access control for different user roles (SuperAdmin, BranchAdmin, Trainer, Member)

### 3. **Class & Schedule Management**
- Create, update, and manage classes, trainers, rooms, and schedules
- Automated conflict detection prevents double-booking of trainers or rooms

### 4. **Booking & Attendance**
- Members can book classes online
- Attendance tracking for performance and revenue calculations

### 5. **Reporting & Analytics**
- Generate detailed reports (PDF supported) on bookings, attendance, revenue, and more
- Monthly growth and churn analysis

### 6. **Offers & Promotions**
- Define and manage promotional offers and discounts per branch

### 7. **Chat & Notifications**
- Real-time communication between users and admins
- Automated notifications for class updates, bookings, and more

### 8. **API Documentation**
- Interactive Swagger UI available at `/api-docs` for developers and integrators

---

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** TypeORM (supports PostgreSQL, MySQL, etc.)
- **Authentication:** JWT-based
- **Websockets:** Socket.IO for real-time features
- **Documentation:** Swagger (OpenAPI)
- **PDF Reporting:** PDFKit
- **Environment Management:** dotenv

---

## Database Design

The platform uses a relational database with entities such as:
- **User** (with roles: SuperAdmin, BranchAdmin, Trainer, Member)
- **Branch**
- **Class**
- **Room**
- **Schedule**
- **SessionBooking**
- **Report**
- **Offer**
- **ChatMessage**

TypeORM ensures structured relationships and transactional integrity.

---

## Dashboard Details

### Branch Admin Dashboard
- **KPIs:** Members, trainers, classes, bookings, schedules
- **Attendance summary**
- **Financial summary (revenue from attended bookings)**
- **Top classes and trainers (by bookings in last month)**
- **Member growth & churn**
- **Average class attendance**

### SuperAdmin Dashboard
- **All branch stats aggregated**
- **Global revenue and trends**
- **Top trainers and branches**
- **Growth and churn trends**
- **Predictive analytics (stub for future enhancement)**

---

## API Endpoints

- **Authentication:** `/auth/*`
- **Branch Management:** `/branches/*`
- **User Management:** `/users/*`
- **Class Management:** `/classes/*`
- **Room Management:** `/rooms/*`
- **Schedule Management:** `/schedules/*`
- **Booking Management:** `/bookings/*`
- **Reporting:** `/reports/*`
- **Offers:** `/offers/*`
- **Chat & Notifications:** `/chat/*`, `/notifications/*`
- **Dashboards:** `/dashboard/admin`, `/dashboard/superadmin`

---

## Getting Started

1. **Clone the repository**
2. **Install dependencies:**  
   `npm install`
3. **Configure environment variables:**  
   Copy `.env.example` to `.env` and update with your DB credentials and JWT secret
4. **Run database migrations:**  
   `npm run typeorm migration:run`
5. **Start the server:**  
   `npm run dev`
6. **Access API documentation:**  
   Visit `http://localhost:<port>/api-docs`

---

## Acknowledgements

This project leverages the power of modern Node.js, Express, TypeORM, and the open-source community to deliver a professional, extensible, and production-ready gym management platform.

---

## Database Schema (ERD)

The database schema can be found in the [ERD folder](ERD/multigym.png).

