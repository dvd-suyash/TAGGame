const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});
app.use(express.static('public'));

const PLAYER_SIZE = 26;
const TAG_HORIZONTAL_DISTANCE = 48;
const TAG_VERTICAL_DISTANCE = 56;
const TAG_COOLDOWN_MS = 1000;
const DEFAULT_ROUND_DURATION_SECONDS = 75;
const ROUND_READY_SECONDS = 3;
const MIN_ROOM_PLAYERS = 2;
const MAX_ROOM_PLAYERS = 4;
const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 700;
const MAP_LAYOUT_WIDTH = 1259;
const MAP_LAYOUT_HEIGHT = 586;
const MAP_OFFSET_X = (CANVAS_WIDTH - MAP_LAYOUT_WIDTH) / 2;
const MAP_OFFSET_Y = (CANVAS_HEIGHT - MAP_LAYOUT_HEIGHT) / 2;
const MAP_DEFINITIONS = {
    map1: {
        id: 'map1',
        name: 'Classic',
        platformLayout: [
            { x: 0, y: 154, width: 111, height: 12, angle: 0 },
            { x: 139, y: 219, width: 81, height: 12, angle: 0 },
            { x: 23, y: 273, width: 81, height: 12, angle: 0 },
            { x: 255, y: 273, width: 170, height: 12, angle: 0 },
            { x: 449, y: 195, width: 169, height: 12, angle: 0 },
            { x: 604, y: 131, width: 169, height: 12, angle: 0 },
            { x: 760, y: 195, width: 269, height: 11, angle: 0 },
            { x: 920, y: 137, width: 163, height: 12, angle: 0 },
            { x: 1083, y: 137, width: 50, height: 12, angle: 30, rotationOrigin: 'left-center' },
            { x: 1164, y: 231, width: 59, height: 11, angle: 0 },
            { x: 926, y: 322, width: 221, height: 12, angle: 0 },
            { x: 476, y: 273, width: 297, height: 14, angle: 0 },
            { x: 421, y: 342, width: 391, height: 12, angle: 0 },
            { x: 664, y: 383, width: 164, height: 11, angle: 0 },
            { x: 2, y: 342, width: 290, height: 12, angle: 0 },
            { x: 70, y: 481, width: 149, height: 11, angle: 0 },
            { x: 246, y: 415, width: 185, height: 12, angle: 0 },
            { x: 431, y: 417, width: 186, height: 12, angle: 30, rotationOrigin: 'left-center' },
            { x: 915, y: 412, width: 158, height: 11, angle: 0 },
            { x: 832, y: 486, width: 362, height: 10, angle: 0 },
            { x: 2, y: 557, width: 1257, height: 29, angle: 0 },
            { x: -90, y: 290, width: 210, height: 12, angle: 30, rotationOrigin: 'left-center' }
        ],
        spawns: [
            { x: 101, y: 588 },
            { x: 1274, y: 588 },
            { x: 649, y: 304 },
            { x: 981, y: 353 }
        ]
    },
    map2: {
        id: 'map2',
        name: 'Maze',
        platformLayout: [
            { x: 2, y: 553, width: 1255, height: 28, angle: 0 },
            { x: 2, y: 0, width: 12, height: 553, angle: 0 },
            { x: 1245, y: 0, width: 12, height: 553, angle: 0 },
            { x: 42, y: 484, width: 220, height: 15, angle: 0 },
            { x: 330, y: 484, width: 186, height: 15, angle: 0 },
            { x: 742, y: 484, width: 186, height: 15, angle: 0 },
            { x: 996, y: 484, width: 220, height: 15, angle: 0 },
            { x: 42, y: 388, width: 176, height: 14, angle: 0 },
            { x: 334, y: 388, width: 216, height: 14, angle: 0 },
            { x: 690, y: 388, width: 216, height: 14, angle: 0 },
            { x: 1038, y: 388, width: 176, height: 14, angle: 0 },
            { x: 126, y: 286, width: 214, height: 14, angle: 0 },
            { x: 448, y: 286, width: 344, height: 15, angle: 0 },
            { x: 920, y: 286, width: 214, height: 14, angle: 0 },
            { x: 294, y: 236, width: 108, height: 11, angle: 0 },
            { x: 856, y: 236, width: 108, height: 11, angle: 0 },
            { x: 42, y: 184, width: 208, height: 14, angle: 0 },
            { x: 342, y: 184, width: 180, height: 14, angle: 0 },
            { x: 718, y: 184, width: 180, height: 14, angle: 0 },
            { x: 1008, y: 184, width: 208, height: 14, angle: 0 },
            { x: 470, y: 94, width: 300, height: 14, angle: 0 },
            { x: 334, y: 138, width: 104, height: 11, angle: 0 },
            { x: 802, y: 138, width: 104, height: 11, angle: 0 }
        ],
        spawns: [
            { x: 101, y: 507 },
            { x: 1274, y: 507 },
            { x: 620, y: 507 },
            { x: 621, y: 309 }
        ]
    },
    map3: {
        id: 'map3',
        name: 'Courtyard',
        platformLayout: [
            { x: 2, y: 553, width: 1255, height: 28, angle: 0 },
            { x: 2, y: 0, width: 12, height: 553, angle: 0 },
            { x: 1245, y: 0, width: 12, height: 553, angle: 0 },
            { x: 48, y: 476, width: 248, height: 14, angle: 0 },
            { x: 960, y: 476, width: 248, height: 14, angle: 0 },
            { x: 86, y: 376, width: 192, height: 14, angle: 0 },
            { x: 982, y: 376, width: 192, height: 14, angle: 0 },
            { x: 84, y: 188, width: 228, height: 14, angle: 0 },
            { x: 946, y: 188, width: 228, height: 14, angle: 0 },
            { x: 360, y: 476, width: 538, height: 15, angle: 0 },
            { x: 394, y: 376, width: 470, height: 15, angle: 0 },
            { x: 454, y: 188, width: 350, height: 15, angle: 0 },
            { x: 492, y: 270, width: 274, height: 15, angle: 0 },
            { x: 286, y: 270, width: 126, height: 11, angle: 0 },
            { x: 846, y: 270, width: 126, height: 11, angle: 0 },
            { x: 514, y: 116, width: 230, height: 11, angle: 0 }
        ],
        spawns: [
            { x: 155, y: 507 },
            { x: 1218, y: 507 },
            { x: 688, y: 507 },
            { x: 687, y: 301 }
        ]
    },
    map4: {
        id: 'map4',
        name: 'Cathedral',
        platformLayout: [
            { x: 2, y: 553, width: 1255, height: 28, angle: 0 },
            { x: 2, y: 0, width: 12, height: 553, angle: 0 },
            { x: 1245, y: 0, width: 12, height: 553, angle: 0 },
            { x: 304, y: 486, width: 170, height: 14, angle: 0 },
            { x: 785, y: 486, width: 170, height: 14, angle: 0 },
            { x: 226, y: 418, width: 210, height: 14, angle: 0 },
            { x: 823, y: 418, width: 210, height: 14, angle: 0 },
            { x: 140, y: 344, width: 244, height: 14, angle: 0 },
            { x: 875, y: 344, width: 244, height: 14, angle: 0 },
            { x: 530, y: 332, width: 200, height: 14, angle: 0 },
            { x: 86, y: 262, width: 286, height: 14, angle: 0 },
            { x: 887, y: 262, width: 286, height: 14, angle: 0 },
            { x: 480, y: 176, width: 300, height: 15, angle: 0 },
            { x: 552, y: 102, width: 154, height: 11, angle: 0 }
        ],
        spawns: [
            { x: 389, y: 507 },
            { x: 868, y: 507 },
            { x: 629, y: 353 },
            { x: 629, y: 197 }
        ]
    },
    map5: {
        id: 'map5',
        name: 'Split Bunker',
        platformLayout: [
            { x: 2, y: 553, width: 1255, height: 28, angle: 0 },
            { x: 2, y: 0, width: 12, height: 553, angle: 0 },
            { x: 1245, y: 0, width: 12, height: 553, angle: 0 },
            { x: 56, y: 486, width: 252, height: 14, angle: 0 },
            { x: 950, y: 486, width: 252, height: 14, angle: 0 },
            { x: 104, y: 382, width: 232, height: 14, angle: 0 },
            { x: 922, y: 382, width: 232, height: 14, angle: 0 },
            { x: 138, y: 236, width: 224, height: 14, angle: 0 },
            { x: 898, y: 236, width: 224, height: 14, angle: 0 },
            { x: 458, y: 458, width: 344, height: 11, angle: 0, motion: { axis: 'x', distance: 92, period: 4.8 } },
            { x: 496, y: 306, width: 268, height: 11, angle: 0, motion: { axis: 'x', distance: 64, period: 3.6 } },
            { x: 378, y: 228, width: 108, height: 11, angle: 0, motion: { axis: 'x', distance: 40, period: 2.8 } },
            { x: 774, y: 228, width: 108, height: 11, angle: 0, motion: { axis: 'x', distance: 40, period: 2.8, phase: Math.PI } },
            { x: 156, y: 132, width: 214, height: 14, angle: 0 },
            { x: 888, y: 132, width: 214, height: 14, angle: 0 }
        ],
        spawns: [
            { x: 115, y: 507 },
            { x: 1258, y: 507 },
            { x: 232, y: 403 },
            { x: 1026, y: 403 }
        ]
    }
};

// Store game rooms
const rooms = {};

function rotatePoint(x, y, angleRadians) {
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);
    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos
    };
}

function buildPlatformFromLayout(platform) {
    const width = platform.width;
    const height = platform.height;
    const angle = platform.angle || 0;
    const x = platform.x + MAP_OFFSET_X;
    const y = platform.y + MAP_OFFSET_Y;

    if (angle === 0 || !platform.rotationOrigin) {
        return {
            x,
            y,
            baseX: x,
            baseY: y,
            width,
            height,
            angle,
            motion: platform.motion
        };
    }

    const angleRadians = angle * Math.PI / 180;
    let centerX;
    let centerY;

    if (platform.rotationOrigin === 'left-center') {
        centerX = x + Math.cos(angleRadians) * (width / 2);
        centerY = y + height / 2 + Math.sin(angleRadians) * (width / 2);
    } else if (platform.rotationOrigin === 'right-center') {
        centerX = x + width - Math.cos(angleRadians) * (width / 2);
        centerY = y + height / 2 - Math.sin(angleRadians) * (width / 2);
    } else {
        centerX = x + width / 2;
        centerY = y + height / 2;
    }

    return {
        x: centerX - width / 2,
        y: centerY - height / 2,
        baseX: centerX - width / 2,
        baseY: centerY - height / 2,
        width,
        height,
        angle,
        motion: platform.motion
    };
}

function getPlatformMotionOffset(platform, elapsedSeconds) {
    if (!platform.motion) {
        return { x: 0, y: 0 };
    }

    const period = Math.max(platform.motion.period || 1, 0.001);
    const phase = platform.motion.phase || 0;
    const wave = Math.sin((elapsedSeconds / period) * Math.PI * 2 + phase);
    const distance = platform.motion.distance || 0;
    const axis = platform.motion.axis || 'x';

    return {
        x: axis === 'x' ? wave * distance : 0,
        y: axis === 'y' ? wave * distance : 0
    };
}

function getActiveServerPlatforms(room) {
    const elapsedSeconds = room.roundMotionStartAt
        ? Math.max((Date.now() - room.roundMotionStartAt) / 1000, 0)
        : 0;

    return room.serverPlatforms.map(platform => {
        const offset = room.roundLive ? getPlatformMotionOffset(platform, elapsedSeconds) : { x: 0, y: 0 };
        return {
            ...platform,
            x: platform.baseX + offset.x,
            y: platform.baseY + offset.y
        };
    });
}

function normalizeMapId(value) {
    return MAP_DEFINITIONS[value] ? value : 'map1';
}

function getMapDefinition(mapId) {
    return MAP_DEFINITIONS[normalizeMapId(mapId)];
}

function getServerPlatforms(mapId) {
    return getMapDefinition(mapId).platformLayout.map(buildPlatformFromLayout);
}

function getDistance(playerA, playerB) {
    const dx = (playerA.x + PLAYER_SIZE / 2) - (playerB.x + PLAYER_SIZE / 2);
    const dy = (playerA.y + PLAYER_SIZE / 2) - (playerB.y + PLAYER_SIZE / 2);
    return Math.sqrt(dx * dx + dy * dy);
}

function normalizeMaxPlayers(value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        return MIN_ROOM_PLAYERS;
    }
    return Math.max(MIN_ROOM_PLAYERS, Math.min(MAX_ROOM_PLAYERS, parsed));
}

function normalizeRoundDuration(value) {
    return DEFAULT_ROUND_DURATION_SECONDS;
}

function getSpawnPosition(playerNumber, mapId) {
    const spawnPoints = getMapDefinition(mapId).spawns;
    return spawnPoints[playerNumber - 1] || spawnPoints[0];
}

function createPlayerData(socketId, playerNumber, mapId) {
    const spawn = getSpawnPosition(playerNumber, mapId);

    return {
        id: socketId,
        number: playerNumber,
        x: spawn.x,
        y: spawn.y,
        velocityX: 0,
        velocityY: 0,
        isIt: false,
        color: '#4ecdc4'
    };
}

function emitRoomStatus(roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        return;
    }

    io.to(roomCode).emit('roomStatus', {
        roomCode,
        mapId: room.mapId,
        mapName: getMapDefinition(room.mapId).name,
        maxPlayers: room.maxPlayers,
        roundDuration: room.roundDuration,
        playersJoined: room.players.length,
        playersNeeded: Math.max(room.maxPlayers - room.players.length, 0)
    });
}

function pointInsidePlatform(x, y, platform) {
    const angleRadians = (platform.angle || 0) * Math.PI / 180;
    const centerX = platform.x + platform.width / 2;
    const centerY = platform.y + platform.height / 2;
    const relativeX = x - centerX;
    const relativeY = y - centerY;
    const localPoint = rotatePoint(relativeX, relativeY, -angleRadians);

    return Math.abs(localPoint.x) <= platform.width / 2 && Math.abs(localPoint.y) <= platform.height / 2;
}

function transformPointToPlatformLocal(point, platform) {
    const angleRadians = (platform.angle || 0) * Math.PI / 180;
    const centerX = platform.x + platform.width / 2;
    const centerY = platform.y + platform.height / 2;
    const relativeX = point.x - centerX;
    const relativeY = point.y - centerY;
    return rotatePoint(relativeX, relativeY, -angleRadians);
}

function segmentIntersectsExpandedPlatform(start, end, platform, padding = 0) {
    const startLocal = transformPointToPlatformLocal(start, platform);
    const endLocal = transformPointToPlatformLocal(end, platform);
    const minX = -platform.width / 2 - padding;
    const maxX = platform.width / 2 + padding;
    const minY = -platform.height / 2 - padding;
    const maxY = platform.height / 2 + padding;
    const dx = endLocal.x - startLocal.x;
    const dy = endLocal.y - startLocal.y;
    let t0 = 0;
    let t1 = 1;

    const clip = (p, q) => {
        if (p === 0) {
            return q >= 0;
        }

        const ratio = q / p;
        if (p < 0) {
            if (ratio > t1) {
                return false;
            }
            if (ratio > t0) {
                t0 = ratio;
            }
            return true;
        }

        if (ratio < t0) {
            return false;
        }
        if (ratio < t1) {
            t1 = ratio;
        }
        return true;
    };

    return clip(-dx, startLocal.x - minX)
        && clip(dx, maxX - startLocal.x)
        && clip(-dy, startLocal.y - minY)
        && clip(dy, maxY - startLocal.y)
        && t0 <= t1;
}

function isTagBlockedByPlatform(tagger, tagged, serverPlatforms) {
    const startX = tagger.x + PLAYER_SIZE / 2;
    const startY = tagger.y + PLAYER_SIZE / 2;
    const endX = tagged.x + PLAYER_SIZE / 2;
    const endY = tagged.y + PLAYER_SIZE / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const offsets = [0, -PLAYER_SIZE * 0.3, PLAYER_SIZE * 0.3];

    for (const platform of serverPlatforms) {
        for (const offset of offsets) {
            const start = {
                x: startX + normalX * offset,
                y: startY + normalY * offset
            };
            const end = {
                x: endX + normalX * offset,
                y: endY + normalY * offset
            };

            if (segmentIntersectsExpandedPlatform(start, end, platform, 2)) {
                return true;
            }
        }

        if (pointInsidePlatform(startX, startY, platform) || pointInsidePlatform(endX, endY, platform)) {
            return true;
        }
    }

    return false;
}

function canTag(room, tagger, tagged) {
    const activePlatforms = getActiveServerPlatforms(room);
    const dx = Math.abs((tagger.x + PLAYER_SIZE / 2) - (tagged.x + PLAYER_SIZE / 2));
    const dy = Math.abs((tagger.y + PLAYER_SIZE / 2) - (tagged.y + PLAYER_SIZE / 2));
    return dx <= TAG_HORIZONTAL_DISTANCE
        && dy <= TAG_VERTICAL_DISTANCE
        && !isTagBlockedByPlatform(tagger, tagged, activePlatforms);
}

function getActiveTagPair(room) {
    const tagger = room.players.find(player => player.isIt);
    if (!tagger) {
        return null;
    }

    const candidates = room.players
        .filter(player => player.id !== tagger.id && canTag(room, tagger, player))
        .sort((a, b) => getDistance(tagger, a) - getDistance(tagger, b));

    if (!candidates.length) {
        return null;
    }

    return { tagger, tagged: candidates[0] };
}

function applyTag(room, taggerId, taggedId, options = {}) {
    const now = Date.now();
    const tagger = room.players.find(player => player.id === taggerId);
    const tagged = room.players.find(player => player.id === taggedId);
    const force = Boolean(options.force);

    if (!tagger || !tagged || !tagger.isIt || tagged.isIt) {
        return null;
    }

    if (!force && now - room.lastTagAt < TAG_COOLDOWN_MS) {
        return null;
    }

    if (!force && !canTag(room, tagger, tagged)) {
        return null;
    }

    room.players.forEach(player => {
        player.isIt = player.id === taggedId;
    });
    room.lastTagAt = now;

    return {
        taggerId,
        taggedId,
        players: room.players
    };
}

function stopRoundTimer(room) {
    if (room && room.roundTimer) {
        clearInterval(room.roundTimer);
        room.roundTimer = null;
    }
}

function stopRoundCountdown(room) {
    if (room && room.roundCountdownTimer) {
        clearInterval(room.roundCountdownTimer);
        room.roundCountdownTimer = null;
    }
}

function resetPlayersForRound(room) {
    const startingItIndex = Math.floor(Math.random() * room.players.length);

    room.players.forEach((player, index) => {
        const isIt = index === startingItIndex;
        const spawn = getSpawnPosition(player.number, room.mapId);
        player.x = spawn.x;
        player.y = spawn.y;
        player.velocityX = 0;
        player.velocityY = 0;
        player.isIt = isIt;
        player.color = isIt ? '#ff6b6b' : '#4ecdc4';
    });
    room.lastTagAt = 0;
}

function endRound(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.gameEnded) {
        return;
    }

    const suddenDeathTag = getActiveTagPair(room);
    if (suddenDeathTag) {
        const tagEvent = applyTag(room, suddenDeathTag.tagger.id, suddenDeathTag.tagged.id, { force: true });
        if (tagEvent) {
            io.to(roomCode).emit('tagOccurred', tagEvent);
        }
    }

    const loser = room.players.find(player => player.isIt);
    room.gameEnded = true;
    room.roundLive = false;
    room.timeRemaining = 0;
    stopRoundTimer(room);
    stopRoundCountdown(room);

    io.to(roomCode).emit('timerUpdate', room.timeRemaining);
    io.to(roomCode).emit('gameOver', {
        loserId: loser ? loser.id : null,
        players: room.players
    });
}

function startRoundTimer(roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        return;
    }

    stopRoundTimer(room);

    room.roundTimer = setInterval(() => {
        const activeRoom = rooms[roomCode];
        if (!activeRoom || activeRoom.gameEnded || !activeRoom.roundLive) {
            stopRoundTimer(activeRoom || room);
            return;
        }

        activeRoom.timeRemaining = Math.max(activeRoom.timeRemaining - 1, 0);
        io.to(roomCode).emit('timerUpdate', activeRoom.timeRemaining);

        if (activeRoom.timeRemaining === 0) {
            endRound(roomCode);
        }
    }, 1000);
}

function startRoundCountdown(roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        return;
    }

    stopRoundCountdown(room);
    room.roundLive = false;
    room.gameEnded = false;

    let secondsRemaining = ROUND_READY_SECONDS;
    io.to(roomCode).emit('roundCountdown', secondsRemaining);

    room.roundCountdownTimer = setInterval(() => {
        const activeRoom = rooms[roomCode];
        if (!activeRoom || activeRoom.gameEnded) {
            stopRoundCountdown(activeRoom || room);
            return;
        }

        secondsRemaining -= 1;

        if (secondsRemaining > 0) {
            io.to(roomCode).emit('roundCountdown', secondsRemaining);
            return;
        }

        stopRoundCountdown(activeRoom);
        activeRoom.roundLive = true;
        activeRoom.roundMotionStartAt = Date.now();
        io.to(roomCode).emit('roundLive');
        startRoundTimer(roomCode);
    }, 1000);
}

function prepareRound(roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        return;
    }

    resetPlayersForRound(room);
    room.timeRemaining = room.roundDuration;
    room.gameEnded = false;
    room.roundLive = false;
    room.roundMotionStartAt = null;
    stopRoundTimer(room);
    stopRoundCountdown(room);

    io.to(roomCode).emit('gameStart', {
        players: room.players,
        timeRemaining: room.timeRemaining,
        readySeconds: ROUND_READY_SECONDS,
        roundDuration: room.roundDuration,
        mapId: room.mapId
    });
    startRoundCountdown(roomCode);
}


// Network optimization: 20Hz world update loop
setInterval(() => {
    for (const roomCode in rooms) {
        const room = rooms[roomCode];
        if (!room || room.players.length === 0) continue;

        // Pack players into Float32Array: [playerNumber, x, y, velocityX, velocityY, isIt]
        const buffer = new Float32Array(room.players.length * 6);
        for (let i = 0; i < room.players.length; i++) {
            const p = room.players[i];
            buffer[i * 6 + 0] = p.number;
            buffer[i * 6 + 1] = p.x;
            buffer[i * 6 + 2] = p.y;
            buffer[i * 6 + 3] = p.velocityX;
            buffer[i * 6 + 4] = p.velocityY;
            buffer[i * 6 + 5] = p.isIt ? 1 : 0;
        }
        io.to(roomCode).emit('tick', buffer.buffer);
    }
}, 50);

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Create or join a room
    socket.on('createRoom', (data) => {
        const maxPlayers = normalizeMaxPlayers(data && data.maxPlayers);
        const roundDuration = normalizeRoundDuration(data && data.roundDuration);
        const mapId = normalizeMapId(data && data.mapId);
        const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const hostPlayer = createPlayerData(socket.id, 1, mapId);

        rooms[roomCode] = {
            players: [hostPlayer],
            gameState: null,
            lastTagAt: 0,
            timeRemaining: roundDuration,
            roundTimer: null,
            roundCountdownTimer: null,
            gameEnded: false,
            roundLive: false,
            roundMotionStartAt: null,
            maxPlayers,
            roundDuration,
            mapId,
            serverPlatforms: getServerPlatforms(mapId)
        };
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.emit('roomCreated', roomCode);
        io.to(roomCode).emit('playerListUpdate', rooms[roomCode].players);
        socket.emit('roomJoined', {
            playerNumber: hostPlayer.number,
            roomCode,
            players: rooms[roomCode].players,
            maxPlayers,
            roundDuration,
            mapId
        });
        emitRoomStatus(roomCode);
        console.log('Room created:', roomCode);
    });

    
    socket.on('updateRoomSettings', (settings) => {
        if (!socket.roomCode) return;
        const room = rooms[socket.roomCode];
        if (room && room.players[0] && room.players[0].id === socket.id) {
            room.maxPlayers = settings.maxPlayers;
            room.mapId = settings.mapId;
            socket.to(socket.roomCode).emit('roomSettingsUpdated', settings);
        }
    });

    socket.on('joinRoom', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        if (room.players.length >= room.maxPlayers) {
            socket.emit('error', 'Room is full');
            return;
        }

        socket.join(roomCode);
        socket.roomCode = roomCode;
        
        const playerNumber = room.players.length + 1;
        const playerData = createPlayerData(socket.id, playerNumber, room.mapId);
        
        room.players.push(playerData);
        
        socket.emit('roomJoined', {
            playerNumber,
            roomCode,
            players: room.players,
            maxPlayers: room.maxPlayers,
            roundDuration: room.roundDuration,
            mapId: room.mapId
        });
        emitRoomStatus(roomCode);
        
        // If room is full, start the game
        if (room.players.length === room.maxPlayers) {
            prepareRound(roomCode);
        }
    });

    // Handle player movement
    socket.on('playerMove', (data) => {
        if (!socket.roomCode) return;
        const room = rooms[socket.roomCode];
        if (!room || room.gameEnded || !room.roundLive) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.x = data.x;
            player.y = data.y;
            player.velocityX = data.velocityX;
            player.velocityY = data.velocityY;
            
            // Broadcast to other players
            // Broadcast moved to 20Hz tick

            const activeTagPair = getActiveTagPair(room);
            if (activeTagPair) {
                const tagEvent = applyTag(room, activeTagPair.tagger.id, activeTagPair.tagged.id);
                if (tagEvent) {
                    io.to(socket.roomCode).emit('tagOccurred', tagEvent);
                }
            }
        }
    });


    socket.on('startGame', () => {
        if (!socket.roomCode) return;
        const room = rooms[socket.roomCode];
        if (!room) return;
        // Only host can start (player 0)
        if (room.players[0] && room.players[0].id === socket.id) {
            prepareRound(socket.roomCode);
        }
    });

    socket.on('playAgain', () => {
        if (!socket.roomCode) return;
        const room = rooms[socket.roomCode];
        if (!room || !room.gameEnded || room.players.length < 2) return;

        prepareRound(socket.roomCode);
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        if (socket.roomCode && rooms[socket.roomCode]) {
            const room = rooms[socket.roomCode];
            room.players = room.players.filter(p => p.id !== socket.id);
            stopRoundTimer(room);
            stopRoundCountdown(room);
            
            if (room.players.length === 0) {
                delete rooms[socket.roomCode];
            } else {
                emitRoomStatus(socket.roomCode);
                io.to(socket.roomCode).emit('playerListUpdate', rooms[socket.roomCode].players);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];

    for (let iface of Object.values(networkInterfaces)) {
        for (let info of iface) {
            if (info.family === 'IPv4' && !info.internal) {
                addresses.push(info.address);
            }
        }
    }

    console.log(`✅ Server running locally on: http://localhost:${PORT}`);
    if (addresses.length) {
        console.log(`🌐 On your network, others can connect via: http://${addresses[0]}:${PORT}`);
    } else {
        console.log('⚠️ Could not detect a network IP address.');
    }
});
