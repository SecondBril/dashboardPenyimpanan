'use client';

import React, { useState, useEffect } from 'react';
import { 
  OrganizationRule, 
  ClassificationJob, 
  SystemSettings, 
  ConditionType 
} from '@/lib/storage/types';
import { formatDate } from '@/lib/utils';
import { 
  X, 
  Sparkles, 
  Sliders, 
  RotateCcw, 
  Check, 
  Plus, 
  Trash2, 
  SlidersHorizontal,
  Bot,
  FileCheck2,
  HelpCircle,
  Loader2
} from 'lucide-react';

interface SmartOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

export const SmartOrganizationModal: React.FC<SmartOrganizationModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'settings' | 'history'>('rules');
  const [rules, setRules] = useState<OrganizationRule[]>([]);
  const [jobs, setJobs] = useState<ClassificationJob[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    autoMoveThreshold: 0.85,
    suggestThreshold: 0.50,
    excludedFolders: [],
    notificationChannels: ['in_app', 'telegram'],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New Rule Form State
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newConditionType, setNewConditionType] = useState<ConditionType>('mime_type');
  const [newConditionValue, setNewConditionValue] = useState('');
  const [newTargetAccount, setNewTargetAccount] = useState('a0000000-0000-0000-0000-000000000001');
  const [newTargetFolder, setNewTargetFolder] = useState('gda_fld_1');
  const [newTargetFolderName, setNewTargetFolderName] = useState('Dokumen Proyek PKL');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rulesRes, jobsRes, settingsRes] = await Promise.all([
        fetch('/api/v1/organization/rules'),
        fetch('/api/v1/organization/jobs'),
        fetch('/api/v1/organization/settings'),
      ]);

      if (rulesRes.ok) {
        const d = await rulesRes.json();
        setRules(d.rules || []);
      }
      if (jobsRes.ok) {
        const d = await jobsRes.json();
        setJobs(d.jobs || []);
      }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        if (d.settings) setSettings(d.settings);
      }
    } catch (err) {
      console.error('Failed to load organization data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newConditionValue.trim()) return;

    try {
      const res = await fetch('/api/v1/organization/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRuleName.trim(),
          conditionType: newConditionType,
          conditionValue: newConditionValue.trim(),
          targetAccountId: newTargetAccount,
          targetFolderId: newTargetFolder,
          targetFolderName: newTargetFolderName,
        }),
      });

      if (res.ok) {
        setIsAddingRule(false);
        setNewRuleName('');
        setNewConditionValue('');
        loadData();
      }
    } catch (err) {
      console.error('Failed to create rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await fetch(`/api/v1/organization/rules/${ruleId}`, { method: 'DELETE' });
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleToggleRule = async (rule: OrganizationRule) => {
    try {
      const updated = !rule.enabled;
      await fetch(`/api/v1/organization/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: updated }),
      });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: updated } : r))
      );
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await fetch('/api/v1/organization/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      alert('Pengaturan threshold berhasil disimpan!');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleUndo = async (jobId: string) => {
    setActionLoadingId(jobId);
    try {
      const res = await fetch(`/api/v1/organization/jobs/${jobId}/undo`, {
        method: 'POST',
      });
      if (res.ok) {
        loadData();
        onRefreshData();
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal melakukan undo');
      }
    } catch (err) {
      console.error('Undo failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApprove = async (jobId: string) => {
    setActionLoadingId(jobId);
    try {
      const res = await fetch(`/api/v1/organization/jobs/${jobId}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        loadData();
        onRefreshData();
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal menyetujui saran');
      }
    } catch (err) {
      console.error('Approve failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl glass-panel border border-white/15 bg-slate-900/98 p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 p-0.5 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <div className="h-full w-full bg-slate-950/80 rounded-[10px] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-pink-400" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Smart Auto-Organization Hub</h3>
              <p className="text-xs text-slate-400">
                Otomatisasi pengelompokan file berbasis Rule Deterministik & Gemini AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pt-3 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'rules'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Aturan Rule Engine ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Threshold AI & Pengaturan
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Riwayat Auto-Move & Undo ({jobs.length})
          </button>
        </div>

        {/* Tab 1: Rules Engine */}
        {activeTab === 'rules' && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Aturan deterministik dievaluasi terlebih dahulu (hemat kuota & instan).
              </p>
              <button
                onClick={() => setIsAddingRule(!isAddingRule)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Aturan</span>
              </button>
            </div>

            {/* Form Add Rule */}
            {isAddingRule && (
              <form onSubmit={handleCreateRule} className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/30 space-y-3">
                <h4 className="text-xs font-bold text-purple-300">Konfigurasi Aturan Baru</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Nama Aturan:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pisahkan Dokumen Kontrak"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Tipe Kondisi:</label>
                    <select
                      value={newConditionType}
                      onChange={(e) => setNewConditionType(e.target.value as ConditionType)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="mime_type">MIME Type (mis. image/, application/pdf)</option>
                      <option value="filename_keyword">Kata Kunci Nama File (mis. invoice, tagihan)</option>
                      <option value="extension">Ekstensi File (mis. zip, pdf, png)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Nilai Kondisi (Pisahkan koma):</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: invoice, tagihan, kwitansi"
                    value={newConditionValue}
                    onChange={(e) => setNewConditionValue(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingRule(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500"
                  >
                    Simpan Aturan
                  </button>
                </div>
              </form>
            )}

            {/* List Rules */}
            <div className="space-y-2.5">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    rule.enabled
                      ? 'bg-slate-950/60 border-white/10'
                      : 'bg-slate-950/20 border-white/5 opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white">{rule.name}</span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {rule.conditionType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Jika cocok <code className="text-cyan-300">"{rule.conditionValue}"</code> ➔ Pindahkan ke folder{' '}
                      <span className="text-purple-300 font-medium">{rule.targetFolderName}</span> ({rule.targetAccountLabel})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleRule(rule)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                        rule.enabled
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-white/10'
                      }`}
                    >
                      {rule.enabled ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Hapus Aturan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Settings & Threshold */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
                Ambang Batas Skor Confidence AI (Gemini)
              </h4>
              <p className="text-xs text-slate-400">
                Sesuai PRD Addendum §10, confidence dimulai tinggi (0.85) untuk mencegah salah klasifikasi.
              </p>

              {/* Slider Auto Move */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Auto-Move Threshold:</span>
                  <span className="text-cyan-400 font-bold">{Math.round(settings.autoMoveThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.05"
                  value={settings.autoMoveThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, autoMoveThreshold: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400"
                />
                <p className="text-[10px] text-slate-500">
                  File dengan skor di atas ambang batas ini langsung dipindahkan otomatis dengan opsi Undo.
                </p>
              </div>

              {/* Slider Suggestion */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Suggestion Threshold:</span>
                  <span className="text-indigo-400 font-bold">{Math.round(settings.suggestThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="0.8"
                  step="0.05"
                  value={settings.suggestThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, suggestThreshold: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-400"
                />
                <p className="text-[10px] text-slate-500">
                  File di antara Suggestion dan Auto-Move akan memicu notifikasi "Saran Pindah" (menunggu persetujuan).
                </p>
              </div>
            </div>

            {/* AI Engine Status */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="h-6 w-6 text-purple-400" />
                <div>
                  <h5 className="text-xs font-bold text-white">Google Gemini API Classifier</h5>
                  <p className="text-[11px] text-slate-400">
                    Model: Gemini 1.5 Flash (Free Tier Developer via Google AI Studio)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Ready / Active
              </span>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: History & Undo */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            <p className="text-xs text-slate-400 mb-2">
              Setiap pemindahan otomatis dicatat di sini. Anda dapat membatalkan (Undo) kapan saja untuk mengembalikan file ke akun & folder asalnya.
            </p>

            {jobs.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Belum ada aktivitas klasifikasi.
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3.5 rounded-xl glass-panel border border-white/10 bg-slate-950/60 shadow-md flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-bold text-white truncate" title={job.fileName}>
                        {job.fileName}
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                        {job.method === 'rule' ? 'By Rule' : 'By AI'} ({Math.round(job.confidence * 100)}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tujuan: <span className="text-cyan-300 font-medium">{job.predictedTargetFolderName}</span> ({job.predictedTargetAccountLabel})
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(job.createdAt)}</p>
                  </div>

                  {/* Actions: Undo / Approve / Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {job.action === 'undone' ? (
                      <span className="text-[11px] text-slate-500 italic">Sudah di-Undo</span>
                    ) : job.action === 'auto_moved' ? (
                      <button
                        onClick={() => handleUndo(job.id)}
                        disabled={actionLoadingId === job.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 transition-all active:scale-95"
                      >
                        {actionLoadingId === job.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        <span>Undo</span>
                      </button>
                    ) : job.action === 'suggested' ? (
                      <button
                        onClick={() => handleApprove(job.id)}
                        disabled={actionLoadingId === job.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all active:scale-95"
                      >
                        {actionLoadingId === job.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        <span>Setujui</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500">Diabaikan</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
};
