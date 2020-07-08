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

const   RoonApi             = require('node-roon-api'),
        RoonApiSettings     = require('node-roon-api-settings'),
        RoonApiStatus       = require('node-roon-api-status'),
        RoonApiTransport    = require('node-roon-api-transport'),
        DiscordRPC          = require('./node_modules/discord-rpc');

let _core         = undefined;
let _transport    = undefined;
const _settings   = undefined;

const clientId  = '464873958232162353';
const client    = require('discord-rich-presence')(clientId);

let roon = new RoonApi({
    extension_id:       'com.georlegacy.general.roon-discord-rp',
    display_name:       'Discord Rich Presence',
    display_version:    '1.0',
    publisher:          '615283 (James Conway)',
    email:              'j@wonacy.com',
    website:            'https://www.615283.net',

    core_paired: function (core) {
        _core = core;

        // noinspection JSUnresolvedVariable
        _transport = _core.services.RoonApiTransport;

        _transport.subscribe_zones(function (cmd, data) {
            console.log(cmd);
            if (cmd === "Changed") {
                // noinspection JSUnresolvedVariable
                if (data.zones_changed) {
                    data.zones_changed.forEach(zone => {
                        setStateFromZone(zone)
                    });
                }
                // noinspection JSUnresolvedVariable
                if (data.zones_seek_changed) {
                    data.zones_seek_changed.forEach(change => {
                        let transportZones = [];
                        for (let key in _transport._zones)
                            transportZones.push(_transport._zones[key]);
                        for (let zone of transportZones) {
                            for (let zoneChanged of data.zones_seek_changed) {
                                if (zone.zone_id === zoneChanged.zone_id) {
                                    setStateFromZone(zone)
                                }
                            }
                        }
                    });
                }
                // noinspection JSUnresolvedVariable
                if (data.zones_removed) {
                    // noinspection JSIgnoredPromiseFromCall
                    setActivityClosed();
                }
            }
        });

    },

    core_unpaired: function (core) {
        _core = undefined;
        _transport = undefined;
    }
});

let my_settings = roon.load_config("settings") || {
};

function makelayout(settings) {
    let l = {
        values:     settings,
        layout:     [],
        has_error:  false
    };

    l.layout.push({
        type:   "label",
        title:  "The zone that will push to your Discord Rich Presence"
    });

    l.layout.push({
        type:       "zone",
        title:      "Zone",
        setting:    "zone"
    });
    return l;
}

let svc_settings = new RoonApiSettings(roon, {
    get_settings: function (cb) {
        cb(makelayout(my_settings));
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

function setStateFromZone(zone) {
    // noinspection JSUnresolvedVariable
    for (let output of zone.outputs) {
        if (my_settings.zone && output.output_id === my_settings.zone.output_id) {
            if (zone.state === 'stopped') {
                // noinspection JSIgnoredPromiseFromCall
                setActivityStopped();
            } else if (zone.state === 'paused') {
                // noinspection JSIgnoredPromiseFromCall
                setActivityPaused(zone.now_playing.two_line.line1, zone.now_playing.two_line.line2, zone.display_name);
            } else if (zone.state === 'loading') {
                // noinspection JSIgnoredPromiseFromCall
                setActivityLoading(zone.display_name);
            } else if (zone.state === 'playing') {
                // noinspection JSIgnoredPromiseFromCall
                setActivity(zone.now_playing.two_line.line1, zone.now_playing.two_line.line2, zone.now_playing.length, zone.now_playing.seek_position, zone.display_name);
            }
        }
    }
}

async function setActivityClosed() {
    client.updatePresence({
        details:        'Output Status:',
        state:          'Closed or Crashed',
        largeImageKey:  'roon-main',
        largeImageText: 'Not using Roon.',
        smallImageKey:  'exit-symbol',
        smallImageText: 'Roon',
        instance:       false,
    });
}

async function setActivity(line1, line2, songLength, currentSeek, zoneName) {
    const startTimestamp = Math.round((new Date().getTime() / 1000) - currentSeek);
    const endTimestamp = Math.round(startTimestamp + songLength);
    
    client.updatePresence({
        details: line1,
        state: line2,
        startTimestamp,
        endTimestamp,
        largeImageKey: 'roon-main',
        largeImageText: 'Zone: ' + zoneName,
        smallImageKey: 'play-symbol',
        smallImageText: 'Roon',
        instance: false,
    });
}

async function setActivityLoading(zoneName) {
    client.updatePresence({
        details: 'Loading...',
        largeImageKey: 'roon-main',
        largeImageText: 'Zone: ' + zoneName,
        smallImageKey: 'roon-small',
        smallImageText: 'Roon',
        instance: false,
    });
}

async function setActivityPaused(line1, line2, zoneName) {
    client.updatePresence({
        details: '[Paused] ' + line1,
        state: line2,
        largeImageKey: 'roon-main',
        largeImageText: 'Zone: ' + zoneName,
        smallImageKey: 'pause-symbol',
        smallImageText: 'Roon',
        instance: false,
    });
}

async function setActivityStopped() {
    client.updatePresence({
        details: 'Not listening',
        largeImageKey: 'roon-main',
        largeImageText: 'Idling in Roon',
        smallImageKey: 'stop-symbol',
        smallImageText: 'Roon',
        instance: false,
    })
}