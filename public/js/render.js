import { state } from './state.js';
import { ui } from './ui.js';
import * as constants from './constants.js';
import { socket } from './network.js';
import { getMapDefinition, buildPlatformFromLayout, initPlatforms, getPlatformMotionOffset, updatePlatforms, getPlatformTopEdge, getPlatformSurfaceYAtX, getPlatformOverlap, shouldIgnoreConnectedSeamCollision, resolveSolidPlatformCollisions } from './map.js';
import { rotatePoint, approach } from './utils.js';
import { upsertPlayerState, initializePlayers, updateRemotePlayers, updatePlayer, checkCollisions } from './physics.js';

export function draw() {
    drawArenaBackground();
    drawPlatforms();
    drawPlayers();
}

export function drawArenaBackground() {
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

    const pageGradient = ui.ctx.createLinearGradient(0, 0, 0, ui.canvas.height);
    pageGradient.addColorStop(0, '#19131f');
    pageGradient.addColorStop(0.48, '#2f1d33');
    pageGradient.addColorStop(1, '#4f2430');
    ui.ctx.fillStyle = pageGradient;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    ui.ctx.save();
    const glowLeft = ui.ctx.createRadialGradient(180, 110, 20, 180, 110, 260);
    glowLeft.addColorStop(0, 'rgba(255, 185, 95, 0.45)');
    glowLeft.addColorStop(1, 'rgba(255, 185, 95, 0)');
    ui.ctx.fillStyle = glowLeft;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    const glowRight = ui.ctx.createRadialGradient(1180, 180, 20, 1180, 180, 320);
    glowRight.addColorStop(0, 'rgba(255, 99, 71, 0.24)');
    glowRight.addColorStop(1, 'rgba(255, 99, 71, 0)');
    ui.ctx.fillStyle = glowRight;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);
    ui.ctx.restore();

    const arenaGradient = ui.ctx.createLinearGradient(0, constants.MAP_OFFSET_Y, 0, constants.MAP_OFFSET_Y + constants.MAP_LAYOUT_HEIGHT);
    arenaGradient.addColorStop(0, 'rgba(27, 19, 33, 0.9)');
    arenaGradient.addColorStop(0.58, 'rgba(81, 36, 61, 0.82)');
    arenaGradient.addColorStop(1, 'rgba(255, 151, 90, 0.78)');
    ui.ctx.fillStyle = arenaGradient;
    ui.ctx.fillRect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);

    ui.ctx.save();
    ui.ctx.setLineDash([6, 6]);
    ui.ctx.strokeStyle = 'rgba(255, 244, 223, 0.28)';
    ui.ctx.lineWidth = 2.5;
    ui.ctx.strokeRect(constants.MAP_OFFSET_X + 1.5, constants.MAP_OFFSET_Y + 1.5, constants.MAP_LAYOUT_WIDTH - 3, constants.MAP_LAYOUT_HEIGHT - 3);
    ui.ctx.restore();

    ui.ctx.save();
    ui.ctx.fillStyle = 'rgba(255, 244, 223, 0.05)';
    ui.ctx.fillRect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);
    ui.ctx.restore();

    ui.ctx.save();
    ui.ctx.beginPath();
    ui.ctx.rect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);
    ui.ctx.clip();
    drawMapEllipses(activeMap.backgroundEllipses);
    drawMapStumps(activeMap.stumps || []);
    ui.ctx.restore();
}

export function drawBunkerArenaBackground() {
    const pageGradient = ui.ctx.createLinearGradient(0, 0, 0, ui.canvas.height);
    pageGradient.addColorStop(0, '#101722');
    pageGradient.addColorStop(0.5, '#1d2b3f');
    pageGradient.addColorStop(1, '#314664');
    ui.ctx.fillStyle = pageGradient;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    const glow = ui.ctx.createRadialGradient(ui.canvas.width / 2, 150, 20, ui.canvas.width / 2, 150, 320);
    glow.addColorStop(0, 'rgba(140, 210, 255, 0.12)');
    glow.addColorStop(1, 'rgba(140, 210, 255, 0)');
    ui.ctx.fillStyle = glow;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    const arenaGradient = ui.ctx.createLinearGradient(0, constants.MAP_OFFSET_Y, 0, constants.MAP_OFFSET_Y + constants.MAP_LAYOUT_HEIGHT);
    arenaGradient.addColorStop(0, '#536486');
    arenaGradient.addColorStop(0.48, '#65789d');
    arenaGradient.addColorStop(1, '#3b4d68');
    ui.ctx.fillStyle = arenaGradient;
    ui.ctx.fillRect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);

    ui.ctx.save();
    ui.ctx.setLineDash([6, 8]);
    ui.ctx.strokeStyle = 'rgba(226, 234, 255, 0.2)';
    ui.ctx.lineWidth = 2.5;
    ui.ctx.strokeRect(constants.MAP_OFFSET_X + 1.5, constants.MAP_OFFSET_Y + 1.5, constants.MAP_LAYOUT_WIDTH - 3, constants.MAP_LAYOUT_HEIGHT - 3);
    ui.ctx.restore();

    ui.ctx.save();
    ui.ctx.beginPath();
    ui.ctx.rect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);
    ui.ctx.clip();

    ui.ctx.fillStyle = 'rgba(18, 26, 41, 0.18)';
    roundRect(constants.MAP_OFFSET_X + 86, constants.MAP_OFFSET_Y + 118, 372, 320, 26);
    ui.ctx.fill();
    roundRect(constants.MAP_OFFSET_X + 801, constants.MAP_OFFSET_Y + 118, 372, 320, 26);
    ui.ctx.fill();

    ui.ctx.fillStyle = 'rgba(238, 243, 255, 0.08)';
    roundRect(constants.MAP_OFFSET_X + 420, constants.MAP_OFFSET_Y + 470, 418, 20, 10);
    ui.ctx.fill();
    roundRect(constants.MAP_OFFSET_X + 484, constants.MAP_OFFSET_Y + 318, 290, 16, 8);
    ui.ctx.fill();

    ui.ctx.strokeStyle = 'rgba(224, 232, 255, 0.12)';
    ui.ctx.lineWidth = 2;
    ui.ctx.setLineDash([18, 16]);
    ui.ctx.beginPath();
    ui.ctx.moveTo(constants.MAP_OFFSET_X + 426, constants.MAP_OFFSET_Y + 474);
    ui.ctx.lineTo(constants.MAP_OFFSET_X + 836, constants.MAP_OFFSET_Y + 474);
    ui.ctx.moveTo(constants.MAP_OFFSET_X + 500, constants.MAP_OFFSET_Y + 322);
    ui.ctx.lineTo(constants.MAP_OFFSET_X + 760, constants.MAP_OFFSET_Y + 322);
    ui.ctx.stroke();
    ui.ctx.setLineDash([]);

    ui.ctx.restore();
}

export function drawCathedralArenaBackground() {
    const pageGradient = ui.ctx.createLinearGradient(0, 0, 0, ui.canvas.height);
    pageGradient.addColorStop(0, '#0f1320');
    pageGradient.addColorStop(0.5, '#1d2740');
    pageGradient.addColorStop(1, '#33456a');
    ui.ctx.fillStyle = pageGradient;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    const halo = ui.ctx.createRadialGradient(ui.canvas.width / 2, 120, 20, ui.canvas.width / 2, 120, 260);
    halo.addColorStop(0, 'rgba(212, 228, 255, 0.22)');
    halo.addColorStop(1, 'rgba(212, 228, 255, 0)');
    ui.ctx.fillStyle = halo;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    const arenaGradient = ui.ctx.createLinearGradient(0, constants.MAP_OFFSET_Y, 0, constants.MAP_OFFSET_Y + constants.MAP_LAYOUT_HEIGHT);
    arenaGradient.addColorStop(0, '#8f9cb9');
    arenaGradient.addColorStop(0.46, '#7686a9');
    arenaGradient.addColorStop(1, '#596988');
    ui.ctx.fillStyle = arenaGradient;
    ui.ctx.fillRect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);

    ui.ctx.save();
    ui.ctx.setLineDash([5, 7]);
    ui.ctx.strokeStyle = 'rgba(223, 232, 255, 0.28)';
    ui.ctx.lineWidth = 2.5;
    ui.ctx.strokeRect(constants.MAP_OFFSET_X + 1.5, constants.MAP_OFFSET_Y + 1.5, constants.MAP_LAYOUT_WIDTH - 3, constants.MAP_LAYOUT_HEIGHT - 3);
    ui.ctx.restore();

    ui.ctx.save();
    ui.ctx.beginPath();
    ui.ctx.rect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);
    ui.ctx.clip();

    ui.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    roundRect(constants.MAP_OFFSET_X + 172, constants.MAP_OFFSET_Y + 144, constants.MAP_LAYOUT_WIDTH - 344, 284, 24);
    ui.ctx.fill();

    ui.ctx.fillStyle = 'rgba(32, 42, 68, 0.22)';
    roundRect(constants.MAP_OFFSET_X + 226, constants.MAP_OFFSET_Y + 118, constants.MAP_LAYOUT_WIDTH - 452, 332, 18);
    ui.ctx.fill();

    drawCathedralWindow(constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH / 2 - 52, constants.MAP_OFFSET_Y + 64, 104, 144, 'rgba(223, 232, 255, 0.2)');
    drawCathedralWindow(constants.MAP_OFFSET_X + 186, constants.MAP_OFFSET_Y + 126, 66, 104, 'rgba(223, 232, 255, 0.1)');
    drawCathedralWindow(constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH - 252, constants.MAP_OFFSET_Y + 126, 66, 104, 'rgba(223, 232, 255, 0.1)');
    drawCathedralColumns();
    drawCathedralFloorGlow();

    ui.ctx.restore();
}

export function drawCathedralWindow(x, y, width, height, glowStyle) {
    ui.ctx.save();
    ui.ctx.fillStyle = 'rgba(28, 37, 58, 0.3)';
    roundRect(x, y, width, height, width / 2);
    ui.ctx.fill();

    const innerX = x + 10;
    const innerY = y + 12;
    const innerWidth = width - 20;
    const innerHeight = height - 22;
    const gradient = ui.ctx.createLinearGradient(0, innerY, 0, innerY + innerHeight);
    gradient.addColorStop(0, glowStyle);
    gradient.addColorStop(1, 'rgba(223, 232, 255, 0.02)');
    ui.ctx.fillStyle = gradient;
    roundRect(innerX, innerY, innerWidth, innerHeight, innerWidth / 2);
    ui.ctx.fill();

    ui.ctx.strokeStyle = 'rgba(233, 240, 255, 0.16)';
    ui.ctx.lineWidth = 1.5;
    ui.ctx.beginPath();
    ui.ctx.moveTo(x + width / 2, innerY + 6);
    ui.ctx.lineTo(x + width / 2, y + height - 16);
    ui.ctx.moveTo(innerX + 6, y + height * 0.52);
    ui.ctx.lineTo(x + width - 16, y + height * 0.52);
    ui.ctx.stroke();
    ui.ctx.restore();
}

export function drawCathedralColumns() {
    const columnXs = [constants.MAP_OFFSET_X + 132, constants.MAP_OFFSET_X + 292, constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH - 320, constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH - 160];
    columnXs.forEach(x => {
        ui.ctx.save();
        ui.ctx.fillStyle = 'rgba(225, 233, 255, 0.08)';
        roundRect(x, constants.MAP_OFFSET_Y + 164, 26, 310, 10);
        ui.ctx.fill();
        ui.ctx.restore();
    });
}

export function drawCathedralFloorGlow() {
    ui.ctx.save();
    const floorGradient = ui.ctx.createLinearGradient(0, constants.MAP_OFFSET_Y + 430, 0, constants.MAP_OFFSET_Y + 560);
    floorGradient.addColorStop(0, 'rgba(218, 228, 255, 0.08)');
    floorGradient.addColorStop(1, 'rgba(218, 228, 255, 0)');
    ui.ctx.fillStyle = floorGradient;
    roundRect(constants.MAP_OFFSET_X + 86, constants.MAP_OFFSET_Y + 424, constants.MAP_LAYOUT_WIDTH - 172, 112, 18);
    ui.ctx.fill();

    ui.ctx.strokeStyle = 'rgba(226, 234, 255, 0.08)';
    ui.ctx.lineWidth = 2;
    ui.ctx.beginPath();
    ui.ctx.moveTo(constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH / 2, constants.MAP_OFFSET_Y + 430);
    ui.ctx.lineTo(constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH / 2, constants.MAP_OFFSET_Y + 546);
    ui.ctx.moveTo(constants.MAP_OFFSET_X + 210, constants.MAP_OFFSET_Y + 486);
    ui.ctx.lineTo(constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH - 210, constants.MAP_OFFSET_Y + 486);
    ui.ctx.stroke();
    ui.ctx.restore();
}

export function drawMazeArenaBackground() {
    const activeMap = getMapDefinition();
    const pageGradient = ui.ctx.createLinearGradient(0, 0, 0, ui.canvas.height);
    pageGradient.addColorStop(0, '#2a3150');
    pageGradient.addColorStop(0.55, '#4c5d92');
    pageGradient.addColorStop(1, '#7d8bc0');
    ui.ctx.fillStyle = pageGradient;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    const mistGlow = ui.ctx.createRadialGradient(ui.canvas.width / 2, 120, 20, ui.canvas.width / 2, 120, 280);
    mistGlow.addColorStop(0, 'rgba(233, 240, 255, 0.2)');
    mistGlow.addColorStop(1, 'rgba(233, 240, 255, 0)');
    ui.ctx.fillStyle = mistGlow;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    const arenaGradient = ui.ctx.createLinearGradient(0, constants.MAP_OFFSET_Y, 0, constants.MAP_OFFSET_Y + constants.MAP_LAYOUT_HEIGHT);
    arenaGradient.addColorStop(0, '#94a0cf');
    arenaGradient.addColorStop(0.45, '#9caae0');
    arenaGradient.addColorStop(1, '#8997cd');
    ui.ctx.fillStyle = arenaGradient;
    ui.ctx.fillRect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);

    ui.ctx.save();
    ui.ctx.setLineDash([6, 6]);
    ui.ctx.strokeStyle = 'rgba(226, 234, 255, 0.28)';
    ui.ctx.lineWidth = 2.5;
    ui.ctx.strokeRect(constants.MAP_OFFSET_X + 1.5, constants.MAP_OFFSET_Y + 1.5, constants.MAP_LAYOUT_WIDTH - 3, constants.MAP_LAYOUT_HEIGHT - 3);
    ui.ctx.restore();

    ui.ctx.save();
    ui.ctx.beginPath();
    ui.ctx.rect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);
    ui.ctx.clip();
    drawMapEllipses(activeMap.backgroundEllipses);
    drawMapStumps(activeMap.stumps || []);
    ui.ctx.restore();
}

export function drawCourtyardArenaBackground() {
    const pageGradient = ui.ctx.createLinearGradient(0, 0, 0, ui.canvas.height);
    pageGradient.addColorStop(0, '#23161d');
    pageGradient.addColorStop(0.48, '#714737');
    pageGradient.addColorStop(1, '#d6a06a');
    ui.ctx.fillStyle = pageGradient;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    const sunGlow = ui.ctx.createRadialGradient(ui.canvas.width - 250, 130, 20, ui.canvas.width - 250, 130, 250);
    sunGlow.addColorStop(0, 'rgba(255, 229, 176, 0.28)');
    sunGlow.addColorStop(1, 'rgba(255, 224, 163, 0)');
    ui.ctx.fillStyle = sunGlow;
    ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    const arenaGradient = ui.ctx.createLinearGradient(0, constants.MAP_OFFSET_Y, 0, constants.MAP_OFFSET_Y + constants.MAP_LAYOUT_HEIGHT);
    arenaGradient.addColorStop(0, '#d9ab77');
    arenaGradient.addColorStop(0.46, '#e7c291');
    arenaGradient.addColorStop(1, '#c98761');
    ui.ctx.fillStyle = arenaGradient;
    ui.ctx.fillRect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);

    ui.ctx.save();
    ui.ctx.setLineDash([7, 7]);
    ui.ctx.strokeStyle = 'rgba(255, 243, 218, 0.34)';
    ui.ctx.lineWidth = 2.5;
    ui.ctx.strokeRect(constants.MAP_OFFSET_X + 1.5, constants.MAP_OFFSET_Y + 1.5, constants.MAP_LAYOUT_WIDTH - 3, constants.MAP_LAYOUT_HEIGHT - 3);
    ui.ctx.restore();

    ui.ctx.save();
    ui.ctx.beginPath();
    ui.ctx.rect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);
    ui.ctx.clip();

    const skyMist = ui.ctx.createLinearGradient(0, constants.MAP_OFFSET_Y, 0, constants.MAP_OFFSET_Y + constants.MAP_LAYOUT_HEIGHT * 0.5);
    skyMist.addColorStop(0, 'rgba(255, 242, 216, 0.22)');
    skyMist.addColorStop(1, 'rgba(255, 242, 216, 0)');
    ui.ctx.fillStyle = skyMist;
    ui.ctx.fillRect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT * 0.5);

    drawSimpleCourtyardSilhouettes();
    drawSimpleCourtyardFloorBands();

    ui.ctx.restore();
}

export function drawSimpleCourtyardSilhouettes() {
    ui.ctx.save();
    ui.ctx.fillStyle = 'rgba(123, 67, 50, 0.16)';

    roundRect(constants.MAP_OFFSET_X + 116, constants.MAP_OFFSET_Y + 176, 1028, 124, 24);
    ui.ctx.fill();

    roundRect(constants.MAP_OFFSET_X + 244, constants.MAP_OFFSET_Y + 126, 772, 70, 18);
    ui.ctx.fill();

    ui.ctx.beginPath();
    ui.ctx.ellipse(constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH / 2, constants.MAP_OFFSET_Y + 136, 72, 34, 0, Math.PI, 0);
    ui.ctx.lineTo(constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH / 2 + 72, constants.MAP_OFFSET_Y + 168);
    ui.ctx.lineTo(constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH / 2 - 72, constants.MAP_OFFSET_Y + 168);
    ui.ctx.closePath();
    ui.ctx.fill();

    ui.ctx.fillStyle = 'rgba(248, 232, 202, 0.08)';
    roundRect(constants.MAP_OFFSET_X + 154, constants.MAP_OFFSET_Y + 208, 950, 54, 16);
    ui.ctx.fill();
    ui.ctx.restore();
}

export function drawSimpleCourtyardFloorBands() {
    ui.ctx.save();
    ui.ctx.fillStyle = 'rgba(255, 244, 220, 0.08)';
    roundRect(constants.MAP_OFFSET_X + 86, constants.MAP_OFFSET_Y + 448, constants.MAP_LAYOUT_WIDTH - 172, 20, 8);
    ui.ctx.fill();
    roundRect(constants.MAP_OFFSET_X + 128, constants.MAP_OFFSET_Y + 488, constants.MAP_LAYOUT_WIDTH - 256, 16, 8);
    ui.ctx.fill();

    const channelGradient = ui.ctx.createLinearGradient(0, constants.MAP_OFFSET_Y + 426, 0, constants.MAP_OFFSET_Y + 546);
    channelGradient.addColorStop(0, 'rgba(58, 123, 126, 0.12)');
    channelGradient.addColorStop(1, 'rgba(58, 123, 126, 0.03)');
    ui.ctx.fillStyle = channelGradient;
    roundRect(constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH / 2 - 18, constants.MAP_OFFSET_Y + 412, 36, 126, 10);
    ui.ctx.fill();
    ui.ctx.restore();
}

export function drawCourtyardPalace() {
    const palaceX = constants.MAP_OFFSET_X + 190;
    const palaceY = constants.MAP_OFFSET_Y + 124;
    const palaceWidth = 880;
    const palaceHeight = 128;

    ui.ctx.save();
    ui.ctx.fillStyle = 'rgba(132, 72, 54, 0.28)';
    roundRect(palaceX, palaceY, palaceWidth, palaceHeight, 26);
    ui.ctx.fill();

    ui.ctx.fillStyle = 'rgba(248, 231, 202, 0.12)';
    roundRect(palaceX + 18, palaceY + 18, palaceWidth - 36, palaceHeight - 36, 18);
    ui.ctx.fill();

    drawCourtyardDome(palaceX + palaceWidth * 0.5, palaceY + 4, 54, 'rgba(152, 82, 60, 0.34)');
    drawCourtyardDome(palaceX + 164, palaceY + 26, 36, 'rgba(152, 82, 60, 0.24)');
    drawCourtyardDome(palaceX + palaceWidth - 164, palaceY + 26, 36, 'rgba(152, 82, 60, 0.24)');

    const towerWidth = 26;
    [palaceX + 64, palaceX + palaceWidth - 90].forEach(towerX => {
        ui.ctx.fillStyle = 'rgba(132, 72, 54, 0.26)';
        roundRect(towerX, palaceY - 18, towerWidth, palaceHeight + 46, 10);
        ui.ctx.fill();
        drawCourtyardDome(towerX + towerWidth / 2, palaceY - 12, 16, 'rgba(160, 86, 62, 0.28)');
    });
    ui.ctx.restore();
}

export function drawCourtyardDome(centerX, topY, radius, fillStyle) {
    ui.ctx.save();
    ui.ctx.fillStyle = fillStyle;
    ui.ctx.beginPath();
    ui.ctx.moveTo(centerX - radius, topY + radius);
    ui.ctx.quadraticCurveTo(centerX - radius * 0.8, topY, centerX, topY);
    ui.ctx.quadraticCurveTo(centerX + radius * 0.8, topY, centerX + radius, topY + radius);
    ui.ctx.lineTo(centerX + radius * 0.9, topY + radius + 16);
    ui.ctx.lineTo(centerX - radius * 0.9, topY + radius + 16);
    ui.ctx.closePath();
    ui.ctx.fill();
    ui.ctx.restore();
}

export function drawCourtyardArcadeRow(startX, baseY, count, gap, archWidth, archHeight, fillStyle, highlightStyle) {
    for (let index = 0; index < count; index++) {
        const x = startX + index * gap;
        ui.ctx.save();
        ui.ctx.fillStyle = fillStyle;
        roundRect(x, baseY, archWidth, archHeight, 18);
        ui.ctx.fill();

        ui.ctx.globalCompositeOperation = 'destination-out';
        ui.ctx.beginPath();
        ui.ctx.moveTo(x + 18, baseY + archHeight);
        ui.ctx.lineTo(x + 18, baseY + 62);
        ui.ctx.quadraticCurveTo(x + archWidth / 2, baseY - 8, x + archWidth - 18, baseY + 62);
        ui.ctx.lineTo(x + archWidth - 18, baseY + archHeight);
        ui.ctx.closePath();
        ui.ctx.fill();
        ui.ctx.restore();

        ui.ctx.save();
        ui.ctx.strokeStyle = highlightStyle;
        ui.ctx.lineWidth = 1.5;
        ui.ctx.beginPath();
        ui.ctx.moveTo(x + 18, baseY + 62);
        ui.ctx.quadraticCurveTo(x + archWidth / 2, baseY + 6, x + archWidth - 18, baseY + 62);
        ui.ctx.stroke();
        ui.ctx.restore();
    }
}

export function drawCourtyardPlanters() {
    const planters = [
        { x: constants.MAP_OFFSET_X + 178, y: constants.MAP_OFFSET_Y + 424 },
        { x: constants.MAP_OFFSET_X + 1070, y: constants.MAP_OFFSET_Y + 424 },
        { x: constants.MAP_OFFSET_X + 592, y: constants.MAP_OFFSET_Y + 320 },
        { x: constants.MAP_OFFSET_X + 592, y: constants.MAP_OFFSET_Y + 222 }
    ];

    planters.forEach(planter => {
        ui.ctx.save();
        ui.ctx.fillStyle = 'rgba(110, 60, 43, 0.32)';
        roundRect(planter.x, planter.y, 34, 26, 8);
        ui.ctx.fill();
        ui.ctx.fillStyle = 'rgba(41, 88, 58, 0.34)';
        ui.ctx.beginPath();
        ui.ctx.moveTo(planter.x + 17, planter.y - 34);
        ui.ctx.quadraticCurveTo(planter.x + 4, planter.y - 8, planter.x + 12, planter.y + 4);
        ui.ctx.quadraticCurveTo(planter.x + 16, planter.y - 10, planter.x + 17, planter.y - 34);
        ui.ctx.moveTo(planter.x + 17, planter.y - 36);
        ui.ctx.quadraticCurveTo(planter.x + 30, planter.y - 8, planter.x + 22, planter.y + 4);
        ui.ctx.quadraticCurveTo(planter.x + 18, planter.y - 12, planter.x + 17, planter.y - 36);
        ui.ctx.fill();
        ui.ctx.restore();
    });
}

export function drawCourtyardFloorPattern() {
    const floorY = constants.MAP_OFFSET_Y + 448;
    ui.ctx.save();
    ui.ctx.fillStyle = 'rgba(255, 244, 220, 0.08)';
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 10; col++) {
            const tileX = constants.MAP_OFFSET_X + 102 + col * 108 + (row % 2) * 18;
            const tileY = floorY + row * 28;
            roundRect(tileX, tileY, 72, 16, 5);
            ui.ctx.fill();
        }
    }

    const channelGradient = ui.ctx.createLinearGradient(0, floorY, 0, floorY + 104);
    channelGradient.addColorStop(0, 'rgba(42, 114, 130, 0.22)');
    channelGradient.addColorStop(1, 'rgba(42, 114, 130, 0.06)');
    ui.ctx.fillStyle = channelGradient;
    roundRect(constants.MAP_OFFSET_X + constants.MAP_LAYOUT_WIDTH / 2 - 22, floorY - 18, 44, 124, 10);
    ui.ctx.fill();
    roundRect(constants.MAP_OFFSET_X + 286, floorY + 30, constants.MAP_LAYOUT_WIDTH - 572, 22, 10);
    ui.ctx.fill();
    ui.ctx.restore();
}

export function drawMapEllipses(ellipses) {
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
        ui.ctx.save();
        ui.ctx.globalAlpha = ellipse.alpha;
        ui.ctx.fillStyle = fills[ellipse.tier] || '#fff4df';
        ui.ctx.beginPath();
        ui.ctx.ellipse(
            constants.MAP_OFFSET_X + ellipse.x,
            constants.MAP_OFFSET_Y + ellipse.y,
            ellipse.rx,
            ellipse.ry,
            0,
            0,
            Math.PI * 2
        );
        ui.ctx.fill();
        ui.ctx.restore();
    });
}

export function drawMapStumps(stumps) {
    const activeMap = getMapDefinition();
    const isMaze = activeMap.theme === 'maze';

    stumps.forEach(stump => {
        const drawX = constants.MAP_OFFSET_X + stump.x;
        const drawY = constants.MAP_OFFSET_Y + stump.y;

        ui.ctx.save();
        ui.ctx.fillStyle = isMaze ? 'rgba(109, 122, 168, 0.46)' : 'rgba(65, 80, 111, 0.48)';
        roundRect(drawX, drawY, stump.width, stump.height, 3);
        ui.ctx.fill();

        ui.ctx.fillStyle = isMaze ? 'rgba(216, 226, 248, 0.2)' : 'rgba(255, 244, 223, 0.14)';
        ui.ctx.beginPath();
        ui.ctx.ellipse(
            drawX + stump.width / 2,
            drawY,
            stump.crownRx,
            stump.crownRy,
            0,
            0,
            Math.PI * 2
        );
        ui.ctx.fill();
        ui.ctx.restore();
    });
}

export function drawPlatforms() {
    const activeMap = getMapDefinition();
    const isCourtyard = activeMap.theme === 'courtyard';
    const isCathedral = activeMap.theme === 'cathedral';
    const isBunker = activeMap.theme === 'bunker';

    ui.ctx.save();
    ui.ctx.beginPath();
    ui.ctx.rect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);
    ui.ctx.clip();

    state.platforms.forEach(platform => {
        const angleRadians = (platform.angle || 0) * Math.PI / 180;
        const centerX = platform.x + platform.width / 2;
        const centerY = platform.y + platform.height / 2;
        const surfaceRatio = platform.surfaceRatio || 0.45;

        ui.ctx.save();
        ui.ctx.translate(centerX, centerY);
        ui.ctx.rotate(angleRadians);
        ui.ctx.fillStyle = isCourtyard
            ? 'rgba(84, 46, 34, 0.18)'
            : isCathedral
                ? 'rgba(24, 30, 48, 0.18)'
                : isBunker
                    ? 'rgba(18, 28, 43, 0.22)'
                : 'rgba(18, 15, 24, 0.22)';
        roundRect(-platform.width / 2 + 8, -platform.height / 2 + 8, platform.width, platform.height, 6);
        ui.ctx.fill();

        const bodyGradient = ui.ctx.createLinearGradient(0, -platform.height / 2, 0, platform.height / 2);
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
        ui.ctx.fillStyle = bodyGradient;
        roundRect(-platform.width / 2, -platform.height / 2, platform.width, platform.height, 6);
        ui.ctx.fill();

        ui.ctx.strokeStyle = isCourtyard
            ? 'rgba(255, 243, 218, 0.22)'
            : isCathedral
                ? 'rgba(232, 238, 255, 0.22)'
                : isBunker
                    ? 'rgba(228, 236, 255, 0.16)'
                : 'rgba(255, 244, 223, 0.16)';
        ui.ctx.lineWidth = 1.5;
        roundRect(-platform.width / 2, -platform.height / 2, platform.width, platform.height, 6);
        ui.ctx.stroke();

        ui.ctx.fillStyle = isCourtyard ? '#f8ebd5' : isCathedral ? '#eef3ff' : isBunker ? '#eef4ff' : '#fff4df';
        roundRect(-platform.width / 2, -platform.height / 2, platform.width, platform.height * surfaceRatio, 4);
        ui.ctx.fill();

        ui.ctx.fillStyle = isCourtyard
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
        ui.ctx.fill();

        if (isBunker && platform.motion) {
            ui.ctx.fillStyle = 'rgba(245, 250, 255, 0.58)';
            roundRect(platform.width / 2 - 38, -2, 24, 4, 3);
            ui.ctx.fill();
            roundRect(platform.width / 2 - 54, -2, 8, 4, 3);
            ui.ctx.fill();
        }
        ui.ctx.restore();
    });

    ui.ctx.restore();
}

export function drawPlayers() {
    ui.ctx.save();
    ui.ctx.beginPath();
    ui.ctx.rect(constants.MAP_OFFSET_X, constants.MAP_OFFSET_Y, constants.MAP_LAYOUT_WIDTH, constants.MAP_LAYOUT_HEIGHT);
    ui.ctx.clip();

    Object.values(state.players)
        .sort((a, b) => (a.renderY ?? a.y) - (b.renderY ?? b.y))
        .forEach(player => {
            drawPlayerTrail(player);
            drawPlayerBody(player);
            drawPlayerLabel(player);
        });

    ui.ctx.restore();
}

export function drawPlayerTrail(player) {
    const drawX = player.renderX ?? player.x;
    const drawY = player.renderY ?? player.y;
    const speed = Math.abs(player.velocityX) + Math.abs(player.velocityY);
    if (speed < 40) return;

    const trailColor = player.isIt ? 'rgba(255, 106, 74, 0.18)' : 'rgba(60, 214, 197, 0.18)';
    for (let i = 1; i <= 3; i++) {
        const offsetX = player.velocityX * 0.025 * i;
        const offsetY = player.velocityY * 0.01 * i;
        ui.ctx.fillStyle = trailColor;
        roundRect(drawX - offsetX, drawY - offsetY, constants.PLAYER_SIZE, constants.PLAYER_SIZE, 10);
        ui.ctx.fill();
    }
}

export function drawPlayerBody(player) {
    const drawX = player.renderX ?? player.x;
    const drawY = player.renderY ?? player.y;
    const theme = player.isIt
        ? { primary: '#ff6848', accent: '#ffd470', glow: 'rgba(255, 104, 72, 0.32)' }
        : { primary: '#2fd2c5', accent: '#e8fff6', glow: 'rgba(47, 210, 197, 0.28)' };

    ui.ctx.save();
    ui.ctx.shadowColor = theme.glow;
    ui.ctx.shadowBlur = player.isIt ? 24 : 18;
    ui.ctx.fillStyle = theme.primary;
    roundRect(drawX, drawY, constants.PLAYER_SIZE, constants.PLAYER_SIZE, 10);
    ui.ctx.fill();
    ui.ctx.restore();

    ui.ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    roundRect(drawX + 4, drawY + 4, constants.PLAYER_SIZE - 8, 7, 4);
    ui.ctx.fill();

    ui.ctx.fillStyle = theme.accent;
    roundRect(drawX + 5, drawY + 12, constants.PLAYER_SIZE - 10, 8, 4);
    ui.ctx.fill();

    ui.ctx.fillStyle = '#0f1726';
    ui.ctx.beginPath();
    ui.ctx.arc(drawX + 10, drawY + 17, 1.7, 0, Math.PI * 2);
    ui.ctx.arc(drawX + 20, drawY + 17, 1.7, 0, Math.PI * 2);
    ui.ctx.fill();

    ui.ctx.strokeStyle = player.id === state.myPlayerId ? '#fff4df' : 'rgba(255, 244, 223, 0.72)';
    ui.ctx.lineWidth = player.id === state.myPlayerId ? 3 : 2;
    roundRect(drawX, drawY, constants.PLAYER_SIZE, constants.PLAYER_SIZE, 10);
    ui.ctx.stroke();

    if (player.isIt) {
        ui.ctx.strokeStyle = 'rgba(255, 212, 112, 0.8)';
        ui.ctx.lineWidth = 3;
        ui.ctx.beginPath();
        ui.ctx.arc(drawX + constants.PLAYER_SIZE / 2, drawY + constants.PLAYER_SIZE / 2, constants.PLAYER_SIZE / 2 + 8, 0, Math.PI * 2);
        ui.ctx.stroke();
    }
}

export function drawPlayerLabel(player) {
    const drawX = player.renderX ?? player.x;
    const drawY = player.renderY ?? player.y;
    ui.ctx.save();
    ui.ctx.textAlign = 'center';
    ui.ctx.font = 'bold 13px Trebuchet MS';

    if (player.isIt) {
        ui.ctx.fillStyle = '#fff4df';
        ui.ctx.fillText('IT', drawX + constants.PLAYER_SIZE / 2, drawY - 14);
    } else {
        ui.ctx.fillStyle = 'rgba(255, 244, 223, 0.78)';
        ui.ctx.fillText(player.id === state.myPlayerId ? 'YOU' : `P${player.number}`, drawX + constants.PLAYER_SIZE / 2, drawY - 14);
    }
    ui.ctx.restore();
}

export function roundRect(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    ui.ctx.beginPath();
    ui.ctx.moveTo(x + safeRadius, y);
    ui.ctx.lineTo(x + width - safeRadius, y);
    ui.ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    ui.ctx.lineTo(x + width, y + height - safeRadius);
    ui.ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    ui.ctx.lineTo(x + safeRadius, y + height);
    ui.ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    ui.ctx.lineTo(x, y + safeRadius);
    ui.ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    ui.ctx.closePath();
}

