import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderSearch,
  Copy,
  Search,
  MessageSquare,
  BarChart3,
  Trash2,
  Settings,
  User,
  LogOut,
  Sparkles,
  Image,
  Video,
  Music,
  FileText,
  Archive,
  Table,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listCategories } from '../../api/client';

const iconMap = {
  images: Image,
  videos: Video,
  audio: Music,
  documents: FileText,
  spreadsheets: Table,
  archives: Archive,
  code: FileText,
  Others: FileText,
};

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/organizer', icon: FolderSearch, label: 'Organizer' },
  { to: '/duplicates', icon: Copy, label: 'Duplicates' },
  { to: '/search', icon: Search, label: 'AI Search' },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { to: '/files', icon: Sparkles, label: 'All Files' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/recycle', icon: Trash2, label: 'Recycle Bin' },
];

const bottomItems = [
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [expandedCat, setExpandedCat] = useState(null);

  useEffect(() => {
    listCategories()
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  const toggleCat = (cat) => {
    setExpandedCat(expandedCat === cat ? null : cat);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-72 min-h-screen flex flex-col bg-surface-900/80 backdrop-blur-2xl border-r border-surface-400/10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-400/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-oracle-500 to-cyan-600 flex items-center justify-center text-base font-bold shadow-[0_4px_16px_-4px_rgba(6,182,212,0.3)]">
              FO
            </div>
            <div>
              <h1 className="font-bold text-base text-surface-100">FileOracle</h1>
              <p className="text-2xs text-surface-400">AI File Organizer</p>
            </div>
          </div>
          {onClose && (
            <button className="btn-icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-custom">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-oracle-500/15 to-cyan-500/5 text-oracle-300 border border-oracle-500/10 shadow-[0_1px_8px_-4px_rgba(6,182,212,0.15)]'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/40'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}

        {/* Category browser */}
        <div className="pt-4 mt-4 border-t border-surface-400/10">
          <p className="text-2xs font-semibold text-surface-500 uppercase tracking-widest px-3.5 mb-2">
            Categories
          </p>
          {categories.map((cat) => {
            const CatIcon = iconMap[cat.category] || FileText;
            const hasSubs = cat.subcategories?.filter((s) => s !== 'Others').length > 0;
            const isExpanded = expandedCat === cat.category;
            const isActive = false; // We don't nav-link categories directly
            return (
              <div key={cat.category}>
                <button
                  onClick={() => hasSubs && toggleCat(cat.category)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm transition-all duration-200 ${
                    isActive
                      ? 'text-oracle-300 bg-oracle-500/10'
                      : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/40'
                  }`}
                >
                  <CatIcon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  <span className="capitalize truncate">{cat.category}</span>
                  <span className="ml-auto text-2xs text-surface-500 font-mono tabular-nums">{cat.count}</span>
                  {hasSubs && (
                    <span className="text-surface-500">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                  )}
                </button>
                {isExpanded && hasSubs && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-surface-400/10 pl-3">
                    {cat.subcategories.filter((s) => s !== 'Others').map((sub) => (
                      <NavLink
                        key={sub}
                        to={`/files?category=${cat.category}&subcategory=${sub}`}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `block px-3.5 py-1.5 rounded-lg text-xs transition-colors duration-200 ${
                            isActive
                              ? 'text-oracle-300 bg-oracle-500/10'
                              : 'text-surface-500 hover:text-surface-300'
                          }`
                        }
                      >
                        {sub.replace(/_/g, ' ')}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-surface-400/10 space-y-1">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-oracle-500/15 to-cyan-500/5 text-oracle-300 border border-oracle-500/10'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/40'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 shrink-0" strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="pt-2 mt-2 border-t border-surface-400/10">
          <div className="flex items-center gap-3 px-3.5 py-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-oracle-500/30 to-cyan-600/20 border border-surface-400/10 flex items-center justify-center text-xs font-bold text-oracle-300">
              {user?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-surface-300 truncate">{user?.username || 'User'}</p>
              <p className="text-2xs text-surface-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" strokeWidth={1.75} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
