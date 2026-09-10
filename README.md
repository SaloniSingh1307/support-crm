# Support CRM

A full-stack customer support ticket management system for creating, tracking, searching, and managing customer support requests.

## Features

- Create support tickets
- Automatic ticket ID generation
- Automatic created and updated timestamps
- View all support tickets
- Search by customer name
- Search by customer email
- Search by ticket ID
- Search by issue title
- Search by issue description
- Filter tickets by status
- View detailed ticket information
- Update ticket status
- Add internal support notes
- Dashboard statistics
- Responsive and clean user interface

## Tech Stack

### Frontend

- React
- Vite
- CSS

### Backend

- Python
- FastAPI

### Database

- SQLite

## Architecture

```text
React Frontend
      |
      | REST API
      v
FastAPI Backend
      |
      v
SQLite Database
