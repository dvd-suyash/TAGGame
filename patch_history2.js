const fs = require('fs');
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

// Replace the comment "// Menu screen handlers" with the historyInit + comment
mainCode = mainCode.replace("// Menu screen handlers", historyInit + "\n// Menu screen handlers");
fs.writeFileSync('public/js/main.js', mainCode);
console.log('Fixed main.js history patch!');
