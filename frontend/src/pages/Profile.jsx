import { useState } from 'react';
import { User, Save, Mail, AtSign } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/client';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ full_name: user?.full_name || '', email: user?.email || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateProfile(form);
      setUser(res.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally { setLoading(false); }
  };

  const initials = (user?.full_name || user?.username || '?').split(' ').map((s) => s[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Layout title="Profile">
      <div className="max-w-2xl space-y-4 lg:space-y-6">
        {/* Profile card */}
        <div className="glass-card">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-oracle-500 to-cyan-600 flex items-center justify-center text-2xl font-bold shadow-[0_8px_24px_-4px_rgba(6,182,212,0.3)] shrink-0">
              {initials}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-surface-100">{user?.full_name || user?.username}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-surface-400">
                  <AtSign className="w-3.5 h-3.5" />@{user?.username}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-surface-400">
                  <Mail className="w-3.5 h-3.5" />{user?.email}
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-2">Member since registration</p>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-400/10">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-oracle-500/20 to-cyan-600/10 border border-oracle-500/10">
              <User className="w-5 h-5 text-oracle-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-surface-100">Edit Profile</h3>
              <p className="text-xs text-surface-400">Update your personal information</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Full name</label>
              <input className="input-field" placeholder="Your full name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input type="email" className="input-field" placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
