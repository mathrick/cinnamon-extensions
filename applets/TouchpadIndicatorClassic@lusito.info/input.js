/*
 * Copyright 2012 Santo Pfingsten <santo@lusito.info>
 *
 * Original Touchpad Indicator Python by Lorenzo Carbonell Cerezo
 * and Miguel Angel Santamaría Rogado:
 * https://launchpad.net/touchpad-indicator
 *
 * Used some parts of the Gnome 3 Extension from Armin Köhler:
 * https://extensions.gnome.org/extension/131/touchpad-indicator/
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const GLib = imports.gi.GLib;
const Util = imports.misc.util;

function execute_sync(command) {
    try {
        return GLib.spawn_command_line_sync(command);
    } catch (e) {
        global.logError(e);
        return false;
    }
}

function XInputManager() {
    this.refresh();
}

XInputManager.prototype = {
    refresh: function() {
        this.touchscreens = [];
        this.touchpads = [];
        this.mice = [];
        let all = this.getAllPointerIds();
        for (let i = 0; i < all.length; i++) {
            let info = this.getDeviceInfo(all[i]);
            if(info.touchscreen)
                this.touchscreens.push(all[i]);
            else if(info.touchpad)
                this.touchpads.push(all[i]);
            else if(info.mouse)
                this.mice.push(all[i]);
        }
    },

    getAllPointerIds: function() {
        var devids = new Array();
        let lines = execute_sync('xinput --list');
        if (lines) {
            lines = lines[1].toString().split('\n');
            for (let line = 0; line < lines.length; line++) {
                if (lines[line].indexOf('pointer')!=-1) {
                    let match = /\sid=([0-9]+)/g.exec(lines[line]);
                    if(match)
                        devids.push(match[1]);
                }
            }
        }
        return devids;
    },

    getDeviceInfo: function(id) {
        let node = this.getDeviceNode(id);
        let lines = execute_sync('udevadm info --query=env --name=' + node);
        let result = { touchscreen: false, touchpad: false, mouse: false };
        if (lines) {
            lines = lines[1].toString().split('\n');
            for (let line = 0; line < lines.length; line++) {
                if (lines[line].indexOf('ID_INPUT_TOUCHSCREEN=1')==0)
                    result.touchscreen = true;
                else if (lines[line].indexOf('ID_INPUT_TOUCHPAD=1')==0)
                    result.touchpad = true;
                else if (lines[line].indexOf('ID_INPUT_MOUSE=1')==0)
                    result.mouse = true;
            }
        }
        return result;
    },
    
    getDeviceNode: function(id) {
        let lines = execute_sync('xinput --list-props ' + id);
        if (lines) {
            let match = /\sDevice Node \([0-9]+\):\s*\"(.*)\"/g.exec(lines[1].toString());
            if(match)
                return match[1];
        }
        return null;
    },

    setDeviceEnabled: function(id, enabled) {
        Util.spawnCommandLine('xinput set-prop ' + id + ' "Device Enabled" ' + (enabled ? '1' : '0'));
    },

    enableAllDevices: function(devices, enabled) {
        for (let i = 0; i < devices.length; i++)
            this.setDeviceEnabled(devices[i], enabled);
    },

    isDeviceEnabled: function(id) {
        var lines = execute_sync('xinput --list-props ' + id);
        if (lines) {
            let match = /\sDevice Enabled \([0-9]+\):\s*1/g.exec(lines[1].toString());
            if(match)
                return true;
        }
        return false;
    },

    allDevicesEnabled: function(devices) {
        if (devices.length == 0)
            return false;

        for (let i = 0; i < devices.length; i++) {
            if (!this.isDeviceEnabled(devices[i]))
                return false;
        }
        return true;
    }
};

