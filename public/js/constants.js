// Game constants
export const GRAVITY = 3200;
export const JUMP_STRENGTH = -880;
export const MOVE_SPEED = 350;
export const PLAYER_SIZE = 26;
export const COLLISION_DISTANCE = 40;
export const GROUND_ACCELERATION = 4200;
export const AIR_ACCELERATION = 3900;
export const GROUND_FRICTION = 4600;
export const AIR_FRICTION = 250;
export const COYOTE_TIME_SECONDS = 0.15;
export const JUMP_BUFFER_SECONDS = 0.15;
export const REMOTE_INTERPOLATION_SECONDS = 0.05;
export const MAP_LAYOUT_WIDTH = 1259;
export const MAP_LAYOUT_HEIGHT = 586;
export const MAP_OFFSET_X = (1400 - MAP_LAYOUT_WIDTH) / 2;
export const MAP_OFFSET_Y = (700 - MAP_LAYOUT_HEIGHT) / 2;
export const MAP_BOUNDS = {
    left: MAP_OFFSET_X,
    top: MAP_OFFSET_Y,
    right: MAP_OFFSET_X + MAP_LAYOUT_WIDTH,
    bottom: MAP_OFFSET_Y + MAP_LAYOUT_HEIGHT
};
export const MAP_DEFINITIONS = {
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
