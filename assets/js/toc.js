// Table of contents initialization and conditional visibility
// This runs after tocbot CDN is loaded and DOM is ready

(function () {
    if (typeof tocbot !== 'undefined') {
        tocbot.init({
            // Where to render the table of contents.
            tocSelector: '.gh-toc',
            // Where to grab the headings to build the table of contents.
            contentSelector: '.gh-content',
            // Which headings to grab inside of the contentSelector element.
            headingSelector: 'h1, h2, h3, h4',
            // Ensure correct positioning
            hasInnerContainers: true,
            collapseDepth: 6,
            orderedList: false,
        });
    }

    // remove table of contents if there are no headings in the content or if the page is restricted and the user doesn't have access
    if (document.querySelector('.gh-sidebar') && (document.querySelectorAll('.gh-toc .toc-link').length === 0 || document.querySelector('.gh-cta'))) {
        document.querySelector('.gh-sidebar').style.display = 'none';
        if (document.querySelector('.gh-toc-divider')) {
            document.querySelector('.gh-toc-divider').style.display = 'none';
        }
        document.body.classList.add('no-toc');
    } else if (!document.querySelector('.gh-sidebar')) {
        document.body.classList.add('no-toc');
    }
})();
