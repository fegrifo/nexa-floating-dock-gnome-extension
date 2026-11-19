import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';
import {ItemContainer, ApplicationsButton} from './itemContainer.js';
import * as Util from './util.js';
import {NUMBER_TO_CHAR_UPPERCASE, NUMBER_TO_CHAR} from './util.js';
import {ItemBox} from './itemBox.js';
import {AroundButtonManager} from './aroundButton.js';
import {MainButton} from './mainButton.js';

const ICON_FILE = 'floating-dock-icon-file';
const DOCK_POSITION = 'floating-dock-position';
const APP_LIST = 'floating-dock-app-list';
const USE_FAVORITES = 'floating-dock-icon-favorites';
const KEEP_OPEN = 'floating-dock-keep-open';
const INDICATOR = 'floating-dock-indicator';
const CURRENT_WORKSPACE = 'floating-dock-current-workspace-app';
const APPLICATIONS_BUTTON = 'floating-dock-applications-button';
const BLUR_ENABLED = 'floating-dock-blur-enabled';
const BLUR_RADIUS = 'floating-dock-blur-radius';
const BG_OPACITY = 'floating-dock-bg-opacity';
const BORDER_RADIUS = 'floating-dock-border-radius';
const ACCENT_COLOR = 'floating-dock-accent-color';
const ACTION_LEFT = 'floating-dock-action-left-click';
const ACTION_DOUBLE = 'floating-dock-action-double-click';
const ACTION_RIGHT = 'floating-dock-action-right-click';
const LONG_PRESS = 'floating-dock-long-press-enabled';
const OPEN_MODE = 'floating-dock-open-mode';
const LONG_PRESS_DELAY = 500;
const HOVER_LEAVE_DELAY = 3000;
const HOVER_CLICK_OUTSIDE_DELAY = 1000;

const ITEM_ANIMATION_TIME = 200;

const WINDOW_DND_SIZE = 256;
const DRAGGING_WINDOW_OPACITY = 0;

export const DockBox = GObject.registerClass({
    Signals: {
        'dock-updated': {},
    },
}, class DockBox extends St.Widget {
    _init(params) {
        super._init({ name: 'floating-dock',
                      can_focus: true,
                      reactive: true,
                      track_hover: true,
                      layout_manager: new Clutter.BinLayout() });

        this.settings = params.settings;
        this.iconSize = params.iconSize;
        this.direction = params.direction;
        this.dir = params.dir;

        this._mainButton = new MainButton(params.iconSize, params.settings, params.dir);
        this._mainButton._delegate = this;
        this._draggable = DND.makeDraggable(this._mainButton,
                                            { restoreOnSuccess: false,
                                              manualMode: false,
                                              dragActorMaxSize: WINDOW_DND_SIZE,
                                              dragActorOpacity: DRAGGING_WINDOW_OPACITY });
        this._draggable.connect('drag-begin', this._onDragBegin.bind(this));
        this._draggable.connect('drag-cancelled', this._onDragCancelled.bind(this));
        this._draggable.connect('drag-end', this._onDragEnd.bind(this));

        this._mainButton.connect('clicked', this._mainButtonClicked.bind(this));
        this._mainButton.connect('button-press-event', this._mainButtonPress.bind(this));
        this._mainButton.connect('notify::pressed', () => {
            if (!this._mainButton.pressed)
                this._cancelLongPress();
        });
        this._mainButton.connect('leave-event', () => {
            this._cancelLongPress();
            return Clutter.EVENT_PROPAGATE;
        });
        this._mainButton.connect('touch-event', (_actor, event) => {
            let type = event.type();
            if (type === Clutter.EventType.TOUCH_BEGIN)
                this._startLongPress();
            else if (type === Clutter.EventType.TOUCH_END || type === Clutter.EventType.TOUCH_CANCEL)
                this._cancelLongPress();
            return Clutter.EVENT_PROPAGATE;
        });

        this._label = new St.Label({ style_class: 'dash-label',
                                     text: 'Press ESC to cancel' });
        this._label.hide();
        Main.layoutManager.addChrome(this._label);

        this._keepOpen = this.settings.get_boolean(KEEP_OPEN);
        this._showApp = this._keepOpen;

        this._vimMode = false;
        this._inDrag = false;
        this._inPreviewMode = false;
        this._inPreviewButton = null;
        this._timeoutId = 0;
        this._clickTimeoutId = 0;
        this._longPressTimeoutId = 0;
        this._longPressTriggered = false;
        this._outsideClickId = 0;
        this._outsideIdleId = 0;
        this._hoverLeaveTimeoutId = 0;
        this._hoverClickOutsideTimeoutId = 0;
        this._hoverOutsideClickId = 0;
        this._wasExpandedBeforePopup = false;
        this._inOverview = false;
        [this._mainButtonX, this._mainButtonY] = this.settings.get_value(DOCK_POSITION).deep_unpack();
        this._useFavorites = this.settings.get_boolean(USE_FAVORITES);
        this._appSystem = Shell.AppSystem.get_default();
        this._userApps = (this.settings.get_string(APP_LIST)).split(';');

        this._bg = new St.Widget({
            style_class: 'item-box',
            x_expand: true,
            y_expand: true,
        });
        this._applyAppearance();
        this.add_child(this._bg);

        let isVertical = (this.direction == St.Side.TOP || this.direction == St.Side.BOTTOM);
        this._content = new St.BoxLayout({
            orientation: isVertical ? Clutter.Orientation.VERTICAL : Clutter.Orientation.HORIZONTAL,
        });
        this.add_child(this._content);

        this._box = new ItemBox(this.direction);
        if (this.direction == St.Side.LEFT || this.direction == St.Side.TOP) {
            this._content.add_child(this._box);
            this._content.add_child(this._mainButton);
        } else {
            this._content.add_child(this._mainButton);
            this._content.add_child(this._box);
        }

        this._workId = Main.initializeDeferredWork(this, this._redisplay.bind(this));

        this._connectSignals();

        this.connect('style-changed', () => { this.queueRedisplay.bind(this) });
        this.connect('show', () => { this._showDock(false); });

        this.connect('dock-updated', () => {
            if (this._showApp)
                this._mainButton.showIcon(true);
            else
                this._mainButton.showIcon(false);
        });

        this.connect('notify::hover', this._onDockHoverChanged.bind(this));
        this._mainButton.connect('notify::hover', this._onMainButtonHoverChanged.bind(this));

        this._aroundButtonManager = new AroundButtonManager(this.iconSize, this._mainButton, this.settings, this.dir);
        this._aroundButtonManager._aroundButtons.forEach(b => {
            b.connect('clicked', () => this._detachOutsideClick());
        });

        Main.layoutManager.addChrome(this, { trackFullscreen: true });

        this.set_position(this._mainButtonX, this._mainButtonY);
        this._monitorChanged();
    }

    _applyAppearance() {
        let blurEnabled = this.settings.get_boolean(BLUR_ENABLED);
        let blurRadius = this.settings.get_int(BLUR_RADIUS);
        let bgOpacity = this.settings.get_int(BG_OPACITY) / 100.0;
        let borderRadius = this.settings.get_int(BORDER_RADIUS);

        this._bg.set_style(
            `border-radius: ${borderRadius}px; background-color: rgba(10, 10, 10, ${bgOpacity.toFixed(2)});`
        );

        let existingBlur = this._bg.get_effect('dock-blur');
        if (blurEnabled) {
            if (existingBlur) {
                existingBlur.radius = blurRadius;
            } else {
                try {
                    const blur = new Shell.BlurEffect({
                        radius: blurRadius,
                        brightness: 1.0,
                        mode: Shell.BlurMode.BACKGROUND,
                    });
                    this._bg.add_effect_with_name('dock-blur', blur);
                } catch (e) {
                    logError(e, 'floatingDock: failed to add BlurEffect');
                }
            }
        } else if (existingBlur) {
            this._bg.remove_effect_by_name('dock-blur');
        }

        this._bg.queue_redraw();
    }

    _connectSignals() {
        this.keepOpenID = this.settings.connect("changed::" + KEEP_OPEN, () => {
            this._keepOpen = this.settings.get_boolean(KEEP_OPEN);
        });
        this.useFavoritesID = this.settings.connect("changed::" + USE_FAVORITES, () => {
            this._useFavorites = this.settings.get_boolean(USE_FAVORITES);
            this.queueRedisplay();
        });
        this.appListID = this.settings.connect("changed::" + APP_LIST, () => {
            this._userApps = (this.settings.get_string(APP_LIST)).split(';');
            this.queueRedisplay();
        });

        this._indicator = this.settings.get_value(INDICATOR).deep_unpack();
        this.indicatorChangedID = this.settings.connect("changed::" + INDICATOR, () => {
            this._indicator = this.settings.get_value(INDICATOR).deep_unpack();
            this.queueRedisplay();
        });

        this._currentWorkspaceApp = this.settings.get_boolean(CURRENT_WORKSPACE);
        this.currentWorkspaceAppID = this.settings.connect("changed::" + CURRENT_WORKSPACE, () => {
            this._currentWorkspaceApp = this.settings.get_boolean(CURRENT_WORKSPACE);
            this.queueRedisplay();
        });

        this._applicationButton = this.settings.get_boolean(APPLICATIONS_BUTTON);
        this.applicationButtonID = this.settings.connect("changed::" + APPLICATIONS_BUTTON, () => {
            this._applicationButton = this.settings.get_boolean(APPLICATIONS_BUTTON);
            this.queueRedisplay();
        });

        this._accentColor = this.settings.get_string(ACCENT_COLOR);
        this.accentColorID = this.settings.connect("changed::" + ACCENT_COLOR, () => {
            this._accentColor = this.settings.get_string(ACCENT_COLOR);
            this.queueRedisplay();
        });

        this.blurEnabledID = this.settings.connect("changed::" + BLUR_ENABLED, () => this._applyAppearance());
        this.blurRadiusID = this.settings.connect("changed::" + BLUR_RADIUS, () => this._applyAppearance());
        this.bgOpacityID = this.settings.connect("changed::" + BG_OPACITY, () => this._applyAppearance());
        this.borderRadiusID = this.settings.connect("changed::" + BORDER_RADIUS, () => this._applyAppearance());
        this.openModeID = this.settings.connect("changed::" + OPEN_MODE, () => {
            this._cancelHoverTimers();
            this._detachHoverOutsideClick();
        });

        this.installChangedID = this._appSystem.connect('installed-changed', () => {
            AppFavorites.getAppFavorites().reload();
            this.queueRedisplay();
        });

        this.appFavoritesChangedID = AppFavorites.getAppFavorites().connect('changed', this.queueRedisplay.bind(this));
        this.appStateChangedID = this._appSystem.connect('app-state-changed', this.queueRedisplay.bind(this));

        this._overViewShownID = Main.overview.connect('showing', () => {
            this._inOverview = true;
            this.hide(); });
        this._overViewActiveID = Main.overview.connect('shown', () => {
            this._inOverview = true;
            this.hide(); });
        this._overViewHiddenID = Main.overview.connect('hiding', () => {
            this._inOverview = false;
            this.show();
            this._showDock(false); });
        this._monitorChangedID = Main.layoutManager.connect('monitors-changed', this._monitorChanged.bind(this));

        this._workspaceChangedID = global.workspace_manager.connect('active-workspace-changed',
                                                                    this.queueRedisplay.bind(this));
    }

    _redisplay() {
        let children = this._box.get_children();
        children.map(actor => { actor.destroy(); });

        this._itemNumber = 0;
        if (this._useFavorites)
            this._addFavorites();
        else
            this._addCustomerApp();
        this._addApps();

        this._showDock(false);
    }

    queueRedisplay() {
        this._vimMode = false;
        if (this._mainButton)
            this._mainButton.reactive = true;
        //Main.queueDeferredWork(this._workId);
        this._redisplay();
    }

    _findInBox(app) {
        let children = this._box.get_children();
        let result = false;
        for (let i = 0; i < children.length; i++) {
            if (children[i].isApplicationButton)
                continue;
            if (children[i].app.id == app.id) {
                result = true;
                break;
            }
        }
        return result;
    }

    _addApps() {
        let running = this._appSystem.get_running();

        if (this._currentWorkspaceApp) {
            running = running.filter(function(app) {
                return Util.appInActiveWorkspace(app);
            });
        }

        for (let i = 0; i < running.length; i++) {
            if (this._findInBox(running[i]))
                continue;
            let item = new ItemContainer({
                app: running[i],
                vimMode: this._vimMode,
                number: this._itemNumber++,
                iconSize: this.iconSize,
                indicator: this._indicator,
                accentColor: this._accentColor,
                currentWorkspace: this._currentWorkspaceApp,
                settings: this.settings,
                dir: this.dir
            });
            item.button.connect('activate-window', this._activateWindow.bind(this));
            item.button.connect('hover-redraw', () => this._bg.queue_redraw());
            item.button.connect('in-preview', (button, state) => {
                this._inPreviewMode = state;
                if (state)
                    this._inPreviewButton = button;
            });

            this._box.add_child(item);
        }
    }

    _addFavorites() {
        let favorites = AppFavorites.getAppFavorites().getFavoriteMap();

        for (let i in favorites) {
            if (favorites[i] == null)
                continue;

            let item = new ItemContainer({
                app: favorites[i],
                vimMode: this._vimMode,
                number: this._itemNumber++,
                iconSize: this.iconSize,
                indicator: this._indicator,
                accentColor: this._accentColor,
                currentWorkspace: this._currentWorkspaceApp,
                settings: this.settings,
                dir: this.dir
            });
            item.button.connect('activate-window', this._activateWindow.bind(this));
            item.button.connect('hover-redraw', () => this._bg.queue_redraw());
            item.button.connect('in-preview', (button, state) => {
                this._inPreviewMode = state;
                if (state)
                    this._inPreviewButton = button;
            });

            this._box.add_child(item);
        }
    }

    _addCustomerApp() {
        for (let i in this._userApps) {
            let application = this._appSystem.lookup_app(this._userApps[i]);
            if (application == null)
                continue;

            let item = new ItemContainer({
                app: application,
                vimMode: this._vimMode,
                number: this._itemNumber++,
                iconSize: this.iconSize,
                indicator: this._indicator,
                accentColor: this._accentColor,
                currentWorkspace: this._currentWorkspaceApp,
                settings: this.settings,
                dir: this.dir
            });
            item.button.connect('activate-window', this._activateWindow.bind(this));
            item.button.connect('hover-redraw', () => this._bg.queue_redraw());
            item.button.connect('in-preview', (button, state) => {
                this._inPreviewMode = state;
                if (state)
                    this._inPreviewButton = button;
            });

            this._box.add_child(item);
        }
    }

    _addApplicationButton() {
        let button = new ApplicationsButton(this.iconSize, this._vimMode); 
        button.connect('activate-window', this._activateWindow.bind(this));
        this._box.add_child(button);
    }

    _activateWindow() {
        this._showApp = this._keepOpen;
        if (this._vimMode)
            this._vimClose()

        this._vimMode = false;
        this._showDock(false);
    }

    _previewSelected(number) {
        let children = this._box.get_children();
        let window = null;
        children.forEach( (item) => {
            if (item.isApplicationButton)
                return;

            let w = item.button.findPreviewMenu(number);
            if (w != null)
                window = w;
        });

        if (!window)
            return;

        this.activateWindow(window);
        this._vimClose();
    }

    _appItemSelected(number, newWindow) {
        let children = this._box.get_children();
        let item = children.find( (element) => {
            if (element.isApplicationButton)
                return false;
            return element.number == number;
        });

        if (!item)
            return;

        let windows = this._currentWorkspaceApp ? Util.windowsInActiveWorkspace(item.button.app)
                                                : item.button.app.get_windows();
        if (newWindow || (windows.length == 0)) {
            item.button.newWindow = newWindow;
            item.button.app.open_new_window(-1);
        } else if ( windows.length == 1) {
            this.activateWindow(windows[0]);
        }  else if (windows.length > 1) {
            this._inPreviewMode = true;
            item.button._showPreviews();
            return;
        }

        this._vimClose();
    }

    activateWindow(window) {
        let focusWindow = global.display.get_focus_window();
        if (window == focusWindow)
            window.minimize();
        else
            Main.activateWindow(window);
    }

    _executeButtonAction(action) {
        if (action === 'overview') {
            this._closeAroundMenu(false);
            Main.overview.show(2);
        } else if (action === 'toggle-dock') {
            this._closeAroundMenu(false);
            this._showApp = !this._showApp;
            this.settings.set_boolean(KEEP_OPEN, this._showApp);
            this._showDock(true);
        } else if (action === 'radial-menu') {
            this._toggleRadialMenu();
        }
    }

    _toggleRadialMenu() {
        if (this._aroundButtonManager.showAroundButton) {
            this._closeAroundMenu(true);
        } else {
            this._wasExpandedBeforePopup = this._showApp;
            if (this._showApp) {
                this._showApp = false;
                this._showDock(false);
            }
            this._aroundButtonManager.popup();
            this._attachOutsideClick();
        }
    }

    _startLongPress() {
        this._cancelLongPress();
        this._longPressTriggered = false;
        if (!this.settings.get_boolean(LONG_PRESS))
            return;

        this._longPressTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, LONG_PRESS_DELAY, () => {
            this._longPressTimeoutId = 0;
            this._longPressTriggered = true;
            this._executeButtonAction(this.settings.get_string(ACTION_RIGHT));
            return GLib.SOURCE_REMOVE;
        });
    }

    _cancelLongPress() {
        if (this._longPressTimeoutId > 0) {
            GLib.source_remove(this._longPressTimeoutId);
            this._longPressTimeoutId = 0;
        }
    }

    _cancelHoverTimers() {
        if (this._hoverLeaveTimeoutId > 0) {
            GLib.source_remove(this._hoverLeaveTimeoutId);
            this._hoverLeaveTimeoutId = 0;
        }
        if (this._hoverClickOutsideTimeoutId > 0) {
            GLib.source_remove(this._hoverClickOutsideTimeoutId);
            this._hoverClickOutsideTimeoutId = 0;
        }
    }

    _scheduleHoverClose(delay) {
        this._cancelHoverTimers();
        if (delay === HOVER_CLICK_OUTSIDE_DELAY) {
            this._hoverClickOutsideTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
                this._hoverClickOutsideTimeoutId = 0;
                if (this.settings.get_string(OPEN_MODE) === 'hover' && this._showApp && !this.hover) {
                    this._showApp = false;
                    this._showDock(true);
                    this._detachHoverOutsideClick();
                }
                return GLib.SOURCE_REMOVE;
            });
        } else {
            this._hoverLeaveTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
                this._hoverLeaveTimeoutId = 0;
                if (this.settings.get_string(OPEN_MODE) === 'hover' && this._showApp && !this.hover) {
                    this._showApp = false;
                    this._showDock(true);
                    this._detachHoverOutsideClick();
                }
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _attachHoverOutsideClick() {
        if (this._hoverOutsideClickId > 0)
            return;
        this._hoverOutsideClickId = global.stage.connect('button-press-event', () => {
            if (this.settings.get_string(OPEN_MODE) !== 'hover' || !this._showApp) {
                this._detachHoverOutsideClick();
                return Clutter.EVENT_PROPAGATE;
            }
            if (!this.hover && !this._aroundButtonManager.showAroundButton)
                this._scheduleHoverClose(HOVER_CLICK_OUTSIDE_DELAY);
            return Clutter.EVENT_PROPAGATE;
        });
    }

    _detachHoverOutsideClick() {
        if (this._hoverOutsideClickId > 0) {
            global.stage.disconnect(this._hoverOutsideClickId);
            this._hoverOutsideClickId = 0;
        }
    }

    _onMainButtonHoverChanged() {
        if (this.settings.get_string(OPEN_MODE) !== 'hover')
            return;
        if (this._mainButton.hover) {
            this._cancelHoverTimers();
            if (!this._showApp && !this._aroundButtonManager.showAroundButton && !this._inDrag && !this._inOverview) {
                this._showApp = true;
                this._showDock(true);
                this._attachHoverOutsideClick();
            }
        }
    }

    _onDockHoverChanged() {
        if (this.settings.get_string(OPEN_MODE) !== 'hover')
            return;
        if (this.hover) {
            this._cancelHoverTimers();
            if (this._showApp)
                this._attachHoverOutsideClick();
        } else if (this._showApp && !this._inDrag) {
            this._scheduleHoverClose(HOVER_LEAVE_DELAY);
        }
    }

    _mainButtonClicked() {
        this._cancelLongPress();
        if (this._longPressTriggered) {
            this._longPressTriggered = false;
            return;
        }

        let doubleAction = this.settings.get_string(ACTION_DOUBLE);
        let leftAction = this.settings.get_string(ACTION_LEFT);

        if (doubleAction === 'none') {
            this._executeButtonAction(leftAction);
            return;
        }

        if (this._clickTimeoutId) {
            GLib.source_remove(this._clickTimeoutId);
            this._clickTimeoutId = 0;
            this._executeButtonAction(doubleAction);
            return;
        }

        this._clickTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
            this._clickTimeoutId = 0;
            this._executeButtonAction(leftAction);
            return GLib.SOURCE_REMOVE;
        });
    }

    _mainButtonPress(actor, event) {
        let btn = event.get_button();
        if (btn === 1) {
            this._startLongPress();
        } else if (btn === 3) {
            this._cancelLongPress();
            this._executeButtonAction(this.settings.get_string(ACTION_RIGHT));
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _attachOutsideClick() {
        this._detachOutsideClick();
        this._outsideIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._outsideIdleId = 0;
            if (!this._aroundButtonManager.showAroundButton)
                return GLib.SOURCE_REMOVE;

            this._outsideClickId = global.stage.connect('button-press-event', (_stage, _ev) => {
                if (!this._aroundButtonManager.showAroundButton) {
                    this._detachOutsideClick();
                    return Clutter.EVENT_PROPAGATE;
                }
                if (this._mainButton.hover ||
                    this._aroundButtonManager._aroundButtons.some(b => b.visible && b.hover))
                    return Clutter.EVENT_PROPAGATE;

                this._closeAroundMenu(true);
                return Clutter.EVENT_PROPAGATE;
            });
            return GLib.SOURCE_REMOVE;
        });
    }

    _detachOutsideClick() {
        if (this._outsideIdleId > 0) {
            GLib.source_remove(this._outsideIdleId);
            this._outsideIdleId = 0;
        }
        if (this._outsideClickId > 0) {
            global.stage.disconnect(this._outsideClickId);
            this._outsideClickId = 0;
        }
    }

    _closeAroundMenu(restoreDock) {
        this._detachOutsideClick();
        if (this._aroundButtonManager.showAroundButton)
            this._aroundButtonManager.hideButton(true);
        if (restoreDock && this._wasExpandedBeforePopup) {
            this._wasExpandedBeforePopup = false;
            this._showApp = true;
            this._showDock(true);
        }
    }

    _vimClose() {
        this._showApp = this._keepOpen;
        this._vimMode = false;
        this._mainButton.reactive = true;
        Main.popModal(this._grab);
        this._grab = null;
        this._redisplay();
    }

    _showDock(animation) {
        if (this._inOverview || Main.overview.visible) {
            this.hide();
            return;
        }
        this.show();

        if (this._showApp) {
            this._box.show();

            if (animation) {
                this._box.setSlide(0);
                this._box.ease_property('@layout.slide', 1, {
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                    duration: ITEM_ANIMATION_TIME, });
            } else
                this._box.setSlide(1);

        } else {
            if (animation) {
                this._box.setSlide(1);
                this._box.ease_property('@layout.slide', 0, {
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                    duration: ITEM_ANIMATION_TIME,
                    onComplete: () => {
                        this._box.hide();
                    }
                });
            } else {
                this._box.setSlide(0);
                this._box.hide();
            }
        }

        if (this._vimMode)
            this._showLabel();
        else
            this._label.hide();

        this._recordMainButtonPosition();
        this.emit('dock-updated');
    }

    _recordMainButtonPosition() {
        if (this._timeoutId != 0)
            return;

        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this._timeoutId = 0;

            if (!this._mainButton)
                return GLib.SOURCE_REMOVE;

            if (this._mainButtonX >= 0 && this._mainButtonY >= 0)
                this._savePosition();

            return GLib.SOURCE_REMOVE;
        });
    }

    _showLabel() {
        this._label.show();
        let labelHeight = this._label.get_height();
        let labelWidth = this._label.get_width();
        let boxWidth = this.get_width();
        let boxHeight = this.get_height();

        const box = this._mainButton.get_transformed_extents();
        let sourceTopLeft = box.get_top_left();
        let sourceBottomRight = box.get_bottom_right();
        let x = sourceTopLeft.x;
        let y = sourceTopLeft.y;

        switch (this.direction) {
        case St.Side.TOP:
        case St.Side.BOTTOM:
            x = x - labelWidth;
            if (x < 0)
                x = sourceBottomRight.x;
            break;
        case St.Side.RIGHT:
        case St.Side.LEFT:
            y = y - labelHeight;
            if (y < 0)
                y = sourceBottomRight.y;
        default:
            break;
        }
        this._label.set_position(x, y);
    }

    vimShow() {
        this._vimMode = true;
        this._mainButton.reactive = false;
        if (!this._showApp) {
            this._showApp = true;
            this.show();
        }

        this._aroundButtonManager.popupClose();

        Main.queueDeferredWork(this._workId);

        if (this._grab != null)
            return;

        let grab = Main.pushModal(this, { actionMode: Shell.ActionMode.POPUP});
        this._grab = grab;
    }

    _monitorChanged() {
        let workspaceManager = global.workspace_manager;
        let ws = workspaceManager.get_active_workspace();
        let workArea = ws.get_work_area_all_monitors();

        let [, natWidth] = this._mainButton.get_preferred_width(-1);
        let [, natHeight] = this._mainButton.get_preferred_height(-1);

        if (this._mainButtonX >= 0 && this._mainButtonY >= 0) {
            if (this._mainButtonX < workArea.x)
                this._mainButtonX = workArea.x;
            if (this._mainButtonX + natWidth > workArea.x + workArea.width)
                this._mainButtonX = workArea.x + workArea.width - natWidth;
            if (this._mainButtonY < workArea.y)
                this._mainButtonY = workArea.y;
            if (this._mainButtonY + natHeight > workArea.y + workArea.height)
                this._mainButtonY = workArea.y + workArea.height - natHeight;
        }

        this.queue_relayout();
    }

    _sureInWorkArea(box) {
        let workspaceManager = global.workspace_manager;
        let ws = workspaceManager.get_active_workspace();
        let workArea = ws.get_work_area_all_monitors();

        let boxWidth = box.x2 - box.x1;
        let boxHeight = box.y2 - box.y1;

        let x = box.x1;
        let y = box.y1;

        if (x < workArea.x)
            x = workArea.x;
        else if (x + boxWidth > workArea.x + workArea.width)
            x = workArea.x + workArea.width - boxWidth;

        if (y < workArea.y)
            y = workArea.y;
        else if (y + boxHeight > workArea.y + workArea.height)
            y = workArea.y + workArea.height - boxHeight;

        box.set_origin(x, y);
    }

    vfunc_allocate(box) {
        super.vfunc_allocate(box);

        let boxWidth = box.x2 - box.x1;
        let boxHeight = box.y2 - box.y1;

        let mainButtonBox = this._mainButton.get_allocation_box();
        let mainButtonWidth = mainButtonBox.x2 - mainButtonBox.x1;
        let mainButtonHeight = mainButtonBox.y2 - mainButtonBox.y1;

        if (this._mainButtonX < 0 || this._mainButtonY < 0) {
            let ws = global.workspace_manager.get_active_workspace();
            let workArea = ws.get_work_area_all_monitors();
            let centerX = workArea.x + Math.round((workArea.width - boxWidth) / 2);
            this._mainButtonX = (this.direction == St.Side.LEFT)
                ? centerX + Math.max(0, boxWidth - mainButtonWidth)
                : centerX;
            this._mainButtonY = workArea.y + workArea.height - mainButtonHeight - 10;
        }

        let x = this._mainButtonX;
        let y = this._mainButtonY;

        switch (this.direction) {
        case St.Side.TOP:
            y = this._mainButtonY - (boxHeight - mainButtonHeight);
            break;
        case St.Side.LEFT:
            x = this._mainButtonX - (boxWidth - mainButtonWidth);
            break;
        case St.Side.BOTTOM:
        case St.Side.RIGHT:
        default:
            break;
        }

        box.set_origin(x, y);
        if (!this._inDrag)
            this._sureInWorkArea(box);
        this.set_allocation(box);
    }

    vfunc_key_press_event(keyEvent) {
        let symbol = keyEvent.get_key_symbol();
        if (symbol == Clutter.KEY_Escape && this._inPreviewMode) {
            this._inPreviewButton._previewMenu.close();
            return Clutter.EVENT_STOP;
        }

        if (symbol == Clutter.KEY_Escape) {
            this._inPreviewMode = false;
            this._vimClose();
            return Clutter.EVENT_STOP;
        }

        let number = NUMBER_TO_CHAR.findIndex( (element) => {
                                                return element == symbol; });
        if (number >= 0) {
            if (this._inPreviewMode)
                this._previewSelected(number);
            else
                this._appItemSelected(number, false);

            return Clutter.EVENT_STOP;
        }

        let uppercase = NUMBER_TO_CHAR_UPPERCASE.findIndex( (element) => {
                                                return element == symbol; });
        if (uppercase >= 0 && !this._inPreviewMode) {
            this._appItemSelected(uppercase, true);
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_STOP;
    }

    _onDragMotion(dropEvent) {
        this._inDrag = true;
        this._mainButtonX = dropEvent.dragActor.x;
        this._mainButtonY = dropEvent.dragActor.y;
        this.queue_relayout();

        if (this._aroundButtonManager.showAroundButton) {
            this._aroundButtonManager.set_position(
                this._aroundStartX + (this._mainButtonX - this._dragStartX),
                this._aroundStartY + (this._mainButtonY - this._dragStartY)
            );
        }

        this._showDock(false);
        return DND.DragMotionResult.CONTINUE;
    }

    _onDragBegin(_draggable, _time) {
        this._cancelLongPress();
        this._dragStartX = this._mainButtonX;
        this._dragStartY = this._mainButtonY;
        this._aroundStartX = this._aroundButtonManager.x;
        this._aroundStartY = this._aroundButtonManager.y;
        this._dragMonitor = {
            dragMotion: this._onDragMotion.bind(this),
        };
        DND.addDragMonitor(this._dragMonitor);
    }

    _savePosition() {
        this.settings.set_value(DOCK_POSITION,
            new GLib.Variant('ai', [Math.round(this._mainButtonX), Math.round(this._mainButtonY)]));
    }

    _onDragCancelled(_draggable, _time) {
        this._inDrag = false;
        DND.removeDragMonitor(this._dragMonitor);
        this._savePosition();
        this._showDock(false);
    }

    _onDragEnd(_draggable, _time, _snapback) {
        this._inDrag = false;
        DND.removeDragMonitor(this._dragMonitor);

        this._savePosition();
        this._showDock(false);
        this._updateMenuStyle();
    }

    getDragActor() {
        return this._mainButton.createDragButton();
    }

    getDragActorSource() {
        return this._mainButton;
    }

    acceptDrop() {
        return true;
    }

    _updateMenuStyle() {
        let children = this._box.get_children();
        children.forEach( (item) => {
            if (item.isApplicationButton)
                return;
            let button = item.button;
            if (button._previewMenu != null) {
                button._previewMenu.destroy();
                button._previewMenu = null;
            }
        });
    }

    destroy() {
        if (this._timeoutId)
            GLib.source_remove(this._timeoutId);

        if (this._overViewShownID)
            Main.overview.disconnect(this._overViewShownID);
        if (this._overViewActiveID)
            Main.overview.disconnect(this._overViewActiveID);
        if (this._overViewHiddenID)
            Main.overview.disconnect(this._overViewHiddenID);
        if (this._monitorChangedID)
            Main.layoutManager.disconnect(this._monitorChangedID);
        if (this._workspaceChangedID)
            global.workspace_manager.disconnect(this._workspaceChangedID);

        if (this.keepOpenID)
            this.settings.disconnect(this.keepOpenID);
        if (this.iconFileID)
            this.settings.disconnect(this.iconFileID);
        if (this.useFavoritesID)
            this.settings.disconnect(this.useFavoritesID);
        if (this.appListID)
            this.settings.disconnect(this.appListID);
        if (this.indicatorChangedID)
            this.settings.disconnect(this.indicatorChangedID);
        if (this.currentWorkspaceAppID)
            this.settings.disconnect(this.currentWorkspaceAppID);
        if (this.applicationButtonID)
            this.settings.disconnect(this.applicationButtonID);
        if (this.accentColorID)
            this.settings.disconnect(this.accentColorID);
        if (this.blurEnabledID)
            this.settings.disconnect(this.blurEnabledID);
        if (this.blurRadiusID)
            this.settings.disconnect(this.blurRadiusID);
        if (this.bgOpacityID)
            this.settings.disconnect(this.bgOpacityID);
        if (this.borderRadiusID)
            this.settings.disconnect(this.borderRadiusID);
        if (this.openModeID)
            this.settings.disconnect(this.openModeID);
        if (this.installChangedID)
            this._appSystem.disconnect(this.installChangedID);
        if (this.appFavoritesChangedID)
            AppFavorites.getAppFavorites().disconnect(this.appFavoritesChangedID);
        if (this.appStateChangedID)
            this._appSystem.disconnect(this.appStateChangedID);

        if (this._clickTimeoutId) {
            GLib.source_remove(this._clickTimeoutId);
            this._clickTimeoutId = 0;
        }
        this._cancelLongPress();
        this._cancelHoverTimers();
        this._detachHoverOutsideClick();
        this._detachOutsideClick();
        this._aroundButtonManager.destroy();
        Main.layoutManager.removeChrome(this._label);
        Main.layoutManager.removeChrome(this);
        this._mainButton.destroy();
    }
});
