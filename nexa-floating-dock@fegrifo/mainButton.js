import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {SwitchWorkspace} from './switchWorkspace.js';

const ICON_FILE = 'floating-dock-icon-file';
const ACCENT_COLOR = 'floating-dock-accent-color';
const DELAY = 3000;

export const MainButton = GObject.registerClass(
class MainButton extends St.Button {
    _init(iconSize, settings, dir) {
        super._init({ name: 'floating-dock-main-button',
                      style_class: 'button-box',
                      track_hover: true });

        this.settings = settings;
        this.iconSize = iconSize;
        this.dir = dir;
        this._watchId = 0;
        this._mouseIn = false;
        this._show = false;

        this.container = new St.Widget({
            width: this.iconSize,
            height: this.iconSize,
        });
        this.set_child(this.container);

        let accentColor = this.settings.get_string(ACCENT_COLOR);
        this.icon = new St.Icon({ icon_name: 'view-app-grid-symbolic',
                                  icon_size: this.iconSize,
                                  style: `color: ${accentColor};` });
        this.container.add_child(this.icon);

        let switchWorkspace = new SwitchWorkspace();
        this.connect('scroll-event', switchWorkspace.scrollEvent.bind(switchWorkspace));

        this.accentColorID = this.settings.connect("changed::" + ACCENT_COLOR, () => {
            let color = this.settings.get_string(ACCENT_COLOR);
            this.icon.set_style(`color: ${color};`);
        });

        this._addWatch();
    }

    _createButtonIcon() {
        let uri = this.settings.get_string(ICON_FILE)
        if (!GLib.file_test(uri, GLib.FileTest.EXISTS))
            uri = this.dir.get_path() + '/icons/flag.png';

        return  new Gio.FileIcon({ file: Gio.File.new_for_path(uri) });
    }

    createDragButton() {
        let accentColor = this.settings.get_string(ACCENT_COLOR);
        let icon = new St.Icon({ icon_name: 'view-app-grid-symbolic',
                                 icon_size: this.iconSize,
                                 style: `color: ${accentColor};` });
        let button= new St.Button({ name: 'floating-dock-main-button',
                                    child: icon });
        return button;
    }

    _addWatch() {
        if (this._watchId != 0)
            return;

        if (this._show)
            return;

        this._watchId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DELAY, () => {
            this._hideIcon();
            this._watchId = 0;
            return GLib.SOURCE_REMOVE;
        });
        GLib.Source.set_name_by_id(this._watchId, '[gnome-shell] mainButton show delay');
    }

    _removeWatch() {
        if (this._watchId > 0) {
            GLib.source_remove(this._watchId);
            this._watchId = 0;
        }
    }

    _showIcon() {
        this.icon.opacity = 255;
    }

    _hideIcon() {
        this.icon.opacity = 90;
    }

    vfunc_enter_event(crossingEvent) {
        this._mouseIn = true;
        this._removeWatch();
        this._showIcon();
        return super.vfunc_enter_event(crossingEvent);
    }

    vfunc_leave_event(crossingEvent) {
        this._mouseIn = false;
        this._addWatch();
        return super.vfunc_leave_event(crossingEvent);
    }

    showIcon(show) {
        this._show = show;
        if (show || this._mouseIn) {
            this._removeWatch();
            this._showIcon();
        } else {
            this._addWatch();
        }
    }

    destroy() {
        this._removeWatch();
        if (this.accentColorID > 0)
            this.settings.disconnect(this.accentColorID);
        super.destroy();
    }
});
