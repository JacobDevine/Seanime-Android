(function() {
    var PRECONNECT = [
        'https://s4.anilist.co',
        'https://img.anili.st',
        'https://anilist.co',
        'https://graphql.anilist.co'
    ];

    var DNS_PREFETCH = [
        'https://s4.anilist.co',
        'https://cdn.myanimelist.net'
    ];

    PRECONNECT.forEach(function(origin) {
        if (document.querySelector('link[rel="preconnect"][href="' + origin + '"]')) return;
        var link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    });

    DNS_PREFETCH.forEach(function(origin) {
        if (document.querySelector('link[rel="dns-prefetch"][href="' + origin + '"]')) return;
        var link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = origin;
        document.head.appendChild(link);
    });

    document.querySelectorAll(
        '[data-media-page-header-entry-details-cover-image="true"], img[alt="banner image"]'
    ).forEach(function(img) {
        img.setAttribute('fetchpriority', 'high');
        img.setAttribute('loading', 'eager');
    });
})();
