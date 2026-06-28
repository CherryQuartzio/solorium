// Theme color management - runs in <head> to prevent FOUC
// This file is loaded as a standalone script in <head>, NOT bundled into main.min.js

var textColor, originalAccentColorShade, originalAccentColor, originalBackgroundColor;

// Function to dynamically set text color based on background color
function setTextColorBasedOnBackground() {
    /* Get the current global background color of the site */
    var bgColor = getComputedStyle(document.documentElement).getPropertyValue('--background-color').trim().slice(1);

    /* The script for calculating the color contrast was taken from
    https://gomakethings.com/dynamically-changing-the-text-color-based-on-background-color-contrast-with-vanilla-js/ */
    var r = parseInt(bgColor.substr(0, 2), 16);
    var g = parseInt(bgColor.substr(2, 2), 16);
    var b = parseInt(bgColor.substr(4, 2), 16);
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    // Determine if text color should be light or dark
    textColor = (yiq >= 128) ? 'dark' : 'light';

    // Apply the determined text color class to the root element (use classList so other
    // root classes, e.g. is-dark-mode, are preserved)
    document.documentElement.classList.remove('has-light-text', 'has-dark-text');
    document.documentElement.classList.add('has-' + textColor + '-text');
}

// Determine whether dark mode is active right now, mirroring initColorTheme()'s logic so
// the correct theme/icon can be applied in <head> before the page paints (prevents FOUC).
function isDarkModeActive() {
    var prefersDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var manual = localStorage.getItem('darkMode');
    var auto = localStorage.getItem('autoDarkMode');

    // First visit (no manual preference) or auto mode follows the system setting.
    if (manual === null || auto === 'true') {
        return prefersDark;
    }
    return manual === 'true';
}

// To prevent theme flashing on load, apply all colors (and the dark-mode class that drives
// the toggle icon) before the page paints.
if (isDarkModeActive()) {
    document.documentElement.style.setProperty('--background-color', 'var(--dark-mode-background-color)');
    document.documentElement.classList.add('is-dark-mode');
}

setTextColorBasedOnBackground(); // Initial run to set text color based on initial background color

function setAccentColorBasedOnTextColor() {
    // select all standalone a tags in .gh-content
    var allAtagsSelector = '.gh-content a:not(.toc-link):not(.kg-btn):not(.kg-cta-button):not(.kg-header-card-button):not(.gh-author-name-list > a):not(.kg-header-card-heading > a)';
    var allAtags = document.querySelectorAll(allAtagsSelector);
    // select all blockquotes in .gh-content and set their border color to the original accent color for better contrast
    var allBlockquotes = document.querySelectorAll('.gh-content blockquote');
    var allInlineCode = document.querySelectorAll(':not(pre) > code'); // select all inline code blocks in .gh-content

    if (textColor === 'dark' || originalAccentColorShade === 'bright') { // light background or light original accent color
        if (allAtags.length > 0) allAtags.forEach(function(a) { a.style.color = originalAccentColor; });
        if (allBlockquotes.length > 0) allBlockquotes.forEach(function(blockquote) { blockquote.style.borderColor = originalAccentColor; });
        if (allInlineCode.length > 0) allInlineCode.forEach(function(code) { code.style.color = originalAccentColor; });
    } else { // dark background, increase contrast
        var accentRgb = originalAccentColor.trim().slice(1); // remove the '#' from hex color
        var r = Math.min(255, parseInt(accentRgb.substr(0, 2), 16) + 60);
        var g = Math.min(255, parseInt(accentRgb.substr(2, 2), 16) + 60);
        var b = Math.min(255, parseInt(accentRgb.substr(4, 2), 16) + 60);

        if (allAtags.length > 0) allAtags.forEach(function(a) { a.style.color = 'rgb(' + r + ', ' + g + ', ' + b + ')'; });
        if (allBlockquotes.length > 0) allBlockquotes.forEach(function(blockquote) { blockquote.style.borderColor = 'rgb(' + r + ', ' + g + ', ' + b + ')'; });
        if (allInlineCode.length > 0) allInlineCode.forEach(function(code) { code.style.color = 'rgb(' + r + ', ' + g + ', ' + b + ', 1)'; });
    }
}

// Function to toggle dark mode and change body background color
function changeColorTheme(mode) {
    if (!mode || mode === 'switch') {
        localStorage.setItem('autoDarkMode', false); // disable auto dark mode when user manually toggles theme
        mode = localStorage.getItem('darkMode') === 'true' ? 'light' : 'dark';
    }

    if (mode === 'light') {
        showSunToggleIcon(false); // display moon icon, hide sun icon
        document.documentElement.style.setProperty('--background-color', originalBackgroundColor); // Set light background
        localStorage.setItem('darkMode', false);
        setTextColorBasedOnBackground();
        setAccentColorBasedOnTextColor();
        return;
    } else if (mode === 'dark') {
        showSunToggleIcon(true); // display sun icon, hide moon icon
        document.documentElement.style.setProperty('--background-color', 'var(--dark-mode-background-color)'); // Set dark background
        localStorage.setItem('darkMode', true);
        setTextColorBasedOnBackground();
        setAccentColorBasedOnTextColor();
        return;
    }
}

// Function to update icon visibility based on the mode
function showSunToggleIcon(is_currently_dark) {
    var moonIcons = document.querySelectorAll('.icon-moon');
    var sunIcons = document.querySelectorAll('.icon-sun');

    if (is_currently_dark) {
        moonIcons.forEach(function(icon) { icon.style.display = 'none'; });
        sunIcons.forEach(function(icon) { icon.style.display = 'flex'; });
    } else {
        moonIcons.forEach(function(icon) { icon.style.display = 'flex'; });
        sunIcons.forEach(function(icon) { icon.style.display = 'none'; });
    }
}

// Check and apply dark mode preference from local storage
function initColorTheme() {
    var prefers_dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var previous_dark_state = localStorage.getItem('darkMode');

    if (previous_dark_state === null)
        localStorage.setItem('autoDarkMode', true);

    // set based on system preference if there is no manual preference, otherwise set based on manual preference
    if (localStorage.getItem('autoDarkMode') === 'true') {
        if (prefers_dark) {
            changeColorTheme('dark');
        } else {
            changeColorTheme('light');
        }
    }
    else if (previous_dark_state === 'true') { // restore dark mode if it was previously enabled
        showSunToggleIcon(true);
        setAccentColorBasedOnTextColor();
    }
    else {
        showSunToggleIcon(false);
        //setAccentColorBasedOnTextColor();
    }
}
