import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Params from 'resource:///org/gnome/shell/misc/params.js';
import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';
import {getTranslator} from './translations.js';

const SCHEMA = 'org.gnome.shell.extensions.nexa-floating-dock';
const APP_LIST = 'floating-dock-app-list';
const DIRECTION_ID = 'floating-dock-direction';

const SYSTEM_ACTIONS = ['lock-screen', 'logout', 'suspend', 'power-off'];

const DIRECTION = ['up', 'down', 'right', 'left'];
const RADIAL_SVG_ICONS = {
    'lock-screen': 'lock-symbolic.svg',
    'logout': 'logout-symbolic.svg',
    'suspend': 'suspend-symbolic.svg',
    'power-off': 'power-symbolic.svg',
    'up': 'up-symbolic.svg',
    'down': 'down-symbolic.svg',
    'right': 'right-symbolic.svg',
    'left': 'left-symbolic.svg',
};
const BUTTON_LABEL_KEYS = {
    'lock-screen': 'tooltip_lock',
    'logout': 'tooltip_logout',
    'suspend': 'tooltip_suspend',
    'power-off': 'tooltip_power',
    'up': 'tooltip_up',
    'down': 'tooltip_down',
    'right': 'tooltip_right',
    'left': 'tooltip_left',
};
const ACCENT_COLOR = 'floating-dock-accent-color';
const TOOLTIP_DELAY = 2000;

const ITEM_ANIMATION_TIME = 200;

const Actions = GObject.registerClass({
    Signals: {
        'do': { param_types: [GObject.TYPE_STRING] },
    },
}, class Actions extends St.Widget {
    _init() {
        super._init({});

        this._systemActions = new SystemActions.getDefault();
        this.connect('do', (button, id) => {
            this._systemActions.activateAction(id);
        });
    }
});

let actions = new Actions({});

export const AroundButtonManager = GObject.registerClass(
class AroundButtonManager extends St.Widget {
    _init(iconSize, mainButton, settings, dir) {
        super._init({});

        this._gsettings = settings;
        this._dir = dir;

        this.iconSize = iconSize;
        this._mainButton = mainButton;
        this.showAroundButton = false;

        this._aroundButtons = [];
        for (let i = 0; i < SYSTEM_ACTIONS.length; i++) {
            this._aroundButtons[i] = this.createButton(SYSTEM_ACTIONS[i], i);
        }
        for (let i = 0; i < DIRECTION.length; i++) {
            this._aroundButtons[i + DIRECTION.length] = 
                this.createButton(DIRECTION[i], i + DIRECTION.length);
            if ((i + SYSTEM_ACTIONS.length) == 7)
                break;
        }
        //this._userApps = (this._gsettings.get_string(APP_LIST)).split(';');
        //for (let i = 0; i < this._userApps.length; i++) {
            //this._aroundButtons[i + SYSTEM_ACTIONS.length] =
                //this.createButton(this._userApps[i], i + SYSTEM_ACTIONS.length);
            //if ((i + SYSTEM_ACTIONS.length) == 7)
                //break;
        //}

        this._aroundButtons.forEach( button => { this.add_child(button); });
        Main.layoutManager.addChrome(this);
        this._mainButtonHideId = this._mainButton.connect('hide', () => this.popupClose() );
        this._accentColorID = this._gsettings.connect('changed::' + ACCENT_COLOR, () => {
            let color = this._gsettings.get_string(ACCENT_COLOR);
            this._aroundButtons.forEach(button => button.setAccentColor(color));
        });
    }

    createButton(id, number) {
        let accentColor = this._gsettings.get_string(ACCENT_COLOR);
        let button = new AroundButton(id, number, this.iconSize, this._mainButton, this._dir, accentColor, this._gsettings);

        button.hide();
        button.connect('animation-complete', this.hideWidget.bind(this));
        button.connect('button-clicked', this.popupClose.bind(this));
        button.connect('direction-changed', this.directionChanged.bind(this));
        return button;
    }

    popup() {
        this.showAroundButton = !this.showAroundButton;
        if (this.showAroundButton)
            this.showButton(true);
        else
            this.hideButton(true);
    }

    popupClose() {
        this.showAroundButton = false;
        this.hideButton(false);
        this.set_position(0, 0);
        this.hide();
    }

    directionChanged(button, direction) {
        this.popupClose();
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._gsettings.set_string(DIRECTION_ID, direction);
            return GLib.SOURCE_REMOVE;
        });
    }

    showButton(animation) {
        this.set_position(0, 0);
        this.show();
        if (animation)
            this._aroundButtons.forEach( button => { button.showAnimation(); });
        else
            this._aroundButtons.forEach( button => { button.show(); });
    }

    hideButton(animation) {
        if (animation)
            this._aroundButtons.forEach( button => { button.hideAnimation(); });
        else
            this._aroundButtons.forEach( button => { button.hide(); });
        this.showAroundButton = false;
    }

    hideWidget(button, number) {
        if (number != this._aroundButtons.length - 1)
            return;

        this.hide();
    }

    destroy() {
        if (this._mainButtonHideId)
            this._mainButton.disconnect(this._mainButtonHideId);
        if (this._accentColorID)
            this._gsettings.disconnect(this._accentColorID);

        this._aroundButtons.forEach( button => { button.destroy(); });
        Main.layoutManager.removeChrome(this);

        super.destroy();
    }
});

const AroundButton = GObject.registerClass({
    Signals: {
        'animation-complete': { param_types: [GObject.TYPE_INT] },
        'button-clicked': {},
        'direction-changed': { param_types: [GObject.TYPE_STRING] },
    },
}, class AroundButton extends St.Button {
    _init(id, number, iconSize, mainButton, dir, accentColor = '#ffffff', settings = null) {
        super._init({ name: 'floating-dock-around-button',
                      x_align: Clutter.ActorAlign.CENTER,
                      y_align: Clutter.ActorAlign.CENTER,
                      reactive: true,
                      track_hover: true,
        });

        this.id = id;
        let appSys = Shell.AppSystem.get_default();
        this.isApp = appSys.lookup_app(id) ? true : false;
        this.isAction = SYSTEM_ACTIONS.includes(id) ? true : false;

        this.number = number;
        this.iconSize = iconSize;
        this.mainButton = mainButton;
        this._settings = settings;
        this._symbolicIcon = null;
        this.set_pivot_point(0.5, 0.5);
        this.scale = 0.8;
        this.scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;

        this._systemActions = new SystemActions.getDefault();

        let symbolicSize = Math.round(this.iconSize * 0.6);
        if (this.isApp) {
            let app = appSys.lookup_app(this.id);
            this.set_child(app.create_icon_texture(this.iconSize));
        } else {
            let fileName = RADIAL_SVG_ICONS[this.id];
            let iconFile = Gio.File.new_for_path(dir.get_path() + '/icons/' + fileName);
            this._symbolicIcon = new St.Icon({ gicon: new Gio.FileIcon({ file: iconFile }),
                                               icon_size: symbolicSize,
                                               style: `color: ${accentColor};` });
            this.set_child(this._symbolicIcon);
        }

        this.connect('clicked', this._onClicked.bind(this));
        this.connect('notify::hover', this._onHover.bind(this));

        this._tooltipTimeoutId = 0;
        this._tooltip = new St.Label({
            style_class: 'dash-label',
            text: this.id,
        });
        this._tooltip.hide();
        Main.layoutManager.addChrome(this._tooltip);
        this.connect('destroy', this._onDestroy.bind(this));
    }

    /*
     *       1
     *    0      2
     *   7  Main  3
     *    6      4
     *       5
     */
    setAccentColor(color) {
        if (this._symbolicIcon)
            this._symbolicIcon.set_style(`color: ${color};`);
    }

    _circle(box) {
        let R = this.iconSize * 1.8 * this.scaleFactor;
        let [, btnW] = this.get_preferred_width(-1);
        let [, btnH] = this.get_preferred_height(-1);
        let baseX = box.x1 + (box.x2 - box.x1 - btnW) / 2;
        let baseY = box.y1 + (box.y2 - box.y1 - btnH) / 2;

        let x, y;
        if (this.number == 0) {
            x = baseX - R * 0.7071;
            y = baseY - R * 0.7071;
        } else if (this.number == 1) {
            x = baseX;
            y = baseY - R;
        } else if (this.number == 2) {
            x = baseX + R * 0.7071;
            y = baseY - R * 0.7071;
        } else if (this.number == 7) {
            x = baseX - R;
            y = baseY;
        } else if (this.number == 3) {
            x = baseX + R;
            y = baseY;
        } else if (this.number == 6) {
            x = baseX - R * 0.7071;
            y = baseY + R * 0.7071;
        } else if (this.number == 5) {
            x = baseX;
            y = baseY + R;
        } else if (this.number == 4) {
            x = baseX + R * 0.7071;
            y = baseY + R * 0.7071;
        }

        return [x, y];
    }

    _getMainButtonBox() {
        let [x, y] = this.mainButton.get_transformed_position();
        let [w, h] = this.mainButton.get_size();
        let box = new Clutter.ActorBox();
        box.x1 = x;
        box.y1 = y;
        box.x2 = x + w;
        box.y2 = y + h;
        return box;
    }

    showAnimation() {
        let box = this._getMainButtonBox();
        let [, btnW] = this.get_preferred_width(-1);
        let [, btnH] = this.get_preferred_height(-1);
        let startX = box.x1 + (box.x2 - box.x1 - btnW) / 2;
        let startY = box.y1 + (box.y2 - box.y1 - btnH) / 2;

        this.show();
        this.set_position(startX, startY);

        let [x, y] = this._circle(box);
        this.scale = 0;
        this.ease({
            x: x,
            y: y,
            scale_x: 0.85,
            scale_y: 0.85,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            duration: ITEM_ANIMATION_TIME,
            onComplete: () => {}
            });
    }

    hideAnimation() {
        this._hideTooltip();
        let box = this._getMainButtonBox();
        let [, btnW] = this.get_preferred_width(-1);
        let [, btnH] = this.get_preferred_height(-1);
        let endX = box.x1 + (box.x2 - box.x1 - btnW) / 2;
        let endY = box.y1 + (box.y2 - box.y1 - btnH) / 2;

        this.scale = 1;
        this.ease({
            x: endX,
            y: endY,
            scale_x: 0,
            scale_y: 0,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            duration: ITEM_ANIMATION_TIME,
            onComplete: () => {
                this.hide();
                this.emit('animation-complete', this.number); }
        });
    }

    _onClicked() {
        this._hideTooltip();
        if (this.isApp) {
            let app = appSys.lookup_app(this.id);
            app.open_new_window(-1);
            this.emit('button-clicked');
        } else if (this.isAction) {
            this.emit('button-clicked');
            //this._systemActions.activateAction(this.id);
            actions.emit('do', this.id);
            return;
        } else {
            this.emit('direction-changed', this.id);
            return;
        }
    }

    _showTooltip() {
        if (this._settings && BUTTON_LABEL_KEYS[this.id]) {
            let t = getTranslator(this._settings);
            this._tooltip.set_text(t(BUTTON_LABEL_KEYS[this.id]));
        }
        let [bx, by] = this.get_transformed_position();
        let [bw] = this.get_size();
        let [, tw] = this._tooltip.get_preferred_width(-1);
        let [, th] = this._tooltip.get_preferred_height(-1);
        this._tooltip.set_position(Math.round(bx + (bw - tw) / 2), Math.round(by - th - 6));
        this._tooltip.show();
    }

    _hideTooltip() {
        if (this._tooltipTimeoutId > 0) {
            GLib.source_remove(this._tooltipTimeoutId);
            this._tooltipTimeoutId = 0;
        }
        if (this._tooltip)
            this._tooltip.hide();
    }

    _onDestroy() {
        this._hideTooltip();
        if (this._tooltip) {
            Main.layoutManager.removeChrome(this._tooltip);
            this._tooltip.destroy();
            this._tooltip = null;
        }
    }

    _onHover() {
        let scale;
        if (this.hover) {
            scale = 0.95;
            if (this._tooltipTimeoutId === 0) {
                this._tooltipTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TOOLTIP_DELAY, () => {
                    this._tooltipTimeoutId = 0;
                    if (this.hover && this.visible)
                        this._showTooltip();
                    return GLib.SOURCE_REMOVE;
                });
            }
        } else {
            scale = 0.85;
            this._hideTooltip();
        }

        this.ease({
            scale_x: scale,
            scale_y: scale,
        });
    }
});
