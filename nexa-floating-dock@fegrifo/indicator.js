import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

export const Indicator = GObject.registerClass(
class Indicator extends St.Widget {
    _init(indicator, accentColor = '#ffffff') {
        super._init({
                      x_expand: true,
                      y_expand: true,
        });

        this._type = indicator[0];
        this._position = indicator[1];
        this._accentColor = accentColor;
        this._value = 0;
    }

    set value(value) {
        this.destroy_all_children();
        this._value = value > 4 ? 4 : value;
        for (let i = 1; i <= this._value; i++) {
            let dot;
            if (this._type == 'dash') {
                let sizeStyle = this._position == 'left'
                    ? 'width: 4px; height: 16px; margin-left: 2px; margin-bottom: 0px;'
                    : 'width: 16px; height: 4px; margin-bottom: 2px;';
                dot = new St.Widget({ style_class: 'app-running-dash',
                    style: `background-color: ${this._accentColor}; ${sizeStyle}`,
                    x_expand: true,
                    y_expand: true, });
            } else {
                dot = new St.Widget({ style_class: 'app-running-dot',
                    style: `background-color: ${this._accentColor};`,
                    x_expand: true,
                    y_expand: true, });
            }

            this.add_child(dot);
        }
    }

    vfunc_allocate(box) {
        super.vfunc_allocate(box);

        let children = this.get_children();
        if (children.length == 0)
            return;

        let contentBox = this.get_theme_node().get_content_box(box);

        let availWidth = (contentBox.x2 - contentBox.x1);
        let availHeight = (contentBox.y2 - contentBox.y1);

        let actorBox = new Clutter.ActorBox();
        let step = availWidth / (children.length + 1);
        for (let i = 0; i < children.length; i++) {
            let [, natWidth] = children[i].get_preferred_width(availHeight);
            let [, natHeight] = children[i].get_preferred_height(availWidth);

            if (this._position == 'bottom') {
                actorBox.x1 = contentBox.x1 + step * (i + 1) - (natWidth / 2);
                actorBox.x2 = actorBox.x1 + natWidth;
                actorBox.y1 = contentBox.y1 + availHeight - natHeight;
                actorBox.y2 = actorBox.y1 + natHeight;
            } else {
                actorBox.x1 = contentBox.x1;
                actorBox.x2 = actorBox.x1 + natWidth;
                actorBox.y1 = contentBox.y1 + step * (i + 1) - (natHeight / 2);
                actorBox.y2 = actorBox.y1 + natHeight;
            }
            children[i].allocate(actorBox);
        }
    }
});
