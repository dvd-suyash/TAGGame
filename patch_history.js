const fs = require('fs');

let uiCode = fs.readFileSync('public/js/ui.js', 'utf8');

const newSetActiveScreen = `
export function setActiveScreen(screenId, pushToHistory = true) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.toggle('active', screen.id === screenId);
    });
    
    if (pushToHistory) {
        history.pushState({ screenId }, "", "#" + screenId);
    }
}
`;

uiCode = uiCode.replace(
    /export function setActiveScreen\(screenId\) \{[\s\S]*?\}/,
    newSetActiveScreen.trim()
);

fs.writeFileSync('public/js/ui.js', uiCode);

let mainCode = fs.readFileSync('public/js/main.js', 'utf8');

const historyInit = `
// Initialize History API for browser back button
history.replaceState({ screenId: 'playerCountScreen' }, "", "#playerCountScreen");

window.addEventListener('popstate', (event) => {
    if (event.state && event.state.screenId) {
        setActiveScreen(event.state.screenId, false);
    } else {
        setActiveScreen('playerCountScreen', false);
    }
});
`;

// Insert the history init after the imports
mainCode = mainCode.replace("import { startGame, gameLoop } from './main.js';", "import { startGame, gameLoop } from './main.js';\n" + historyInit);
fs.writeFileSync('public/js/main.js', mainCode);

console.log("Patched History API!");
