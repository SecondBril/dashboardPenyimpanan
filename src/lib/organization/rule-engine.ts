import { OrganizationRule, UnifiedFile } from '../storage/types';
import { DEFAULT_ACCOUNTS } from '../storage/factory';

// Default starter rules per PRD Addendum §6
const DEFAULT_RULES: OrganizationRule[] = [
  {
    id: 'rule_1',
    name: 'Auto-route Foto & Gambar ke Google Drive Media',
    conditionType: 'mime_type',
    conditionValue: 'image/',
    targetAccountId: 'a0000000-0000-0000-0000-000000000002', // Google Drive B (Media)
    targetAccountLabel: 'Google Drive B (Media)',
    targetFolderId: 'gdb_fld_1',
    targetFolderName: 'Foto Dokumentasi PKL',
    enabled: true,
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'rule_2',
    name: 'Auto-route Invoice & Tagihan ke Google Drive Utama',
    conditionType: 'filename_keyword',
    conditionValue: 'invoice,tagihan,receipt,pembayaran',
    targetAccountId: 'a0000000-0000-0000-0000-000000000001', // Google Drive A (Utama)
    targetAccountLabel: 'Google Drive A (Utama)',
    targetFolderId: 'gda_fld_2',
    targetFolderName: 'Keuangan & Invoice',
    enabled: true,
    createdAt: '2026-09-02T00:00:00Z',
  },
  {
    id: 'rule_3',
    name: 'Auto-route File Backup & Zip ke Google Drive Arsip',
    conditionType: 'extension',
    conditionValue: 'zip,tar,gz,sql,bak',
    targetAccountId: 'a0000000-0000-0000-0000-000000000003', // Google Drive C (Arsip)
    targetAccountLabel: 'Google Drive C (Arsip)',
    targetFolderId: 'gdc_fld_1',
    targetFolderName: 'Database Backups 2026',
    enabled: true,
    createdAt: '2026-09-03T00:00:00Z',
  },
  {
    id: 'rule_4',
    name: 'Auto-route Sertifikat & Dokumen Resmi ke OneDrive Pribadi',
    conditionType: 'filename_keyword',
    conditionValue: 'sertifikat,certificate,kontrak,ijazah',
    targetAccountId: 'a0000000-0000-0000-0000-000000000004', // OneDrive D
    targetAccountLabel: 'OneDrive D (Pribadi)',
    targetFolderId: 'odd_fld_1',
    targetFolderName: 'Dokumen Penting & Sertifikat',
    enabled: true,
    createdAt: '2026-09-04T00:00:00Z',
  },
];

declare global {
  var __orgRulesStore: OrganizationRule[] | undefined;
}

function getRulesStore(): OrganizationRule[] {
  if (!global.__orgRulesStore) {
    global.__orgRulesStore = [...DEFAULT_RULES];
  }
  return global.__orgRulesStore;
}

export class RuleEngine {
  public static getRules(): OrganizationRule[] {
    return getRulesStore();
  }

  public static addRule(rule: Omit<OrganizationRule, 'id' | 'createdAt' | 'targetAccountLabel'>): OrganizationRule {
    const acc = DEFAULT_ACCOUNTS.find((a) => a.id === rule.targetAccountId);
    const newRule: OrganizationRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetAccountLabel: acc?.label || 'Target Account',
      createdAt: new Date().toISOString(),
    };
    getRulesStore().push(newRule);
    return newRule;
  }

  public static updateRule(id: string, updates: Partial<OrganizationRule>): OrganizationRule | null {
    const store = getRulesStore();
    const index = store.findIndex((r) => r.id === id);
    if (index === -1) return null;
    store[index] = { ...store[index], ...updates };
    return store[index];
  }

  public static deleteRule(id: string): boolean {
    const store = getRulesStore();
    const index = store.findIndex((r) => r.id === id);
    if (index === -1) return false;
    store.splice(index, 1);
    return true;
  }

  /**
   * Evaluates if a given file matches any active rule
   */
  public static matchFile(file: UnifiedFile): OrganizationRule | null {
    if (file.isFolder) return null; // Don't auto-move entire root folders

    const rules = getRulesStore().filter((r) => r.enabled);

    for (const rule of rules) {
      // If rule is restricted to a specific source folder
      if (rule.sourceFolderFilter && file.parentId !== rule.sourceFolderFilter) {
        continue;
      }

      // Check condition
      if (rule.conditionType === 'mime_type') {
        const patterns = rule.conditionValue.toLowerCase().split(',').map((p) => p.trim());
        const matched = patterns.some((pat) => file.mimeType.toLowerCase().includes(pat));
        if (matched) return rule;
      } else if (rule.conditionType === 'filename_keyword') {
        const keywords = rule.conditionValue.toLowerCase().split(',').map((k) => k.trim());
        const fileNameLower = file.name.toLowerCase();
        const matched = keywords.some((kw) => fileNameLower.includes(kw));
        if (matched) return rule;
      } else if (rule.conditionType === 'extension') {
        const exts = rule.conditionValue.toLowerCase().split(',').map((e) => e.trim().replace(/^\./, ''));
        const fileExt = (file.extension || file.name.split('.').pop() || '').toLowerCase();
        if (exts.includes(fileExt)) return rule;
      }
    }

    return null;
  }
}
