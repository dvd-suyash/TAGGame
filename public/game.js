const socket = io();

// Game variables
let myPlayerId = null;
let myPlayerNumber = null;
let currentRoomCode = null;
let players = {};
let platforms = [];
let keys = {};
let gameStarted = false;
let gameOver = false;
let roundActive = false;
let timeRemaining = 75;
let lastFrameTime = null;
let selectedMaxPlayers = null;
let selectedRoundDuration = 75;
let selectedMapId = 'map1';
let currentMapId = 'map1';
let selectedLobbyMode = null;
let jumpBufferTime = 0;
let coyoteTime = 0;
let roundMotionStartTime = null;
let supportedPlatformId = null;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playAgainBtn = document.getElementById('playAgainBtn');
const playerCountButtons = document.querySelectorAll('.player-count-btn');
const mapCarousel = document.getElementById('mapCarousel');
let mapButtons = [];
const chooseCreateBtn = document.getElementById('chooseCreateBtn');
const chooseJoinBtn = document.getElementById('chooseJoinBtn');
const createRoomPanel = document.getElementById('createRoomPanel');
const joinRoomPanel = document.getElementById('joinRoomPanel');
const roundBanner = document.getElementById('roundBanner');
let isRecenteringMapCarousel = false;
canvas.width = 1400;
canvas.height = 700;

// Game constants
const GRAVITY = 3200;
const JUMP_STRENGTH = -880;
const MOVE_SPEED = 350;
const PLAYER_SIZE = 26;
const COLLISION_DISTANCE = 40;
const GROUND_ACCELERATION = 4200;
const AIR_ACCELERATION = 3900;
const GROUND_FRICTION = 4600;
const AIR_FRICTION = 250;
const COYOTE_TIME_SECONDS = 0.15;
const JUMP_BUFFER_SECONDS = 0.15;
const REMOTE_INTERPOLATION_SECONDS = 0.05;
const MAP_LAYOUT_WIDTH = 1259;
const MAP_LAYOUT_HEIGHT = 586;
const MAP_OFFSET_X = (canvas.width - MAP_LAYOUT_WIDTH) / 2;
const MAP_OFFSET_Y = (canvas.height - MAP_LAYOUT_HEIGHT) / 2;
const MAP_BOUNDS = {
    left: MAP_OFFSET_X,
    top: MAP_OFFSET_Y,
    right: MAP_OFFSET_X + MAP_LAYOUT_WIDTH,
    bottom: MAP_OFFSET_Y + MAP_LAYOUT_HEIGHT
};
const MAP_DEFINITIONS = {
    map1: {
        id: 'map1',
        name: 'Classic',
        subtitle: 'Classic',
        platformLayout: [
            { x: 0, y: 154, width: 111, height: 12, angle: 0 },
            { x: 139, y: 219, width: 81, height: 12, angle: 0 },
            { x: 23, y: 273, width: 81, height: 12, angle: 0 },
            { x: 255, y: 273, width: 170, height: 12, angle: 0 },
            { x: 449, y: 195, width: 169, height: 12, angle: 0 },
            { x: 604, y: 131, width: 169, height: 12, angle: 0 },
            { x: 760, y: 195, width: 269, height: 11, angle: 0 },
            { x: 920, y: 137, width: 163, height: 12, angle: 0, seamGroup: 'upper-right-ramp' },
            { x: 1083, y: 137, width: 50, height: 12, angle: 30, rotationOrigin: 'left-center', seamGroup: 'upper-right-ramp' },
            { x: 1164, y: 231, width: 59, height: 11, angle: 0 },
            { x: 926, y: 322, width: 221, height: 12, angle: 0 },
            { x: 476, y: 273, width: 297, height: 14, angle: 0 },
            { x: 421, y: 342, width: 391, height: 12, angle: 0 },
            { x: 664, y: 383, width: 164, height: 11, angle: 0 },
            { x: 2, y: 342, width: 290, height: 12, angle: 0 },
            { x: 70, y: 481, width: 149, height: 11, angle: 0 },
            { x: 246, y: 415, width: 185, height: 12, angle: 0, seamGroup: 'mid-left-ramp' },
            { x: 431, y: 417, width: 186, height: 12, angle: 30, rotationOrigin: 'left-center', seamGroup: 'mid-left-ramp' },
            { x: 915, y: 412, width: 158, height: 11, angle: 0 },
            { x: 832, y: 486, width: 362, height: 10, angle: 0 },
            { x: 2, y: 557, width: 1257, height: 29, angle: 0, surfaceRatio: 0.35, seamGroup: 'bottom-left-ramp' },
            { x: -90, y: 290, width: 210, height: 12, angle: 30, rotationOrigin: 'left-center', seamGroup: 'bottom-left-ramp' }
        ],
        backgroundEllipses: [
            { x: 120, y: 530, rx: 200, ry: 120, tier: 'deep', alpha: 0.6 },
            { x: 370, y: 510, rx: 240, ry: 140, tier: 'deep', alpha: 0.56 },
            { x: 640, y: 490, rx: 280, ry: 160, tier: 'deep', alpha: 0.52 },
            { x: 950, y: 510, rx: 260, ry: 140, tier: 'deep', alpha: 0.56 },
            { x: 1200, y: 530, rx: 200, ry: 120, tier: 'deep', alpha: 0.58 },
            { x: 200, y: 460, rx: 160, ry: 90, tier: 'mid', alpha: 0.33 },
            { x: 500, y: 440, rx: 180, ry: 100, tier: 'mid', alpha: 0.28 },
            { x: 800, y: 450, rx: 200, ry: 110, tier: 'mid', alpha: 0.3 },
            { x: 1100, y: 455, rx: 170, ry: 95, tier: 'mid', alpha: 0.32 },
            { x: 80, y: 510, rx: 70, ry: 40, tier: 'snow', alpha: 0.18 },
            { x: 430, y: 505, rx: 65, ry: 38, tier: 'snow', alpha: 0.16 },
            { x: 680, y: 500, rx: 75, ry: 42, tier: 'snow', alpha: 0.18 },
            { x: 920, y: 505, rx: 68, ry: 40, tier: 'snow', alpha: 0.16 },
            { x: 1180, y: 510, rx: 70, ry: 40, tier: 'snow', alpha: 0.18 },
            { x: 390, y: 300, rx: 75, ry: 38, tier: 'cloud', alpha: 0.12 },
            { x: 440, y: 295, rx: 55, ry: 32, tier: 'cloud', alpha: 0.12 },
            { x: 500, y: 450, rx: 55, ry: 28, tier: 'cloud', alpha: 0.11 },
            { x: 840, y: 350, rx: 80, ry: 40, tier: 'cloud', alpha: 0.12 },
            { x: 900, y: 345, rx: 60, ry: 35, tier: 'cloud', alpha: 0.12 },
            { x: 1080, y: 410, rx: 70, ry: 35, tier: 'cloud', alpha: 0.11 }
        ],
        stumps: [],
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
        subtitle: 'Maze',
        theme: 'maze',
        platformLayout: [
            { x: 2, y: 553, width: 1255, height: 28, angle: 0, surfaceRatio: 0.3 },
            { x: 2, y: 0, width: 12, height: 553, angle: 0, surfaceRatio: 0.35 },
            { x: 1245, y: 0, width: 12, height: 553, angle: 0, surfaceRatio: 0.35 },
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
            { x: 294, y: 236, width: 108, height: 11, angle: 0, surfaceRatio: 0.36 },
            { x: 856, y: 236, width: 108, height: 11, angle: 0, surfaceRatio: 0.36 },
            { x: 42, y: 184, width: 208, height: 14, angle: 0 },
            { x: 342, y: 184, width: 180, height: 14, angle: 0 },
            { x: 718, y: 184, width: 180, height: 14, angle: 0 },
            { x: 1008, y: 184, width: 208, height: 14, angle: 0 },
            { x: 470, y: 94, width: 300, height: 14, angle: 0 },
            { x: 334, y: 138, width: 104, height: 11, angle: 0, surfaceRatio: 0.36 },
            { x: 802, y: 138, width: 104, height: 11, angle: 0, surfaceRatio: 0.36 }
        ],
        backgroundEllipses: [
            { x: 170, y: 586, rx: 270, ry: 150, tier: 'maze-deep', alpha: 0.55 },
            { x: 485, y: 586, rx: 300, ry: 170, tier: 'maze-deep', alpha: 0.48 },
            { x: 820, y: 586, rx: 320, ry: 185, tier: 'maze-deep', alpha: 0.5 },
            { x: 1140, y: 586, rx: 250, ry: 145, tier: 'maze-deep', alpha: 0.55 },
            { x: 255, y: 520, rx: 190, ry: 95, tier: 'maze-mid', alpha: 0.36 },
            { x: 640, y: 505, rx: 240, ry: 110, tier: 'maze-mid', alpha: 0.3 },
            { x: 1015, y: 518, rx: 190, ry: 96, tier: 'maze-mid', alpha: 0.36 },
            { x: 95, y: 558, rx: 88, ry: 34, tier: 'maze-snow', alpha: 0.2 },
            { x: 325, y: 560, rx: 92, ry: 36, tier: 'maze-snow', alpha: 0.18 },
            { x: 640, y: 558, rx: 126, ry: 42, tier: 'maze-snow', alpha: 0.2 },
            { x: 940, y: 560, rx: 92, ry: 36, tier: 'maze-snow', alpha: 0.18 },
            { x: 1172, y: 558, rx: 88, ry: 34, tier: 'maze-snow', alpha: 0.2 },
            { x: 180, y: 142, rx: 72, ry: 34, tier: 'maze-cloud', alpha: 0.16 },
            { x: 235, y: 136, rx: 48, ry: 24, tier: 'maze-cloud', alpha: 0.15 },
            { x: 1030, y: 158, rx: 78, ry: 36, tier: 'maze-cloud', alpha: 0.16 },
            { x: 1094, y: 152, rx: 50, ry: 24, tier: 'maze-cloud', alpha: 0.14 },
            { x: 620, y: 210, rx: 96, ry: 43, tier: 'maze-cloud', alpha: 0.08 }
        ],
        stumps: [
            { x: 102, y: 436, width: 18, height: 86, crownRx: 34, crownRy: 18 },
            { x: 557, y: 388, width: 20, height: 112, crownRx: 42, crownRy: 21 },
            { x: 1125, y: 436, width: 18, height: 86, crownRx: 34, crownRy: 18 }
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
        subtitle: 'Courtyard',
        theme: 'courtyard',
        platformLayout: [
            { x: 2, y: 553, width: 1255, height: 28, angle: 0, surfaceRatio: 0.3 },
            { x: 2, y: 0, width: 12, height: 553, angle: 0, surfaceRatio: 0.35 },
            { x: 1245, y: 0, width: 12, height: 553, angle: 0, surfaceRatio: 0.35 },
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
            { x: 286, y: 270, width: 126, height: 11, angle: 0, surfaceRatio: 0.36 },
            { x: 846, y: 270, width: 126, height: 11, angle: 0, surfaceRatio: 0.36 },
            { x: 514, y: 116, width: 230, height: 11, angle: 0, surfaceRatio: 0.36 }
        ],
        backgroundEllipses: [],
        stumps: [],
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
        subtitle: 'Cathedral',
        theme: 'cathedral',
        platformLayout: [
            { x: 2, y: 553, width: 1255, height: 28, angle: 0, surfaceRatio: 0.3 },
            { x: 2, y: 0, width: 12, height: 553, angle: 0, surfaceRatio: 0.35 },
            { x: 1245, y: 0, width: 12, height: 553, angle: 0, surfaceRatio: 0.35 },
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
            { x: 552, y: 102, width: 154, height: 11, angle: 0, surfaceRatio: 0.36 }
        ],
        backgroundEllipses: [],
        stumps: [],
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
        subtitle: 'Moving Platforms',
        theme: 'bunker',
        platformLayout: [
            { x: 2, y: 553, width: 1255, height: 28, angle: 0, surfaceRatio: 0.3 },
            { x: 2, y: 0, width: 12, height: 553, angle: 0, surfaceRatio: 0.35 },
            { x: 1245, y: 0, width: 12, height: 553, angle: 0, surfaceRatio: 0.35 },
            { x: 56, y: 486, width: 252, height: 14, angle: 0, styleRole: 'safe' },
            { x: 950, y: 486, width: 252, height: 14, angle: 0, styleRole: 'safe' },
            { x: 104, y: 382, width: 232, height: 14, angle: 0, styleRole: 'chamber' },
            { x: 922, y: 382, width: 232, height: 14, angle: 0, styleRole: 'chamber' },
            { x: 138, y: 236, width: 224, height: 14, angle: 0, styleRole: 'chamber' },
            { x: 898, y: 236, width: 224, height: 14, angle: 0, styleRole: 'chamber' },
            { x: 458, y: 458, width: 344, height: 11, angle: 0, surfaceRatio: 0.36, motion: { axis: 'x', distance: 92, period: 4.8 }, styleRole: 'mover' },
            { x: 496, y: 306, width: 268, height: 11, angle: 0, surfaceRatio: 0.36, motion: { axis: 'x', distance: 64, period: 3.6 }, styleRole: 'mover' },
            { x: 378, y: 228, width: 108, height: 11, angle: 0, surfaceRatio: 0.36, motion: { axis: 'x', distance: 40, period: 2.8 }, styleRole: 'mover' },
            { x: 774, y: 228, width: 108, height: 11, angle: 0, surfaceRatio: 0.36, motion: { axis: 'x', distance: 40, period: 2.8, phase: Math.PI }, styleRole: 'mover' },
            { x: 156, y: 132, width: 214, height: 14, angle: 0, styleRole: 'roof' },
            { x: 888, y: 132, width: 214, height: 14, angle: 0, styleRole: 'roof' }
        ],
        backgroundEllipses: [],
        stumps: [],
        spawns: [
            { x: 115, y: 507 },
            { x: 1258, y: 507 },
            { x: 232, y: 403 },
            { x: 1026, y: 403 }
        ]
    }
};

function getMapDefinition(mapId = currentMapId) {
    return MAP_DEFINITIONS[mapId] || MAP_DEFINITIONS.map1;
}

function buildPlatformFromLayout(platform, index) {
    const width = platform.width;
    const height = platform.height;
    const angle = platform.angle || 0;
    const x = platform.x + MAP_OFFSET_X;
    const y = platform.y + MAP_OFFSET_Y;

    if (angle === 0 || !platform.rotationOrigin) {
        return {
            id: index,
            x,
            y,
            baseX: x,
            baseY: y,
            width,
            height,
            angle,
            seamGroup: platform.seamGroup,
            surfaceRatio: platform.surfaceRatio,
            motion: platform.motion,
            styleRole: platform.styleRole,
            deltaX: 0,
            deltaY: 0
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
        id: index,
        x: centerX - width / 2,
        y: centerY - height / 2,
        baseX: centerX - width / 2,
        baseY: centerY - height / 2,
        width,
        height,
        angle,
        seamGroup: platform.seamGroup,
        surfaceRatio: platform.surfaceRatio,
        motion: platform.motion,
        styleRole: platform.styleRole,
        deltaX: 0,
        deltaY: 0
    };
}

function initPlatforms() {
    platforms = getMapDefinition().platformLayout.map((platform, index) => buildPlatformFromLayout(platform, index));
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

function updatePlatforms(currentTimestamp) {
    const canMovePlatforms = roundActive && roundMotionStartTime !== null;
    const elapsedSeconds = canMovePlatforms
        ? Math.max((currentTimestamp - roundMotionStartTime) / 1000, 0)
        : 0;

    platforms.forEach(platform => {
        const previousX = platform.x;
        const previousY = platform.y;
        const offset = canMovePlatforms ? getPlatformMotionOffset(platform, elapsedSeconds) : { x: 0, y: 0 };
        platform.x = platform.baseX + offset.x;
        platform.y = platform.baseY + offset.y;
        platform.deltaX = platform.x - previousX;
        platform.deltaY = platform.y - previousY;
    });
}

function rotatePoint(x, y, angleRadians) {
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);

    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos
    };
}

function approach(current, target, maxDelta) {
    if (current < target) {
        return Math.min(current + maxDelta, target);
    }
    return Math.max(current - maxDelta, target);
}

function getPlatformTopEdge(platform) {
    const angleRadians = (platform.angle || 0) * Math.PI / 180;
    const halfWidth = platform.width / 2;
    const halfHeight = platform.height / 2;
    const centerX = platform.x + halfWidth;
    const centerY = platform.y + halfHeight;
    const start = rotatePoint(-halfWidth, -halfHeight, angleRadians);
    const end = rotatePoint(halfWidth, -halfHeight, angleRadians);

    return {
        start: {
            x: centerX + start.x,
            y: centerY + start.y
        },
        end: {
            x: centerX + end.x,
            y: centerY + end.y
        }
    };
}

function setMapButtonsState(disabled) {
    mapButtons.forEach(button => {
        button.disabled = disabled;
    });
}

function refreshMapButtons() {
    mapButtons = Array.from(document.querySelectorAll('.map-stage-card'));
}

function updateMapSelectionUI() {
    mapButtons.forEach(button => {
        const isSelected = button.dataset.mapId === selectedMapId;
        button.classList.toggle('active', isSelected);
    });
}

function setActiveScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.toggle('active', screen.id === screenId);
    });
}

function updateLobbySummaries() {
    const map = getMapDefinition(selectedMapId);
    const sizeText = selectedMaxPlayers
        ? `${selectedMaxPlayers} player${selectedMaxPlayers === 1 ? '' : 's'}`
        : 'Match size pending';
    const mapText = map ? map.name : 'Map pending';
    const summaryText = `${sizeText} • ${mapText} • ${selectedRoundDuration}s round`;

    const mapCountSummary = document.getElementById('mapCountSummary');
    const modeSummary = document.getElementById('modeSummary');
    const roomSetupSummary = document.getElementById('roomSetupSummary');

    if (mapCountSummary) {
        mapCountSummary.textContent = `${sizeText} locked • ${selectedRoundDuration}s rounds`;
    }
    if (modeSummary) {
        modeSummary.textContent = summaryText;
    }
    if (roomSetupSummary) {
        roomSetupSummary.textContent = summaryText;
    }
}

function updateRoomModeUI() {
    const isJoin = selectedLobbyMode === 'join';
    const roomEyebrow = document.getElementById('roomEyebrow');
    const roomSubtitle = document.getElementById('roomSubtitle');
    const roomActionLabel = document.getElementById('roomActionLabel');

    createRoomPanel.classList.toggle('hidden', isJoin);
    joinRoomPanel.classList.toggle('hidden', !isJoin);

    if (roomEyebrow) {
        roomEyebrow.textContent = isJoin ? 'Join Match' : 'Host Match';
    }
    if (roomSubtitle) {
        roomSubtitle.textContent = isJoin
            ? 'Enter the room code below. The host settings will override your local preview once you join.'
            : 'Create the room with the selected player count and map. The match will start automatically when the room fills.';
    }
    if (roomActionLabel) {
        roomActionLabel.textContent = isJoin ? 'Enter Code' : 'Create Room';
    }
}

function updateSelectedMapLabel() {
    updateLobbySummaries();
}

function scrollSelectedMapIntoView(behavior = 'smooth') {
    const baseCards = mapButtons.filter(button => !button.classList.contains('map-stage-clone'));
    const selectedCard = baseCards.find(button => button.dataset.mapId === selectedMapId);
    if (selectedCard) {
        selectedCard.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
    }
}

function getBaseMapCards() {
    return mapButtons.filter(button => !button.classList.contains('map-stage-clone'));
}

function getBaseCarouselMetrics() {
    const baseCards = getBaseMapCards();
    if (!baseCards.length) {
        return null;
    }

    const first = baseCards[0];
    const last = baseCards[baseCards.length - 1];
    const carouselStyle = window.getComputedStyle(mapCarousel);
    const paddingLeft = Number.parseFloat(carouselStyle.paddingLeft) || 0;

    return {
        first,
        last,
        paddingLeft,
        sectionWidth: (last.offsetLeft + last.offsetWidth) - first.offsetLeft
    };
}

function recenterMapCarouselIfNeeded() {
    if (!mapCarousel || isRecenteringMapCarousel) {
        return;
    }

    const metrics = getBaseCarouselMetrics();
    if (!metrics) {
        return;
    }

    const leftEdge = metrics.first.offsetLeft - metrics.paddingLeft;
    const lowerBound = leftEdge - metrics.sectionWidth * 0.45;
    const upperBound = leftEdge + metrics.sectionWidth * 1.45;

    if (mapCarousel.scrollLeft >= lowerBound && mapCarousel.scrollLeft <= upperBound) {
        return;
    }

    isRecenteringMapCarousel = true;

    if (mapCarousel.scrollLeft < lowerBound) {
        mapCarousel.scrollLeft += metrics.sectionWidth;
    } else if (mapCarousel.scrollLeft > upperBound) {
        mapCarousel.scrollLeft -= metrics.sectionWidth;
    }

    requestAnimationFrame(() => {
        isRecenteringMapCarousel = false;
    });
}

function setupInfiniteMapCarousel() {
    if (!mapCarousel || mapCarousel.dataset.infiniteReady === 'true') {
        refreshMapButtons();
        return;
    }

    const originals = Array.from(mapCarousel.querySelectorAll('.map-stage-card'));
    const prefix = originals.map(card => {
        const clone = card.cloneNode(true);
        clone.classList.add('map-stage-clone');
        return clone;
    });
    const suffix = originals.map(card => {
        const clone = card.cloneNode(true);
        clone.classList.add('map-stage-clone');
        return clone;
    });

    prefix.reverse().forEach(clone => {
        mapCarousel.insertBefore(clone, mapCarousel.firstChild);
    });
    suffix.forEach(clone => {
        mapCarousel.appendChild(clone);
    });

    mapCarousel.dataset.infiniteReady = 'true';
    refreshMapButtons();

    requestAnimationFrame(() => {
        const metrics = getBaseCarouselMetrics();
        if (!metrics) {
            return;
        }
        mapCarousel.scrollLeft = metrics.first.offsetLeft - metrics.paddingLeft;
        scrollSelectedMapIntoView('auto');
        syncMapSelectionToViewport();
    });
}

function syncMapSelectionToViewport() {
    if (!mapCarousel) {
        return;
    }

    recenterMapCarouselIfNeeded();

    const carouselRect = mapCarousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    let nearestCard = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    mapButtons.forEach(button => {
        const buttonRect = button.getBoundingClientRect();
        const buttonCenter = buttonRect.left + buttonRect.width / 2;
        const distance = Math.abs(buttonCenter - carouselCenter);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestCard = button;
        }
    });

    if (nearestCard) {
        selectedMapId = nearestCard.dataset.mapId;
        updateMapSelectionUI();
        updateLobbySummaries();
    }
}

function upsertPlayerState(playerData, snap = false) {
    const existing = players[playerData.id];

    if (!existing) {
        players[playerData.id] = {
            ...playerData,
            targetX: playerData.x,
            targetY: playerData.y,
            renderX: playerData.x,
            renderY: playerData.y
        };
        return;
    }

    const targetX = playerData.x;
    const targetY = playerData.y;
    Object.assign(existing, playerData);
    existing.targetX = targetX;
    existing.targetY = targetY;

    if (snap || playerData.id === myPlayerId) {
        existing.renderX = targetX;
        existing.renderY = targetY;
    } else {
        existing.renderX = existing.renderX ?? targetX;
        existing.renderY = existing.renderY ?? targetY;
    }
}

function initializePlayers(playerList, snap = true) {
    const nextIds = new Set(playerList.map(player => player.id));
    Object.keys(players).forEach(playerId => {
        if (!nextIds.has(playerId)) {
            delete players[playerId];
        }
    });
    playerList.forEach(player => upsertPlayerState(player, snap));
}

function updateRemotePlayers(deltaTime) {
    const interpolationAmount = Math.min(deltaTime / REMOTE_INTERPOLATION_SECONDS, 1);

    Object.values(players).forEach(player => {
        if (player.id === myPlayerId) {
            player.renderX = player.x;
            player.renderY = player.y;
            return;
        }

        player.renderX = player.renderX ?? player.x;
        player.renderY = player.renderY ?? player.y;
        player.targetX = player.targetX ?? player.x;
        player.targetY = player.targetY ?? player.y;
        if (Math.abs(player.targetX - player.renderX) > 180 || Math.abs(player.targetY - player.renderY) > 180) {
            player.renderX = player.targetX;
            player.renderY = player.targetY;
            return;
        }
        player.renderX += (player.targetX - player.renderX) * interpolationAmount;
        player.renderY += (player.targetY - player.renderY) * interpolationAmount;
    });
}

function getPlatformSurfaceYAtX(platform, x) {
    const topEdge = getPlatformTopEdge(platform);
    const minX = Math.min(topEdge.start.x, topEdge.end.x);
    const maxX = Math.max(topEdge.start.x, topEdge.end.x);

    if (x < minX || x > maxX) {
        return null;
    }

    if (Math.abs(topEdge.end.x - topEdge.start.x) < 0.001) {
        return Math.min(topEdge.start.y, topEdge.end.y);
    }

    const t = (x - topEdge.start.x) / (topEdge.end.x - topEdge.start.x);
    return topEdge.start.y + (topEdge.end.y - topEdge.start.y) * t;
}

function getPlatformOverlap(player, platform) {
    const angleRadians = (platform.angle || 0) * Math.PI / 180;
    const playerCenterX = player.x + PLAYER_SIZE / 2;
    const playerCenterY = player.y + PLAYER_SIZE / 2;
    const platformCenterX = platform.x + platform.width / 2;
    const platformCenterY = platform.y + platform.height / 2;
    const relativeX = playerCenterX - platformCenterX;
    const relativeY = playerCenterY - platformCenterY;
    const localCenter = rotatePoint(relativeX, relativeY, -angleRadians);
    const halfPlayer = PLAYER_SIZE / 2;
    const absCos = Math.abs(Math.cos(angleRadians));
    const absSin = Math.abs(Math.sin(angleRadians));
    const localHalfWidth = halfPlayer * absCos + halfPlayer * absSin;
    const localHalfHeight = halfPlayer * absSin + halfPlayer * absCos;
    const overlapX = platform.width / 2 + localHalfWidth - Math.abs(localCenter.x);
    const overlapY = platform.height / 2 + localHalfHeight - Math.abs(localCenter.y);

    if (overlapX <= 0 || overlapY <= 0) {
        return null;
    }

    const resolveOnX = overlapX < overlapY;
    const localResolution = resolveOnX
        ? { x: localCenter.x < 0 ? -overlapX : overlapX, y: 0 }
        : { x: 0, y: localCenter.y < 0 ? -overlapY : overlapY };

    return {
        localResolution,
        worldResolution: rotatePoint(localResolution.x, localResolution.y, angleRadians),
        resolveOnX
    };
}

function shouldIgnoreConnectedSeamCollision(player, platform, overlap) {
    if (!overlap.resolveOnX || !platform.seamGroup) {
        return false;
    }

    const playerCenterX = player.x + PLAYER_SIZE / 2;
    const playerBottom = player.y + PLAYER_SIZE;
    const seamPlatforms = platforms.filter(item => item.seamGroup === platform.seamGroup);
    const supportYs = seamPlatforms
        .map(item => getPlatformSurfaceYAtX(item, playerCenterX))
        .filter(surfaceY => surfaceY !== null);

    if (!supportYs.length) {
        return false;
    }

    const nearestSurfaceY = Math.min(...supportYs);
    const nearConnectedTopSurface = playerBottom >= nearestSurfaceY - 12 && playerBottom <= nearestSurfaceY + 22;
    const notHittingFromBelow = player.velocityY >= -40;

    return nearConnectedTopSurface && notHittingFromBelow;
}

function resolveSolidPlatformCollisions(player) {
    let onGround = false;
    let supportPlatform = null;

    for (let i = 0; i < 4; i++) {
        let resolvedCollision = false;

        for (const platform of platforms) {
            const overlap = getPlatformOverlap(player, platform);
            if (!overlap) {
                continue;
            }

            if (shouldIgnoreConnectedSeamCollision(player, platform, overlap)) {
                continue;
            }

            player.x += overlap.worldResolution.x;
            player.y += overlap.worldResolution.y;
            resolvedCollision = true;

            if (overlap.resolveOnX) {
                player.velocityX = 0;
            } else {
                if (overlap.localResolution.y < 0) {
                    onGround = true;
                    supportPlatform = platform;
                }
                player.velocityY = 0;
            }
        }

        if (!resolvedCollision) {
            break;
        }
    }

    return { onGround, supportPlatform };
}

// Menu screen handlers
refreshMapButtons();
setupInfiniteMapCarousel();

playerCountButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedMaxPlayers = Number(button.dataset.playerCount);
        updateSelectedSizeLabel();
        updateLobbySummaries();
        setActiveScreen('mapScreen');
        requestAnimationFrame(() => {
            scrollSelectedMapIntoView('smooth');
            syncMapSelectionToViewport();
        });
    });
});

if (mapCarousel) {
    mapCarousel.addEventListener('click', (event) => {
        const button = event.target.closest('.map-stage-card');
        if (!button) {
            return;
        }
        selectedMapId = button.dataset.mapId;
        updateMapSelectionUI();
        updateLobbySummaries();
        scrollSelectedMapIntoView('smooth');
        setActiveScreen('modeScreen');
    });

    mapCarousel.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            event.preventDefault();
            mapCarousel.scrollBy({ left: event.deltaY, behavior: 'smooth' });
        }
    }, { passive: false });

    mapCarousel.addEventListener('scroll', () => {
        window.clearTimeout(mapCarousel._selectionTimer);
        mapCarousel._selectionTimer = window.setTimeout(syncMapSelectionToViewport, 80);
    });
}

chooseCreateBtn.addEventListener('click', () => {
    selectedLobbyMode = 'create';
    updateRoomModeUI();
    updateLobbySummaries();
    setActiveScreen('roomScreen');
});

chooseJoinBtn.addEventListener('click', () => {
    selectedLobbyMode = 'join';
    updateRoomModeUI();
    updateLobbySummaries();
    setActiveScreen('roomScreen');
    requestAnimationFrame(() => {
        document.getElementById('roomCodeInput').focus();
    });
});

document.getElementById('createRoomBtn').addEventListener('click', () => {
    if (!selectedMaxPlayers) {
        showError('Choose the room size first');
        return;
    }

    socket.emit('createRoom', {
        maxPlayers: selectedMaxPlayers,
        mapId: selectedMapId
    });
});

document.getElementById('joinRoomBtn').addEventListener('click', () => {
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if (roomCode) {
        socket.emit('joinRoom', roomCode);
    } else {
        showError('Please enter a room code');
    }
});

playAgainBtn.addEventListener('click', () => {
    playAgainBtn.disabled = true;
    playAgainBtn.textContent = 'RESTARTING...';
    socket.emit('playAgain');
});

updateMapSelectionUI();
updateLobbySummaries();

// Socket event listeners
socket.on('roomCreated', (data) => {
    currentRoomCode = data.roomCode;
    selectedMaxPlayers = data.maxPlayers;
    selectedRoundDuration = data.roundDuration || selectedRoundDuration;
    selectedMapId = data.mapId || selectedMapId;
    currentMapId = selectedMapId;
    updateMapSelectionUI();
    updateLobbySummaries();
    updateRoomModeUI();
    setActiveScreen('roomScreen');
    document.getElementById('roomCode').textContent = data.roomCode;
    document.getElementById('roomCodeDisplay').classList.remove('hidden');
    document.getElementById('createRoomBtn').disabled = true;
    setMapButtonsState(true);
});

socket.on('joined', (data) => {
    myPlayerId = socket.id;
    myPlayerNumber = data.playerNumber;
    currentRoomCode = data.roomCode;
    selectedMaxPlayers = data.maxPlayers || selectedMaxPlayers;
    selectedRoundDuration = data.roundDuration || selectedRoundDuration;
    selectedMapId = data.mapId || selectedMapId;
    currentMapId = selectedMapId;
    updateMapSelectionUI();
    updateLobbySummaries();
    updateRoomModeUI();
    setActiveScreen('roomScreen');
    
    // Initialize players
    initializePlayers(data.players, true);

    document.getElementById('createRoomBtn').disabled = true;
    document.getElementById('joinRoomBtn').disabled = true;
    document.getElementById('roomCodeInput').disabled = true;
    setMapButtonsState(true);
    document.getElementById('roomCode').textContent = data.roomCode;
    document.getElementById('roomCodeDisplay').classList.remove('hidden');
    
    showError(`Joined room ${data.roomCode} as Player ${data.playerNumber}`);
});

socket.on('roomStatus', (data) => {
    currentRoomCode = data.roomCode;
    selectedMaxPlayers = data.maxPlayers || selectedMaxPlayers;
    selectedRoundDuration = data.roundDuration || selectedRoundDuration;
    selectedMapId = data.mapId || selectedMapId;
    updateMapSelectionUI();
    updateLobbySummaries();

    const mapName = data.mapName || getMapDefinition(selectedMapId).name;
    document.getElementById('roomStatusText').textContent = `${data.playersJoined} / ${data.maxPlayers} joined • ${mapName} • ${selectedRoundDuration}s round`;
    document.getElementById('waitingText').textContent = data.playersNeeded === 0
        ? 'Starting match...'
        : `Waiting for ${data.playersNeeded} more player${data.playersNeeded === 1 ? '' : 's'}...`;
});

socket.on('gameStart', (playerData) => {
    gameStarted = true;
    gameOver = false;
    roundActive = false;
    roundMotionStartTime = null;
    supportedPlatformId = null;
    hideGameOverScreen();
    initializePlayers(playerData.players, true);
    timeRemaining = playerData.timeRemaining;
    selectedRoundDuration = playerData.roundDuration || selectedRoundDuration;
    currentMapId = playerData.mapId || currentMapId;
    selectedMapId = currentMapId;
    updateMapSelectionUI();
    updateLobbySummaries();
    updateTimerDisplay();
    showRoundBanner(`GET READY ${playerData.readySeconds || 3}`);
    
    initPlatforms();
    startGame();
});

socket.on('playerMoved', (playerData) => {
    upsertPlayerState(playerData, false);
});

socket.on('tagOccurred', (data) => {
    data.players.forEach(player => upsertPlayerState(player, true));
    updateRoleDisplay();
});

socket.on('roundCountdown', (secondsRemaining) => {
    roundActive = false;
    showRoundBanner(`GET READY ${secondsRemaining}`);
});

socket.on('roundLive', () => {
    roundActive = true;
    roundMotionStartTime = performance.now();
    hideRoundBanner();
});

socket.on('timerUpdate', (secondsRemaining) => {
    timeRemaining = secondsRemaining;
    updateTimerDisplay();
});

socket.on('gameOver', (data) => {
    gameStarted = false;
    gameOver = true;
    roundActive = false;
    roundMotionStartTime = null;
    supportedPlatformId = null;
    timeRemaining = 0;
    updateTimerDisplay();

    hideRoundBanner();
    data.players.forEach(player => upsertPlayerState(player, true));
    updateRoleDisplay();
    keys = {};
    jumpBufferTime = 0;
    coyoteTime = 0;
    showGameOverScreen(data.loserId);
});

socket.on('playerLeft', () => {
    showError('Other player left the game');
    setTimeout(() => {
        location.reload();
    }, 2000);
});

socket.on('error', (message) => {
    showError(message);
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 3000);
}

function startGame() {
    setActiveScreen('gameScreen');
    
    updateRoleDisplay();
    updateTimerDisplay();
    lastFrameTime = null;
    keys = {};
    jumpBufferTime = 0;
    coyoteTime = 0;
    playAgainBtn.disabled = false;
    playAgainBtn.textContent = 'PLAY AGAIN';

    requestAnimationFrame(gameLoop);
}

function updateSelectedSizeLabel() {
    updateLobbySummaries();
}

function showRoundBanner(text) {
    roundBanner.textContent = text;
    roundBanner.classList.remove('hidden');
}

function hideRoundBanner() {
    roundBanner.classList.add('hidden');
}

function updateRoleDisplay() {
    const myPlayer = players[myPlayerId];
    if (myPlayer) {
        const roleSpan = document.getElementById('playerRole');
        roleSpan.textContent = myPlayer.isIt ? 'CHASER (IT)' : 'RUNNER';
        roleSpan.style.color = myPlayer.isIt ? '#ff6b6b' : '#4ecdc4';
    }
}

function updateTimerDisplay() {
    document.getElementById('timeDisplay').textContent = timeRemaining;
}

function showGameOverScreen(loserId) {
    const loser = players[loserId];
    const iLost = loserId === myPlayerId;
    const loserLabel = loser
        ? (loserId === myPlayerId ? 'YOU' : `PLAYER ${loser.number}`)
        : 'UNKNOWN';
    const resultTitle = iLost ? 'LOSER' : 'WINNER';
    const message = iLost
        ? 'Time ran out while you were it.'
        : `${loserLabel} was it when time ran out.`;

    document.getElementById('gameOverTitle').textContent = resultTitle;
    document.getElementById('gameOverPlayer').textContent = iLost ? 'YOU' : loserLabel;
    document.getElementById('gameOverMessage').textContent = message;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function hideGameOverScreen() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    playAgainBtn.disabled = false;
    playAgainBtn.textContent = 'PLAY AGAIN';
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && !keys[e.key]) {
        jumpBufferTime = JUMP_BUFFER_SECONDS;
    }
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') {
        const player = players[myPlayerId];
        if (player && player.velocityY < 0) {
            player.velocityY *= 0.5;
        }
    }
    keys[e.key] = false;
});

function gameLoop(timestamp) {
    if (!gameStarted || gameOver) return;

    if (typeof timestamp !== 'number') {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (lastFrameTime === null) {
        lastFrameTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp;

    updatePlatforms(timestamp);
    updateRemotePlayers(deltaTime);
    if (roundActive) {
        updatePlayer(deltaTime);
        checkCollisions();
    }
    draw();
    
    requestAnimationFrame(gameLoop);
}

function updatePlayer(deltaTime) {
    const player = players[myPlayerId];
    if (!player) return;
    const wasGrounded = coyoteTime > 0;
    const supportingPlatform = supportedPlatformId !== null
        ? platforms.find(platform => platform.id === supportedPlatformId)
        : null;

    if (supportingPlatform) {
        player.x += supportingPlatform.deltaX;
        player.y += supportingPlatform.deltaY;
        if (player.x < MAP_BOUNDS.left) player.x = MAP_BOUNDS.left;
        if (player.x > MAP_BOUNDS.right - PLAYER_SIZE) player.x = MAP_BOUNDS.right - PLAYER_SIZE;
    }

    const targetVelocityX = keys['ArrowLeft']
        ? -MOVE_SPEED
        : keys['ArrowRight']
            ? MOVE_SPEED
            : 0;
    
    if (targetVelocityX !== 0) {
        const acceleration = wasGrounded ? GROUND_ACCELERATION : AIR_ACCELERATION;
        player.velocityX = approach(player.velocityX, targetVelocityX, acceleration * deltaTime);
    } else {
        const friction = wasGrounded ? GROUND_FRICTION : AIR_FRICTION;
        player.velocityX = approach(player.velocityX, 0, friction * deltaTime);
    }
    
    // Apply gravity
    player.velocityY += GRAVITY * deltaTime;
    const moveX = player.velocityX * deltaTime;
    const moveY = player.velocityY * deltaTime;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(moveX), Math.abs(moveY)) / 4));
    const stepX = moveX / steps;
    const stepY = moveY / steps;
    let onGround = false;
    let supportPlatform = null;

    // Resolve movement in small steps so thin platforms behave like solid objects.
    for (let i = 0; i < steps; i++) {
        player.x += stepX;
        resolveSolidPlatformCollisions(player);

        player.y += stepY;
        const collisionResult = resolveSolidPlatformCollisions(player);
        onGround = collisionResult.onGround || onGround;
        if (collisionResult.supportPlatform) {
            supportPlatform = collisionResult.supportPlatform;
        }

        if (player.x < MAP_BOUNDS.left) player.x = MAP_BOUNDS.left;
        if (player.x > MAP_BOUNDS.right - PLAYER_SIZE) player.x = MAP_BOUNDS.right - PLAYER_SIZE;
        if (player.y > MAP_BOUNDS.bottom - PLAYER_SIZE) {
            player.y = MAP_BOUNDS.bottom - PLAYER_SIZE;
            player.velocityY = 0;
        }
    }
    
    jumpBufferTime = Math.max(0, jumpBufferTime - deltaTime);
    coyoteTime = onGround ? COYOTE_TIME_SECONDS : Math.max(0, coyoteTime - deltaTime);

    if (jumpBufferTime > 0 && (onGround || coyoteTime > 0)) {
        player.velocityY = JUMP_STRENGTH;
        jumpBufferTime = 0;
        coyoteTime = 0;
        onGround = false;
        supportPlatform = null;
    }

    supportedPlatformId = onGround && supportPlatform ? supportPlatform.id : null;
    
    // Send position to server
    socket.emit('playerMove', {
        x: player.x,
        y: player.y,
        velocityX: player.velocityX,
        velocityY: player.velocityY
    });
}

function checkCollisions() {
    // Server-side tagging is authoritative.
}

function draw() {
    drawArenaBackground();
    drawPlatforms();
    drawPlayers();
}

function drawArenaBackground() {
    const activeMap = getMapDefinition();
    if (activeMap.theme === 'bunker') {
        drawBunkerArenaBackground();
        return;
    }
    if (activeMap.theme === 'cathedral') {
        drawCathedralArenaBackground();
        return;
    }
    if (activeMap.theme === 'courtyard') {
        drawCourtyardArenaBackground();
        return;
    }
    if (activeMap.theme === 'maze') {
        drawMazeArenaBackground();
        return;
    }

    const pageGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    pageGradient.addColorStop(0, '#19131f');
    pageGradient.addColorStop(0.48, '#2f1d33');
    pageGradient.addColorStop(1, '#4f2430');
    ctx.fillStyle = pageGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    const glowLeft = ctx.createRadialGradient(180, 110, 20, 180, 110, 260);
    glowLeft.addColorStop(0, 'rgba(255, 185, 95, 0.45)');
    glowLeft.addColorStop(1, 'rgba(255, 185, 95, 0)');
    ctx.fillStyle = glowLeft;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glowRight = ctx.createRadialGradient(1180, 180, 20, 1180, 180, 320);
    glowRight.addColorStop(0, 'rgba(255, 99, 71, 0.24)');
    glowRight.addColorStop(1, 'rgba(255, 99, 71, 0)');
    ctx.fillStyle = glowRight;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const arenaGradient = ctx.createLinearGradient(0, MAP_OFFSET_Y, 0, MAP_OFFSET_Y + MAP_LAYOUT_HEIGHT);
    arenaGradient.addColorStop(0, 'rgba(27, 19, 33, 0.9)');
    arenaGradient.addColorStop(0.58, 'rgba(81, 36, 61, 0.82)');
    arenaGradient.addColorStop(1, 'rgba(255, 151, 90, 0.78)');
    ctx.fillStyle = arenaGradient;
    ctx.fillRect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);

    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255, 244, 223, 0.28)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(MAP_OFFSET_X + 1.5, MAP_OFFSET_Y + 1.5, MAP_LAYOUT_WIDTH - 3, MAP_LAYOUT_HEIGHT - 3);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255, 244, 223, 0.05)';
    ctx.fillRect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);
    ctx.clip();
    drawMapEllipses(activeMap.backgroundEllipses);
    drawMapStumps(activeMap.stumps || []);
    ctx.restore();
}

function drawBunkerArenaBackground() {
    const pageGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    pageGradient.addColorStop(0, '#101722');
    pageGradient.addColorStop(0.5, '#1d2b3f');
    pageGradient.addColorStop(1, '#314664');
    ctx.fillStyle = pageGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(canvas.width / 2, 150, 20, canvas.width / 2, 150, 320);
    glow.addColorStop(0, 'rgba(140, 210, 255, 0.12)');
    glow.addColorStop(1, 'rgba(140, 210, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const arenaGradient = ctx.createLinearGradient(0, MAP_OFFSET_Y, 0, MAP_OFFSET_Y + MAP_LAYOUT_HEIGHT);
    arenaGradient.addColorStop(0, '#536486');
    arenaGradient.addColorStop(0.48, '#65789d');
    arenaGradient.addColorStop(1, '#3b4d68');
    ctx.fillStyle = arenaGradient;
    ctx.fillRect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);

    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(226, 234, 255, 0.2)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(MAP_OFFSET_X + 1.5, MAP_OFFSET_Y + 1.5, MAP_LAYOUT_WIDTH - 3, MAP_LAYOUT_HEIGHT - 3);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);
    ctx.clip();

    ctx.fillStyle = 'rgba(18, 26, 41, 0.18)';
    roundRect(MAP_OFFSET_X + 86, MAP_OFFSET_Y + 118, 372, 320, 26);
    ctx.fill();
    roundRect(MAP_OFFSET_X + 801, MAP_OFFSET_Y + 118, 372, 320, 26);
    ctx.fill();

    ctx.fillStyle = 'rgba(238, 243, 255, 0.08)';
    roundRect(MAP_OFFSET_X + 420, MAP_OFFSET_Y + 470, 418, 20, 10);
    ctx.fill();
    roundRect(MAP_OFFSET_X + 484, MAP_OFFSET_Y + 318, 290, 16, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(224, 232, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 16]);
    ctx.beginPath();
    ctx.moveTo(MAP_OFFSET_X + 426, MAP_OFFSET_Y + 474);
    ctx.lineTo(MAP_OFFSET_X + 836, MAP_OFFSET_Y + 474);
    ctx.moveTo(MAP_OFFSET_X + 500, MAP_OFFSET_Y + 322);
    ctx.lineTo(MAP_OFFSET_X + 760, MAP_OFFSET_Y + 322);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
}

function drawCathedralArenaBackground() {
    const pageGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    pageGradient.addColorStop(0, '#0f1320');
    pageGradient.addColorStop(0.5, '#1d2740');
    pageGradient.addColorStop(1, '#33456a');
    ctx.fillStyle = pageGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const halo = ctx.createRadialGradient(canvas.width / 2, 120, 20, canvas.width / 2, 120, 260);
    halo.addColorStop(0, 'rgba(212, 228, 255, 0.22)');
    halo.addColorStop(1, 'rgba(212, 228, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const arenaGradient = ctx.createLinearGradient(0, MAP_OFFSET_Y, 0, MAP_OFFSET_Y + MAP_LAYOUT_HEIGHT);
    arenaGradient.addColorStop(0, '#8f9cb9');
    arenaGradient.addColorStop(0.46, '#7686a9');
    arenaGradient.addColorStop(1, '#596988');
    ctx.fillStyle = arenaGradient;
    ctx.fillRect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);

    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(223, 232, 255, 0.28)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(MAP_OFFSET_X + 1.5, MAP_OFFSET_Y + 1.5, MAP_LAYOUT_WIDTH - 3, MAP_LAYOUT_HEIGHT - 3);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);
    ctx.clip();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    roundRect(MAP_OFFSET_X + 172, MAP_OFFSET_Y + 144, MAP_LAYOUT_WIDTH - 344, 284, 24);
    ctx.fill();

    ctx.fillStyle = 'rgba(32, 42, 68, 0.22)';
    roundRect(MAP_OFFSET_X + 226, MAP_OFFSET_Y + 118, MAP_LAYOUT_WIDTH - 452, 332, 18);
    ctx.fill();

    drawCathedralWindow(MAP_OFFSET_X + MAP_LAYOUT_WIDTH / 2 - 52, MAP_OFFSET_Y + 64, 104, 144, 'rgba(223, 232, 255, 0.2)');
    drawCathedralWindow(MAP_OFFSET_X + 186, MAP_OFFSET_Y + 126, 66, 104, 'rgba(223, 232, 255, 0.1)');
    drawCathedralWindow(MAP_OFFSET_X + MAP_LAYOUT_WIDTH - 252, MAP_OFFSET_Y + 126, 66, 104, 'rgba(223, 232, 255, 0.1)');
    drawCathedralColumns();
    drawCathedralFloorGlow();

    ctx.restore();
}

function drawCathedralWindow(x, y, width, height, glowStyle) {
    ctx.save();
    ctx.fillStyle = 'rgba(28, 37, 58, 0.3)';
    roundRect(x, y, width, height, width / 2);
    ctx.fill();

    const innerX = x + 10;
    const innerY = y + 12;
    const innerWidth = width - 20;
    const innerHeight = height - 22;
    const gradient = ctx.createLinearGradient(0, innerY, 0, innerY + innerHeight);
    gradient.addColorStop(0, glowStyle);
    gradient.addColorStop(1, 'rgba(223, 232, 255, 0.02)');
    ctx.fillStyle = gradient;
    roundRect(innerX, innerY, innerWidth, innerHeight, innerWidth / 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(233, 240, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, innerY + 6);
    ctx.lineTo(x + width / 2, y + height - 16);
    ctx.moveTo(innerX + 6, y + height * 0.52);
    ctx.lineTo(x + width - 16, y + height * 0.52);
    ctx.stroke();
    ctx.restore();
}

function drawCathedralColumns() {
    const columnXs = [MAP_OFFSET_X + 132, MAP_OFFSET_X + 292, MAP_OFFSET_X + MAP_LAYOUT_WIDTH - 320, MAP_OFFSET_X + MAP_LAYOUT_WIDTH - 160];
    columnXs.forEach(x => {
        ctx.save();
        ctx.fillStyle = 'rgba(225, 233, 255, 0.08)';
        roundRect(x, MAP_OFFSET_Y + 164, 26, 310, 10);
        ctx.fill();
        ctx.restore();
    });
}

function drawCathedralFloorGlow() {
    ctx.save();
    const floorGradient = ctx.createLinearGradient(0, MAP_OFFSET_Y + 430, 0, MAP_OFFSET_Y + 560);
    floorGradient.addColorStop(0, 'rgba(218, 228, 255, 0.08)');
    floorGradient.addColorStop(1, 'rgba(218, 228, 255, 0)');
    ctx.fillStyle = floorGradient;
    roundRect(MAP_OFFSET_X + 86, MAP_OFFSET_Y + 424, MAP_LAYOUT_WIDTH - 172, 112, 18);
    ctx.fill();

    ctx.strokeStyle = 'rgba(226, 234, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MAP_OFFSET_X + MAP_LAYOUT_WIDTH / 2, MAP_OFFSET_Y + 430);
    ctx.lineTo(MAP_OFFSET_X + MAP_LAYOUT_WIDTH / 2, MAP_OFFSET_Y + 546);
    ctx.moveTo(MAP_OFFSET_X + 210, MAP_OFFSET_Y + 486);
    ctx.lineTo(MAP_OFFSET_X + MAP_LAYOUT_WIDTH - 210, MAP_OFFSET_Y + 486);
    ctx.stroke();
    ctx.restore();
}

function drawMazeArenaBackground() {
    const activeMap = getMapDefinition();
    const pageGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    pageGradient.addColorStop(0, '#2a3150');
    pageGradient.addColorStop(0.55, '#4c5d92');
    pageGradient.addColorStop(1, '#7d8bc0');
    ctx.fillStyle = pageGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const mistGlow = ctx.createRadialGradient(canvas.width / 2, 120, 20, canvas.width / 2, 120, 280);
    mistGlow.addColorStop(0, 'rgba(233, 240, 255, 0.2)');
    mistGlow.addColorStop(1, 'rgba(233, 240, 255, 0)');
    ctx.fillStyle = mistGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const arenaGradient = ctx.createLinearGradient(0, MAP_OFFSET_Y, 0, MAP_OFFSET_Y + MAP_LAYOUT_HEIGHT);
    arenaGradient.addColorStop(0, '#94a0cf');
    arenaGradient.addColorStop(0.45, '#9caae0');
    arenaGradient.addColorStop(1, '#8997cd');
    ctx.fillStyle = arenaGradient;
    ctx.fillRect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);

    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(226, 234, 255, 0.28)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(MAP_OFFSET_X + 1.5, MAP_OFFSET_Y + 1.5, MAP_LAYOUT_WIDTH - 3, MAP_LAYOUT_HEIGHT - 3);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);
    ctx.clip();
    drawMapEllipses(activeMap.backgroundEllipses);
    drawMapStumps(activeMap.stumps || []);
    ctx.restore();
}

function drawCourtyardArenaBackground() {
    const pageGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    pageGradient.addColorStop(0, '#23161d');
    pageGradient.addColorStop(0.48, '#714737');
    pageGradient.addColorStop(1, '#d6a06a');
    ctx.fillStyle = pageGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sunGlow = ctx.createRadialGradient(canvas.width - 250, 130, 20, canvas.width - 250, 130, 250);
    sunGlow.addColorStop(0, 'rgba(255, 229, 176, 0.28)');
    sunGlow.addColorStop(1, 'rgba(255, 224, 163, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const arenaGradient = ctx.createLinearGradient(0, MAP_OFFSET_Y, 0, MAP_OFFSET_Y + MAP_LAYOUT_HEIGHT);
    arenaGradient.addColorStop(0, '#d9ab77');
    arenaGradient.addColorStop(0.46, '#e7c291');
    arenaGradient.addColorStop(1, '#c98761');
    ctx.fillStyle = arenaGradient;
    ctx.fillRect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);

    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = 'rgba(255, 243, 218, 0.34)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(MAP_OFFSET_X + 1.5, MAP_OFFSET_Y + 1.5, MAP_LAYOUT_WIDTH - 3, MAP_LAYOUT_HEIGHT - 3);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);
    ctx.clip();

    const skyMist = ctx.createLinearGradient(0, MAP_OFFSET_Y, 0, MAP_OFFSET_Y + MAP_LAYOUT_HEIGHT * 0.5);
    skyMist.addColorStop(0, 'rgba(255, 242, 216, 0.22)');
    skyMist.addColorStop(1, 'rgba(255, 242, 216, 0)');
    ctx.fillStyle = skyMist;
    ctx.fillRect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT * 0.5);

    drawSimpleCourtyardSilhouettes();
    drawSimpleCourtyardFloorBands();

    ctx.restore();
}

function drawSimpleCourtyardSilhouettes() {
    ctx.save();
    ctx.fillStyle = 'rgba(123, 67, 50, 0.16)';

    roundRect(MAP_OFFSET_X + 116, MAP_OFFSET_Y + 176, 1028, 124, 24);
    ctx.fill();

    roundRect(MAP_OFFSET_X + 244, MAP_OFFSET_Y + 126, 772, 70, 18);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(MAP_OFFSET_X + MAP_LAYOUT_WIDTH / 2, MAP_OFFSET_Y + 136, 72, 34, 0, Math.PI, 0);
    ctx.lineTo(MAP_OFFSET_X + MAP_LAYOUT_WIDTH / 2 + 72, MAP_OFFSET_Y + 168);
    ctx.lineTo(MAP_OFFSET_X + MAP_LAYOUT_WIDTH / 2 - 72, MAP_OFFSET_Y + 168);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(248, 232, 202, 0.08)';
    roundRect(MAP_OFFSET_X + 154, MAP_OFFSET_Y + 208, 950, 54, 16);
    ctx.fill();
    ctx.restore();
}

function drawSimpleCourtyardFloorBands() {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.08)';
    roundRect(MAP_OFFSET_X + 86, MAP_OFFSET_Y + 448, MAP_LAYOUT_WIDTH - 172, 20, 8);
    ctx.fill();
    roundRect(MAP_OFFSET_X + 128, MAP_OFFSET_Y + 488, MAP_LAYOUT_WIDTH - 256, 16, 8);
    ctx.fill();

    const channelGradient = ctx.createLinearGradient(0, MAP_OFFSET_Y + 426, 0, MAP_OFFSET_Y + 546);
    channelGradient.addColorStop(0, 'rgba(58, 123, 126, 0.12)');
    channelGradient.addColorStop(1, 'rgba(58, 123, 126, 0.03)');
    ctx.fillStyle = channelGradient;
    roundRect(MAP_OFFSET_X + MAP_LAYOUT_WIDTH / 2 - 18, MAP_OFFSET_Y + 412, 36, 126, 10);
    ctx.fill();
    ctx.restore();
}

function drawCourtyardPalace() {
    const palaceX = MAP_OFFSET_X + 190;
    const palaceY = MAP_OFFSET_Y + 124;
    const palaceWidth = 880;
    const palaceHeight = 128;

    ctx.save();
    ctx.fillStyle = 'rgba(132, 72, 54, 0.28)';
    roundRect(palaceX, palaceY, palaceWidth, palaceHeight, 26);
    ctx.fill();

    ctx.fillStyle = 'rgba(248, 231, 202, 0.12)';
    roundRect(palaceX + 18, palaceY + 18, palaceWidth - 36, palaceHeight - 36, 18);
    ctx.fill();

    drawCourtyardDome(palaceX + palaceWidth * 0.5, palaceY + 4, 54, 'rgba(152, 82, 60, 0.34)');
    drawCourtyardDome(palaceX + 164, palaceY + 26, 36, 'rgba(152, 82, 60, 0.24)');
    drawCourtyardDome(palaceX + palaceWidth - 164, palaceY + 26, 36, 'rgba(152, 82, 60, 0.24)');

    const towerWidth = 26;
    [palaceX + 64, palaceX + palaceWidth - 90].forEach(towerX => {
        ctx.fillStyle = 'rgba(132, 72, 54, 0.26)';
        roundRect(towerX, palaceY - 18, towerWidth, palaceHeight + 46, 10);
        ctx.fill();
        drawCourtyardDome(towerX + towerWidth / 2, palaceY - 12, 16, 'rgba(160, 86, 62, 0.28)');
    });
    ctx.restore();
}

function drawCourtyardDome(centerX, topY, radius, fillStyle) {
    ctx.save();
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(centerX - radius, topY + radius);
    ctx.quadraticCurveTo(centerX - radius * 0.8, topY, centerX, topY);
    ctx.quadraticCurveTo(centerX + radius * 0.8, topY, centerX + radius, topY + radius);
    ctx.lineTo(centerX + radius * 0.9, topY + radius + 16);
    ctx.lineTo(centerX - radius * 0.9, topY + radius + 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawCourtyardArcadeRow(startX, baseY, count, gap, archWidth, archHeight, fillStyle, highlightStyle) {
    for (let index = 0; index < count; index++) {
        const x = startX + index * gap;
        ctx.save();
        ctx.fillStyle = fillStyle;
        roundRect(x, baseY, archWidth, archHeight, 18);
        ctx.fill();

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(x + 18, baseY + archHeight);
        ctx.lineTo(x + 18, baseY + 62);
        ctx.quadraticCurveTo(x + archWidth / 2, baseY - 8, x + archWidth - 18, baseY + 62);
        ctx.lineTo(x + archWidth - 18, baseY + archHeight);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = highlightStyle;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 18, baseY + 62);
        ctx.quadraticCurveTo(x + archWidth / 2, baseY + 6, x + archWidth - 18, baseY + 62);
        ctx.stroke();
        ctx.restore();
    }
}

function drawCourtyardPlanters() {
    const planters = [
        { x: MAP_OFFSET_X + 178, y: MAP_OFFSET_Y + 424 },
        { x: MAP_OFFSET_X + 1070, y: MAP_OFFSET_Y + 424 },
        { x: MAP_OFFSET_X + 592, y: MAP_OFFSET_Y + 320 },
        { x: MAP_OFFSET_X + 592, y: MAP_OFFSET_Y + 222 }
    ];

    planters.forEach(planter => {
        ctx.save();
        ctx.fillStyle = 'rgba(110, 60, 43, 0.32)';
        roundRect(planter.x, planter.y, 34, 26, 8);
        ctx.fill();
        ctx.fillStyle = 'rgba(41, 88, 58, 0.34)';
        ctx.beginPath();
        ctx.moveTo(planter.x + 17, planter.y - 34);
        ctx.quadraticCurveTo(planter.x + 4, planter.y - 8, planter.x + 12, planter.y + 4);
        ctx.quadraticCurveTo(planter.x + 16, planter.y - 10, planter.x + 17, planter.y - 34);
        ctx.moveTo(planter.x + 17, planter.y - 36);
        ctx.quadraticCurveTo(planter.x + 30, planter.y - 8, planter.x + 22, planter.y + 4);
        ctx.quadraticCurveTo(planter.x + 18, planter.y - 12, planter.x + 17, planter.y - 36);
        ctx.fill();
        ctx.restore();
    });
}

function drawCourtyardFloorPattern() {
    const floorY = MAP_OFFSET_Y + 448;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.08)';
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 10; col++) {
            const tileX = MAP_OFFSET_X + 102 + col * 108 + (row % 2) * 18;
            const tileY = floorY + row * 28;
            roundRect(tileX, tileY, 72, 16, 5);
            ctx.fill();
        }
    }

    const channelGradient = ctx.createLinearGradient(0, floorY, 0, floorY + 104);
    channelGradient.addColorStop(0, 'rgba(42, 114, 130, 0.22)');
    channelGradient.addColorStop(1, 'rgba(42, 114, 130, 0.06)');
    ctx.fillStyle = channelGradient;
    roundRect(MAP_OFFSET_X + MAP_LAYOUT_WIDTH / 2 - 22, floorY - 18, 44, 124, 10);
    ctx.fill();
    roundRect(MAP_OFFSET_X + 286, floorY + 30, MAP_LAYOUT_WIDTH - 572, 22, 10);
    ctx.fill();
    ctx.restore();
}

function drawMapEllipses(ellipses) {
    const fills = {
        deep: '#3f2843',
        mid: '#7b4558',
        snow: '#fff4df',
        cloud: '#fff4df',
        'maze-deep': '#6f7cab',
        'maze-mid': '#8e9cc9',
        'maze-snow': '#ccd6ef',
        'maze-cloud': '#edf2ff'
    };

    ellipses.forEach(ellipse => {
        ctx.save();
        ctx.globalAlpha = ellipse.alpha;
        ctx.fillStyle = fills[ellipse.tier] || '#fff4df';
        ctx.beginPath();
        ctx.ellipse(
            MAP_OFFSET_X + ellipse.x,
            MAP_OFFSET_Y + ellipse.y,
            ellipse.rx,
            ellipse.ry,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
    });
}

function drawMapStumps(stumps) {
    const activeMap = getMapDefinition();
    const isMaze = activeMap.theme === 'maze';

    stumps.forEach(stump => {
        const drawX = MAP_OFFSET_X + stump.x;
        const drawY = MAP_OFFSET_Y + stump.y;

        ctx.save();
        ctx.fillStyle = isMaze ? 'rgba(109, 122, 168, 0.46)' : 'rgba(65, 80, 111, 0.48)';
        roundRect(drawX, drawY, stump.width, stump.height, 3);
        ctx.fill();

        ctx.fillStyle = isMaze ? 'rgba(216, 226, 248, 0.2)' : 'rgba(255, 244, 223, 0.14)';
        ctx.beginPath();
        ctx.ellipse(
            drawX + stump.width / 2,
            drawY,
            stump.crownRx,
            stump.crownRy,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
    });
}

function drawPlatforms() {
    const activeMap = getMapDefinition();
    const isCourtyard = activeMap.theme === 'courtyard';
    const isCathedral = activeMap.theme === 'cathedral';
    const isBunker = activeMap.theme === 'bunker';

    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);
    ctx.clip();

    platforms.forEach(platform => {
        const angleRadians = (platform.angle || 0) * Math.PI / 180;
        const centerX = platform.x + platform.width / 2;
        const centerY = platform.y + platform.height / 2;
        const surfaceRatio = platform.surfaceRatio || 0.45;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angleRadians);
        ctx.fillStyle = isCourtyard
            ? 'rgba(84, 46, 34, 0.18)'
            : isCathedral
                ? 'rgba(24, 30, 48, 0.18)'
                : isBunker
                    ? 'rgba(18, 28, 43, 0.22)'
                : 'rgba(18, 15, 24, 0.22)';
        roundRect(-platform.width / 2 + 8, -platform.height / 2 + 8, platform.width, platform.height, 6);
        ctx.fill();

        const bodyGradient = ctx.createLinearGradient(0, -platform.height / 2, 0, platform.height / 2);
        if (isCourtyard) {
            bodyGradient.addColorStop(0, '#b66f47');
            bodyGradient.addColorStop(0.62, '#a6603f');
            bodyGradient.addColorStop(1, '#7c4534');
        } else if (isCathedral) {
            bodyGradient.addColorStop(0, '#96a4bf');
            bodyGradient.addColorStop(0.62, '#7c8da9');
            bodyGradient.addColorStop(1, '#5f6f8d');
        } else if (isBunker) {
            if (platform.motion) {
                bodyGradient.addColorStop(0, '#7d93c6');
                bodyGradient.addColorStop(0.62, '#6880b7');
                bodyGradient.addColorStop(1, '#4f6799');
            } else if (platform.styleRole === 'safe') {
                bodyGradient.addColorStop(0, '#445376');
                bodyGradient.addColorStop(0.62, '#55668d');
                bodyGradient.addColorStop(1, '#3a4968');
            } else {
                bodyGradient.addColorStop(0, '#4b5a81');
                bodyGradient.addColorStop(0.62, '#5d6d97');
                bodyGradient.addColorStop(1, '#3e4d6e');
            }
        } else {
            bodyGradient.addColorStop(0, '#41506f');
            bodyGradient.addColorStop(1, '#24324c');
        }
        ctx.fillStyle = bodyGradient;
        roundRect(-platform.width / 2, -platform.height / 2, platform.width, platform.height, 6);
        ctx.fill();

        ctx.strokeStyle = isCourtyard
            ? 'rgba(255, 243, 218, 0.22)'
            : isCathedral
                ? 'rgba(232, 238, 255, 0.22)'
                : isBunker
                    ? 'rgba(228, 236, 255, 0.16)'
                : 'rgba(255, 244, 223, 0.16)';
        ctx.lineWidth = 1.5;
        roundRect(-platform.width / 2, -platform.height / 2, platform.width, platform.height, 6);
        ctx.stroke();

        ctx.fillStyle = isCourtyard ? '#f8ebd5' : isCathedral ? '#eef3ff' : isBunker ? '#eef4ff' : '#fff4df';
        roundRect(-platform.width / 2, -platform.height / 2, platform.width, platform.height * surfaceRatio, 4);
        ctx.fill();

        ctx.fillStyle = isCourtyard
            ? 'rgba(55, 117, 108, 0.16)'
            : isCathedral
                ? 'rgba(168, 198, 255, 0.12)'
                : isBunker
                    ? (platform.motion ? 'rgba(157, 219, 255, 0.18)' : 'rgba(130, 151, 186, 0.12)')
                : 'rgba(60, 214, 197, 0.1)';
        roundRect(
            -platform.width / 2 + 12,
            -platform.height / 2 + platform.height * 0.48,
            Math.max(platform.width - 24, 6),
            Math.max(platform.height * 0.22, 2),
            3
        );
        ctx.fill();

        if (isBunker && platform.motion) {
            ctx.fillStyle = 'rgba(245, 250, 255, 0.58)';
            roundRect(platform.width / 2 - 38, -2, 24, 4, 3);
            ctx.fill();
            roundRect(platform.width / 2 - 54, -2, 8, 4, 3);
            ctx.fill();
        }
        ctx.restore();
    });

    ctx.restore();
}

function drawPlayers() {
    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_LAYOUT_WIDTH, MAP_LAYOUT_HEIGHT);
    ctx.clip();

    Object.values(players)
        .sort((a, b) => (a.renderY ?? a.y) - (b.renderY ?? b.y))
        .forEach(player => {
            drawPlayerTrail(player);
            drawPlayerBody(player);
            drawPlayerLabel(player);
        });

    ctx.restore();
}

function drawPlayerTrail(player) {
    const drawX = player.renderX ?? player.x;
    const drawY = player.renderY ?? player.y;
    const speed = Math.abs(player.velocityX) + Math.abs(player.velocityY);
    if (speed < 40) return;

    const trailColor = player.isIt ? 'rgba(255, 106, 74, 0.18)' : 'rgba(60, 214, 197, 0.18)';
    for (let i = 1; i <= 3; i++) {
        const offsetX = player.velocityX * 0.025 * i;
        const offsetY = player.velocityY * 0.01 * i;
        ctx.fillStyle = trailColor;
        roundRect(drawX - offsetX, drawY - offsetY, PLAYER_SIZE, PLAYER_SIZE, 10);
        ctx.fill();
    }
}

function drawPlayerBody(player) {
    const drawX = player.renderX ?? player.x;
    const drawY = player.renderY ?? player.y;
    const theme = player.isIt
        ? { primary: '#ff6848', accent: '#ffd470', glow: 'rgba(255, 104, 72, 0.32)' }
        : { primary: '#2fd2c5', accent: '#e8fff6', glow: 'rgba(47, 210, 197, 0.28)' };

    ctx.save();
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = player.isIt ? 24 : 18;
    ctx.fillStyle = theme.primary;
    roundRect(drawX, drawY, PLAYER_SIZE, PLAYER_SIZE, 10);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    roundRect(drawX + 4, drawY + 4, PLAYER_SIZE - 8, 7, 4);
    ctx.fill();

    ctx.fillStyle = theme.accent;
    roundRect(drawX + 5, drawY + 12, PLAYER_SIZE - 10, 8, 4);
    ctx.fill();

    ctx.fillStyle = '#0f1726';
    ctx.beginPath();
    ctx.arc(drawX + 10, drawY + 17, 1.7, 0, Math.PI * 2);
    ctx.arc(drawX + 20, drawY + 17, 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = player.id === myPlayerId ? '#fff4df' : 'rgba(255, 244, 223, 0.72)';
    ctx.lineWidth = player.id === myPlayerId ? 3 : 2;
    roundRect(drawX, drawY, PLAYER_SIZE, PLAYER_SIZE, 10);
    ctx.stroke();

    if (player.isIt) {
        ctx.strokeStyle = 'rgba(255, 212, 112, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(drawX + PLAYER_SIZE / 2, drawY + PLAYER_SIZE / 2, PLAYER_SIZE / 2 + 8, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawPlayerLabel(player) {
    const drawX = player.renderX ?? player.x;
    const drawY = player.renderY ?? player.y;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Trebuchet MS';

    if (player.isIt) {
        ctx.fillStyle = '#fff4df';
        ctx.fillText('IT', drawX + PLAYER_SIZE / 2, drawY - 14);
    } else {
        ctx.fillStyle = 'rgba(255, 244, 223, 0.78)';
        ctx.fillText(player.id === myPlayerId ? 'YOU' : `P${player.number}`, drawX + PLAYER_SIZE / 2, drawY - 14);
    }
    ctx.restore();
}

function roundRect(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + width - safeRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    ctx.lineTo(x + width, y + height - safeRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    ctx.lineTo(x + safeRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    ctx.closePath();
}
