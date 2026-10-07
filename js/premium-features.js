/* RODO Premium Features — V1
 * Explicit integration layer for purchased, optional section extensions.
 * Ownership and activation are controlled by Store V4; this module only implements
 * the behavior that appears when a feature is active.
 */
(() => {
    'use strict';

    const FEATURE = Object.freeze({
        JOURNAL_FOLDERS: 'feature_journal_folders',
        ADVANCED_STATS: 'feature_advanced_stats',
        FOCUS_PRESETS: 'feature_focus_presets',
        GOAL_MILESTONES: 'feature_goal_milestones'
    });

    const FEATURE_LIMITS = Object.freeze({
        journalFolderName: 80,
        focusPresetName: 80,
        milestoneName: 100
    });

    const safeParse = (value, fallback) => {
        try { return JSON.parse(value); } catch { return fallback; }
    };

    const ensureStoreFeatureState = () => {
        if (typeof state === 'undefined') return null;
        if (!state.store || typeof state.store !== 'object' || Array.isArray(state.store)) state.store = {};
        if (!state.store.v4Features || typeof state.store.v4Features !== 'object' || Array.isArray(state.store.v4Features)) {
            state.store.v4Features = {};
        }
        const f = state.store.v4Features;
        if (!Array.isArray(f.owned)) f.owned = [];
        if (!Array.isArray(f.active)) f.active = [];
        if (!f.data || typeof f.data !== 'object' || Array.isArray(f.data)) f.data = {};
        return f;
    };

    const isActive = (id) => {
        const f = ensureStoreFeatureState();
        return Boolean(f && f.active.includes(id));
    };

    const ensureData = () => {
        const f = ensureStoreFeatureState();
        if (!f) return null;
        if (!f.data.journalFolders || typeof f.data.journalFolders !== 'object' || Array.isArray(f.data.journalFolders)) {
            f.data.journalFolders = { folders: [] };
        }
        if (!Array.isArray(f.data.journalFolders.folders)) f.data.journalFolders.folders = [];
        if (!f.data.focusPresets || typeof f.data.focusPresets !== 'object' || Array.isArray(f.data.focusPresets)) {
            f.data.focusPresets = { presets: [] };
        }
        if (!Array.isArray(f.data.focusPresets.presets)) f.data.focusPresets.presets = [];
        if (!f.data.goalMilestones || typeof f.data.goalMilestones !== 'object' || Array.isArray(f.data.goalMilestones)) {
            f.data.goalMilestones = {};
        }
        return f.data;
    };

    const escape = (value) => typeof escapeHTML === 'function' ? escapeHTML(value) : String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const id = () => String(typeof createEntityId === 'function' ? createEntityId() : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

    const toast = (message, type = 'info') => {
        if (typeof showToast === 'function') showToast(message, type);
    };

    const getJournals = () => {
        if (typeof state === 'undefined') return [];
        if (!Array.isArray(state.journals)) state.journals = [];
        return state.journals;
    };

    const getFolders = () => ensureData()?.journalFolders?.folders || [];

    const normalizeFolderData = () => {
        const folders = getFolders();
        const seen = new Set();
        const valid = [];
        folders.forEach(folder => {
            if (!folder || typeof folder !== 'object') return;
            const folderId = String(folder.id || '');
            const name = String(folder.name || '').trim().slice(0, FEATURE_LIMITS.journalFolderName);
            if (!folderId || !name || seen.has(folderId)) return;
            seen.add(folderId);
            valid.push({ id: folderId, name, createdAt: Number(folder.createdAt) || Date.now() });
        });
        const data = ensureData();
        if (data) data.journalFolders.folders = valid;
        const validIds = new Set(valid.map(folder => folder.id));
        getJournals().forEach(entry => {
            if (entry.folderId && !validIds.has(String(entry.folderId))) delete entry.folderId;
        });
        return valid;
    };

    const createFolder = (rawName) => {
        const name = String(rawName || '').trim().slice(0, FEATURE_LIMITS.journalFolderName);
        if (!name) return null;
        const data = ensureData();
        const folder = { id: id(), name, createdAt: Date.now() };
        data.journalFolders.folders.push(folder);
        if (typeof saveState === 'function') saveState();
        return folder;
    };

    const folderById = (folderId) => getFolders().find(folder => String(folder.id) === String(folderId)) || null;

    const assignEntryToFolder = (entryId, folderId = null) => {
        const entry = getJournals().find(item => String(item.id) === String(entryId));
        if (!entry) return false;
        if (folderId && !folderById(folderId)) return false;
        if (folderId) entry.folderId = String(folderId);
        else delete entry.folderId;
        if (typeof saveState === 'function') saveState();
        if (window.RODOJournal?.render) window.RODOJournal.render();
        if (window.RODOJournal?.openReader) window.RODOJournal.openReader(entry);
        return true;
    };

    const getFolderNoteCount = (folderId) => getJournals().filter(entry => String(entry.folderId || '') === String(folderId)).length;

    const closeFolderDialog = () => {
        const dialog = document.getElementById('rodo-journal-folder-dialog');
        if (!dialog) return;
        dialog.classList.add('is-closing');
        window.setTimeout(() => dialog.remove(), 170);
    };

    const ensureFolderDialog = () => {
        let dialog = document.getElementById('rodo-journal-folder-dialog');
        if (dialog) return dialog;
        dialog = document.createElement('div');
        dialog.id = 'rodo-journal-folder-dialog';
        dialog.className = 'rodo-journal-folder-dialog hidden';
        dialog.setAttribute('aria-hidden', 'true');
        dialog.innerHTML = `
            <div class="rodo-journal-folder-dialog-backdrop" data-premium-folder-close></div>
            <section class="rodo-journal-folder-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="rodo-journal-folder-dialog-title">
                <header class="rodo-journal-folder-dialog-head">
                    <div>
                        <span class="rodo-journal-dialog-kicker">تنظيم</span>
                        <h3 id="rodo-journal-folder-dialog-title">مجلدات يومياتك</h3>
                        <p id="rodo-journal-folder-dialog-description"></p>
                    </div>
                    <button type="button" class="rodo-journal-icon-button" data-premium-folder-close aria-label="إغلاق">
                        <i data-lucide="x" aria-hidden="true"></i>
                    </button>
                </header>
                <div id="rodo-journal-folder-dialog-body" class="rodo-journal-folder-dialog-body"></div>
            </section>
        `;
        document.body.appendChild(dialog);
        return dialog;
    };

    const openFolderDialog = ({ title, description = '', body }) => {
        const dialog = ensureFolderDialog();
        dialog.querySelector('#rodo-journal-folder-dialog-title').textContent = title;
        dialog.querySelector('#rodo-journal-folder-dialog-description').textContent = description;
        const bodyEl = dialog.querySelector('#rodo-journal-folder-dialog-body');
        bodyEl.innerHTML = body;
        dialog.classList.remove('hidden', 'is-closing');
        dialog.setAttribute('aria-hidden', 'false');
        if (window.lucide?.createIcons) window.lucide.createIcons({ root: dialog });
        window.setTimeout(() => bodyEl.querySelector('input,button')?.focus(), 0);
        return dialog;
    };

    const renderFolderFilter = () => {
        if (!isActive(FEATURE.JOURNAL_FOLDERS)) return;
        const shell = document.querySelector('#view-journal .rodo-journal-shell');
        const toolbar = shell?.querySelector('.rodo-journal-toolbar');
        if (!shell || !toolbar) return;
        let panel = document.getElementById('rodo-journal-folders');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'rodo-journal-folders';
            panel.className = 'rodo-journal-folders-panel';
            toolbar.insertAdjacentElement('afterend', panel);
        }
        const folders = normalizeFolderData();
        const current = document.getElementById('journal-folder-filter')?.value || 'all';
        panel.innerHTML = `
            <div class="rodo-journal-folders-head">
                <div>
                    <span>تنظيم</span>
                    <strong>مجلداتك</strong>
                </div>
                <div class="rodo-journal-folder-actions">
                    ${folders.length ? `<button type="button" class="rodo-journal-folder-manage" data-premium-folder-manage>إدارة</button>` : ''}
                    <button type="button" class="rodo-journal-folder-add" data-premium-folder-create><span>+</span> فولدر جديد</button>
                </div>
            </div>
            <select id="journal-folder-filter" class="rodo-journal-folder-filter-native" aria-label="تصفية اليوميات حسب الفولدر">
                <option value="all">كل اليوميات</option>
                ${folders.map(folder => `<option value="${escape(folder.id)}">${escape(folder.name)}</option>`).join('')}
            </select>
            <div class="rodo-journal-folder-chips" role="tablist" aria-label="فولدرات اليوميات">
                <button type="button" class="rodo-journal-folder-chip ${current === 'all' ? 'is-active' : ''}" data-premium-folder-filter="all" role="tab" aria-selected="${current === 'all' ? 'true' : 'false'}">
                    <span>الكل</span><small>${getJournals().length}</small>
                </button>
                ${folders.map(folder => {
                    const folderId = String(folder.id);
                    const count = getFolderNoteCount(folderId);
                    return `<button type="button" class="rodo-journal-folder-chip ${current === folderId ? 'is-active' : ''}" data-premium-folder-filter="${escape(folderId)}" role="tab" aria-selected="${current === folderId ? 'true' : 'false'}"><i data-lucide="folder" aria-hidden="true"></i><span>${escape(folder.name)}</span><small>${count}</small></button>`;
                }).join('')}
            </div>
        `;
        const select = document.getElementById('journal-folder-filter');
        if (select && (current === 'all' || folders.some(folder => String(folder.id) === String(current)))) select.value = current;
        if (window.lucide?.createIcons) window.lucide.createIcons({ root: shell });
    };

    const removeFolderPanelWhenInactive = () => {
        if (!isActive(FEATURE.JOURNAL_FOLDERS)) {
            document.getElementById('rodo-journal-folders')?.remove();
            closeFolderDialog();
        }
    };

    const openFolderCreate = ({ entryId = null } = {}) => {
        const entry = entryId ? getJournals().find(item => String(item.id) === String(entryId)) : null;
        openFolderDialog({
            title: entry ? 'إنشاء فولدر وإضافة اليومية' : 'فولدر جديد',
            description: entry ? 'اكتب اسم الفولدر اللي تحب تحفظ فيه اليومية.' : 'اسم بسيط يكفي. تقدر تغيره بعدين.',
            body: `
                <form class="rodo-journal-folder-form" data-premium-folder-create-form>
                    <label>
                        <span>اسم الفولدر</span>
                        <input type="text" name="folderName" maxlength="${FEATURE_LIMITS.journalFolderName}" placeholder="مثلاً: تخطيطاتي" autocomplete="off" required>
                    </label>
                    <div class="rodo-journal-folder-dialog-actions">
                        <button type="button" class="rodo-journal-dialog-secondary" data-premium-folder-close>إلغاء</button>
                        <button type="submit" class="rodo-journal-dialog-primary">إنشاء${entry ? ' وإضافة' : ''}</button>
                    </div>
                </form>
            `
        });
        const form = document.querySelector('[data-premium-folder-create-form]');
        form?.setAttribute('data-entry-id', entry ? String(entry.id) : '');
    };

    const openFolderManager = () => {
        const folders = normalizeFolderData();
        openFolderDialog({
            title: 'إدارة الفولدرات',
            description: folders.length ? 'غيّر الاسم أو احذف الفولدر من غير ما تحذف أي يومية.' : 'لسه مفيش فولدرات هنا.',
            body: `
                <div class="rodo-journal-folder-manager">
                    <div class="rodo-journal-folder-manager-list">
                        ${folders.length ? folders.map(folder => `
                            <article class="rodo-journal-folder-manager-item" data-folder-id="${escape(folder.id)}">
                                <div class="rodo-journal-folder-manager-main">
                                    <div class="rodo-journal-folder-manager-icon"><i data-lucide="folder" aria-hidden="true"></i></div>
                                    <div>
                                        <strong>${escape(folder.name)}</strong>
                                        <span>${getFolderNoteCount(folder.id)} ${getFolderNoteCount(folder.id) === 1 ? 'نوت' : 'نوتات'}</span>
                                    </div>
                                </div>
                                <div class="rodo-journal-folder-manager-actions">
                                    <button type="button" data-premium-folder-rename="${escape(folder.id)}">إعادة تسمية</button>
                                    <button type="button" class="is-danger" data-premium-folder-delete="${escape(folder.id)}">حذف</button>
                                </div>
                            </article>
                        `).join('') : `<div class="rodo-journal-folder-manager-empty">لسه مفيش فولدرات. اعمل أول واحد من الزر اللي تحت.</div>`}
                    </div>
                    <button type="button" class="rodo-journal-folder-manager-add" data-premium-folder-create><span>+</span> فولدر جديد</button>
                </div>
            `
        });
    };

    const openFolderRename = (folderId) => {
        const folder = folderById(folderId);
        if (!folder) return;
        openFolderDialog({
            title: 'إعادة تسمية الفولدر',
            description: 'غيّر الاسم فقط. النوتات اللي جواه هتفضل مكانها.',
            body: `
                <form class="rodo-journal-folder-form" data-premium-folder-rename-form data-folder-id="${escape(folder.id)}">
                    <label>
                        <span>اسم الفولدر</span>
                        <input type="text" name="folderName" maxlength="${FEATURE_LIMITS.journalFolderName}" value="${escape(folder.name)}" autocomplete="off" required>
                    </label>
                    <div class="rodo-journal-folder-dialog-actions">
                        <button type="button" class="rodo-journal-dialog-secondary" data-premium-folder-close>إلغاء</button>
                        <button type="submit" class="rodo-journal-dialog-primary">حفظ التغيير</button>
                    </div>
                </form>
            `
        });
    };

    const openFolderDelete = (folderId) => {
        const folder = folderById(folderId);
        if (!folder) return;
        const count = getFolderNoteCount(folder.id);
        openFolderDialog({
            title: 'حذف الفولدر؟',
            description: 'الفولدر نفسه هيتحذف، لكن اليوميات اللي جواه مش هتتمسح.',
            body: `
                <div class="rodo-journal-folder-confirm">
                    <div class="rodo-journal-folder-confirm-icon"><i data-lucide="folder-minus" aria-hidden="true"></i></div>
                    <strong>${escape(folder.name)}</strong>
                    <span>${count} ${count === 1 ? 'نوت هتفضل محفوظة' : 'نوتات هتفضل محفوظة'}</span>
                    <div class="rodo-journal-folder-dialog-actions">
                        <button type="button" class="rodo-journal-dialog-secondary" data-premium-folder-manage>رجوع</button>
                        <button type="button" class="rodo-journal-dialog-danger" data-premium-folder-delete-confirm="${escape(folder.id)}">حذف الفولدر</button>
                    </div>
                </div>
            `
        });
    };

    const deleteFolder = (folderId) => {
        const data = ensureData();
        if (!data) return false;
        const folders = data.journalFolders?.folders || [];
        const index = folders.findIndex(folder => String(folder.id) === String(folderId));
        if (index < 0) return false;
        folders.splice(index, 1);
        getJournals().forEach(entry => {
            if (String(entry.folderId || '') === String(folderId)) delete entry.folderId;
        });
        if (typeof saveState === 'function') saveState();
        return true;
    };

    const setFolderFilter = (folderId) => {
        const select = document.getElementById('journal-folder-filter');
        if (!select) return;
        const value = folderId === 'all' ? 'all' : String(folderId);
        if (![...select.options].some(option => option.value === value)) return;
        select.value = value;
        if (typeof window.RODOJournal?.render === 'function') window.RODOJournal.render();
    };

    const openFolderAssignment = (entry, { afterSave = false } = {}) => {
        if (!entry || !isActive(FEATURE.JOURNAL_FOLDERS)) return;
        const folders = normalizeFolderData();
        const currentFolder = entry.folderId ? folderById(entry.folderId) : null;
        openFolderDialog({
            title: afterSave ? 'تحب تحفظ اليومية في فولدر؟' : 'تنظيم اليومية',
            description: afterSave ? 'اختياري — تقدر تسيبها في اليوميات العامة.' : 'اختار مكان اليومية أو سيبها من غير فولدر.',
            body: `
                <div class="rodo-journal-folder-assignment" data-premium-folder-entry-id="${escape(entry.id)}">
                    <div class="rodo-journal-folder-entry-preview">
                        <span>${escape(entry.title || 'اليومية')}</span>
                        <small>${escape(formatFolderAssignmentDate(entry.dateKey))}</small>
                    </div>
                    <div class="rodo-journal-folder-choice-list">
                        <button type="button" class="rodo-journal-folder-choice ${!currentFolder ? 'is-current' : ''}" data-premium-folder-assign="none">
                            <span><i data-lucide="inbox" aria-hidden="true"></i><b>من غير فولدر</b><small>تفضل في الأرشيف العام</small></span>
                            ${!currentFolder ? '<i data-lucide="check" aria-hidden="true"></i>' : ''}
                        </button>
                        ${folders.map(folder => `
                            <button type="button" class="rodo-journal-folder-choice ${currentFolder && String(currentFolder.id) === String(folder.id) ? 'is-current' : ''}" data-premium-folder-assign="${escape(folder.id)}">
                                <span><i data-lucide="folder" aria-hidden="true"></i><b>${escape(folder.name)}</b><small>${getFolderNoteCount(folder.id)} ${getFolderNoteCount(folder.id) === 1 ? 'نوت' : 'نوتات'}</small></span>
                                ${currentFolder && String(currentFolder.id) === String(folder.id) ? '<i data-lucide="check" aria-hidden="true"></i>' : ''}
                            </button>
                        `).join('')}
                    </div>
                    <button type="button" class="rodo-journal-folder-manager-add" data-premium-folder-create data-entry-id="${escape(entry.id)}"><span>+</span> إنشاء فولدر جديد</button>
                </div>
            `
        });
    };

    const formatFolderAssignmentDate = (dateKey) => {
        try { return formatDate(dateKey, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return String(dateKey || ''); }
    };

    const finishFolderMutation = (message) => {
        closeFolderDialog();
        renderFolderFilter();
        if (typeof window.RODOJournal?.render === 'function') window.RODOJournal.render();
        if (message) toast(message, 'success');
    };

    const handleFolderDialogSubmit = (event) => {
        const createForm = event.target.closest?.('[data-premium-folder-create-form]');
        const renameForm = event.target.closest?.('[data-premium-folder-rename-form]');
        if (!createForm && !renameForm) return false;
        event.preventDefault();
        const form = createForm || renameForm;
        const input = form.querySelector('input[name="folderName"]');
        const name = String(input?.value || '').trim().slice(0, FEATURE_LIMITS.journalFolderName);
        if (!name) return true;

        if (createForm) {
            const folder = createFolder(name);
            if (!folder) return true;
            const entryId = String(form.dataset.entryId || '');
            if (entryId) {
                const entry = getJournals().find(item => String(item.id) === entryId);
                if (entry) assignEntryToFolder(entry.id, folder.id);
            }
            finishFolderMutation(entryId ? `اتعمل «${folder.name}» واتضافت إليه اليومية.` : `اتعمل فولدر «${folder.name}».`);
            return true;
        }

        const folder = folderById(form.dataset.folderId);
        if (!folder) return true;
        folder.name = name;
        if (typeof saveState === 'function') saveState();
        finishFolderMutation('اتغير اسم الفولدر.');
        return true;
    };

    const handleFolderDialogClick = (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-premium-folder-close],[data-premium-folder-rename],[data-premium-folder-delete],[data-premium-folder-delete-confirm],[data-premium-folder-assign],[data-premium-folder-create],[data-premium-folder-manage],[data-premium-folder-filter]') : null;
        if (!target) return false;
        event.preventDefault();
        event.stopPropagation();

        if (target.dataset.premiumFolderClose !== undefined) { closeFolderDialog(); return true; }
        if (target.dataset.premiumFolderFilter !== undefined) { setFolderFilter(target.dataset.premiumFolderFilter); return true; }
        if (target.dataset.premiumFolderCreate !== undefined) { openFolderCreate({ entryId: target.dataset.entryId || null }); return true; }
        if (target.dataset.premiumFolderManage !== undefined) { openFolderManager(); return true; }
        if (target.dataset.premiumFolderRename !== undefined) { openFolderRename(target.dataset.premiumFolderRename); return true; }
        if (target.dataset.premiumFolderDelete !== undefined) { openFolderDelete(target.dataset.premiumFolderDelete); return true; }
        if (target.dataset.premiumFolderDeleteConfirm !== undefined) {
            const folder = folderById(target.dataset.premiumFolderDeleteConfirm);
            const removed = folder && deleteFolder(folder.id);
            if (removed) finishFolderMutation('اتحذف الفولدر، واليوميات لسه محفوظة.');
            return true;
        }
        if (target.dataset.premiumFolderAssign !== undefined) {
            const assignment = target.dataset.premiumFolderAssign === 'none' ? null : target.dataset.premiumFolderAssign;
            const dialog = document.getElementById('rodo-journal-folder-dialog');
            const entryId = dialog?.querySelector('[data-premium-folder-entry-id]')?.dataset.premiumFolderEntryId;
            const entry = entryId ? getJournals().find(item => String(item.id) === String(entryId)) : null;
            if (entry) {
                assignEntryToFolder(entry.id, assignment);
                closeFolderDialog();
                toast(assignment ? 'اتنظمت اليومية داخل الفولدر.' : 'اتشالت اليومية من الفولدر.', 'success');
            }
            return true;
        }
        return false;
    };

    const onJournalRendered = () => {
        if (!document.getElementById('view-journal')) return;
        if (isActive(FEATURE.JOURNAL_FOLDERS)) renderFolderFilter(); else removeFolderPanelWhenInactive();
    };

    const onJournalSaved = (entry, meta = {}) => {
        if (!isActive(FEATURE.JOURNAL_FOLDERS) || !entry || !meta.isNew) return;
        window.setTimeout(() => openFolderAssignment(entry, { afterSave: true }), 120);
    };

    const onJournalReaderOpen = (entry) => {
        renderReaderFolderControl(entry);
    };

    // ---------- Advanced Statistics ----------
    const getSessionRows = () => {
        const rows = [];
        if (typeof state === 'undefined' || !Array.isArray(state.studySubjects)) return rows;
        state.studySubjects.forEach(subject => {
            if (!Array.isArray(subject.history)) return;
            subject.history.forEach(session => {
                const minutes = Number(session?.minutes) || 0;
                const date = String(session?.date || '');
                if (minutes > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)) rows.push({ subjectId: String(subject.id), subjectName: String(subject.name || 'مادة'), minutes, date, timestamp: Number(session.timestamp) || 0 });
            });
        });
        return rows;
    };

    const parseLocalDate = (key) => {
        const [y, m, d] = String(key || '').split('-').map(Number);
        return y && m && d ? new Date(y, m - 1, d) : null;
    };

    const weekStartKey = (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return typeof getLocalDateStr === 'function' ? getLocalDateStr(d) : d.toISOString().slice(0, 10);
    };

    const shiftDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };

    const advancedStats = () => {
        const sessions = getSessionRows();
        const now = new Date();
        const currentWeekStart = parseLocalDate(weekStartKey(now)) || now;
        const previousWeekStart = shiftDays(currentWeekStart, -7);
        const currentWeekKey = typeof getLocalDateStr === 'function' ? getLocalDateStr(currentWeekStart) : currentWeekStart.toISOString().slice(0,10);
        const previousWeekKey = typeof getLocalDateStr === 'function' ? getLocalDateStr(previousWeekStart) : previousWeekStart.toISOString().slice(0,10);
        const weekMinutes = sessions.reduce((sum, row) => sum + (row.date >= currentWeekKey ? row.minutes : 0), 0);
        const previousMinutes = sessions.reduce((sum, row) => sum + (row.date >= previousWeekKey && row.date < currentWeekKey ? row.minutes : 0), 0);
        const recentStart = shiftDays(now, -29);
        recentStart.setHours(0,0,0,0);
        const recentStartKey = typeof getLocalDateStr === 'function' ? getLocalDateStr(recentStart) : recentStart.toISOString().slice(0,10);
        const recent = sessions.filter(row => row.date >= recentStartKey);
        const subjectMap = new Map();
        recent.forEach(row => subjectMap.set(row.subjectName, (subjectMap.get(row.subjectName) || 0) + row.minutes));
        const topSubject = [...subjectMap.entries()].sort((a,b)=>b[1]-a[1])[0] || null;
        const dayMap = new Map();
        recent.forEach(row => {
            const date = parseLocalDate(row.date);
            const label = date ? date.toLocaleDateString('ar-EG', { weekday:'long' }) : '—';
            dayMap.set(label, (dayMap.get(label) || 0) + row.minutes);
        });
        const topDay = [...dayMap.entries()].sort((a,b)=>b[1]-a[1])[0] || null;
        const weekBuckets = [];
        for (let i = 7; i >= 0; i--) {
            const start = shiftDays(currentWeekStart, -7*i);
            const key = typeof getLocalDateStr === 'function' ? getLocalDateStr(start) : start.toISOString().slice(0,10);
            const end = shiftDays(start, 7);
            const endKey = typeof getLocalDateStr === 'function' ? getLocalDateStr(end) : end.toISOString().slice(0,10);
            const minutes = sessions.reduce((sum,row)=>sum + (row.date >= key && row.date < endKey ? row.minutes : 0),0);
            weekBuckets.push({ key, label: start.toLocaleDateString('ar-EG',{month:'short',day:'numeric'}), minutes });
        }
        const change = previousMinutes > 0 ? Math.round(((weekMinutes - previousMinutes) / previousMinutes) * 100) : null;
        return { weekMinutes, previousMinutes, change, topSubject, topDay, weekBuckets, sessions: sessions.length };
    };

    const renderAdvancedStats = () => {
        const view = document.getElementById('view-stats');
        if (!view) return;
        if (!isActive(FEATURE.ADVANCED_STATS)) {
            document.getElementById('rodo-advanced-stats')?.remove();
            return;
        }
        let panel = document.getElementById('rodo-advanced-stats');
        if (!panel) {
            panel = document.createElement('section');
            panel.id = 'rodo-advanced-stats';
            panel.className = 'rodo-premium-panel rodo-premium-stats';
            const anchor = document.getElementById('stat-smart-insights')?.closest('.glass-panel');
            if (anchor?.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling); else view.appendChild(panel);
        }
        const stats = advancedStats();
        const trendText = stats.change === null ? 'لسه بنجمع baseline كفاية للمقارنة.' : stats.change > 0 ? `أعلى من الأسبوع اللي فات بـ${stats.change}%` : stats.change < 0 ? `أقل من الأسبوع اللي فات بـ${Math.abs(stats.change)}%` : 'نفس مستوى الأسبوع اللي فات تقريبًا.';
        const trendClass = stats.change > 0 ? 'is-positive' : stats.change < 0 ? 'is-negative' : '';
        const max = Math.max(1, ...stats.weekBuckets.map(bucket => bucket.minutes));
        panel.innerHTML = `
            <div class="rodo-premium-panel-head"><div><span>PREMIUM</span><h3>إحصاءات متقدمة</h3><p>قراءة أعمق لنمط مذاكرتك خلال الوقت، من غير ما نغيّر الإحصاءات الأساسية.</p></div><span class="rodo-premium-chip">مفعّلة</span></div>
            <div class="rodo-premium-metric-grid">
                <article><span>هذا الأسبوع</span><strong>${stats.weekMinutes} د</strong><small class="${trendClass}">${escape(trendText)}</small></article>
                <article><span>أكثر مادة · آخر 30 يوم</span><strong>${escape(stats.topSubject?.[0] || '—')}</strong><small>${stats.topSubject ? `${stats.topSubject[1]} دقيقة` : 'لسه مفيش بيانات كفاية'}</small></article>
                <article><span>أفضل يوم · آخر 30 يوم</span><strong>${escape(stats.topDay?.[0] || '—')}</strong><small>${stats.topDay ? `${stats.topDay[1]} دقيقة` : '—'}</small></article>
                <article><span>إجمالي الجلسات</span><strong>${stats.sessions}</strong><small>كل الجلسات المسجلة</small></article>
            </div>
            <div class="rodo-premium-trend">
                <div class="rodo-premium-subhead"><strong>اتجاه الدراسة · آخر 8 أسابيع</strong><span>بالدقائق</span></div>
                <div class="rodo-premium-weekbars">${stats.weekBuckets.map(bucket => `<div class="rodo-premium-week"><div class="rodo-premium-bar-track"><span style="height:${Math.max(6,Math.round((bucket.minutes/max)*100))}%" title="${bucket.minutes} دقيقة"></span></div><small>${escape(bucket.label)}</small></div>`).join('')}</div>
            </div>`;
    };

    // ---------- Focus Presets ----------
    const getPresets = () => ensureData()?.focusPresets?.presets || [];

    const readSelectedFocusGoal = () => {
        const modal = document.getElementById('modal-focus-start');
        const selected = modal?.querySelector('[data-focus-goal].is-selected');
        const custom = document.getElementById('focus-custom-goal');
        let goalMinutes = selected ? Number(selected.dataset.focusGoal) : 0;
        if (goalMinutes === -1) goalMinutes = Math.max(15, Math.min(720, Number(custom?.value) || 0));
        return Math.max(0, Math.floor(goalMinutes));
    };

    const useFocusPreset = (presetId) => {
        if (!isActive(FEATURE.FOCUS_PRESETS)) return;
        const preset = getPresets().find(item => String(item.id) === String(presetId));
        if (!preset) return;
        const subjectExists = Array.isArray(state.studySubjects) && state.studySubjects.some(subject => String(subject.id) === String(preset.subjectId));
        if (!subjectExists) {
            toast('المادة المرتبطة بالإعداد ده مش موجودة دلوقتي.', 'info');
            return;
        }
        selectFocusStartSubject(preset.subjectId);
        selectFocusGoal(preset.goalMinutes || 0);
        if (Number(preset.goalMinutes) > 0 && ![0,30,45,60,90,120,180,240].includes(Number(preset.goalMinutes))) {
            const custom = document.getElementById('focus-custom-goal');
            if (custom) custom.value = Number(preset.goalMinutes);
            selectFocusGoal(-1);
            updateFocusGoalRewardPreview();
        }
        toast(`تم تحميل «${preset.name}».`, 'success');
    };

    const saveFocusPreset = () => {
        if (!isActive(FEATURE.FOCUS_PRESETS)) return;
        const list = document.getElementById('focus-start-subject-list');
        const subjectId = list?.dataset.selectedId;
        if (!subjectId) { toast('اختار مادة الأول.', 'info'); return; }
        const goalMinutes = readSelectedFocusGoal();
        const name = window.prompt('اسم الإعداد:');
        if (name === null) return;
        const clean = name.trim().slice(0, FEATURE_LIMITS.focusPresetName);
        if (!clean) return;
        const data = ensureData();
        data.focusPresets.presets.push({ id: id(), name: clean, subjectId: String(subjectId), goalMinutes, createdAt: Date.now() });
        if (typeof saveState === 'function') saveState();
        renderFocusPresets();
        toast(`اتحفظ «${clean}».`, 'success');
    };

    const deleteFocusPreset = (presetId) => {
        const data = ensureData();
        const index = data?.focusPresets.presets.findIndex(item => String(item.id) === String(presetId));
        if (index == null || index < 0) return;
        const preset = data.focusPresets.presets[index];
        if (!window.confirm(`تحذف «${preset.name}» من إعدادات التركيز؟`)) return;
        data.focusPresets.presets.splice(index, 1);
        if (typeof saveState === 'function') saveState();
        renderFocusPresets();
    };

    const renderFocusPresets = () => {
        const goalStep = document.getElementById('focus-start-goal-step');
        if (!goalStep) return;
        let panel = document.getElementById('rodo-focus-presets');
        if (!isActive(FEATURE.FOCUS_PRESETS)) { panel?.remove(); return; }
        if (!panel) {
            panel = document.createElement('section');
            panel.id = 'rodo-focus-presets';
            panel.className = 'rodo-premium-inline-panel';
            goalStep.appendChild(panel);
        }
        const presets = getPresets();
        panel.innerHTML = `
            <div class="rodo-premium-inline-head"><div><span>PREMIUM</span><strong>إعداداتك المحفوظة</strong><small>اختصار لإعدادات التركيز اللي بتستخدمها كتير.</small></div><button type="button" data-premium-focus-save>حفظ الحالي</button></div>
            <div class="rodo-focus-preset-list">${presets.length ? presets.map(preset => `<div class="rodo-focus-preset"><button type="button" class="rodo-focus-preset-main" data-premium-focus-use="${escape(preset.id)}"><strong>${escape(preset.name)}</strong><small>${escape((state.studySubjects.find(s=>String(s.id)===String(preset.subjectId))?.name || 'مادة غير متاحة'))} · ${preset.goalMinutes ? escape(typeof formatFocusGoal==='function' ? formatFocusGoal(preset.goalMinutes) : `${preset.goalMinutes}د`) : 'بدون هدف'}</small></button><button type="button" class="rodo-focus-preset-delete" data-premium-focus-delete="${escape(preset.id)}" aria-label="حذف الإعداد">×</button></div>`).join('') : `<div class="rodo-premium-empty">لسه مفيش إعدادات محفوظة.</div>`}</div>`;
        if (window.lucide?.createIcons) lucide.createIcons({ root: panel });
    };

    // ---------- Goal Milestones ----------
    const getMilestones = (goalId) => {
        const data = ensureData();
        const key = String(goalId);
        if (!Array.isArray(data.goalMilestones[key])) data.goalMilestones[key] = [];
        return data.goalMilestones[key];
    };

    const renderGoalMilestones = (goal) => {
        if (!goal || !isActive(FEATURE.GOAL_MILESTONES)) return '';
        const milestones = getMilestones(goal.id);
        const completed = milestones.filter(item => item.completed).length;
        const percent = milestones.length ? Math.round((completed / milestones.length) * 100) : 0;
        return `
            <div class="rodo-goal-premium" data-premium-goal-id="${escape(goal.id)}">
                <div class="rodo-goal-premium-head"><div><span>PREMIUM</span><strong>مراحل الهدف</strong><small>${milestones.length ? `${completed} من ${milestones.length} مكتملة` : 'حوّل الهدف لخطوات أصغر.'}</small></div>${milestones.length ? `<b>${percent}%</b>` : ''}</div>
                ${milestones.length ? `<div class="rodo-goal-premium-progress"><span style="width:${percent}%"></span></div>` : ''}
                <div class="rodo-goal-premium-list">${milestones.map(item => `<label class="rodo-goal-premium-item ${item.completed?'is-complete':''}"><input type="checkbox" data-premium-milestone-toggle="${escape(item.id)}" ${item.completed?'checked':''}><span>${escape(item.label)}</span><button type="button" data-premium-milestone-delete="${escape(item.id)}" aria-label="حذف المرحلة">×</button></label>`).join('')}</div>
                <div class="rodo-goal-premium-add"><input type="text" maxlength="100" placeholder="إضافة مرحلة…" data-premium-milestone-input><button type="button" data-premium-milestone-add>إضافة</button></div>
            </div>`;
    };

    const resolveMilestoneContext = (eventTarget) => {
        const root = eventTarget.closest?.('[data-premium-goal-id]');
        if (!root) return null;
        const goalId = String(root.dataset.premiumGoalId);
        const goal = state.goals?.find(item => String(item.id) === goalId);
        return goal ? { root, goal, milestones: getMilestones(goal.id) } : null;
    };

    const handleMilestoneAction = (event) => {
        if (!isActive(FEATURE.GOAL_MILESTONES)) return false;
        const target = event.target instanceof Element ? event.target.closest('[data-premium-milestone-add],[data-premium-milestone-toggle],[data-premium-milestone-delete]') : null;
        if (!target) return false;
        if (target.dataset.premiumMilestoneToggle !== undefined && event.type !== 'change') { event.stopPropagation(); return true; }
        const context = resolveMilestoneContext(target);
        if (!context) return true;
        event.preventDefault();
        event.stopPropagation();
        const { goal, milestones, root } = context;
        if (target.dataset.premiumMilestoneAdd !== undefined) {
            const input = root.querySelector('[data-premium-milestone-input]');
            const label = String(input?.value || '').trim().slice(0, FEATURE_LIMITS.milestoneName);
            if (!label) return true;
            milestones.push({ id: id(), label, completed:false, createdAt:Date.now() });
            if (typeof saveState === 'function') saveState();
            if (typeof renderGoals === 'function') renderGoals();
            return true;
        }
        if (target.dataset.premiumMilestoneToggle !== undefined) {
            const item = milestones.find(entry => String(entry.id) === String(target.dataset.premiumMilestoneToggle));
            if (!item) return true;
            item.completed = Boolean(target.checked);
            if (typeof saveState === 'function') saveState();
            if (typeof renderGoals === 'function') renderGoals();
            return true;
        }
        const index = milestones.findIndex(entry => String(entry.id) === String(target.dataset.premiumMilestoneDelete));
        if (index >= 0) {
            milestones.splice(index, 1);
            if (typeof saveState === 'function') saveState();
            if (typeof renderGoals === 'function') renderGoals();
        }
        return true;
    };

    const onStatsRendered = () => renderAdvancedStats();
    const onGoalsRendered = () => { if (isActive(FEATURE.GOAL_MILESTONES) && typeof renderGoals === 'function') return; };
    const onFocusStartReady = () => renderFocusPresets();
    const onFocusStartStateChanged = () => {
        if (!isActive(FEATURE.FOCUS_PRESETS)) return;
        const panel = document.getElementById('rodo-focus-presets');
        if (!panel) renderFocusPresets();
    };

    const onFeatureChange = (detail = {}) => {
        const id = String(detail.id || '');
        if (id === FEATURE.JOURNAL_FOLDERS) window.RODOJournal?.render?.();
        if (id === FEATURE.ADVANCED_STATS && document.getElementById('view-stats')?.classList.contains('active')) { if (typeof renderStats === 'function') renderStats(); }
        if (id === FEATURE.GOAL_MILESTONES && document.getElementById('view-goals')?.classList.contains('active')) { if (typeof renderGoals === 'function') renderGoals(); }
        if (id === FEATURE.FOCUS_PRESETS) renderFocusPresets();
    };

    const handleDocumentClick = (event) => {
        if (handleFolderDialogClick(event)) return;
        const target = event.target instanceof Element ? event.target.closest('[data-premium-folder-create],[data-premium-folder-manage],[data-premium-entry-folder],[data-premium-focus-save],[data-premium-focus-use],[data-premium-focus-delete]') : null;
        if (!target) return;
        if (target.dataset.premiumFolderCreate !== undefined) { event.preventDefault(); openFolderCreate({ entryId: target.dataset.entryId || null }); return; }
        if (target.dataset.premiumFolderManage !== undefined) { event.preventDefault(); openFolderManager(); return; }
        if (target.dataset.premiumEntryFolder !== undefined) { event.preventDefault(); const entry = getJournals().find(item => String(item.id) === String(target.dataset.premiumEntryFolder)); if (entry) openFolderAssignment(entry); return; }
        if (target.dataset.premiumFocusSave !== undefined) { event.preventDefault(); saveFocusPreset(); return; }
        if (target.dataset.premiumFocusUse !== undefined) { event.preventDefault(); useFocusPreset(target.dataset.premiumFocusUse); return; }
        if (target.dataset.premiumFocusDelete !== undefined) { event.preventDefault(); deleteFocusPreset(target.dataset.premiumFocusDelete); return; }
    };

    const handleFolderFilter = (event) => {
        if (event.target?.id !== 'journal-folder-filter') return;
        if (typeof window.RODOJournal?.render === 'function') window.RODOJournal.render();
    };

    const handleFolderDialogKeydown = (event) => {
        if (event.key !== 'Escape') return;
        const dialog = document.getElementById('rodo-journal-folder-dialog');
        if (dialog && dialog.getAttribute('aria-hidden') === 'false') {
            event.preventDefault();
            closeFolderDialog();
        }
    };

    const init = () => {
        ensureData();
        document.addEventListener('click', handleDocumentClick);
        document.addEventListener('submit', handleFolderDialogSubmit);
        document.addEventListener('change', handleFolderFilter);
        document.addEventListener('keydown', handleFolderDialogKeydown);
        const goalContainer = document.getElementById('ui-goals-container');
        goalContainer?.addEventListener('click', handleMilestoneAction, true);
        goalContainer?.addEventListener('change', handleMilestoneAction, true);
        window.addEventListener('rodo:premium-feature-change', event => onFeatureChange(event.detail || {}));
        renderFocusPresets();
    };

    window.RODOPremiumFeatures = Object.freeze({
        FEATURE,
        isActive,
        onJournalRendered,
        onJournalSaved,
        onJournalReaderOpen,
        journalCardAddon,
        onStatsRendered,
        onGoalsRendered,
        renderAdvancedStats,
        onFocusStartReady,
        onFocusStartStateChanged,
        renderFocusPresets,
        renderGoalMilestones,
        onFeatureChange
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
