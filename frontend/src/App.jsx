import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    closed: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [selectedTicket, setSelectedTicket] = useState(null);

  // -----------------------------
  // Fetch tickets
  // -----------------------------
  const fetchTickets = async () => {
    try {
      setLoading(true);

      let url = `${API_URL}/api/tickets?`;

      if (search) {
        url += `search=${encodeURIComponent(search)}&`;
      }

      if (status) {
        url += `status=${encodeURIComponent(status)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load tickets");
      }

      setTickets(data);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Fetch dashboard statistics
  // -----------------------------
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load statistics");
      }

      setStats(data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  // -----------------------------
  // Load tickets whenever
  // search/filter changes
  // -----------------------------
  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [search, status]);

  // -----------------------------
  // Open ticket details
  // -----------------------------
  const openTicket = async (ticketId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/tickets/${ticketId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Ticket not found");
      }

      setSelectedTicket(data);
      setPage("details");
    } catch (error) {
      console.error("Error opening ticket:", error);
      alert(error.message);
    }
  };

  // -----------------------------
  // Return to dashboard
  // -----------------------------
  const goToDashboard = () => {
    setPage("dashboard");
    setSelectedTicket(null);
    fetchTickets();
    fetchStats();
  };

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div
          className="brand"
          onClick={goToDashboard}
          role="button"
          tabIndex="0"
        >
          <div className="brand-icon">S</div>

          <div>
            <h1>Support CRM</h1>
            <p>Customer Support Management</p>
          </div>
        </div>

        <button
          className="create-button"
          onClick={() => setPage("create")}
        >
          + Create Ticket
        </button>
      </header>

      {/* DASHBOARD */}
      {page === "dashboard" && (
        <Dashboard
          tickets={tickets}
          stats={stats}
          search={search}
          setSearch={setSearch}
          status={status}
          setStatus={setStatus}
          loading={loading}
          openTicket={openTicket}
        />
      )}

      {/* CREATE TICKET */}
      {page === "create" && (
        <CreateTicket
          onBack={goToDashboard}
          onCreated={goToDashboard}
        />
      )}

      {/* TICKET DETAILS */}
      {page === "details" && selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          onBack={goToDashboard}
          onUpdated={() => openTicket(selectedTicket.ticket_id)}
        />
      )}
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  tickets,
  stats,
  search,
  setSearch,
  status,
  setStatus,
  loading,
  openTicket,
}) {
  return (
    <main className="container">
      {/* Welcome */}
      <section className="welcome">
        <div>
          <h2>Support Dashboard</h2>
          <p>
            Monitor and manage customer support tickets from one place.
          </p>
        </div>
      </section>

      {/* Statistics */}
      <section className="stats">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <span>Total Tickets</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <span>Open</span>
          <strong>{stats.open}</strong>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🟡</div>
          <span>In Progress</span>
          <strong>{stats.in_progress}</strong>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚪</div>
          <span>Closed</span>
          <strong>{stats.closed}</strong>
        </div>
      </section>

      {/* Tickets */}
      <section className="ticket-section">
        <div className="section-title">
          <div>
            <h2>All Tickets</h2>
            <p>
              View, search and manage customer support requests.
            </p>
          </div>

          <span>
            {tickets.length}{" "}
            {tickets.length === 1 ? "ticket" : "tickets"}
          </span>
        </div>

        {/* Search + Filter */}
        <div className="toolbar">
          <div className="search-box">
            <span>🔍</span>

            <input
              type="text"
              placeholder="Search by name, email, ticket ID, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Ticket list */}
        {loading ? (
          <div className="message">
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <div>📭</div>

            <h3>No tickets found</h3>

            <p>
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <div className="ticket-table">
            <div className="table-header">
              <span>Ticket</span>
              <span>Customer</span>
              <span>Subject</span>
              <span>Status</span>
              <span>Created</span>
            </div>

            {tickets.map((ticket) => (
              <div
                className="table-row"
                key={ticket.ticket_id}
                onClick={() =>
                  openTicket(ticket.ticket_id)
                }
              >
                <span className="ticket-id">
                  {ticket.ticket_id}
                </span>

                <span>
                  <strong>{ticket.customer_name}</strong>

                  <small>
                    {ticket.customer_email}
                  </small>
                </span>

                <span>{ticket.subject}</span>

                <span>
                  <span
                    className={`status status-${ticket.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {ticket.status}
                  </span>
                </span>

                <span>
                  {new Date(
                    ticket.created_at
                  ).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/* =========================================================
   CREATE TICKET
========================================================= */

function CreateTicket({ onBack, onCreated }) {
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    subject: "",
    description: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (
      !form.customer_name.trim() ||
      !form.customer_email.trim() ||
      !form.subject.trim() ||
      !form.description.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/tickets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to create ticket"
        );
      }

      alert(
        `Ticket ${data.ticket_id} created successfully!`
      );

      onCreated();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container form-container">
      <button
        className="back-button"
        onClick={onBack}
      >
        ← Back to Dashboard
      </button>

      <div className="form-card">
        <div className="form-header">
          <h2>Create Support Ticket</h2>

          <p>
            Enter the customer's information and describe
            their issue.
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Customer Name</label>

              <input
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="Enter customer name"
              />
            </div>

            <div className="form-group">
              <label>Customer Email</label>

              <input
                type="email"
                name="customer_email"
                value={form.customer_email}
                onChange={handleChange}
                placeholder="customer@example.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Issue Title</label>

            <input
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Briefly describe the issue"
            />
          </div>

          <div className="form-group">
            <label>Issue Description</label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Provide detailed information about the customer's issue..."
              rows="7"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onBack}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="create-button"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

/* =========================================================
   TICKET DETAILS
========================================================= */

function TicketDetails({
  ticket,
  onBack,
  onUpdated,
}) {
  const [status, setStatus] = useState(
    ticket.status
  );

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const updateTicket = async () => {
    if (!note.trim() && status === ticket.status) {
      alert("Make a change before updating.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/tickets/${ticket.ticket_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: status,
            notes: note.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to update ticket"
        );
      }

      setNote("");

      alert("Ticket updated successfully!");

      onUpdated();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container details-container">
      <button
        className="back-button"
        onClick={onBack}
      >
        ← Back to Dashboard
      </button>

      <div className="details-grid">
        {/* Ticket information */}
        <section className="details-card">
          <div className="details-header">
            <div>
              <span className="ticket-id">
                {ticket.ticket_id}
              </span>

              <h2>{ticket.subject}</h2>
            </div>

            <span
              className={`status status-${ticket.status
                .toLowerCase()
                .replace(" ", "-")}`}
            >
              {ticket.status}
            </span>
          </div>

          <div className="detail-block">
            <h3>Description</h3>

            <p>{ticket.description}</p>
          </div>

          <div className="detail-meta">
            <div>
              <span>Customer</span>
              <strong>
                {ticket.customer_name}
              </strong>
            </div>

            <div>
              <span>Email</span>
              <strong>
                {ticket.customer_email}
              </strong>
            </div>

            <div>
              <span>Created</span>
              <strong>
                {new Date(
                  ticket.created_at
                ).toLocaleString()}
              </strong>
            </div>

            <div>
              <span>Last Updated</span>
              <strong>
                {new Date(
                  ticket.updated_at
                ).toLocaleString()}
              </strong>
            </div>
          </div>
        </section>

        {/* Update panel */}
        <aside className="update-card">
          <h3>Update Ticket</h3>

          <label>Status</label>

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
          >
            <option value="Open">
              Open
            </option>

            <option value="In Progress">
              In Progress
            </option>

            <option value="Closed">
              Closed
            </option>
          </select>

          <label>Add Note</label>

          <textarea
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            placeholder="Add an internal support note..."
            rows="5"
          />

          <button
            className="create-button full-width"
            onClick={updateTicket}
            disabled={saving}
          >
            {saving
              ? "Updating..."
              : "Save Changes"}
          </button>
        </aside>
      </div>

      {/* Notes */}
      <section className="notes-section">
        <div className="section-title">
          <div>
            <h2>Notes & Activity</h2>

            <p>
              Internal notes added by the support team.
            </p>
          </div>
        </div>

        {ticket.notes.length === 0 ? (
          <div className="message">
            No notes have been added yet.
          </div>
        ) : (
          ticket.notes.map((item) => (
            <div
              className="note-item"
              key={item.id}
            >
              <div className="note-icon">
                N
              </div>

              <div>
                <p>{item.note_text}</p>

                <small>
                  {new Date(
                    item.created_at
                  ).toLocaleString()}
                </small>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

export default App;