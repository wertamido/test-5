import React, { useState, useEffect } from 'react';
import {
  Dashboard,
  Users,
  Truck,
  Package,
  DollarSign,
  Bell,
  Settings,
  Shield,
  BarChart3,
  FileText,
  MapPin,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import './App.css';

// ─── API Client (Web) ─────────────────────────────────────────────────────────

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  activeTrips: number;
  totalLoads: number;
  revenue: number;
  pendingVerifications: number;
  openDisputes: number;
}

// ─── Main App ──────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // In production, these would be real API calls
      setStats({
        totalUsers: 1247,
        activeTrips: 89,
        totalLoads: 342,
        revenue: 1250000,
        pendingVerifications: 23,
        openDisputes: 5,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'loads', label: 'Loads', icon: Package },
    { id: 'trips', label: 'Trips', icon: Truck },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'tracking', label: 'Live Tracking', icon: MapPin },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="admin-app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <Truck size={28} />
            <span>FreightDispatch</span>
          </div>
          <div className="admin-badge">ADMIN PANEL</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-info">
            <div className="admin-avatar">A</div>
            <div>
              <div className="admin-name">Admin User</div>
              <div className="admin-email">admin@freight.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && <DashboardView stats={stats} loading={loading} />}
        {activeTab === 'users' && <UsersView />}
        {activeTab === 'loads' && <LoadsView />}
        {activeTab === 'trips' && <TripsView />}
        {activeTab === 'payments' && <PaymentsView />}
        {activeTab === 'disputes' && <DisputesView />}
        {activeTab === 'documents' && <DocumentsView />}
        {activeTab === 'tracking' && <TrackingView />}
        {activeTab === 'messages' && <MessagesView />}
        {activeTab === 'notifications' && <NotificationsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
};

// ─── Dashboard View ────────────────────────────────────────────────────────────

const DashboardView: React.FC<{ stats: AdminStats | null; loading: boolean }> = ({
  stats,
  loading,
}) => {
  if (loading) return <div className="loading">Loading dashboard...</div>;

  const cards = [
    { title: 'Total Users', value: stats?.totalUsers.toLocaleString() || '0', icon: Users, color: '#1B4F72', change: '+12%' },
    { title: 'Active Trips', value: stats?.activeTrips.toString() || '0', icon: Truck, color: '#27AE60', change: '+5%' },
    { title: 'Open Loads', value: stats?.totalLoads.toString() || '0', icon: Package, color: '#F39C12', change: '+8%' },
    { title: 'Revenue (MTD)', value: `$${(stats?.revenue || 0).toLocaleString()}`, icon: DollarSign, color: '#8E44AD', change: '+23%' },
  ];

  const alerts = [
    { type: 'warning', icon: Clock, title: 'Pending Verifications', count: stats?.pendingVerifications || 0, action: 'Review' },
    { type: 'danger', icon: AlertTriangle, title: 'Open Disputes', count: stats?.openDisputes || 0, action: 'Resolve' },
  ];

  return (
    <div className="view">
      <div className="view-header">
        <h1>Dashboard</h1>
        <p>Welcome back, Admin. Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="stat-card" style={{ borderLeftColor: card.color }}>
              <div className="stat-icon" style={{ backgroundColor: card.color + '15', color: card.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{card.value}</span>
                <span className="stat-title">{card.title}</span>
              </div>
              <span className="stat-change positive">{card.change}</span>
            </div>
          );
        })}
      </div>

      {/* Alerts & Recent Activity */}
      <div className="dashboard-row">
        <div className="card alerts-card">
          <h2>Attention Required</h2>
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div key={alert.title} className={`alert-item ${alert.type}`}>
                <Icon size={20} />
                <div className="alert-info">
                  <span className="alert-title">{alert.title}</span>
                  <span className="alert-count">{alert.count} items</span>
                </div>
                <button className="alert-action">{alert.action}</button>
              </div>
            );
          })}
        </div>

        <div className="card activity-card">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {[
              { user: 'John Doe', action: 'completed trip', time: '2 min ago', icon: CheckCircle, color: '#27AE60' },
              { user: 'ABC Shipping', action: 'posted new load', time: '15 min ago', icon: Package, color: '#F39C12' },
              { user: 'Sarah Wilson', action: 'submitted documents', time: '1 hr ago', icon: FileText, color: '#3498DB' },
              { user: 'Mike Johnson', action: 'raised dispute', time: '2 hr ago', icon: AlertTriangle, color: '#E74C3C' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="activity-item">
                  <div className="activity-avatar" style={{ backgroundColor: item.color + '20', color: item.color }}>
                    <Icon size={16} />
                  </div>
                  <div className="activity-details">
                    <span className="activity-text">
                      <strong>{item.user}</strong> {item.action}
                    </span>
                    <span className="activity-time">{item.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="card chart-card">
        <h2>Revenue Trend</h2>
        <div className="chart-placeholder">
          <BarChart3 size={48} />
          <p>Revenue chart visualization</p>
        </div>
      </div>
    </div>
  );
};

// ─── Users View ────────────────────────────────────────────────────────────────

const UsersView: React.FC = () => {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@truckco.com', role: 'carrier', status: 'active', rating: 4.8, joined: '2025-01-15' },
    { id: 2, name: 'ABC Shipping', email: 'contact@abc.com', role: 'shipper', status: 'active', rating: 4.9, joined: '2024-11-20' },
    { id: 3, name: 'Sarah Wilson', email: 'sarah@freight.net', role: 'carrier', status: 'pending', rating: 0, joined: '2025-03-01' },
    { id: 4, name: 'XYZ Logistics', email: 'admin@xyz.com', role: 'shipper', status: 'suspended', rating: 3.2, joined: '2024-08-10' },
  ];

  return (
    <div className="view">
      <div className="view-header">
        <h1>Users</h1>
        <button className="btn-primary">+ Add User</button>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <input type="text" placeholder="Search users..." className="search-input" />
          <select className="filter-select">
            <option value="">All Roles</option>
            <option value="carrier">Carrier</option>
            <option value="shipper">Shipper</option>
          </select>
          <select className="filter-select">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Rating</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td><span className={`badge ${user.role}`}>{user.role}</span></td>
                <td>
                  <span className={`status-dot ${user.status}`}>
                    {user.status === 'active' && <CheckCircle size={14} />}
                    {user.status === 'pending' && <Clock size={14} />}
                    {user.status === 'suspended' && <XCircle size={14} />}
                    {user.status}
                  </span>
                </td>
                <td>{user.rating > 0 ? `⭐ ${user.rating}` : 'N/A'}</td>
                <td>{new Date(user.joined).toLocaleDateString()}</td>
                <td>
                  <button className="btn-icon" title="Edit">✏️</button>
                  <button className="btn-icon" title="Suspend">⏸️</button>
                  <button className="btn-icon" title="Delete">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Loads View ────────────────────────────────────────────────────────────────

const LoadsView: React.FC = () => {
  const loads = [
    { id: 'LD-001', origin: 'Montreal, QC', destination: 'Toronto, ON', rate: 2500, status: 'posted', equipment: 'dry_van', shipper: 'ABC Shipping' },
    { id: 'LD-002', origin: 'Chicago, IL', destination: 'Detroit, MI', rate: 1800, status: 'assigned', equipment: 'reefer', shipper: 'Fresh Foods' },
    { id: 'LD-003', origin: 'New York, NY', destination: 'Boston, MA', rate: 1200, status: 'in_transit', equipment: 'flatbed', shipper: 'Construction Co' },
  ];

  return (
    <div className="view">
      <div className="view-header">
        <h1>Loads</h1>
        <button className="btn-primary">+ Post Load</button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Load ID</th>
              <th>Route</th>
              <th>Rate</th>
              <th>Equipment</th>
              <th>Shipper</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => (
              <tr key={load.id}>
                <td><strong>{load.id}</strong></td>
                <td>{load.origin} → {load.destination}</td>
                <td>${load.rate.toLocaleString()}</td>
                <td>{load.equipment.replace('_', ' ')}</td>
                <td>{load.shipper}</td>
                <td><span className={`badge ${load.status}`}>{load.status}</span></td>
                <td>
                  <button className="btn-icon">👁️</button>
                  <button className="btn-icon">✏️</button>
                  <button className="btn-icon">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Trips View ────────────────────────────────────────────────────────────────

const TripsView: React.FC = () => {
  const trips = [
    { id: 'TR-001', load: 'LD-001', carrier: 'John Doe', status: 'in_transit', progress: 65, eta: '2025-05-28 14:00' },
    { id: 'TR-002', load: 'LD-002', carrier: 'Sarah Wilson', status: 'at_pickup', progress: 20, eta: '2025-05-27 09:00' },
    { id: 'TR-003', load: 'LD-003', carrier: 'Mike Johnson', status: 'delivered', progress: 100, eta: '2025-05-26 16:00' },
  ];

  return (
    <div className="view">
      <div className="view-header">
        <h1>Trips</h1>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Load</th>
              <th>Carrier</th>
              <th>Status</th>
              <th>Progress</th>
              <th>ETA</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => (
              <tr key={trip.id}>
                <td><strong>{trip.id}</strong></td>
                <td>{trip.load}</td>
                <td>{trip.carrier}</td>
                <td><span className={`badge ${trip.status}`}>{trip.status.replace('_', ' ')}</span></td>
                <td>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${trip.progress}%` }} />
                    <span>{trip.progress}%</span>
                  </div>
                </td>
                <td>{trip.eta}</td>
                <td>
                  <button className="btn-icon">🗺️</button>
                  <button className="btn-icon">👁️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Payments View ─────────────────────────────────────────────────────────────

const PaymentsView: React.FC = () => {
  return (
    <div className="view">
      <div className="view-header">
        <h1>Payments</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: '#27AE60' }}>
          <div className="stat-icon" style={{ backgroundColor: '#27AE6015', color: '#27AE60' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">$45,230</span>
            <span className="stat-title">In Escrow</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#3498DB' }}>
          <div className="stat-icon" style={{ backgroundColor: '#3498DB15', color: '#3498DB' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">$12,450</span>
            <span className="stat-title">Pending Payouts</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#F39C12' }}>
          <div className="stat-icon" style={{ backgroundColor: '#F39C1215', color: '#F39C12' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">$892,100</span>
            <span className="stat-title">Total Processed</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Recent Transactions</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Trip</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'TXN-001', trip: 'TR-003', amount: 2500, status: 'released', date: '2025-05-26' },
              { id: 'TXN-002', trip: 'TR-001', amount: 3200, status: 'escrow', date: '2025-05-25' },
              { id: 'TXN-003', trip: 'TR-002', amount: 1800, status: 'pending', date: '2025-05-24' },
            ].map((txn) => (
              <tr key={txn.id}>
                <td><strong>{txn.id}</strong></td>
                <td>{txn.trip}</td>
                <td>${txn.amount.toLocaleString()}</td>
                <td><span className={`badge ${txn.status}`}>{txn.status}</span></td>
                <td>{txn.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Disputes View ─────────────────────────────────────────────────────────────

const DisputesView: React.FC = () => {
  const disputes = [
    { id: 'DP-001', trip: 'TR-003', reason: 'Damaged cargo', amount: 5000, status: 'open', filed: '2025-05-26', priority: 'high' },
    { id: 'DP-002', trip: 'TR-015', reason: 'Late delivery', amount: 1200, status: 'investigating', filed: '2025-05-25', priority: 'medium' },
  ];

  return (
    <div className="view">
      <div className="view-header">
        <h1>Disputes</h1>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Dispute ID</th>
              <th>Trip</th>
              <th>Reason</th>
              <th>Amount</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((dispute) => (
              <tr key={dispute.id}>
                <td><strong>{dispute.id}</strong></td>
                <td>{dispute.trip}</td>
                <td>{dispute.reason}</td>
                <td>${dispute.amount.toLocaleString()}</td>
                <td><span className={`priority ${dispute.priority}`}>{dispute.priority}</span></td>
                <td><span className={`badge ${dispute.status}`}>{dispute.status}</span></td>
                <td>
                  <button className="btn-primary btn-sm">Review</button>
                  <button className="btn-secondary btn-sm">Resolve</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Documents View ─────────────────────────────────────────────────────────────

const DocumentsView: React.FC = () => {
  const documents = [
    { id: 'DOC-001', user: 'John Doe', type: 'insurance', status: 'pending', uploaded: '2025-05-26' },
    { id: 'DOC-002', user: 'Sarah Wilson', type: 'license', status: 'pending', uploaded: '2025-05-25' },
    { id: 'DOC-003', user: 'Mike Johnson', type: 'dot_number', status: 'verified', uploaded: '2025-05-20' },
  ];

  return (
    <div className="view">
      <div className="view-header">
        <h1>Documents</h1>
        <p>Review and verify user-submitted documents</p>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Doc ID</th>
              <th>User</th>
              <th>Type</th>
              <th>Uploaded</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td><strong>{doc.id}</strong></td>
                <td>{doc.user}</td>
                <td>{doc.type.replace('_', ' ')}</td>
                <td>{doc.uploaded}</td>
                <td><span className={`badge ${doc.status}`}>{doc.status}</span></td>
                <td>
                  <button className="btn-icon" title="View">👁️</button>
                  {doc.status === 'pending' && (
                    <>
                      <button className="btn-icon" title="Verify" style={{ color: '#27AE60' }}>✅</button>
                      <button className="btn-icon" title="Reject" style={{ color: '#E74C3C' }}>❌</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Tracking View (Live Map) ──────────────────────────────────────────────────

const TrackingView: React.FC = () => {
  return (
    <div className="view">
      <div className="view-header">
        <h1>Live Tracking</h1>
        <p>Real-time location of all active trips</p>
      </div>

      <div className="card">
        <div className="map-placeholder">
          <MapPin size={48} />
          <p>Interactive map would render here</p>
          <small>Showing 89 active trips across North America</small>
        </div>
      </div>

      <div className="card">
        <h2>Active Fleet</h2>
        <div className="fleet-grid">
          {[
            { id: 'TR-001', driver: 'John Doe', location: 'I-90, NY', speed: 65, status: 'on_route' },
            { id: 'TR-002', driver: 'Sarah Wilson', location: 'I-75, FL', speed: 0, status: 'at_stop' },
            { id: 'TR-003', driver: 'Mike Johnson', location: 'I-5, CA', speed: 55, status: 'on_route' },
          ].map((vehicle) => (
            <div key={vehicle.id} className="fleet-card">
              <div className="fleet-header">
                <Truck size={20} />
                <span className="fleet-id">{vehicle.id}</span>
              </div>
              <div className="fleet-info">
                <span>{vehicle.driver}</span>
                <span>{vehicle.location}</span>
                <span>Speed: {vehicle.speed} mph</span>
              </div>
              <span className={`fleet-status ${vehicle.status}`}>{vehicle.status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Messages View ─────────────────────────────────────────────────────────────

const MessagesView: React.FC = () => {
  return (
    <div className="view">
      <div className="view-header">
        <h1>Messages</h1>
        <p>Platform-wide communications and support</p>
      </div>

      <div className="card">
        <div className="messages-placeholder">
          <MessageSquare size={48} />
          <p>Support conversations and platform announcements</p>
        </div>
      </div>
    </div>
  );
};

// ─── Notifications View ────────────────────────────────────────────────────────

const NotificationsView: React.FC = () => {
  return (
    <div className="view">
      <div className="view-header">
        <h1>Notifications</h1>
        <p>System-wide notification management</p>
      </div>

      <div className="card">
        <h2>Send Broadcast</h2>
        <div className="broadcast-form">
          <select className="form-input">
            <option>All Users</option>
            <option>All Carriers</option>
            <option>All Shippers</option>
          </select>
          <input type="text" placeholder="Notification title" className="form-input" />
          <textarea placeholder="Message content..." className="form-input" rows={4} />
          <button className="btn-primary">Send Notification</button>
        </div>
      </div>
    </div>
  );
};

// ─── Settings View ─────────────────────────────────────────────────────────────

const SettingsView: React.FC = () => {
  return (
    <div className="view">
      <div className="view-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-grid">
        <div className="card">
          <h2>Platform Settings</h2>
          <div className="setting-row">
            <label>Platform Fee (%)</label>
            <input type="number" defaultValue={5} className="form-input" />
          </div>
          <div className="setting-row">
            <label>Escrow Release Delay (days)</label>
            <input type="number" defaultValue={3} className="form-input" />
          </div>
          <div className="setting-row">
            <label>Max Loads per Shipper</label>
            <input type="number" defaultValue={50} className="form-input" />
          </div>
          <button className="btn-primary">Save Changes</button>
        </div>

        <div className="card">
          <h2>Feature Flags</h2>
          <div className="setting-row">
            <label>Enable Bidding</label>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="setting-row">
            <label>Enable Live Tracking</label>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="setting-row">
            <label>Enable Disputes</label>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="setting-row">
            <label>Maintenance Mode</label>
            <input type="checkbox" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
