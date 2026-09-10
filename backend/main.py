from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3
from datetime import datetime


# --------------------------------------------------
# APP CONFIGURATION
# --------------------------------------------------

app = FastAPI(title="Support CRM API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DATABASE = "support_crm.db"


# --------------------------------------------------
# DATABASE
# --------------------------------------------------

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database():
    conn = get_db()
    cursor = conn.cursor()

    # Tickets table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Open',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # Notes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT NOT NULL,
            note_text TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
        )
    """)

    conn.commit()
    conn.close()


initialize_database()


# --------------------------------------------------
# PYDANTIC MODELS
# --------------------------------------------------

class TicketCreate(BaseModel):
    customer_name: str
    customer_email: str
    subject: str
    description: str


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


# --------------------------------------------------
# HELPER FUNCTIONS
# --------------------------------------------------

def generate_ticket_id():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM tickets")
    count = cursor.fetchone()[0]

    conn.close()

    return f"TKT-{count + 1:03d}"


def ticket_to_dict(ticket):
    return {
        "id": ticket["id"],
        "ticket_id": ticket["ticket_id"],
        "customer_name": ticket["customer_name"],
        "customer_email": ticket["customer_email"],
        "subject": ticket["subject"],
        "description": ticket["description"],
        "status": ticket["status"],
        "created_at": ticket["created_at"],
        "updated_at": ticket["updated_at"],
    }


# --------------------------------------------------
# BASIC ROUTE
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Support CRM API is running"
    }


# --------------------------------------------------
# CREATE TICKET
# --------------------------------------------------

@app.post("/api/tickets")
def create_ticket(ticket: TicketCreate):

    conn = get_db()
    cursor = conn.cursor()

    ticket_id = generate_ticket_id()
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO tickets (
            ticket_id,
            customer_name,
            customer_email,
            subject,
            description,
            status,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ticket_id,
        ticket.customer_name,
        ticket.customer_email,
        ticket.subject,
        ticket.description,
        "Open",
        now,
        now
    ))

    conn.commit()

    cursor.execute(
        "SELECT * FROM tickets WHERE ticket_id = ?",
        (ticket_id,)
    )

    created_ticket = cursor.fetchone()

    conn.close()

    return ticket_to_dict(created_ticket)


# --------------------------------------------------
# LIST / SEARCH / FILTER TICKETS
# --------------------------------------------------

@app.get("/api/tickets")
def get_tickets(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None)
):

    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM tickets WHERE 1=1"
    params = []

    # Status filter
    if status:
        query += " AND status = ?"
        params.append(status)

    # Search
    if search:
        query += """
            AND (
                customer_name LIKE ?
                OR customer_email LIKE ?
                OR ticket_id LIKE ?
                OR subject LIKE ?
                OR description LIKE ?
            )
        """

        search_value = f"%{search}%"

        params.extend([
            search_value,
            search_value,
            search_value,
            search_value,
            search_value
        ])

    query += " ORDER BY id DESC"

    cursor.execute(query, params)

    tickets = cursor.fetchall()

    conn.close()

    return [ticket_to_dict(ticket) for ticket in tickets]


# --------------------------------------------------
# GET TICKET DETAILS
# --------------------------------------------------

@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: str):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM tickets WHERE ticket_id = ?",
        (ticket_id,)
    )

    ticket = cursor.fetchone()

    if not ticket:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    cursor.execute("""
        SELECT *
        FROM notes
        WHERE ticket_id = ?
        ORDER BY id DESC
    """, (ticket_id,))

    notes = cursor.fetchall()

    conn.close()

    result = ticket_to_dict(ticket)

    result["notes"] = [
        {
            "id": note["id"],
            "ticket_id": note["ticket_id"],
            "note_text": note["note_text"],
            "created_at": note["created_at"]
        }
        for note in notes
    ]

    return result


# --------------------------------------------------
# UPDATE TICKET STATUS / ADD NOTE
# --------------------------------------------------

@app.put("/api/tickets/{ticket_id}")
def update_ticket(
    ticket_id: str,
    update: TicketUpdate
):

    conn = get_db()
    cursor = conn.cursor()

    # Check ticket exists
    cursor.execute(
        "SELECT * FROM tickets WHERE ticket_id = ?",
        (ticket_id,)
    )

    ticket = cursor.fetchone()

    if not ticket:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    now = datetime.utcnow().isoformat()

    # Update status if provided
    if update.status:

        allowed_statuses = [
            "Open",
            "In Progress",
            "Closed"
        ]

        if update.status not in allowed_statuses:
            conn.close()

            raise HTTPException(
                status_code=400,
                detail="Invalid status"
            )

        cursor.execute("""
            UPDATE tickets
            SET status = ?, updated_at = ?
            WHERE ticket_id = ?
        """, (
            update.status,
            now,
            ticket_id
        ))

    # Add note if provided
    if update.notes and update.notes.strip():

        cursor.execute("""
            INSERT INTO notes (
                ticket_id,
                note_text,
                created_at
            )
            VALUES (?, ?, ?)
        """, (
            ticket_id,
            update.notes.strip(),
            now
        ))

    conn.commit()

    # Return updated ticket
    cursor.execute(
        "SELECT * FROM tickets WHERE ticket_id = ?",
        (ticket_id,)
    )

    updated_ticket = cursor.fetchone()

    cursor.execute("""
        SELECT *
        FROM notes
        WHERE ticket_id = ?
        ORDER BY id DESC
    """, (ticket_id,))

    notes = cursor.fetchall()

    conn.close()

    result = ticket_to_dict(updated_ticket)

    result["notes"] = [
        {
            "id": note["id"],
            "ticket_id": note["ticket_id"],
            "note_text": note["note_text"],
            "created_at": note["created_at"]
        }
        for note in notes
    ]

    return result


# --------------------------------------------------
# DASHBOARD STATISTICS
# --------------------------------------------------

@app.get("/api/stats")
def get_stats():

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT COUNT(*) FROM tickets"
    )
    total = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM tickets WHERE status = 'Open'"
    )
    open_count = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM tickets WHERE status = 'In Progress'"
    )
    in_progress = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM tickets WHERE status = 'Closed'"
    )
    closed = cursor.fetchone()[0]

    conn.close()

    return {
        "total": total,
        "open": open_count,
        "in_progress": in_progress,
        "closed": closed
    }