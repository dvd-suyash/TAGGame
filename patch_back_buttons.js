const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace(
    '<div id="mapScreen" class="screen">',
    '<div id="mapScreen" class="screen">\n        <button class="back-btn" id="backToPlayerCountBtn">← Back</button>'
);

html = html.replace(
    '<div id="modeScreen" class="screen">',
    '<div id="modeScreen" class="screen">\n        <button class="back-btn" id="backToMapBtn">← Back</button>'
);

html = html.replace(
    '<div id="roomScreen" class="screen">',
    '<div id="roomScreen" class="screen">\n        <button class="back-btn" id="backToModeBtn">← Back</button>'
);

fs.writeFileSync('public/index.html', html);

// 2. Update style.css
let css = fs.readFileSync('public/style.css', 'utf8');
const btnCss = `
.back-btn {
    position: absolute;
    top: 32px;
    left: 32px;
    background: rgba(255, 244, 223, 0.1);
    border: 1px solid rgba(255, 244, 223, 0.2);
    color: var(--paper);
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 100;
}
.back-btn:hover {
    background: rgba(255, 244, 223, 0.25);
    border-color: rgba(255, 244, 223, 0.5);
    transform: translateX(-2px);
}
`;
fs.appendFileSync('public/style.css', btnCss);

// 3. Update main.js
let mainJs = fs.readFileSync('public/js/main.js', 'utf8');
const jsEvents = `
document.getElementById('backToPlayerCountBtn')?.addEventListener('click', () => {
    ui.setActiveScreen('playerCountScreen');
});
document.getElementById('backToMapBtn')?.addEventListener('click', () => {
    ui.setActiveScreen('mapScreen');
});
document.getElementById('backToModeBtn')?.addEventListener('click', () => {
    ui.setActiveScreen('modeScreen');
});
`;
mainJs = mainJs.replace("ui.chooseCreateBtn.addEventListener('click', () => {", jsEvents + "\nui.chooseCreateBtn.addEventListener('click', () => {");
fs.writeFileSync('public/js/main.js', mainJs);

console.log('Patched UI with back buttons!');
