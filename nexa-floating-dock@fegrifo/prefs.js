import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {LANGUAGE_OPTIONS, getTranslator} from './translations.js';

const DIRECTION = 'floating-dock-direction';
const ICON_SIZE = 'floating-dock-icon-size';
const APP_LIST = 'floating-dock-app-list';
const USE_FAVORITES = 'floating-dock-icon-favorites';
const KEEP_OPEN = 'floating-dock-keep-open';
const INDICATOR = 'floating-dock-indicator';
const CURRENT_WORKSPACE = 'floating-dock-current-workspace-app';

const BLUR_ENABLED = 'floating-dock-blur-enabled';
const BLUR_RADIUS = 'floating-dock-blur-radius';
const BG_OPACITY = 'floating-dock-bg-opacity';
const BORDER_RADIUS = 'floating-dock-border-radius';
const HOVER_LIFT = 'floating-dock-hover-lift';
const ACCENT_COLOR = 'floating-dock-accent-color';
const ACTION_LEFT = 'floating-dock-action-left-click';
const ACTION_DOUBLE = 'floating-dock-action-double-click';
const ACTION_RIGHT = 'floating-dock-action-right-click';
const LONG_PRESS = 'floating-dock-long-press-enabled';
const LANGUAGE = 'floating-dock-language';

const BUTTON_ACTIONS = [
    { id: 'overview', key: 'action_overview' },
    { id: 'toggle-dock', key: 'action_toggle_dock' },
    { id: 'radial-menu', key: 'action_radial_menu' },
    { id: 'none', key: 'action_none' },
];

const ICON_SIZES = [16, 24, 32, 36, 40, 44, 48, 64, 96, 128];
const DIRECTIONS = [
    { id: 'up', key: 'dir_up' },
    { id: 'down', key: 'dir_down' },
    { id: 'left', key: 'dir_left' },
    { id: 'right', key: 'dir_right' },
];
const INDICATOR_TYPES = ['dash', 'dot'];
const INDICATOR_POSITIONS = ['bottom', 'left'];

const COLOR_PRESETS = [
    { key: 'color_white', hex: '#ffffff' },
    { key: 'color_blue', hex: '#3584e4' },
    { key: 'color_purple', hex: '#9141ac' },
    { key: 'color_green', hex: '#33d17a' },
    { key: 'color_orange', hex: '#ff7800' },
    { key: 'color_pink', hex: '#e01b24' },
];

function rgbaToHex(rgba) {
    const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${toHex(rgba.red)}${toHex(rgba.green)}${toHex(rgba.blue)}`;
}

export default class FloatingDockPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(620, 680);
        this._pages = [];
        this._buildAllPages(window, settings);
    }

    _buildAllPages(window, settings, activeIndex = 0) {
        this._pages.forEach(page => window.remove(page));
        this._pages = [];

        const t = getTranslator(settings);
        const appearancePage = this._buildAppearancePage(settings, t);
        const controlsPage = this._buildControlsPage(settings, t);
        const behaviorPage = this._buildBehaviorPage(window, settings, t);

        this._pages.push(appearancePage, controlsPage, behaviorPage);
        this._pages.forEach(page => window.add(page));

        if (this._pages[activeIndex])
            window.set_visible_page(this._pages[activeIndex]);
    }

    _buildAppearancePage(settings, t) {
        const page = new Adw.PreferencesPage({
            title: t('page_appearance'),
            icon_name: 'applications-graphics-symbolic',
        });

        // --- Dock Bar Group ---
        const barGroup = new Adw.PreferencesGroup({
            title: t('group_dock_bar'),
            description: t('group_dock_bar_desc'),
        });

        const blurSwitch = new Adw.SwitchRow({
            title: t('blur_enabled_title'),
            subtitle: t('blur_enabled_sub'),
        });
        settings.bind(BLUR_ENABLED, blurSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        barGroup.add(blurSwitch);

        const blurRadiusRow = new Adw.SpinRow({
            title: t('blur_radius_title'),
            subtitle: t('blur_radius_sub'),
            adjustment: new Gtk.Adjustment({ lower: 2, upper: 40, step_increment: 1 }),
        });
        settings.bind(BLUR_RADIUS, blurRadiusRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        settings.bind(BLUR_ENABLED, blurRadiusRow, 'sensitive', Gio.SettingsBindFlags.GET);
        barGroup.add(blurRadiusRow);

        const opacityRow = new Adw.SpinRow({
            title: t('bg_opacity_title'),
            subtitle: t('bg_opacity_sub'),
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 100, step_increment: 2 }),
        });
        settings.bind(BG_OPACITY, opacityRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        barGroup.add(opacityRow);

        const radiusRow = new Adw.SpinRow({
            title: t('border_radius_title'),
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 32, step_increment: 1 }),
        });
        settings.bind(BORDER_RADIUS, radiusRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        barGroup.add(radiusRow);

        page.add(barGroup);

        // --- Icons & Accent Color Group ---
        const iconsGroup = new Adw.PreferencesGroup({
            title: t('group_icons'),
        });

        const sizeModel = Gtk.StringList.new(ICON_SIZES.map(s => `${s} px`));
        const sizeRow = new Adw.ComboRow({
            title: t('icon_size_title'),
            model: sizeModel,
        });
        const currentSize = settings.get_int(ICON_SIZE);
        const sizeIdx = ICON_SIZES.indexOf(currentSize);
        if (sizeIdx >= 0)
            sizeRow.set_selected(sizeIdx);
        sizeRow.connect('notify::selected', () => {
            settings.set_int(ICON_SIZE, ICON_SIZES[sizeRow.get_selected()]);
        });
        iconsGroup.add(sizeRow);

        const liftRow = new Adw.SpinRow({
            title: t('hover_lift_title'),
            subtitle: t('hover_lift_sub'),
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 18, step_increment: 1 }),
        });
        settings.bind(HOVER_LIFT, liftRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        iconsGroup.add(liftRow);

        iconsGroup.add(this._buildAccentColorRow(settings, t));

        page.add(iconsGroup);

        // --- Running Indicator Group ---
        const indicatorGroup = new Adw.PreferencesGroup({
            title: t('group_indicator'),
        });

        let [indType, indPos] = settings.get_value(INDICATOR).deep_unpack();

        const typeRow = new Adw.ComboRow({
            title: t('indicator_style_title'),
            model: Gtk.StringList.new([t('indicator_dash'), t('indicator_dot')]),
            selected: Math.max(0, INDICATOR_TYPES.indexOf(indType)),
        });
        typeRow.connect('notify::selected', () => {
            let [, pos] = settings.get_value(INDICATOR).deep_unpack();
            settings.set_value(INDICATOR, new GLib.Variant('as', [INDICATOR_TYPES[typeRow.get_selected()], pos]));
        });
        indicatorGroup.add(typeRow);

        const posRow = new Adw.ComboRow({
            title: t('indicator_pos_title'),
            model: Gtk.StringList.new([t('pos_bottom'), t('pos_left')]),
            selected: Math.max(0, INDICATOR_POSITIONS.indexOf(indPos)),
        });
        posRow.connect('notify::selected', () => {
            let [type] = settings.get_value(INDICATOR).deep_unpack();
            settings.set_value(INDICATOR, new GLib.Variant('as', [type, INDICATOR_POSITIONS[posRow.get_selected()]]));
        });
        indicatorGroup.add(posRow);

        page.add(indicatorGroup);
        return page;
    }

    _buildAccentColorRow(settings, t) {
        const row = new Adw.ActionRow({
            title: t('accent_color_title'),
            subtitle: t('accent_color_sub'),
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            valign: Gtk.Align.CENTER,
        });

        const presetNames = [...COLOR_PRESETS.map(p => t(p.key)), t('color_custom')];
        const dropdown = Gtk.DropDown.new_from_strings(presetNames);
        dropdown.valign = Gtk.Align.CENTER;

        const colorDialog = new Gtk.ColorDialog({ with_alpha: false });
        const colorButton = new Gtk.ColorDialogButton({
            dialog: colorDialog,
            valign: Gtk.Align.CENTER,
        });

        let syncing = false;
        const syncWidgetsFromSettings = () => {
            syncing = true;
            const hex = settings.get_string(ACCENT_COLOR).toLowerCase();
            const rgba = new Gdk.RGBA();
            if (rgba.parse(hex))
                colorButton.set_rgba(rgba);
            const presetIdx = COLOR_PRESETS.findIndex(p => p.hex.toLowerCase() === hex);
            dropdown.set_selected(presetIdx >= 0 ? presetIdx : COLOR_PRESETS.length);
            syncing = false;
        };

        syncWidgetsFromSettings();

        dropdown.connect('notify::selected', () => {
            if (syncing)
                return;
            const idx = dropdown.get_selected();
            if (idx < COLOR_PRESETS.length) {
                settings.set_string(ACCENT_COLOR, COLOR_PRESETS[idx].hex);
                syncWidgetsFromSettings();
            }
        });

        colorButton.connect('notify::rgba', () => {
            if (syncing)
                return;
            const hex = rgbaToHex(colorButton.get_rgba());
            settings.set_string(ACCENT_COLOR, hex);
            syncWidgetsFromSettings();
        });

        box.append(dropdown);
        box.append(colorButton);
        row.add_suffix(box);
        return row;
    }

    _buildControlsPage(settings, t) {
        const page = new Adw.PreferencesPage({
            title: t('page_controls'),
            icon_name: 'input-mouse-symbolic',
        });

        const actionsGroup = new Adw.PreferencesGroup({
            title: t('group_actions'),
            description: t('group_actions_desc'),
        });

        const makeActionRow = (title, key) => {
            const labels = BUTTON_ACTIONS.map(a => t(a.key));
            const currentId = settings.get_string(key);
            const selected = Math.max(0, BUTTON_ACTIONS.findIndex(a => a.id === currentId));
            const row = new Adw.ComboRow({
                title,
                model: Gtk.StringList.new(labels),
                selected,
            });
            row.connect('notify::selected', () => {
                settings.set_string(key, BUTTON_ACTIONS[row.get_selected()].id);
            });
            return row;
        };

        actionsGroup.add(makeActionRow(t('action_left_click'), ACTION_LEFT));
        actionsGroup.add(makeActionRow(t('action_double_click'), ACTION_DOUBLE));
        actionsGroup.add(makeActionRow(t('action_right_click'), ACTION_RIGHT));

        const longPressSwitch = new Adw.SwitchRow({
            title: t('long_press_title'),
            subtitle: t('long_press_sub'),
        });
        settings.bind(LONG_PRESS, longPressSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        actionsGroup.add(longPressSwitch);

        page.add(actionsGroup);

        const gesturesGroup = new Adw.PreferencesGroup({
            title: t('group_gestures'),
            description: t('group_gestures_desc'),
        });

        const gestures = [
            [t('gesture_drag_title'), t('gesture_drag_sub')],
            [t('gesture_scroll_title'), t('gesture_scroll_sub')],
            [t('gesture_outside_title'), t('gesture_outside_sub')],
        ];
        gestures.forEach(([title, subtitle]) => {
            gesturesGroup.add(new Adw.ActionRow({ title, subtitle }));
        });

        page.add(gesturesGroup);
        return page;
    }

    _buildBehaviorPage(window, settings, t) {
        const page = new Adw.PreferencesPage({
            title: t('page_behavior'),
            icon_name: 'preferences-system-symbolic',
        });

        const behaviorGroup = new Adw.PreferencesGroup({
            title: t('group_behavior'),
        });

        const currentLang = settings.get_string(LANGUAGE);
        const langIdx = Math.max(0, LANGUAGE_OPTIONS.findIndex(l => l.id === currentLang));
        const langRow = new Adw.ComboRow({
            title: t('language_title'),
            subtitle: t('language_sub'),
            model: Gtk.StringList.new(LANGUAGE_OPTIONS.map(l => t(l.labelKey))),
            selected: langIdx,
        });
        langRow.connect('notify::selected', () => {
            const newLang = LANGUAGE_OPTIONS[langRow.get_selected()].id;
            if (newLang !== settings.get_string(LANGUAGE)) {
                settings.set_string(LANGUAGE, newLang);
                this._buildAllPages(window, settings, 2);
            }
        });
        behaviorGroup.add(langRow);

        const currentDir = settings.get_string(DIRECTION);
        const dirIdx = Math.max(0, DIRECTIONS.findIndex(d => d.id === currentDir));
        const dirRow = new Adw.ComboRow({
            title: t('direction_title'),
            model: Gtk.StringList.new(DIRECTIONS.map(d => t(d.key))),
            selected: dirIdx,
        });
        dirRow.connect('notify::selected', () => {
            settings.set_string(DIRECTION, DIRECTIONS[dirRow.get_selected()].id);
        });
        behaviorGroup.add(dirRow);

        const keepOpenSwitch = new Adw.SwitchRow({
            title: t('keep_open_title'),
            subtitle: t('keep_open_sub'),
        });
        settings.bind(KEEP_OPEN, keepOpenSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(keepOpenSwitch);

        const currentWsSwitch = new Adw.SwitchRow({
            title: t('current_ws_title'),
        });
        settings.bind(CURRENT_WORKSPACE, currentWsSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(currentWsSwitch);

        page.add(behaviorGroup);

        // --- Applications Group ---
        const appsGroup = new Adw.PreferencesGroup({
            title: t('group_apps'),
        });

        const favSwitch = new Adw.SwitchRow({
            title: t('use_favorites_title'),
        });
        settings.bind(USE_FAVORITES, favSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        appsGroup.add(favSwitch);

        const customAppsWidget = this._buildCustomAppsWidget(window, settings);
        appsGroup.add(customAppsWidget);

        page.add(appsGroup);
        return page;
    }

    _buildCustomAppsWidget(window, settings) {
        const builder = new Gtk.Builder();
        builder.add_from_file(this.dir.get_path() + '/prefs.ui');

        const appCustomer = builder.get_object('app_customer');
        const appListBox = builder.get_object('app_list_box');
        const addButton = builder.get_object('add_app');
        const deleteButton = builder.get_object('delete_app');
        const appChooserWindow = builder.get_object('app_chooser_window');
        const appChooserWidget = builder.get_object('app_chooser_widget');

        addButton.connect('clicked', () => {
            appChooserWindow.set_transient_for(window);
            appChooserWindow.show();
        });

        appChooserWidget.connect('application_selected', (_actor, app) => {
            appChooserWindow.hide();
            const parts = app.get_filename().split('/');
            const id = parts[parts.length - 1];
            const apps = settings.get_string(APP_LIST).split(';').filter(Boolean);
            if (!apps.includes(id)) {
                apps.push(id);
                settings.set_string(APP_LIST, apps.join(';'));
                const row = this._createAppRow(id);
                if (row)
                    appListBox.append(row);
            }
        });

        const apps = settings.get_string(APP_LIST).split(';').filter(Boolean);
        apps.forEach(appId => {
            const row = this._createAppRow(appId);
            if (row)
                appListBox.append(row);
        });

        deleteButton.connect('clicked', () => {
            const row = appListBox.get_selected_row();
            if (!row)
                return;
            const targetId = row.get_first_child().app;
            const current = settings.get_string(APP_LIST).split(';').filter(id => id && id !== targetId);
            settings.set_string(APP_LIST, current.join(';'));
            appListBox.remove(row);
        });

        return appCustomer;
    }

    _createAppRow(appId) {
        const app = Gio.AppInfo.get_all().find(a => a.get_id() === appId);
        if (!app)
            return null;

        const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });
        const image = new Gtk.Image({ pixel_size: 32 });
        image.set_from_gicon(app.get_icon() || new Gio.ThemedIcon({ name: 'application-x-executable' }));

        const label = new Gtk.Label({ margin_start: 10, label: app.get_display_name() });
        row.append(image);
        row.append(label);
        row.app = appId;
        return row;
    }
}
