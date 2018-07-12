/* 
Copyright 2018 615283 (James Conway)

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

"use strict";

var RoonApi = require('node-roon-api'),
    RoonApiSettings = require('node-roon-api-settings'),
    RoonApiStautus = require('node-roon-api-status'),
    RoonApiTransport = require('node-roon-api-transport'),
    DiscordRPC = require('discord-rpc');

var _core = undefined;
var _transport = undefined;
var _settings = undefined;

const clientId = '464873958232162353';
const scopes = ['rpc', 'rpc.api', 'messages.read'];

DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({transport: 'ipc'});

rpc.login(clientId, {scopes, tokenEndpoint: 'https://www.615283.net'}).catch(console.error);

var roon = new RoonApi({
    extension_id: 'com.georlegacy.general.roon-discord-rp',
    display_name: 'Discord Rich Presence',
    display_version: '1.0',
    publisher: '615283 (James Conway)',
    email: 'j@wonacy.com',
    website: 'https://www.615283.net',

    core_paired: function (core) {
        _core = core;
        _transport = _core.services.RoonApiTransport;

        _transport.subscribe_zones(function (cmd, data) {
            console.log(cmd);
            if (cmd == "Changed") {
                if (data.zones_changed) {
                    data.zones_changed.forEach(zone => {
                        console.log(zone.zone_id);
                        console.log(my_settings.zone.zone_id);
                        //if (zone.zone_id === my_settings.zone.zone_id) {
                            if (zone.state === 'stopped') {
                                setActivityStopped();
                            } else if (zone.state === 'paused') {
                                setActivityPaused(zone.now_playing.two_line.line1, zone.now_playing.two_line.line2);
                            } else if (zone.state === 'loading') {
                                setActivityLoading();
                            } else if (zone.state === 'playing') {
                                setActivity(zone.now_playing.two_line.line1, zone.now_playing.two_line.line2, zone.now_playing.length, zone.now_playing.seek_position);
                            }
                        //}
                    });
                }
                if (data.zones_removed) {
                    data.zones_removed.forEach(zone => {
                       // if (zone.zone_id === my_settings.zone.zone_id) {
                            setActivityClosed();
                       // }
                    });
                }
            }
        });

    },

    core_unpaired: function (core) {
        _core = undefined;
        _transport = undefined;
    }
});

var my_settings = roon.load_config("settings") || {
};

function makelayout() {
    let l = {
        values: my_settings,
        layout: [],
        has_error: false
    };

    l.layout.push({
        type: "label",
        title: "The zone that will push to your Discord Rich Presence"
    });

    l.layout.push({
        type: "zone",
        title: "Zone",
        setting: "zone"
    });

    return l;
}

var svc_settings = new RoonApiSettings(roon, {
    get_settings: function (cb) {
        cb(makelayout());
    },
    save_settings: function (req, isdryrun, settings) {
        let l = makelayout(settings.values);
        req.send_complete(l.has_error ? "NotValid" : "Success", {settings: l});

        if (!isdryrun && !l.has_error) {
            my_settings = l.values;
            svc_settings.update_settings(l);
            roon.save_config("settings", my_settings);
        }
    }
});

roon.init_services({
    required_services: [RoonApiTransport],
    provided_services: [svc_settings]
});

roon.start_discovery();

async function setActivityClosed() {

    rpc.setActivity({
        details: 'Roon Status:',
        state: 'Closed or Crashed',
        largeImageKey: 'roon-main',
        largeImageText: 'Not using Roon.',
        smallImageKey: 'exit-symbol',
        smallImageText: 'Roon',
        instance: false,
    });

}

async function setActivity(line1, line2, songLength, currentSeek) {

    var startTimestamp = (new Date().getTime() / 1000) - currentSeek;
    var endTimestamp = startTimestamp + songLength;

    rpc.setActivity({
        details: line1,
        state: line2,
        startTimestamp,
        endTimestamp,
        largeImageKey: 'roon-main',
        largeImageText: 'Listening with Roon.',
        smallImageKey: 'play-symbol',
        smallImageText: 'Roon',
        instance: false,
    });

}

async function setActivityLoading() {

    rpc.setActivity({
        details: 'Loading...',
        largeImageKey: 'roon-main',
        largeImageText: 'Loading in Roon.',
        smallImageKey: 'roon-small',
        smallImageText: 'Roon',
        instance: false,
    });

}

async function setActivityPaused(line1, line2) {

    rpc.setActivity({
        details: '[Paused] ' + line1,
        state: line2,
        largeImageKey: 'roon-main',
        largeImageText: 'Paused on Roon.',
        smallImageKey: 'pause-symbol',
        smallImageText: 'Roon',
        instance: false,
    });

}

async function setActivityStopped() {

    rpc.setActivity({
        details: 'Not listening',
        largeImageKey: 'roon-main',
        largeImageText: 'Idling in Roon',
        smallImageKey: 'stop-symbol',
        smallImageText: 'Roon',
        instance: false,
    })

}