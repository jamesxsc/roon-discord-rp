// Copyright 2018 615283 (James Conway)
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

"use strict";

var RoonApi = require('node-roon-api'),
    RoonApiSettings = require('node-roon-api-settings'),
    RoonApiStautus = require('node-roon-api-status'),
    RoonApiTransport = require('node-roon-api-transport'),
    DiscordRPC = require('discord-rpc');

var _core = undefined;
var _transport = undefined;

const clientId = '464873958232162353';
const scopes = ['rpc', 'rpc.api', 'messages.read'];

DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({transport: 'ipc'});

rpc.login(clientId, { scopes }).catch(console.error);

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
        console.log(core.core_id,
            core.display_name,
            core.display_version,
            "-",
            "PAIRED");

        _transport.subscribe_zones(function (cmd, data) {
            if (cmd == "Changed") {
                console.log("is changed");
                if (data.zones_changed) {
                    console.log("zones_changed === true");
                    data.zones_changed.forEach(zone => {
                        zone.outputs.forEach(output => {
                            console.log("logging now playing:");
                            console.log(zone.now_playing);
                            console.log(zone.now_playing.seek_position !== undefined);
                        });
                    });
                }
            }

        });

    },

    core_unpaired: function (core) {
        _core = undefined;
        _transport = undefined;
        console.log(core.core_id,
            core.display_name,
            core.display_version,
            "-",
            "LOST");
    }
})

const clientId = '464873958232162353';

DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const startTimestamp = new Date();

async function setActivity() {
    if (!rpc || !mainWindow) {
        return;
    }

    rpc.setActivity({
        details: 'nein',
        state: 'no u',
        startTimestamp,
        largeImageKey: 'roon-main',
        largeImageText: 'tea is delicious',
        smallImageKey: 'roon-small',
        smallImageText: 'i am my own pillows',
        instance: false,
    });
}

rpc.on('ready', () => {
    setActivity();

    setInterval(() => {
        setActivity();
    }, 15e3);
});

rpc.login({ clientId }).catch(console.error);

roon.init_services({
    required_services: [RoonApiTransport]
});

roon.start_discovery();