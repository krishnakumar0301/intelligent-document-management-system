import { useEffect, useState } from 'react';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { getSettings, updateSettings, listRules, createRule, deleteRule } from '../api/client';
import { SkeletonCard } from '../components/ui/LoadingSpinner';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRule, setNewRule] = useState({ name: '', extension_pattern: '', category: '', target_folder: '' });

  const load = () => {
    Promise.all([getSettings(), listRules()])
      .then(([s, r]) => { setSettings(s.data); setRules(r.data); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const saveSettings = async (updates) => {
    try {
      const res = await updateSettings(updates);
      setSettings(res.data);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); }
  };

  const handleAddRule = async () => {
    try {
      await createRule(newRule);
      setNewRule({ name: '', extension_pattern: '', category: '', target_folder: '' });
      load();
      toast.success('Rule added');
    } catch { toast.error('Failed to add rule'); }
  };

  if (loading) return <Layout title="Settings"><div className="space-y-4"><SkeletonCard lines={3} /><SkeletonCard lines={3} /></div></Layout>;

  return (
    <Layout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Preferences */}
        <div className="glass-card space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-400/10">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-oracle-500/20 to-cyan-600/10 border border-oracle-500/10">
              <Settings2 className="w-5 h-5 text-oracle-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-surface-100">Preferences</h3>
              <p className="text-xs text-surface-400">Application settings</p>
            </div>
          </div>

          <div>
            <label className="input-label">Default scan path</label>
            <input className="input-field" placeholder="e.g. C:\Users\You\Documents"
              value={settings?.scan_path || ''}
              onChange={(e) => setSettings({ ...settings, scan_path: e.target.value })}
              onBlur={() => saveSettings({ scan_path: settings.scan_path })}
            />
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <p className="text-sm text-surface-200 group-hover:text-surface-100 transition-colors">Auto-organize on scan</p>
                <p className="text-2xs text-surface-500">Automatically organize files after scanning</p>
              </div>
              <div className={`toggle ${settings?.auto_organize ? 'active' : ''}`} onClick={() => saveSettings({ auto_organize: !settings?.auto_organize })}>
                <span className="toggle-handle" />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <p className="text-sm text-surface-200 group-hover:text-surface-100 transition-colors">Real-time file watcher</p>
                <p className="text-2xs text-surface-500">Watch for new files automatically</p>
              </div>
              <div className={`toggle ${settings?.watcher_enabled ? 'active' : ''}`} onClick={() => saveSettings({ watcher_enabled: !settings?.watcher_enabled })}>
                <span className="toggle-handle" />
              </div>
            </label>
          </div>
        </div>

        {/* Rules */}
        <div className="glass-card space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-400/10">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/10">
              <Plus className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-surface-100">Custom Rules</h3>
              <p className="text-xs text-surface-400">Override AI classification per extension</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <input className="input-field" placeholder="Rule name" value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
            <input className="input-field" placeholder="Extensions (e.g. py,js)" value={newRule.extension_pattern}
              onChange={(e) => setNewRule({ ...newRule, extension_pattern: e.target.value })} />
            <input className="input-field" placeholder="Target folder name" value={newRule.target_folder}
              onChange={(e) => setNewRule({ ...newRule, target_folder: e.target.value })} />
            <button className="btn-primary w-full" onClick={handleAddRule} disabled={!newRule.name || !newRule.target_folder}>
              <Plus className="w-4 h-4" /> Add Rule
            </button>
          </div>

          <div className="divider" />

          <div className="space-y-1">
            {rules.length === 0 ? (
              <p className="text-xs text-surface-500 py-4 text-center">No custom rules yet</p>
            ) : (
              rules.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-800/40 border border-surface-400/5 text-sm group">
                  <div className="space-y-0.5">
                    <p className="text-surface-200">{r.name}</p>
                    <p className="text-2xs text-surface-500">{r.extension_pattern} → <span className="text-oracle-400">{r.target_folder}</span></p>
                  </div>
                  <button className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100" onClick={() => deleteRule(r.id).then(load)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
