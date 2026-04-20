# TeamTask Project Report

## 1. Introduction

TeamTask is a full-stack web application built to improve task coordination, team collaboration, and project visibility inside an organization. The system supports multiple user roles and provides a centralized platform for assigning work, tracking progress, managing approvals, and monitoring performance.

This project was developed as a role-based task and project management system with a modern web interface and a RESTful backend. It is designed to help organizations reduce manual coordination, improve accountability, and keep operational data in one place.

## 2. Problem Statement

Many teams still manage internal work through scattered tools such as chat, spreadsheets, and verbal follow-up. This creates several problems:

- Lack of a clear task ownership model
- Difficulty tracking deadlines and overdue work
- Weak visibility into employee and section performance
- No structured approval process for submitted work
- Poor communication between leadership, managers, employees, and clients

TeamTask addresses these issues by offering a structured platform where work is assigned, updated, reviewed, and monitored through clearly defined workflows.

## 3. Project Objectives

The main objectives of TeamTask are:

- Build a centralized task management platform
- Support role-based access for CEO, Manager, Employee, and Client
- Enable project and section-level organization
- Provide task evidence submission and approval workflows
- Track performance using scores, stars, levels, and on-time completion metrics
- Support bilingual use through English and Arabic interfaces
- Offer a scalable architecture for future expansion

## 4. System Overview

TeamTask is organized into two main parts:

- Frontend: A React application built with Vite and styled with Tailwind CSS
- Backend: A Node.js and Express API connected to PostgreSQL through Prisma ORM

The frontend handles dashboards, routing, forms, and user interaction. The backend manages authentication, business logic, database access, notifications, file handling, and API responses.

## 5. Technology Stack

### Frontend

- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- i18next
- Recharts
- Socket.IO Client

### Backend

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- JWT authentication
- bcryptjs
- Socket.IO
- Swagger
- Multer

## 6. Core Features Implemented

Based on the current repository state, the following major features are implemented:

### 6.1 Authentication and Role-Based Access

- Secure login with JWT-based authentication
- User roles: CEO, Manager, Employee, Client
- Protected frontend routes based on user role
- Authorization middleware on backend routes

### 6.2 Task Management

- Create and assign tasks
- View tasks by role
- Track task status: `TODO`, `IN_PROGRESS`, `PENDING_APPROVAL`, `DONE`, `LATE`
- Set deadlines and priorities
- Support recurring tasks with daily, weekly, and monthly repetition options
- Support parent tasks and subtasks
- Automatically mark overdue tasks as `LATE`

### 6.3 Evidence and Approval Workflow

- Upload task evidence
- Attach one or multiple evidence URLs
- Add evidence notes
- Submit tasks for approval
- Approve or reject completed work with comments

### 6.4 Section and Team Management

- Create and manage organizational sections
- Assign a manager to each section
- Link employees and tasks to sections
- Track section-level task progress

### 6.5 Project Management

- Create and manage projects
- Assign project manager, client, and section
- Connect tasks to projects
- Track project progress and completion state
- Add project comments for collaboration

### 6.6 Performance Tracking

- Record task scores
- Track whether work is completed on time
- Maintain employee stars and levels such as `BRONZE`, `SILVER`, and `GOLD`
- Show team rankings and performance indicators on dashboards

### 6.7 Notifications and Real-Time Updates

- Notification records stored in the database
- Socket.IO integration for real-time communication
- Dedicated notifications page in the frontend

### 6.8 Multilingual Support

- English and Arabic translation files
- Dynamic left-to-right and right-to-left layout switching
- Local language preference saved in the browser

### 6.9 API Documentation

- Swagger UI available for backend API documentation
- Easier testing and developer onboarding

## 7. User Roles and Responsibilities

### CEO

- Oversees the whole system
- Manages sections, users, tasks, and projects
- Reviews progress and overdue work
- Monitors team performance

### Manager

- Manages section work
- Assigns tasks to employees
- Tracks section performance
- Monitors project progress for assigned projects

### Employee

- Views assigned tasks
- Updates progress
- Submits evidence for completed work

### Client

- Has a dedicated dashboard
- Can be linked to projects
- Represents external stakeholders in the workflow

## 8. Database Design Summary

The database schema includes the following main entities:

- `User`
- `Section`
- `Project`
- `Task`
- `Score`
- `Notification`
- `ProjectComment`

The design supports:

- Role-based users
- Task assignment between creators and assignees
- Task recurrence
- Project-task relationships
- Performance scoring
- Approval status tracking
- Notification delivery

Prisma migrations in the repository show that the project evolved incrementally, with later additions such as projects, evidence URLs, task evidence notes, public-relations fields, and recurring task support.

## 9. Special Functional Areas

### 9.1 Public Relations Workflow

The system includes specialized fields for public-relations and government-transaction tasks. These fields allow structured storage of:

- Company name
- Government entity
- Transaction type
- Government employee
- Application number
- Tax ID number
- National ID number
- Notes and updates

This makes TeamTask suitable not only for general task management, but also for operational workflows that require domain-specific data capture.

### 9.2 Calendar and Dashboards

The frontend includes multiple dashboards and overview pages, including:

- CEO dashboard
- Manager dashboard
- Employee dashboard
- Client dashboard
- Tasks page
- Task detail page
- Projects page
- Sections page
- Users page
- Calendar page
- Notifications page
- Profile and profile edit pages

These screens provide a complete user-facing workflow across planning, execution, review, and monitoring.

## 10. Architecture and Workflow

The typical workflow in TeamTask is:

1. A CEO or manager creates a task or project.
2. The task is assigned to an employee or linked to a project.
3. The assignee updates task status during execution.
4. Evidence is uploaded when the task is completed.
5. The task moves to a pending approval state.
6. Leadership reviews the evidence and approves or rejects the task.
7. Scores and performance indicators are updated based on completion and timing.

This architecture improves traceability because every task has ownership, status, deadlines, evidence, and a review outcome.

## 11. Deployment and Environment

The repository includes both local setup and production-like deployment guidance.

### Local Development

- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:5173`
- PostgreSQL is used as the database
- Prisma handles schema migration and seeding

### Production-Like Deployment

- Recommended server: Ubuntu Server 22.04 LTS
- Backend process management with PM2
- Frontend served as static files
- Nginx used as reverse proxy
- PostgreSQL hosted locally on the server

The project also includes Cloudflare Tunnel instructions for sharing the frontend outside the local network during development.

## 12. Strengths of the Project

- Clear separation between frontend and backend
- Strong role-based structure
- Good database modeling with Prisma
- Real-time support through Socket.IO
- API documentation with Swagger
- Bilingual support for English and Arabic users
- Expandable structure for future business workflows
- Practical dashboards for different stakeholder roles

## 13. Current Limitations

Although the project is solid and functional, there are still areas for improvement:

- No automated test suite is included in the repository
- Some documentation files are outdated compared to the current implementation
- Production security hardening can be improved further
- More reporting and analytics screens could be added
- Client-side capabilities appear present but may still need expansion in business workflows

## 14. Future Enhancements

According to the roadmap and current structure, future development can include:

- Expanded client request and rating workflows
- Client revision requests
- File attachments for external requests
- Invoice and reporting generation
- Analytics dashboards
- Payment integration if required
- SLA tracking and operational metrics
- Improved administration and client management tools

## 15. Conclusion

TeamTask is a well-structured full-stack task and project management platform that supports multiple organizational roles and real business workflows. It combines task assignment, project tracking, approvals, notifications, performance monitoring, and bilingual access in one system.

The project demonstrates practical use of modern web technologies including React, Node.js, Express, Prisma, PostgreSQL, and Socket.IO. Its architecture is modular enough to support future expansion, and its current implementation already covers a strong set of operational features suitable for internal organizational use.

Overall, TeamTask is a strong foundation for a production-ready organizational management system and a meaningful example of full-stack application development.
