function initParallax() {
    jarallax(document.querySelectorAll('.has-parallax-feed .gh-card'), {
        speed: 0.8,
    });
}

(function () {
    if (!document.body.classList.contains('has-background-about')) return;

    const about = document.querySelector('.gh-about');
    if (!about) return;

    const image = about.querySelector('.gh-about-image');

    if (!image.naturalWidth) {
        imagesLoaded(image, function () {
            about.style.setProperty('--about-height', image.clientWidth * image.naturalHeight / image.naturalWidth + 'px');
        });
    }
})();

(function () {
    initParallax();
})();

(function () {
    const dismissBtn = document.getElementById('dismiss-cover');
    const content = document.getElementById('content');
    
    if (!dismissBtn || !content) return;

    dismissBtn.addEventListener('click', function () {
        content.scrollIntoView({ behavior: 'smooth' });
    });
})();

(function () {
    const toggle = document.querySelector('[data-toggle-comments]');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
        document.body.classList.toggle('comments-opened');
    });
})();

(function () {
    const element = document.querySelector('.gh-article-excerpt');
    if (!element) return;

    let text = element.textContent;
    const emojiRE = /\p{EPres}|\p{ExtPict}/gu;

    const emojis = text.match(emojiRE);
    if (!emojis) return;

    emojis.forEach(function (emoji) {
        text = text.replace(emoji, `<span class="emoji">${emoji}</span>`);
    });

    element.innerHTML = text;
})();

(function () {
    pagination(true, initParallax);
})();

// Strip Ghost's inline min-height/padding from kg-header-card elements
// so our CSS rules (in screen.css) can control the layout instead.
(function () {
    function fixHeaderCards() {
        document.querySelectorAll('.kg-header-card').forEach(function (card) {
            // Strip Ghost's injected inline styles
            card.style.removeProperty('min-height');
            card.style.removeProperty('height');

            card.querySelectorAll('*').forEach(function (el) {
                el.style.removeProperty('min-height');
                el.style.removeProperty('height');

                if (
                    el.classList.contains('kg-header-card-content') ||
                    el.classList.contains('kg-header-card-text')
                ) {
                    el.style.removeProperty('padding');
                    el.style.removeProperty('padding-top');
                    el.style.removeProperty('padding-bottom');
                    el.style.removeProperty('padding-left');
                    el.style.removeProperty('padding-right');
                }
            });
        });
    }

    // Run immediately for cards already in the DOM
    fixHeaderCards();

    // Re-run after any dynamic content loads (e.g., pagination)
    document.addEventListener('ghost:card:loaded', fixHeaderCards);
})();
